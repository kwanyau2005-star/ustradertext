// 每次發佈如果 HTML/CSS/JS 有改動，請記得更新版本號，避免用戶一直食舊 cache。
const CACHE_NAME = "ustradertext-shell-v16";
const APP_SHELL = [
  "/",
  "/index.html",
  "/us-trading-dashboard.html",
  "/manifest.webmanifest",
  "/assets/ustradertext_app_icon.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/massive-proxy/")) return;
  if (url.pathname.startsWith("/api/")) return;

  const accept = event.request.headers.get("accept") || "";
  const isHtmlNav = event.request.mode === "navigate" || accept.includes("text/html");

  // HTML 用 network-first：確保發佈後用戶可以即刻見到新版本
  if (isHtmlNav) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/us-trading-dashboard.html", clone)).catch(() => {});
          return response;
        })
        .catch(() => caches.match("/us-trading-dashboard.html"))
    );
    return;
  }

  // 其他靜態資源用 cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        return response;
      });
    })
  );
});
