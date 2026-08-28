import Link from "next/link";
import { Plus } from "lucide-react";
import { SEED_HALLAZGOS } from "@/lib/data/hallazgos";
import {
  ESTADO_HALLAZGO_LABELS,
  EstadoHallazgo,
  Hallazgo,
  ORIGEN_LABELS,
  SEVERIDAD_LABELS,
  SeveridadHallazgo,
} from "@/lib/types/hseq";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";

const ESTADO_TO_STATUS: Record<EstadoHallazgo, "activo" | "pendiente" | "cerrado"> = {
  abierto: "pendiente",
  en_proceso: "pendiente",
  cerrado: "cerrado",
};

const SEVERIDAD_TO_STATUS: Record<SeveridadHallazgo, "activo" | "pendiente" | "critico"> = {
  baja: "activo",
  media: "pendiente",
  alta: "pendiente",
  critica: "critico",
};

const columns: Column<Hallazgo>[] = [
  {
    header: "Hallazgo",
    accessor: "titulo",
    render: (v, row) => (
      <Link href={`/hseq/${row.id}`} className="font-medium text-paper-50 hover:text-radar-cyan">
        {v as string}
      </Link>
    ),
  },
  {
    header: "Origen",
    accessor: "origen",
    render: (v) => <span>{ORIGEN_LABELS[v as Hallazgo["origen"]]}</span>,
  },
  {
    header: "Vehículo",
    accessor: "placa",
    render: (v) => (v ? <PlateTag plate={v as string} /> : <span className="text-fog-400">—</span>),
  },
  {
    header: "Severidad",
    accessor: "severidad",
    render: (v) => (
      <StatusBadge status={SEVERIDAD_TO_STATUS[v as SeveridadHallazgo]}>
        {SEVERIDAD_LABELS[v as SeveridadHallazgo]}
      </StatusBadge>
    ),
  },
  {
    header: "Responsable",
    accessor: "responsable",
  },
  {
    header: "Estado",
    accessor: "estado",
    render: (v) => (
      <StatusBadge status={ESTADO_TO_STATUS[v as EstadoHallazgo]}>
        {ESTADO_HALLAZGO_LABELS[v as EstadoHallazgo]}
      </StatusBadge>
    ),
  },
];

export default async function HSEQPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const tab = estado ?? "abiertos";

  const abiertos = SEED_HALLAZGOS.filter((h) => h.estado !== "cerrado");
  const cerrados = SEED_HALLAZGOS.filter((h) => h.estado === "cerrado");
  const criticos = SEED_HALLAZGOS.filter((h) => h.severidad === "critica" && h.estado !== "cerrado");

  const dataPorTab: Record<string, Hallazgo[]> = {
    abiertos,
    cerrados,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            HSEQ
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Hallazgos, inspecciones, incidentes y acciones correctivas.
          </p>
        </div>
        <Link href="/hseq/nuevo">
          <Button variant="primary">
            <Plus size={16} /> Reportar hallazgo
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <StatCard label="Abiertos" value={abiertos.length} accent="amber" />
        <StatCard label="Críticos activos" value={criticos.length} accent="amber" />
        <StatCard label="Cerrados" value={cerrados.length} accent="green" />
      </div>

      <div className="flex gap-1 border-b border-line-600">
        <Link
          href="/hseq?estado=abiertos"
          className={`border-b-2 px-4 py-2 text-sm transition-colors ${
            tab === "abiertos"
              ? "border-signal-amber text-paper-50 font-medium"
              : "border-transparent text-fog-400 hover:text-mist-200"
          }`}
        >
          Abiertos <span className="text-xs text-fog-400">({abiertos.length})</span>
        </Link>
        <Link
          href="/hseq?estado=cerrados"
          className={`border-b-2 px-4 py-2 text-sm transition-colors ${
            tab === "cerrados"
              ? "border-signal-amber text-paper-50 font-medium"
              : "border-transparent text-fog-400 hover:text-mist-200"
          }`}
        >
          Cerrados <span className="text-xs text-fog-400">({cerrados.length})</span>
        </Link>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={dataPorTab[tab] ?? abiertos} />
      </Card>

      <p className="text-xs text-fog-400">
        Datos de ejemplo (seed) — pendiente conectar a base de datos real.
      </p>
    </div>
  );
}
