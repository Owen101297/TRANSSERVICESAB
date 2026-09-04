"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Building2,
  Truck,
  Link2,
  Route,
  Shield,
  Milestone,
  Leaf,
  FileText,
  BarChart3,
  Cpu,
  Settings,
  GraduationCap,
  ClipboardList,
  CheckSquare,
  Smartphone,
  Radio,
  Droplets,
  Sparkles,
  HeartPulse,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { NAV_GROUPS } from "@/lib/modules";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  building: Building2,
  truck: Truck,
  radio: Radio,
  link: Link2,
  route: Route,
  shield: Shield,
  road: Milestone,
  leaf: Leaf,
  file: FileText,
  chart: BarChart3,
  cpu: Cpu,
  settings: Settings,
  graduation: GraduationCap,
  clipboard: ClipboardList,
  check: CheckSquare,
  droplets: Droplets,
  sparkles: Sparkles,
  heart: HeartPulse,
  smartphone: Smartphone,
};

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-line-600 bg-asphalt-900 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[72px]" : "w-64"
      }`}
    >
      {/* Cabecera del Sidebar */}
      <div className="flex h-16 items-center justify-between border-b border-line-600 px-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/logo.png"
            alt="Trans Services A&B"
            className="h-10 w-10 rounded-full object-contain bg-asphalt-950 p-1 border border-line-600 shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 animate-fadeIn">
              <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-wide text-paper-50 leading-none truncate">
                TRANS SERVICES
              </span>
              <span className="text-[10px] font-mono text-signal-amber font-semibold tracking-wider truncate">
                COOPERATIVA A&amp;B
              </span>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-md text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors ${
              isCollapsed ? "mx-auto mt-2 hidden" : ""
            }`}
            title={isCollapsed ? "Expandir menú lateral" : "Ocultar / Colapsar menú lateral"}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* Lista de Navegación */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4 scrollbar-thin scrollbar-thumb-line-600">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            {group.label && !isCollapsed ? (
              <p className="mb-2 px-2.5 font-mono text-[10px] font-medium uppercase tracking-wider text-fog-400 truncate">
                {group.label}
              </p>
            ) : isCollapsed && group.label ? (
              <div className="h-px bg-line-600/60 my-3 mx-2" />
            ) : null}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? Home;
                const active = pathname === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center rounded-md text-sm transition-all duration-150 ${
                        isCollapsed
                          ? "justify-center p-2.5"
                          : "gap-3 px-3 py-2"
                      } ${
                        active
                          ? "bg-asphalt-700 text-paper-50 font-medium shadow-sm border border-line-500/50"
                          : "text-mist-200 hover:bg-asphalt-800 hover:text-paper-50"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={`shrink-0 ${active ? "text-signal-amber" : "text-fog-400"}`}
                      />
                      {!isCollapsed && (
                        <span className="truncate leading-tight">{item.label}</span>
                      )}
                      {!isCollapsed && active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-signal-amber shrink-0" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Pie del Sidebar con botón de Toggle */}
      {onToggleCollapse && (
        <div className="border-t border-line-600 p-2 bg-asphalt-950/60">
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center rounded-md text-xs text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors ${
              isCollapsed ? "justify-center p-2.5" : "gap-2 px-3 py-2"
            }`}
            title={isCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={16} className="text-signal-amber" />
            ) : (
              <>
                <PanelLeftClose size={16} />
                <span>Ocultar barra lateral</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
