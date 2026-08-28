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
  type LucideIcon,
} from "lucide-react";
import { NAV_GROUPS } from "@/lib/modules";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  building: Building2,
  truck: Truck,
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
  smartphone: Smartphone,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-line-600 bg-asphalt-900">
      <div className="flex h-16 items-center gap-2 border-b border-line-600 px-5">
        <div className="h-2 w-2 rounded-full bg-signal-amber" />
        <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-paper-50">
          A&amp;B OS
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            {group.label && (
              <p className="mb-2 px-2 font-mono text-[10px] font-medium uppercase tracking-wider text-fog-400">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? Home;
                const active = pathname === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-asphalt-700 text-paper-50 font-medium"
                          : "text-mist-200 hover:bg-asphalt-800 hover:text-paper-50"
                      }`}
                    >
                      <Icon
                        size={17}
                        className={active ? "text-signal-amber" : "text-fog-400"}
                      />
                      {item.label}
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-signal-amber" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="route-line-h mx-3" />
      <div className="p-3">
        <p className="px-2 py-2 font-mono text-[10px] text-fog-400">
          TRANSSERVICES A&amp;B · v0.1.0
        </p>
      </div>
    </aside>
  );
}
