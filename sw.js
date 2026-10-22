// Pocketfolio's service worker.
// It lets the browser treat Pocketfolio as an installable app. It always asks the
// internet first, so you never see an old version, and it never stores prices.
const CACHE = "pocketfolio-v1";
const SHELL = ["/", "/app.css", "/app.jsx", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const ours = url.origin === self.location.origin;
  if (event.request.method !== "GET" || !ours || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((saved) => saved || caches.match("/")))
  );
});