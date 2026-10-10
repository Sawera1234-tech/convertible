/// <reference types="vite-plugin-pwa/client" />
// Single registration point for the app-shell service worker.

function isRefusedContext() {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  const blocked = ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"];
  if (blocked.some((d) => h === d || h.endsWith("." + d))) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

export async function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => (r.active || r.installing || r.waiting)?.scriptURL.endsWith("/sw.js"))
        .map((r) => r.unregister()),
    );
    return;
  }
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
  // Make sure the app page itself is stored for offline launch. The very first visit
  // happens before the worker controls the page, so its HTML was never cached.
  try {
    await navigator.serviceWorker.ready;
    const cache = await caches.open("v2mp3-pages-v1");
    if (!(await cache.match("/")) || navigator.onLine) {
      const res = await fetch("/", { cache: "no-store", credentials: "same-origin" });
      if (res.ok && (res.headers.get("content-type") || "").includes("text/html")) await cache.put("/", res);
    }
  } catch {
    /* offline or storage unavailable: keep the existing cached copy */
  }
}
