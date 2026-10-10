// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    optimizeDeps: { exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"] },
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false,
        filename: "sw.js",
        devOptions: { enabled: false },
        workbox: {
          cacheId: "v2mp3",
          // Hashed assets get revisioned precache entries; old precache is removed only
          // after the new SW has fully installed and activated.
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ["**/*.{js,css,png,svg,ico,json,woff,woff2,webmanifest}"],
          globIgnores: ["**/ffmpeg/**", "**/server/**"],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "v2mp3-pages-v1",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 10 },
                plugins: [
                  {
                    // Offline launch from any URL (e.g. home-screen "/?source=pwa"):
                    // fall back to the cached app page instead of the browser's offline screen.
                    handlerDidError: async () =>
                      (await caches.match("/", { cacheName: "v2mp3-pages-v1", ignoreSearch: true })) ||
                      (await caches.match("/", { ignoreSearch: true })) ||
                      Response.error(),
                  },
                ],
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: { cacheName: "v2mp3-assets-v1", expiration: { maxEntries: 200 } },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === "https://fonts.googleapis.com" ||
                url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "v2mp3-fonts-v1",
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
