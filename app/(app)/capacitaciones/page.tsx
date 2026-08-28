import Link from "next/link";
import { Plus } from "lucide-react";
import { SEED_CAPACITACIONES } from "@/lib/data/capacitaciones";
import {
  Capacitacion,
  ESTADO_CAPACITACION_LABELS,
  EstadoCapacitacion,
  TIPO_CAPACITACION_LABELS,
} from "@/lib/types/capacitacion";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";

const ESTADO_TO_STATUS: Record<EstadoCapacitacion, "activo" | "pendiente" | "cerrado"> = {
  programada: "pendiente",
  realizada: "activo",
  cancelada: "cerrado",
};

const columns: Column<Capacitacion>[] = [
  { header: "Capacitación", accessor: "nombre" },
  {
    header: "Tipo",
    accessor: "tipo",
    render: (v) => <span>{TIPO_CAPACITACION_LABELS[v as Capacitacion["tipo"]]}</span>,
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
    header: "Duración",
    accessor: "duracionHoras",
    render: (v) => <span>{v as number}h</span>,
  },
  {
    header: "Asistencia",
    accessor: "asistentesReales",
    render: (v, row) => (
      <span>
        {v !== undefined ? `${v}/${row.asistentesEsperados}` : `— /${row.asistentesEsperados}`}
      </span>
    ),
  },
  {
    header: "Estado",
    accessor: "estado",
    render: (v) => (
      <StatusBadge status={ESTADO_TO_STATUS[v as EstadoCapacitacion]}>
        {ESTADO_CAPACITACION_LABELS[v as EstadoCapacitacion]}
      </StatusBadge>
    ),
  },
];

export default function CapacitacionesPage() {
  const programadas = SEED_CAPACITACIONES.filter((c) => c.estado === "programada").length;
  const realizadas = SEED_CAPACITACIONES.filter((c) => c.estado === "realizada").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Capacitaciones
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Formación en SG-SST, PESV, HSEQ y temas operativos.
          </p>
        </div>
        <Link href="/capacitaciones/nueva">
          <Button variant="primary">
            <Plus size={16} /> Programar capacitación
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <StatCard label="Programadas" value={programadas} accent="amber" />
        <StatCard label="Realizadas" value={realizadas} accent="green" />
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={SEED_CAPACITACIONES} />
      </Card>

      <p className="text-xs text-fog-400">
        Datos de ejemplo (seed) — pendiente conectar a base de datos real.
      </p>
    </div>
  );
}
