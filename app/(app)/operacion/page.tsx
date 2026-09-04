import Link from "next/link";
import { Plus } from "lucide-react";
import { getViajesDb } from "@/lib/services/operacion.service";
import { getFuecsDb, getContratosTransporteDb } from "@/lib/services/fuec.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { ESTADO_VIAJE_LABELS, EstadoViaje, Viaje } from "@/lib/types/viaje";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { FuecTrigger } from "@/components/operacion/FuecTrigger";
import { formatFechaHora } from "@/lib/utils/formatters";

function mapEstadoToStatus(estado?: string): "activo" | "pendiente" | "cerrado" | "critico" {
  const e = (estado || "").toLowerCase();
  if (e.includes("curso") || e.includes("autorizado")) return "activo";
  if (e.includes("pendiente") || e.includes("programado")) return "pendiente";
  if (e.includes("novedad") || e.includes("critico") || e.includes("alto")) return "critico";
  return "cerrado";
}

function getEstadoLabel(estado?: string): string {
  if (!estado) return "En curso";
  const mapped: Record<string, string> = {
    en_curso: "En curso",
    programado: "Programado",
    finalizado: "Finalizado",
    con_novedad: "Con novedad",
    pendiente: "Pendiente",
    pendiente_hse: "Pendiente HSE",
    autorizado: "Autorizado",
  };
  return mapped[estado.toLowerCase()] || estado;
}

const columns: Column<Viaje>[] = [
  {
    header: "Conductor",
    accessor: "conductorNombre",
    render: (v, row) => (
      <Link href={`/personas/${row.conductorId}`} className="hover:text-sky-600 font-semibold text-slate-900">
        {String(v || "Conductor")}
      </Link>
    ),
  },
  {
    header: "Vehículo",
    accessor: "placa",
    render: (v, row) => (
      <Link href={`/flota/${row.vehiculoId}`}>
        <PlateTag plate={String(v || "")} />
      </Link>
    ),
  },
  {
    header: "Ruta",
    accessor: "origen",
    render: (v, row) => (
      <span className="font-medium text-slate-700">
        {String(v || "Origen")} → {String(row.destino || "Destino")}
      </span>
    ),
  },
  {
    header: "Salida",
    accessor: "fechaSalida",
    render: (v, row) => (
      <span className="font-[family-name:var(--font-mono)] text-xs text-slate-600">
        {formatFechaHora(v as string)}
      </span>
    ),
  },
  {
    header: "Duración est.",
    accessor: "duracionEstimadaHoras",
    render: (v) => <span className="font-mono text-xs">{String(v ?? "—")}h</span>,
  },
  {
    header: "Novedades",
    accessor: "novedades",
    render: (v) => {
      const n = (v as Viaje["novedades"])?.length || 0;
      return n > 0 ? (
        <span className="text-amber-600 font-bold">{n}</span>
      ) : (
        <span className="text-slate-400">—</span>
      );
    },
  },
  {
    header: "Estado",
    accessor: "estado",
    render: (v, row) => (
      <Link href={`/operacion/${row.id}`}>
        <StatusBadge status={mapEstadoToStatus(v as string)}>
          {getEstadoLabel(v as string)}
        </StatusBadge>
      </Link>
    ),
  },
];

export const dynamic = "force-dynamic";

export default async function OperacionPage(props: {
  searchParams?: Promise<{ estado?: string }>;
}) {
  let tab: EstadoViaje = "en_curso";
  try {
    if (props.searchParams) {
      const resolved = await props.searchParams;
      if (resolved && resolved.estado) {
        tab = resolved.estado as EstadoViaje;
      }
    }
  } catch {
    tab = "en_curso";
  }

  const allViajes = (await getViajesDb()) || [];
  const fuecs = (await getFuecsDb()) || [];
  const contratos = (await getContratosTransporteDb()) || [];
  const vehiculos = (await getVehiculosDb()) || [];
  const personas = (await getPersonasDb()) || [];

  const enCurso = allViajes.filter((v) => {
    const e = (v?.estado || "").toLowerCase();
    return e !== "finalizado" && e !== "completado" && e !== "programado";
  });
  const programados = allViajes.filter((v) => {
    const e = (v?.estado || "").toLowerCase();
    return e === "programado";
  });
  const finalizados = allViajes.filter((v) => {
    const e = (v?.estado || "").toLowerCase();
    return e === "finalizado" || e === "completado";
  });

  const dataPorTab: Record<string, Viaje[]> = {
    en_curso: enCurso,
    programado: programados,
    finalizado: finalizados,
  };

  const tabs = [
    { key: "en_curso", label: "En Curso / Activos", count: enCurso.length },
    { key: "programado", label: "Programados", count: programados.length },
    { key: "finalizado", label: "Historial", count: finalizados.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">
            Operación · Viajes & FUECs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestión de rutas intermunicipales, novedades en carretera y extractos de contrato.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FuecTrigger
            fuecs={fuecs}
            contratos={contratos}
            vehiculos={vehiculos}
            conductores={personas}
          />
          <Link href="/operacion/nuevo">
            <Button variant="primary" className="shadow-apple-sm">
              <Plus size={16} /> Registrar viaje
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <StatCard label="Activos" value={enCurso.length} accent="green" />
        <StatCard label="Programados" value={programados.length} accent="amber" />
        <StatCard label="En historial" value={finalizados.length} accent="cyan" />
      </div>

      <div className="flex gap-1 border-b border-slate-200/80">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/operacion?estado=${t.key}`}
            className={`border-b-2 px-4 py-2 text-xs sm:text-sm transition-colors ${
              tab === t.key
                ? "border-sky-600 text-sky-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label} <span className="text-xs text-slate-400">({t.count})</span>
          </Link>
        ))}
      </div>

      <Card className="p-0 overflow-hidden shadow-apple-sm">
        <DataTable
          columns={columns}
          data={dataPorTab[tab] ?? enCurso}
          emptyMessage="No hay viajes en este estado."
        />
      </Card>

      <p className="text-xs text-slate-400 font-medium">
        Trazabilidad de servicios especiales, control de tiempos de viaje y soporte FUEC oficial.
      </p>
    </div>
  );
}
