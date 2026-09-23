"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarCheck, GraduationCap, ListChecks, UserRound, Workflow } from "lucide-react";

const NAV = [
  { href: "/portal-conductor?vista=hoy", view: "hoy", label: "Hoy", icon: CalendarCheck },
  { href: "/portal-conductor?vista=jornada", view: "jornada", label: "Jornada", icon: Workflow },
  { href: "/portal-conductor?vista=tareas", view: "tareas", label: "Tareas", icon: ListChecks },
  { href: "/portal-conductor/capacitaciones", view: "formacion", label: "Formación", icon: GraduationCap },
  { href: "/portal-conductor?vista=perfil", view: "perfil", label: "Perfil", icon: UserRound },
] as const;

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusedFlow = pathname.endsWith("/turno") || pathname.endsWith("/preoperacional");
  const currentView = pathname.endsWith("/capacitaciones") ? "formacion" : searchParams.get("vista") || "hoy";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {children}
      {!focusedFlow && (
        <nav aria-label="Navegación principal del portal" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mx-auto grid max-w-xl grid-cols-5 px-1">
            {NAV.map((item) => {
              const active = currentView === item.view;
              return (
                <Link
                  key={item.view}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors ${active ? "text-blue-700" : "text-slate-500 hover:text-slate-900"}`}
                >
                  <item.icon size={21} strokeWidth={active ? 2.5 : 2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
