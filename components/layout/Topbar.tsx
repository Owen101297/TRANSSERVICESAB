"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, PanelLeftOpen, PanelLeftClose, LogOut } from "lucide-react";

interface TopbarProps {
  userName?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Topbar({
  userName: defaultUserName = "Administrador",
  isSidebarCollapsed = false,
  onToggleSidebar,
}: TopbarProps) {
  const router = useRouter();
  const [userName, setUserName] = useState(defaultUserName);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d.user?.nombre) {
          setUserName(d.user.nombre);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("transservices_conductor");
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 w-full max-w-lg">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title={isSidebarCollapsed ? "Expandir menú lateral" : "Ocultar menú lateral"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={18} className="text-amber-600" />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        )}

        <div className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2 transition-all focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            placeholder="Buscar personas, vehículos, placas o reportes..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          aria-label="Notificaciones"
          className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200/80">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 font-sans text-xs font-extrabold text-white shadow-xs">
            {userName.charAt(0)}
          </div>
          <span className="text-xs sm:text-sm text-slate-900 hidden sm:inline-block font-bold truncate max-w-[140px]">
            {userName}
          </span>

          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-0.5"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
