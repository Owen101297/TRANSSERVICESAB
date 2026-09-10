/**
 * TRANS SERVICES A&B — Universal Service Worker Kill-Switch & Cache Purger
 * 
 * Propósito Senior:
 * Desinstala automáticamente cualquier Service Worker remanente en navegadores
 * (móviles, tablets y escritorio) y purga el 100% de los almacenamientos en caché
 * para garantizar que todas las apps y el ERP carguen siempre la última versión en vivo.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log("[SW Kill-Switch] Purgando caché obsoleta:", cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        return self.registration.unregister().then((success) => {
          if (success) {
            console.log("[SW Kill-Switch] Service Worker desinstalado con éxito.");
          }
        });
      })
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => {
        clients.forEach((client) => {
          if (client.url && "navigate" in client) {
            client.navigate(client.url);
          }
        });
      })
  );
});

// Sin intercepciones de red: dejar que todo viaje directo al servidor
self.addEventListener("fetch", () => {
  return;
});
