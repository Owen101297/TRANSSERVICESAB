import { TurnoRotativo, TURNO_LABELS } from "@/lib/types/asignacion";

export function TurnoTag({ turno }: { turno: TurnoRotativo }) {
  return (
    <span className="inline-flex items-center rounded border border-radar-cyan/30 bg-radar-cyan-dim px-2 py-0.5 text-xs text-radar-cyan">
      {TURNO_LABELS[turno]}
    </span>
  );
}
