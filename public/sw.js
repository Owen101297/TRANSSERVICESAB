/**
 * TRANS SERVICES A&B — PWA Offline Service Worker
 * Provee funcionamiento instantáneo (0ms) y disponibilidad 100% offline para el Portal y Apps Satélite.
 */

const CACHE_NAME = "transservices-v1.3";

const STATIC_ASSETS = [
  "/",
  "/portal-conductor",
  "/portal-conductor/preoperacional",
  "/portal-conductor/capacitaciones",
  "/apps/extintor/index.html",
  "/apps/botiquin/index.html",
  "/apps/aseo/index.html",
  "/apps/lavado/index.html",
  "/apps/asistencia/index.html",
  "/apps/viajes/index.html",
  "/apps/encuesta/index.html",
  "/apps/shared/app-theme.css",
  "/apps/shared/vendor/signature_pad.umd.min.js",
  "/brand/logo.png",
  "/favicon.ico",
  "/logo.png"
];

// 1. Instalación: Precarga de assets críticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Algunos assets no se pudieron precachear:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activación: Limpieza de versiones obsoletas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Service Worker: Limpiando caché antigua:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptación: Stale-While-Revalidate seguro
self.addEventListener("fetch", (event) => {
  const reqUrl = event.request.url;

  // Filtrar estrictamente solo protocolos HTTP/HTTPS (ignorar chrome-extension, blob, etc.)
  if (!reqUrl.startsWith("http://") && !reqUrl.startsWith("https://")) {
    return;
  }

  const url = new URL(reqUrl);

  // No interceptar peticiones de API o métodos que muten datos
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Devolver respuesta en caché y revalidar en segundo plano si hay red
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && (reqUrl.startsWith("http://") || reqUrl.startsWith("https://"))) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse).catch(() => {});
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Si no está en caché, intentar red y guardar
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          if (reqUrl.startsWith("http://") || reqUrl.startsWith("https://")) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback offline para navegación HTML
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/portal-conductor");
          }
        });
    })
  );
});
