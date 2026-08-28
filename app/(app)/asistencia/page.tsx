import Link from "next/link";
import { SEED_ASISTENCIA } from "@/lib/data/asistencia";
import { ESTADO_ASISTENCIA_LABELS, EstadoAsistencia, RegistroAsistencia, TIPO_EVENTO_LABELS } from "@/lib/types/asistencia";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";

const ESTADO_TO_STATUS: Record<EstadoAsistencia, "activo" | "pendiente" | "critico"> = {
  presente: "activo",
  tardanza: "pendiente",
  ausente: "critico",
};

const columns: Column<RegistroAsistencia>[] = [
  {
    header: "Persona",
    accessor: "personaNombre",
    render: (v, row) => (
      <Link href={`/personas/${row.personaId}`} className="hover:text-radar-cyan">
        {v as string}
      </Link>
    ),
  },
  { header: "Evento", accessor: "evento" },
  {
    header: "Tipo",
    accessor: "tipoEvento",
    render: (v) => <span>{TIPO_EVENTO_LABELS[v as RegistroAsistencia["tipoEvento"]]}</span>,
  },
  {
    header: "Fecha",
    accessor: "fecha",
    render: (v) => (
      <span className="font-[family-name:var(--font-mono)] text-xs">
        {new Date(v as string).toLocaleDateString("es-CO")}
      </span>
    ),
  },
  {
    header: "Estado",
    accessor: "estado",
    render: (v) => (
      <StatusBadge status={ESTADO_TO_STATUS[v as EstadoAsistencia]}>
        {ESTADO_ASISTENCIA_LABELS[v as EstadoAsistencia]}
      </StatusBadge>
    ),
  },
];

export default function AsistenciaPage() {
  const presentes = SEED_ASISTENCIA.filter((a) => a.estado === "presente").length;
  const total = SEED_ASISTENCIA.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Asistencia
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Registro de asistencia a capacitaciones, reuniones y turnos.
        </p>
      </div>

      <div className="max-w-[200px]">
        <StatCard label="Asistencia" value={`${presentes}/${total}`} accent="green" />
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={SEED_ASISTENCIA} />
      </Card>

      <p className="text-xs text-fog-400">
        Datos de ejemplo (seed) — pendiente conectar a base de datos real.
      </p>
    </div>
  );
}
