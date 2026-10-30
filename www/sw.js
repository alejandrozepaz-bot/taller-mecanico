// Guarda la app en el equipo para que abra sin internet.
const CACHE = "taller-v1.3.0";
const ARCHIVOS = ["./", "index.html", "styles.css", "data.js", "manuales.js", "engine.js", "db.js", "ai.js", "app.js", "manifest.webmanifest", "icono.svg", "icono-192.png", "icono-512.png", "vendor/pdf.min.js", "vendor/pdf.worker.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // la IA y los enlaces externos van directo a internet
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(guardado => {
      const deRed = fetch(e.request).then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => guardado);
      return guardado || deRed;
    })
  );
});
