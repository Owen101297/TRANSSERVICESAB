import Link from "next/link";
import { Plus } from "lucide-react";
import { SEED_VIAJES } from "@/lib/data/viajes";
import { ESTADO_VIAJE_LABELS, EstadoViaje, Viaje } from "@/lib/types/viaje";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";

const ESTADO_TO_STATUS: Record<EstadoViaje, "activo" | "pendiente" | "cerrado" | "critico"> = {
  en_curso: "activo",
  programado: "pendiente",
  finalizado: "cerrado",
  con_novedad: "critico",
};

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const columns: Column<Viaje>[] = [
  {
    header: "Conductor",
    accessor: "conductorNombre",
    render: (v, row) => (
      <Link href={`/personas/${row.conductorId}`} className="hover:text-radar-cyan">
        {v as string}
      </Link>
    ),
  },
  {
    header: "Vehículo",
    accessor: "placa",
    render: (v, row) => (
      <Link href={`/flota/${row.vehiculoId}`}>
        <PlateTag plate={v as string} />
      </Link>
    ),
  },
  {
    header: "Ruta",
    accessor: "origen",
    render: (v, row) => (
      <span>
        {v as string} → {row.destino}
      </span>
    ),
  },
  {
    header: "Salida",
    accessor: "fechaSalida",
    render: (v) => (
      <span className="font-[family-name:var(--font-mono)] text-xs">
        {formatFechaHora(v as string)}
      </span>
    ),
  },
  {
    header: "Duración est.",
    accessor: "duracionEstimadaHoras",
    render: (v) => <span>{v as number}h</span>,
  },
  {
    header: "Novedades",
    accessor: "novedades",
    render: (v) => {
      const n = (v as Viaje["novedades"]).length;
      return n > 0 ? (
        <span className="text-signal-amber">{n}</span>
      ) : (
        <span className="text-fog-400">—</span>
      );
    },
  },
  {
    header: "Estado",
    accessor: "estado",
    render: (v, row) => (
      <Link href={`/operacion/${row.id}`}>
        <StatusBadge status={ESTADO_TO_STATUS[v as EstadoViaje]}>
          {ESTADO_VIAJE_LABELS[v as EstadoViaje]}
        </StatusBadge>
      </Link>
    ),
  },
];

export default async function OperacionPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const tab = (estado as EstadoViaje) ?? "en_curso";

  const enCurso = SEED_VIAJES.filter((v) => v.estado === "en_curso" || v.estado === "con_novedad");
  const programados = SEED_VIAJES.filter((v) => v.estado === "programado");
  const finalizados = SEED_VIAJES.filter((v) => v.estado === "finalizado");

  const dataPorTab: Record<string, Viaje[]> = {
    en_curso: enCurso,
    programado: programados,
    finalizado: finalizados,
  };

  const tabs = [
    { key: "en_curso", label: "Activos", count: enCurso.length },
    { key: "programado", label: "Programados", count: programados.length },
    { key: "finalizado", label: "Historial", count: finalizados.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Operación · Viajes
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Solo viajes fuera del municipio o de más de 2 horas. No es despacho.
          </p>
        </div>
        <Link href="/operacion/nuevo">
          <Button variant="primary">
            <Plus size={16} /> Registrar viaje
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <StatCard label="Activos" value={enCurso.length} accent="green" />
        <StatCard label="Programados" value={programados.length} accent="amber" />
        <StatCard label="En historial" value={finalizados.length} accent="cyan" />
      </div>

      <div className="flex gap-1 border-b border-line-600">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/operacion?estado=${t.key}`}
            className={`border-b-2 px-4 py-2 text-sm transition-colors ${
              tab === t.key
                ? "border-signal-amber text-paper-50 font-medium"
                : "border-transparent text-fog-400 hover:text-mist-200"
            }`}
          >
            {t.label} <span className="text-xs text-fog-400">({t.count})</span>
          </Link>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={dataPorTab[tab] ?? []}
          emptyMessage="No hay viajes en este estado."
        />
      </Card>

      <p className="text-xs text-fog-400">
        Datos de ejemplo (seed) — pendiente conectar a base de datos real.
      </p>
    </div>
  );
}
