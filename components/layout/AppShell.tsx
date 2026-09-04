"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // 1. Restaurar estado colapsado de sidebar
    const saved = localStorage.getItem("transservices_sidebar_collapsed");
    if (saved === "true") {
      setIsSidebarCollapsed(true);
    }

    // 2. Desregistrar automáticamente Service Workers en el ERP Administrativo
    // y limpiar cachés obsoletas para garantizar datos 100% en vivo sin hydration error.
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((unregistered) => {
            if (unregistered) {
              console.log("Service Worker administrativo desregistrado exitosamente.");
            }
          });
        }
      });

      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (!key.startsWith("transservices-pwa-")) {
              caches.delete(key);
            }
          });
        });
      }
    }
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
