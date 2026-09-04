import React from "react";

type Status = "activo" | "pendiente" | "critico" | "cerrado" | "info";

const STYLES: Record<Status, string> = {
  activo: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  pendiente: "bg-amber-50 text-amber-800 border-amber-200/80",
  critico: "bg-rose-50 text-rose-700 border-rose-200/80",
  cerrado: "bg-slate-100 text-slate-600 border-slate-200/80",
  info: "bg-sky-50 text-sky-700 border-sky-200/80",
};

const DOT: Record<Status, string> = {
  activo: "bg-emerald-500",
  pendiente: "bg-amber-500",
  critico: "bg-rose-500",
  cerrado: "bg-slate-400",
  info: "bg-sky-500",
};

export function StatusBadge({
  status,
  children,
}: {
  status: Status;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {children}
    </span>
  );
}
