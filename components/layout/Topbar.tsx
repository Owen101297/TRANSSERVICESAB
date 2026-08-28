import { Search, Bell } from "lucide-react";

export function Topbar({ userName = "Owen" }: { userName?: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line-600 bg-asphalt-950 px-6">
      <div className="flex w-full max-w-md items-center gap-2 rounded-md border border-line-600 bg-asphalt-900 px-3 py-2">
        <Search size={16} className="text-fog-400" />
        <input
          placeholder="Buscar personas, vehículos, placas..."
          className="w-full bg-transparent text-sm text-paper-50 placeholder:text-fog-400 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          aria-label="Notificaciones"
          className="relative rounded-md p-2 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-alert-red" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-asphalt-700 font-[family-name:var(--font-display)] text-sm font-bold text-signal-amber">
            {userName.charAt(0)}
          </div>
          <span className="text-sm text-paper-50">{userName}</span>
        </div>
      </div>
    </header>
  );
}
