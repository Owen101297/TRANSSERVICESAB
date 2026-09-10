/**
 * TRANS SERVICES A&B — Universal App Sentinel & SW Elimination
 * 
 * Funciones clave:
 * 1. Bloquea permanentemente cualquier intento de registro de Service Worker en apps móviles.
 * 2. Desregistra cualquier Service Worker activo o huérfano en el dispositivo del conductor.
 * 3. Purga el 100% de los almacenes de caché (Cache Storage) del navegador.
 * 4. Centinela en vivo: consulta periódicamente /api/version y auto-recarga al detectar nuevos despliegues.
 */
(function () {
  if (typeof window === "undefined") return;

  // 1. Bloqueo defensivo: impedir que cualquier script registre Service Workers
  if ("serviceWorker" in navigator) {
    try {
      navigator.serviceWorker.register = function () {
        console.warn("[Sentinel TS] Intento de registro de SW bloqueado. La plataforma opera en modo Live Real-Time.");
        return Promise.reject(new Error("Service Workers deshabilitados por arquitectura"));
      };
    } catch (e) {}

    // 2. Saneamiento inmediato: desregistrar todos los Service Workers existentes
    navigator.serviceWorker
      .getRegistrations()
      .then(function (registrations) {
        if (!registrations || !registrations.length) return;
        for (var i = 0; i < registrations.length; i++) {
          try {
            registrations[i].unregister().then(function (ok) {
              if (ok) console.info("[Sentinel TS] Service Worker desinstalado con éxito.");
            });
          } catch (err) {}
        }
      })
      .catch(function () {});
  }

  // 3. Purgado de Cache Storage en el navegador del dispositivo
  if ("caches" in window) {
    caches
      .keys()
      .then(function (keys) {
        if (!keys || !keys.length) return;
        for (var i = 0; i < keys.length; i++) {
          try {
            caches.delete(keys[i]);
          } catch (err) {}
        }
      })
      .catch(function () {});
  }

  // 4. Centinela de auto-actualización en tiempo real
  var currentBuildId = null;
  function checkLiveVersion() {
    fetch("/api/version?_t=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.buildId) return;
        if (!currentBuildId) {
          currentBuildId = data.buildId;
        } else if (currentBuildId !== data.buildId) {
          console.info("[Sentinel TS] Nueva versión detectada en servidor (" + data.buildId + "). Actualizando interfaz...");
          window.location.reload();
        }
      })
      .catch(function () {});
  }

  // Ejecutar verificación inicial y programar chequeos continuos
  checkLiveVersion();
  setInterval(checkLiveVersion, 25000);

  // Re-verificar cuando el conductor vuelve a abrir la pestaña o desbloquea la pantalla
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") checkLiveVersion();
  });
  window.addEventListener("focus", checkLiveVersion);
})();
