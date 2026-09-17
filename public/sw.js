const CACHE = "shakh-super-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim().then(async () => {
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach(client => client.postMessage({ type: "APP_UPDATE_READY" }));
  }));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
