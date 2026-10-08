import type { FFmpeg } from "@ffmpeg/ffmpeg";
import wasmAsset from "@/assets/ffmpeg-core.wasm.asset.json";

// Versioned cache for the conversion engine. Bump when @ffmpeg/core changes.
const ENGINE_CACHE = "ffmpeg-core-v0.12.10";
const CORE_URL = "/ffmpeg/ffmpeg-core.js";
const WASM_URL = wasmAsset.url;
const WASM_SIZE = wasmAsset.size;

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export async function isEngineCached(): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const c = await caches.open(ENGINE_CACHE);
    const [a, b] = await Promise.all([c.match(CORE_URL), c.match(WASM_URL)]);
    return !!a && !!b;
  } catch {
    return false;
  }
}

async function getFile(
  url: string,
  type: string,
  onBytes?: (loaded: number) => void,
  expected = 0,
): Promise<Blob> {
  const cache = await caches.open(ENGINE_CACHE);
  const hit = await cache.match(url);
  if (hit) {
    const b = await hit.blob();
    onBytes?.(b.size);
    return new Blob([b], { type });
  }
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok || !res.body) throw new Error("download failed");
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onBytes?.(loaded);
  }
  const blob = new Blob(chunks, { type });
  if (expected && blob.size !== expected) throw new Error("incomplete download");
  await cache.put(url, new Response(blob, { headers: { "content-type": type } }));
  return blob;
}

async function cleanupOldEngineCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((k) => k.startsWith("ffmpeg-core-") && k !== ENGINE_CACHE).map((k) => caches.delete(k)),
  );
}

/** Loads the engine (from local cache when available). onProgress gets 0..1. */
export function loadEngine(onProgress?: (p: number) => void): Promise<FFmpeg> {
  if (instance) return Promise.resolve(instance);
  if (loading) return loading;
  loading = (async () => {
    try {
      navigator.storage?.persist?.().catch(() => {});
      let coreLoaded = 0;
      let wasmLoaded = 0;
      const total = WASM_SIZE + 112_000;
      const report = () => onProgress?.(Math.min(0.99, (coreLoaded + wasmLoaded) / total));
      const [coreBlob, wasmBlob] = await Promise.all([
        getFile(CORE_URL, "text/javascript", (n) => ((coreLoaded = n), report())),
        getFile(WASM_URL, "application/wasm", (n) => ((wasmLoaded = n), report()), WASM_SIZE),
      ]);
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const ff = new FFmpeg();
      await ff.load({
        coreURL: URL.createObjectURL(coreBlob),
        wasmURL: URL.createObjectURL(wasmBlob),
      });
      cleanupOldEngineCaches().catch(() => {});
      onProgress?.(1);
      instance = ff;
      return ff;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Hard-stop the current job; the engine reloads from cache on next use. */
export function terminateEngine() {
  try {
    instance?.terminate();
  } catch {
    /* ignore */
  }
  instance = null;
}
