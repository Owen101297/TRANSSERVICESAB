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
      className={`flex h-full shrink-0 flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[72px]" : "w-64"
      }`}
    >
      {/* Cabecera del Sidebar */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200/80 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/brand/logo.png"
            alt="Trans Services A&B"
            className="h-10 w-10 rounded-xl object-contain bg-white p-1 border border-slate-200 shadow-xs shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 animate-fadeIn">
              <span className="font-[family-name:var(--font-display)] text-base font-extrabold tracking-tight text-slate-900 leading-tight truncate">
                TRANS SERVICES
              </span>
              <span className="text-[10px] font-mono text-amber-600 font-bold tracking-wider truncate">
                A&amp;B
              </span>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors ${
              isCollapsed ? "mx-auto mt-2 hidden" : ""
            }`}
            title={isCollapsed ? "Expandir menú lateral" : "Ocultar / Colapsar menú lateral"}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* Lista de Navegación */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-slate-200">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            {group.label && !isCollapsed ? (
              <p className="mb-2 px-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                {group.label}
              </p>
            ) : isCollapsed && group.label ? (
              <div className="h-px bg-slate-200/80 my-3 mx-2" />
            ) : null}

            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? Home;
                const active = pathname === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center rounded-xl text-xs transition-all duration-150 ${
                        isCollapsed
                          ? "justify-center p-2.5"
                          : "gap-3 px-3 py-2.5"
                      } ${
                        active
                          ? "bg-slate-100 text-slate-950 font-bold shadow-xs border border-slate-200/80"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 font-medium"
                      }`}
                    >
                      <Icon
                        size={17}
                        className={`shrink-0 ${active ? "text-slate-950 stroke-[2.5]" : "text-slate-400"}`}
                      />
                      {!isCollapsed && (
                        <span className="truncate leading-tight">{item.label}</span>
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
      <div className="border-t border-slate-200/80 p-3">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100/80 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors"
        >
          {isCollapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <>
              <PanelLeftClose size={16} />
              <span className="truncate">Colapsar menú</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
