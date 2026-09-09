/**
 * Limpieza y desinstalación forzada del Service Worker legado de Viajes v57
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Siempre ir a la red de inmediato
  event.respondWith(fetch(event.request));
});