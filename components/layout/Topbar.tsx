"use client";

import { Search, Bell, PanelLeftOpen, PanelLeftClose } from "lucide-react";

interface TopbarProps {
  userName?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Topbar({
  userName = "Owen",
  isSidebarCollapsed = false,
  onToggleSidebar,
}: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line-600 bg-asphalt-950 px-4 sm:px-6">
      <div className="flex items-center gap-3 w-full max-w-lg">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-md p-2 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50 transition-colors"
            title={isSidebarCollapsed ? "Expandir menú lateral" : "Ocultar menú lateral"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={18} className="text-signal-amber" />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        )}

        <div className="flex w-full items-center gap-2 rounded-md border border-line-600 bg-asphalt-900 px-3 py-2">
          <Search size={16} className="text-fog-400 shrink-0" />
          <input
            placeholder="Buscar personas, vehículos, placas..."
            className="w-full bg-transparent text-sm text-paper-50 placeholder:text-fog-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          aria-label="Notificaciones"
          className="relative rounded-md p-2 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50 transition-colors"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-alert-red" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-asphalt-700 font-[family-name:var(--font-display)] text-sm font-bold text-signal-amber border border-line-600">
            {userName.charAt(0)}
          </div>
          <span className="text-sm text-paper-50 hidden sm:inline-block font-medium">{userName}</span>
        </div>
      </div>
    </header>
  );
}
