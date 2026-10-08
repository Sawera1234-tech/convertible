import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Film,
  Loader2,
  Lock,
  Music2,
  Smartphone,
  Square,
  Trash2,
  UploadCloud,
  WifiOff,
  X,
  Clock,
  PartyPopper,
} from "lucide-react";
import JSZip from "jszip";
import { isEngineCached, loadEngine, terminateEngine } from "@/lib/ffmpeg-engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Video to MP3 — Convert multiple videos to MP3 instantly" },
      {
        name: "description",
        content:
          "Batch convert MP4, MOV, MKV, AVI, WEBM videos to MP3 right on your device. Private, offline-ready and installable.",
      },
      { property: "og:title", content: "Video to MP3 — Batch converter" },
      {
        property: "og:description",
        content: "Convert multiple videos to MP3 instantly, privately on your device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Status = "waiting" | "converting" | "completed" | "failed" | "cancelled";
interface Item {
  id: string;
  file: File;
  ext: string;
  outName: string;
  status: Status;
  progress: number;
  error?: string;
  blob?: Blob;
  url?: string;
}
type Engine = "checking" | "downloading" | "ready" | "needs-internet" | "error";

const EXTS = ["mp4", "mov", "avi", "mkv", "webm", "m4v", "3gp", "mpeg", "mpg", "wmv", "flv"];
const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const FRIENDLY_FAIL = "This video could not be converted. Please try another video or a smaller file.";

function fmtSize(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}
function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}
function baseOf(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
function triggerDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function Index() {
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [engine, setEngine] = useState<Engine>("checking");
  const [engineProgress, setEngineProgress] = useState(0);
  const [justReady, setJustReady] = useState(false);
  const [installEvt, setInstallEvt] = useState<any>(null);
  const [zipping, setZipping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  const prepareEngine = useCallback(async () => {
    const cached = await isEngineCached();
    if (!cached && !navigator.onLine) {
      setEngine("needs-internet");
      return;
    }
    setEngine(cached ? "checking" : "downloading");
    try {
      await loadEngine((p) => setEngineProgress(p));
      setEngine("ready");
      if (!cached) {
        setJustReady(true);
        setTimeout(() => setJustReady(false), 4000);
      }
    } catch {
      setEngine(navigator.onLine ? "error" : "needs-internet");
    }
  }, []);

  useEffect(() => {
    prepareEngine();
    const onOnline = () => setEngine((e) => (e === "needs-internet" || e === "error" ? (prepareEngine(), e) : e));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [prepareEngine]);

  const addFiles = (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) {
      setNotice("No videos were selected. Please choose one or more video files.");
      return;
    }
    const msgs: string[] = [];
    setItems((prev) => {
      const next = [...prev];
      const used = new Set(next.map((i) => i.outName.toLowerCase()));
      for (const file of files) {
        const ext = extOf(file.name);
        const isVideo = file.type.startsWith("video/") || EXTS.includes(ext);
        if (!isVideo) {
          msgs.push(`"${file.name}" is not a supported video.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          msgs.push(`"${file.name}" is too large (over 2 GB) to convert on this device.`);
          continue;
        }
        if (next.some((i) => i.file.name === file.name && i.file.size === file.size)) {
          msgs.push(`"${file.name}" is already in the list.`);
          continue;
        }
        let out = `${baseOf(file.name)}.mp3`;
        let n = 2;
        while (used.has(out.toLowerCase())) out = `${baseOf(file.name)} (${n++}).mp3`;
        used.add(out.toLowerCase());
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          ext: ext ? ext.toUpperCase() : "VIDEO",
          outName: out,
          status: "waiting",
          progress: 0,
        });
      }
      return next;
    });
    setNotice(msgs.length ? msgs.join(" ") : null);
  };

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const convertAll = async () => {
    if (running) return;
    const queue = itemsRef.current.filter((i) => i.status !== "completed");
    if (!queue.length) {
      setNotice("Please select at least one video first.");
      return;
    }
    setNotice(null);
    setRunning(true);
    cancelRef.current = false;
    queue.forEach((q) => update(q.id, { status: "waiting", progress: 0, error: undefined }));
    let ff;
    try {
      ff = await loadEngine((p) => setEngineProgress(p));
      setEngine("ready");
    } catch {
      setRunning(false);
      setNotice(
        navigator.onLine
          ? "The converter could not start on this browser. Please try again or use a different browser."
          : "Internet is required once to set up the converter. Please connect and try again.",
      );
      return;
    }
    for (const item of queue) {
      if (cancelRef.current) break;
      update(item.id, { status: "converting", progress: 0 });
      const inName = `in_${item.id}.${item.ext.toLowerCase() || "mp4"}`;
      const outName = `out_${item.id}.mp3`;
      const onProg = ({ progress }: { progress: number }) => {
        if (progress >= 0 && progress <= 1) update(item.id, { progress: Math.round(progress * 100) });
      };
      try {
        ff.on("progress", onProg);
        const data = new Uint8Array(await item.file.arrayBuffer());
        await ff.writeFile(inName, data);
        const code = await ff.exec(["-i", inName, "-vn", "-map", "0:a:0", "-c:a", "libmp3lame", "-b:a", "192k", outName]);
        if (cancelRef.current) throw new Error("cancelled");
        if (code !== 0) throw new Error("exec failed");
        const out = (await ff.readFile(outName)) as Uint8Array;
        if (!out.length) throw new Error("empty");
        const blob = new Blob([out.slice().buffer], { type: "audio/mpeg" });
        update(item.id, { status: "completed", progress: 100, blob, url: URL.createObjectURL(blob) });
      } catch (e) {
        if (cancelRef.current) {
          update(item.id, { status: "cancelled", progress: 0 });
          break;
        }
        const msg = String((e as Error)?.message ?? "");
        const oom = /memory|allocation|RangeError|Array buffer/i.test(msg);
        update(item.id, {
          status: "failed",
          error: oom
            ? "Not enough memory on this device for this video. Please try a smaller file."
            : msg === "exec failed"
              ? "This video has no audio track or could not be read. Please try another video."
              : FRIENDLY_FAIL,
        });
        if (oom) {
          terminateEngine();
          try {
            ff = await loadEngine();
          } catch {
            break;
          }
        }
      } finally {
        try {
          ff.off("progress", onProg);
          await ff.deleteFile(inName).catch(() => {});
          await ff.deleteFile(outName).catch(() => {});
        } catch {
          /* engine may be terminated */
        }
      }
    }
    if (cancelRef.current) {
      setItems((prev) => prev.map((i) => (i.status === "waiting" || i.status === "converting" ? { ...i, status: "cancelled", progress: 0 } : i)));
      setNotice("Conversion cancelled.");
    }
    setRunning(false);
  };

  const cancel = () => {
    cancelRef.current = true;
    terminateEngine();
    loadEngine().catch(() => {});
  };

  const remove = (id: string) =>
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it?.url) URL.revokeObjectURL(it.url);
      return prev.filter((i) => i.id !== id);
    });

  const clearAll = () => {
    if (running) cancel();
    items.forEach((i) => i.url && URL.revokeObjectURL(i.url));
    setItems([]);
    setNotice(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const done = items.filter((i) => i.status === "completed");
  const downloadAll = async () => {
    if (!done.length) return;
    if (done.length === 1) return triggerDownload(done[0].url!, done[0].outName);
    setZipping(true);
    try {
      const zip = new JSZip();
      done.forEach((d) => zip.file(d.outName, d.blob!));
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, "Video to MP3.zip");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setNotice("Could not create the ZIP file. Please download the files one by one.");
    } finally {
      setZipping(false);
    }
  };

  const total = items.length;
  const finished = items.filter((i) => i.status === "completed" || i.status === "failed").length;
  const overall = total
    ? Math.round(items.reduce((s, i) => s + (i.status === "completed" || i.status === "failed" ? 100 : i.status === "converting" ? i.progress : 0), 0) / total)
    : 0;
  const allDone = total > 0 && done.length === total && !running;
  const anyFailed = items.some((i) => i.status === "failed");

  return (
    <main className="min-h-screen bg-background pb-16 font-sans">
      <div className="mx-auto w-full max-w-xl px-4 pt-6 sm:pt-10">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 rounded-2xl shadow-brand" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-foreground">Video to MP3</h1>
              <EngineBadge engine={engine} />
            </div>
          </div>
          {installEvt && (
            <button
              onClick={async () => {
                installEvt.prompt();
                await installEvt.userChoice;
                setInstallEvt(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-card transition hover:bg-accent"
            >
              <Smartphone className="h-4 w-4" /> Install App
            </button>
          )}
        </header>

        <p className="mt-5 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
          Convert multiple videos to MP3 instantly
        </p>

        {(engine === "downloading" || justReady) && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
            {justReady ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" /> Offline Converter Ready
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Preparing Offline Converter…
                  </span>
                  <span className="tabular-nums text-muted-foreground">{Math.round(engineProgress * 100)}%</span>
                </div>
                <Bar value={engineProgress * 100} />
                <p className="mt-2 text-xs text-muted-foreground">One-time setup. After this, conversion works without internet.</p>
              </>
            )}
          </div>
        )}

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition sm:py-16 ${
            dragging ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/50"
          } shadow-card`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-primary">
            <UploadCloud className="h-8 w-8" />
          </div>
          <span className="mt-4 inline-flex items-center rounded-full bg-brand px-7 py-3.5 text-base font-bold text-primary-foreground shadow-brand">
            Select Videos
          </span>
          <span className="mt-3 text-sm text-muted-foreground">or drag & drop · MP4, MOV, AVI, MKV, WEBM, M4V</span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v"
            className="sr-only"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Your videos are processed locally on your device. Your files are not uploaded to our server.
        </p>

        {notice && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-accent p-3 text-sm text-accent-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{notice}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {total > 0 && (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {total} video{total > 1 ? "s" : ""}
              </h2>
              <button onClick={clearAll} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Clear All
              </button>
            </div>

            <ul className="space-y-2.5">
              {items.map((it) => (
                <li key={it.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${it.status === "completed" ? "bg-success-soft text-success" : "bg-secondary text-secondary-foreground"}`}>
                      {it.status === "completed" ? <Music2 className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {it.status === "waiting" && !running ? it.file.name : it.outName}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{fmtSize(it.file.size)}</span>
                        <span>·</span>
                        <span>{it.ext}</span>
                        <span>·</span>
                        <StatusLabel item={it} />
                      </p>
                    </div>
                    {it.status === "completed" ? (
                      <button
                        onClick={() => triggerDownload(it.url!, it.outName)}
                        className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-2 text-xs font-bold text-success"
                      >
                        <Download className="h-4 w-4" /> Download
                      </button>
                    ) : (
                      it.status !== "converting" && (
                        <button onClick={() => remove(it.id)} aria-label={`Remove ${it.file.name}`} className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      )
                    )}
                  </div>
                  {it.status === "converting" && <Bar value={it.progress} />}
                  {it.error && <p className="mt-2 text-xs text-destructive">{it.error}</p>}
                </li>
              ))}
            </ul>

            {(running || finished > 0) && (
              <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex justify-between text-sm font-semibold text-foreground">
                  <span>Overall progress</span>
                  <span className="tabular-nums text-muted-foreground">
                    {finished}/{total} · {overall}%
                  </span>
                </div>
                <Bar value={overall} />
              </div>
            )}

            {allDone && (
              <p className="mt-5 flex items-center justify-center gap-2 text-center text-base font-bold text-success">
                <PartyPopper className="h-5 w-5" /> All videos converted successfully
              </p>
            )}

            <div className="mt-5 space-y-3">
              {running ? (
                <button onClick={cancel} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-base font-bold text-foreground shadow-card">
                  <Square className="h-4 w-4" /> Cancel
                </button>
              ) : (
                !allDone && (
                  <button
                    onClick={convertAll}
                    disabled={engine === "needs-internet"}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-base font-bold text-primary-foreground shadow-brand transition active:scale-[0.99] disabled:opacity-50"
                  >
                    <Music2 className="h-5 w-5" /> {anyFailed || done.length ? "Convert Remaining to MP3" : "Convert All to MP3"}
                  </button>
                )
              )}
              {done.length > 0 && (
                <button
                  onClick={downloadAll}
                  disabled={zipping}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-4 text-base font-bold text-background shadow-card disabled:opacity-60"
                >
                  {zipping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                  Download All MP3{done.length > 1 ? ` (${done.length})` : ""}
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${Math.max(2, value)}%` }} />
    </div>
  );
}

function StatusLabel({ item }: { item: Item }) {
  switch (item.status) {
    case "waiting":
      return <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Waiting</span>;
    case "converting":
      return <span className="inline-flex items-center gap-1 font-semibold text-primary"><Loader2 className="h-3 w-3 animate-spin" /> Converting {item.progress}%</span>;
    case "completed":
      return <span className="inline-flex items-center gap-1 font-semibold text-success"><CheckCircle2 className="h-3 w-3" /> Completed</span>;
    case "failed":
      return <span className="inline-flex items-center gap-1 font-semibold text-destructive"><AlertCircle className="h-3 w-3" /> Failed</span>;
    default:
      return <span>Cancelled</span>;
  }
}

function EngineBadge({ engine }: { engine: Engine }) {
  if (engine === "ready")
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
        <span className="h-2 w-2 rounded-full bg-success" /> Offline Ready · Ready to use offline
      </p>
    );
  if (engine === "needs-internet")
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <WifiOff className="h-3 w-3" /> Internet required for first-time setup
      </p>
    );
  if (engine === "error")
    return <p className="text-xs font-semibold text-destructive">Converter setup failed — tap Convert to retry</p>;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" /> {engine === "downloading" ? "Setting up…" : "Starting converter…"}
    </p>
  );
}
