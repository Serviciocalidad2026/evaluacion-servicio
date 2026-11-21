// =============================================================================
// Service Worker · Suite Cottech v2.3
// - Permite instalar la app en Android (PWA) sin alertas.
// - Guarda la app (tecnico.html, encuesta, ícono y librerías) para que ABRA SIN SEÑAL.
// - Nunca guarda ni intercepta datos: Apps Script, Firebase e is.gd van siempre directo a internet.
// =============================================================================
const CACHE = "cottech-app-v2-6";

const ARCHIVOS_APP = [
  "./tecnico.html",
  "./index.html",
  "./manifest.json",
  "./Icono.png"
];

const LIBRERIAS = [
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"
];

const NUNCA_GUARDAR = ["script.google.com", "script.googleusercontent.com", "firebaseio.com", "firebasedatabase.app", "is.gd"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // allSettled: si un archivo falla (sin señal), la instalación no se cae
    await Promise.allSettled(ARCHIVOS_APP.map(u => cache.add(u)));
    await Promise.allSettled(LIBRERIAS.map(async u => {
      const r = await fetch(u, { mode: "cors" });
      if (r.ok) await cache.put(u, r);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(n => n.startsWith("cottech-app-") && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NUNCA_GUARDAR.some(h => url.hostname.endsWith(h))) return;

  // Librerías externas: primero la copia guardada (no cambian, versión fija)
  if (LIBRERIAS.includes(url.href)) {
    event.respondWith(caches.match(url.href).then(c => c || fetch(req)));
    return;
  }

  // Páginas y archivos propios: primero internet (para recibir actualizaciones),
  // si no hay señal, la copia guardada.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      try {
        const r = await fetch(req);
        if (r.ok) {
          const cache = await caches.open(CACHE);
          cache.put(url.origin + url.pathname, r.clone());
        }
        return r;
      } catch (e) {
        const guardada = await caches.match(url.origin + url.pathname, { ignoreSearch: true });
        if (guardada) return guardada;
        if (req.mode === "navigate") {
          const tec = await caches.match(new URL("./tecnico.html", self.location).href);
          if (tec) return tec;
        }
        throw e;
      }
    })());
  }
});
