"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const currentBuildIdRef = useRef<string | null>(null);

  useEffect(() => {
    // 1. Restaurar estado colapsado de sidebar
    const saved = localStorage.getItem("transservices_sidebar_collapsed");
    if (saved === "true") {
      setIsSidebarCollapsed(true);
    }

    // 2. Centinela de auto-actualización en vivo para todos los dispositivos
    const checkForUpdates = async () => {
      try {
        const res = await fetch(`/api/version?_t=${Date.now()}`, {
          cache: "no-store",
          headers: { Pragma: "no-cache" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const incomingBuildId = data.buildId;

        if (!incomingBuildId) return;

        if (currentBuildIdRef.current === null) {
          currentBuildIdRef.current = incomingBuildId;
          sessionStorage.setItem("transservices_active_build", incomingBuildId);
        } else if (currentBuildIdRef.current !== incomingBuildId) {
          console.info("[ERP Auto-Update] Nueva versión detectada en servidor:", incomingBuildId);
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          window.location.reload();
        }
      } catch {
        // Silencioso ante pérdidas temporales de red
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 20000);

    const onVisibleOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    window.addEventListener("focus", onVisibleOrFocus);
    document.addEventListener("visibilitychange", onVisibleOrFocus);

    // 3. Desregistrar automáticamente Service Workers en el ERP Administrativo
    // y purgar cachés residuales de versiones previas.
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      });
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisibleOrFocus);
      document.removeEventListener("visibilitychange", onVisibleOrFocus);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("transservices_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-asphalt-950">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
