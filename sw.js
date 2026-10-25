// Caches the viewer shell so scanning works without a network after one online visit.
// It only handles this origin's own static files: payload data lives in the URL fragment,
// which is never sent over the network, and nothing else is ever cached.
// Bump CACHE when the precache list changes; other file edits arrive via stale-while-revalidate.

const CACHE = "pd-viewer-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/viewer.css",
  "./js/main.js",
  "./js/codec.js",
  "./js/model.js",
  "./js/markdown.js",
  "./js/view.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./vendor/fontawesome/css/all.min.css",
  "./vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "./vendor/fontawesome/webfonts/fa-regular-400.woff2",
  "./vendor/fontawesome/webfonts/fa-brands-400.woff2",
  "./vendor/fonts/fira-sans-latin-400-normal.woff2",
  "./vendor/fonts/fira-sans-latin-600-normal.woff2",
  "./vendor/fonts/fira-sans-latin-700-normal.woff2",
  "./vendor/fonts/fira-code-latin-400-normal.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const update = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  const fresh = await update;
  if (fresh) return fresh;
  if (request.mode === "navigate") return (await cache.match("./index.html")) ?? Response.error();
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(staleWhileRevalidate(request));
});
