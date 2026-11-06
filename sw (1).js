const VERSION = "bp-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
const OPTIONAL = ["./icons/icon-maskable-512.png"];
const NETWORK_TIMEOUT = 3000;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then(async (c) => {
      await c.addAll(SHELL);
      await Promise.allSettled(OPTIONAL.map((u) => c.add(u)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// App: rede primeiro (pega atualizações); se demorar mais de 3s ou falhar, usa o cache
async function appRequest(req) {
  const cache = await caches.open(VERSION);
  const network = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; });
  network.catch(() => {});
  const timeout = new Promise((res) => setTimeout(() => res(null), NETWORK_TIMEOUT));
  try {
    const r = await Promise.race([network, timeout]);
    if (r) return r;
    return (await cache.match(req)) || network;
  } catch (_) {
    return (await cache.match(req))
      || (req.mode === "navigate" ? await cache.match("./index.html") : null)
      || Response.error();
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fontes do Google: guarda no primeiro uso e serve do cache depois
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(VERSION).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((r) => {
          if (r.ok || r.type === "opaque") c.put(req, r.clone());
          return r;
        }))
      )
    );
    return;
  }

  if (url.origin === location.origin) e.respondWith(appRequest(req));
});
