"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerSentinel — Trans Services A&B
 * 
 * Componente centinela global que protege la aplicación contra problemas de caché:
 * 1. Bloquea defensivamente cualquier intento de registrar Service Workers en el cliente.
 * 2. Desregistra activamente cualquier Service Worker remanente o huérfano.
 * 3. Purga todos los almacenes de Cache Storage locales.
 * 4. Monitorea /api/version para recargar automáticamente cuando se despliega una nueva versión en Railway.
 */
export function ServiceWorkerSentinel() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Bloquear de raíz cualquier intento futuro de registro de Service Worker
    if ("serviceWorker" in navigator) {
      try {
        navigator.serviceWorker.register = () => {
          console.warn("[SW Sentinel] Intento de registro bloqueado. El ERP opera en modo Live Real-Time.");
          return Promise.reject(new Error("Service Workers deshabilitados por arquitectura"));
        };
      } catch {}

      // 2. Desregistrar inmediatamente todos los Service Workers en cualquier ámbito
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          if (!registrations || !registrations.length) return;
          for (const reg of registrations) {
            reg.unregister().catch(() => {});
          }
        })
        .catch(() => {});
    }

    // 3. Purgar Cache Storage del navegador
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => {
          if (!keys || !keys.length) return;
          for (const k of keys) {
            caches.delete(k).catch(() => {});
          }
        })
        .catch(() => {});
    }

    // 4. Centinela de versión en vivo contra el backend de Railway
    let activeBuildId: string | null = null;
    const checkVersion = async () => {
      try {
        const res = await fetch(`/api/version?_t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!data?.buildId) return;
          if (!activeBuildId) {
            activeBuildId = data.buildId;
          } else if (activeBuildId !== data.buildId) {
            console.info("[SW Sentinel] Nueva versión en servidor (" + data.buildId + "). Actualizando interfaz...");
            window.location.reload();
          }
        }
      } catch {}
    };

    checkVersion();
    const interval = setInterval(checkVersion, 25000);

    const onVisible = () => {
      if (document.visibilityState === "visible") checkVersion();
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
