"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Droplets,
  Sparkles,
  ShieldAlert,
  HeartPulse,
  ClipboardList,
  GraduationCap,
  CheckSquare,
  FileSpreadsheet,
} from "lucide-react";

interface HseqTab {
  id: string;
  label: string;
  shortLabel?: string;
  href: string;
  icon: React.ElementType;
}

const HSEQ_TABS: HseqTab[] = [
  { id: "lavado", label: "Lavado de Flota", shortLabel: "Lavado", href: "/lavado", icon: Droplets },
  { id: "aseo", label: "Aseo & Desinfección", shortLabel: "Aseo", href: "/aseo", icon: Sparkles },
  { id: "extintores", label: "Extintores", href: "/extintores", icon: ShieldAlert },
  { id: "botiquines", label: "Botiquines", href: "/botiquines", icon: HeartPulse },
  { id: "preoperacionales", label: "Preoperacionales", href: "/hseq/preoperacionales", icon: ClipboardList },
  { id: "capacitaciones", label: "Capacitaciones", href: "/capacitaciones", icon: GraduationCap },
  { id: "asistencia", label: "Asistencia", href: "/asistencia", icon: CheckSquare },
  { id: "encuestas", label: "Encuestas PESV", shortLabel: "Encuestas", href: "/encuestas", icon: FileSpreadsheet },
];

export function HseqSubNav({ activeTab }: { activeTab?: string }) {
  const pathname = usePathname();

  return (
    <div className="w-full overflow-x-auto pb-1 scrollbar-none">
      <nav className="inline-flex items-center gap-1 p-1 rounded-2xl bg-asphalt-900/90 border border-line-600/80 backdrop-blur-xl shadow-sm min-w-full sm:min-w-0">
        {HSEQ_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab ? activeTab === tab.id : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all duration-150 whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-asphalt-950 text-paper-50 font-bold border border-line-500 shadow-sm"
                  : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-800/60 font-medium"
              }`}
            >
              <Icon
                size={14}
                className={isActive ? "text-signal-amber stroke-[2.2]" : "text-fog-400"}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
