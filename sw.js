const VERSION = "bp-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fontes do Google: guarda no primeiro uso e serve do cache depois
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(VERSION).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((r) => { c.put(req, r.clone()); return r; }))
      )
    );
    return;
  }

  // App: rede primeiro (pega atualizações), cache se estiver offline
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return r; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
  }
});
