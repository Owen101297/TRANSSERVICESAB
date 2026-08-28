import Link from "next/link";
import { Plus } from "lucide-react";
import { SEED_ENCUESTAS } from "@/lib/data/encuestas";
import { Encuesta, TIPO_ENCUESTA_LABELS } from "@/lib/types/encuesta";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";

const columns: Column<Encuesta>[] = [
  { header: "Encuesta", accessor: "titulo" },
  {
    header: "Tipo",
    accessor: "tipo",
    render: (v) => <span>{TIPO_ENCUESTA_LABELS[v as Encuesta["tipo"]]}</span>,
  },
  {
    header: "Creada",
    accessor: "fechaCreacion",
    render: (v) => (
      <span className="font-[family-name:var(--font-mono)] text-xs">
        {new Date(v as string).toLocaleDateString("es-CO")}
      </span>
    ),
  },
  {
    header: "Respuestas",
    accessor: "respuestasCount",
    render: (v, row) => <span>{v as number}/{row.destinatariosEsperados}</span>,
  },
  {
    header: "Estado",
    accessor: "estado",
    render: (v) => (
      <StatusBadge status={v === "activa" ? "activo" : "cerrado"}>
        {v === "activa" ? "Activa" : "Cerrada"}
      </StatusBadge>
    ),
  },
];

export default function EncuestasPage() {
  const activas = SEED_ENCUESTAS.filter((e) => e.estado === "activa").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Encuestas
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Satisfacción, clima laboral, percepción de seguridad vial y SG-SST.
          </p>
        </div>
        <Link href="/encuestas/nueva">
          <Button variant="primary">
            <Plus size={16} /> Nueva encuesta
          </Button>
        </Link>
      </div>

      <div className="max-w-[180px]">
        <StatCard label="Activas" value={activas} accent="green" />
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={SEED_ENCUESTAS} />
      </Card>

      <p className="text-xs text-fog-400">
        Datos de ejemplo (seed) — pendiente conectar a base de datos real.
      </p>
    </div>
  );
}
