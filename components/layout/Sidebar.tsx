"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  History,
  ChevronDown,
  ShieldAlert,
  CalendarCheck,
  CalendarOff,
  FileSpreadsheet,
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
  history: History,
  "shield-alert": ShieldAlert,
  "calendar-check": CalendarCheck,
  "calendar-off": CalendarOff,
  "file-spreadsheet": FileSpreadsheet,
};

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const isPathActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  const activeParents = NAV_GROUPS.flatMap((group) =>
    group.items.filter((item) => item.children?.some((child) => isPathActive(child.href))).map((item) => item.id)
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set(activeParents));

  useEffect(() => {
    if (activeParents.length === 0) return;
    setExpandedItems((current) => {
      const next = new Set(current);
      activeParents.forEach((id) => next.add(id));
      return next;
    });
  }, [pathname]);

  function toggleItem(id: string) {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
                const hasChildren = Boolean(item.children?.length);
                const activeChildHref = hasChildren
                  ? item.children!
                      .filter((child) => isPathActive(child.href))
                      .sort((left, right) => right.href.length - left.href.length)[0]?.href
                  : undefined;
                const active = hasChildren ? Boolean(activeChildHref) : isPathActive(item.href);
                const expanded = expandedItems.has(item.id);
                return (
                  <li key={item.id}>
                    {hasChildren && !isCollapsed ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          aria-expanded={expanded}
                          aria-controls={`sidebar-${item.id}`}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-all duration-150 ${active ? "bg-slate-100 font-bold text-slate-950 ring-1 ring-slate-200/80" : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
                        >
                          <Icon size={17} className={`shrink-0 ${active ? "text-slate-950 stroke-[2.5]" : "text-slate-400"}`} />
                          <span className="min-w-0 flex-1 truncate leading-tight">{item.label}</span>
                          <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
                        </button>
                        {expanded && (
                          <ul id={`sidebar-${item.id}`} className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-2">
                            {item.children!.map((child) => {
                              const ChildIcon = ICONS[child.icon] ?? CheckSquare;
                              const childActive = child.href === activeChildHref;
                              return (
                                <li key={child.id}>
                                  <Link
                                    href={child.href}
                                    aria-current={childActive ? "page" : undefined}
                                    className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] transition-colors ${childActive ? "bg-sky-50 font-bold text-sky-800" : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                                  >
                                    <ChildIcon size={14} className={`shrink-0 ${childActive ? "text-sky-700" : "text-slate-400"}`} />
                                    <span className="leading-tight">{child.label}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        title={isCollapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center rounded-xl text-xs transition-all duration-150 ${isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"} ${active ? "border border-slate-200/80 bg-slate-100 font-bold text-slate-950 shadow-xs" : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
                      >
                        <Icon size={17} className={`shrink-0 ${active ? "text-slate-950 stroke-[2.5]" : "text-slate-400"}`} />
                        {!isCollapsed && <span className="truncate leading-tight">{item.label}</span>}
                      </Link>
                    )}
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
