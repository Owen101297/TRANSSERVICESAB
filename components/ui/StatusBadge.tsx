type Status = "activo" | "pendiente" | "critico" | "cerrado" | "info";

const STYLES: Record<Status, string> = {
  activo: "bg-ok-green-dim text-ok-green border-ok-green/30",
  pendiente: "bg-signal-amber-dim text-signal-amber border-signal-amber/30",
  critico: "bg-alert-red-dim text-alert-red border-alert-red/30",
  cerrado: "bg-asphalt-700 text-fog-400 border-line-600",
  info: "bg-radar-cyan-dim text-radar-cyan border-radar-cyan/30",
};

const DOT: Record<Status, string> = {
  activo: "bg-ok-green",
  pendiente: "bg-signal-amber",
  critico: "bg-alert-red",
  cerrado: "bg-fog-400",
  info: "bg-radar-cyan",
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {children}
    </span>
  );
}
