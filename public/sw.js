/**
 * TRANS SERVICES A&B — PWA Offline Service Worker (Aislamiento Total ERP vs Apps)
 * Versión 1.4: Network-First para apps móviles y exclusión total de rutas administrativas.
 */

const CACHE_NAME = "transservices-pwa-v1.4";

// Assets exclusivos para el funcionamiento offline del Portal Conductor y Apps Satélite
const MOBILE_PWA_ASSETS = [
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

// 1. Instalación: Precarga de assets móviles únicamente
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(MOBILE_PWA_ASSETS).catch((err) => {
        console.warn("Aviso precaché PWA:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activación: Purga estricta de cualquier versión anterior de caché
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("PWA SW: Purgando versión de caché obsoleta:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptación: Estrategia NETWORK-FIRST exclusiva para /portal-conductor y /apps/
self.addEventListener("fetch", (event) => {
  const reqUrl = event.request.url;

  // Filtrar estrictamente solo protocolos HTTP/HTTPS
  if (!reqUrl.startsWith("http://") && !reqUrl.startsWith("https://")) {
    return;
  }

  const url = new URL(reqUrl);
  const pathname = url.pathname;

  // REGLA DE ORO DE AISLAMIENTO:
  // Si la petición NO pertenece al portal móvil ni a las apps, NO INTERCEPTAR.
  // Esto deja libre al 100% el ERP (/hseq, /asignaciones, /operacion, /flota, /personas, /dashboard, etc.)
  const isMobilePwaRoute =
    pathname.startsWith("/portal-conductor") ||
    pathname.startsWith("/apps/") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png";

  if (!isMobilePwaRoute || event.request.method !== "GET" || pathname.startsWith("/api/")) {
    // Permitir navegación normal sin interferencia de Service Worker
    return;
  }

  // ESTRATEGIA NETWORK-FIRST:
  // 1. Intentar siempre la red primero para que cualquier cambio nuevo se refleje al instante.
  // 2. Si falla la red (offline/sin señal), entregar la versión guardada en caché.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback offline cuando no hay internet
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }

        // Fallback para navegación de página
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/portal-conductor");
        }
      })
  );
});
