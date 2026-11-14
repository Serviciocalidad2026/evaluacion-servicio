// Service Worker oficial para habilitar instalación limpia (PWA) en Android sin alertas
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  // Permite que todas las peticiones de GPS y Bitácora pasen en tiempo real
  return;
});