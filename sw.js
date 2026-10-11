// Service worker: lets the site open offline and remembers the last game lists.
const VERSION = "v1";
const SHELL = `rbx-shell-${VERSION}`;
const DATA = `rbx-data-${VERSION}`;
const FILES = [
  "./", "index.html", "css/style.css", "js/config.js", "js/snapshot.js", "js/api.js", "js/app.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, DATA].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Roblox data through the proxy: network first, fall back to the last copy.
  if (url.hostname.endsWith(".workers.dev")) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(DATA).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Our own files: show the cached copy fast, refresh it in the background.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
          return res;
        }).catch(() => hit || caches.match("index.html"));
        return hit || net;
      })
    );
  }
});
