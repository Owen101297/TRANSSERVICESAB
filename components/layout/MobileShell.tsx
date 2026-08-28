import Link from "next/link";
import { Home, ClipboardCheck, AlertTriangle, User } from "lucide-react";

const NAV = [
  { href: "/portal-conductor", label: "Inicio", icon: Home },
  { href: "/portal-conductor/preoperacional", label: "Preoperacional", icon: ClipboardCheck },
  { href: "/portal-conductor/novedad", label: "Novedad", icon: AlertTriangle },
  { href: "/personas/p1", label: "Perfil", icon: User },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-col bg-asphalt-950">
      <header className="flex h-14 shrink-0 items-center justify-center border-b border-line-600 bg-asphalt-900">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-signal-amber" />
          <span className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
            A&amp;B OS · Conductor
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-2">{children}</main>

      <nav className="grid shrink-0 grid-cols-4 border-t border-line-600 bg-asphalt-900">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 py-2.5 text-fog-400 hover:text-paper-50"
          >
            <item.icon size={20} />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
