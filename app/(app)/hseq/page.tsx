import Link from "next/link";
import { Plus, ShieldAlert, CheckCircle2, AlertTriangle, ClipboardList } from "lucide-react";
import { getHallazgosDb } from "@/lib/services/hseq.service";
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

const ESTADO_TO_STATUS: Record<string, "activo" | "pendiente" | "cerrado"> = {
  abierto: "pendiente",
  en_proceso: "pendiente",
  cerrado: "cerrado",
};

const SEVERIDAD_TO_STATUS: Record<string, "activo" | "pendiente" | "critico"> = {
  baja: "activo",
  media: "pendiente",
  alta: "pendiente",
  critica: "critico",
};

const columns: Column<Hallazgo>[] = [
  {
    header: "Hallazgo / No Conformidad",
    accessor: "titulo",
    render: (v, row) => (
      <Link href={`/hseq/${row.id}`} className="font-semibold text-slate-900 hover:text-sky-600 transition-colors">
        {String(v || "Hallazgo")}
      </Link>
    ),
  },
  {
    header: "Origen",
    accessor: "origen",
    render: (v) => {
      const orig = (v as Hallazgo["origen"]) || "inspeccion";
      const label = ORIGEN_LABELS[orig] || String(v || "Inspección");
      return <span className="text-xs font-medium text-slate-600">{label}</span>;
    },
  },
  {
    header: "Vehículo",
    accessor: "placa",
    render: (v) => (v ? <PlateTag plate={String(v)} /> : <span className="text-slate-400 font-mono text-xs">—</span>),
  },
  {
    header: "Severidad",
    accessor: "severidad",
    render: (v) => {
      const sev = (v as SeveridadHallazgo) || "media";
      const status = SEVERIDAD_TO_STATUS[sev] || "pendiente";
      const label = SEVERIDAD_LABELS[sev] || String(v || "Media");
      return <StatusBadge status={status}>{label}</StatusBadge>;
    },
  },
  {
    header: "Responsable Asignado",
    accessor: "responsable",
    render: (v) => <span className="text-xs text-slate-700 font-medium">{String(v || "HSEQ")}</span>,
  },
  {
    header: "Fecha Reporte",
    accessor: "fechaReporte",
    render: (v) => <span className="text-xs font-mono text-slate-500">{String(v || "—")}</span>,
  },
  {
    header: "Estado",
    accessor: "estado",
    render: (v) => {
      const est = (v as EstadoHallazgo) || "abierto";
      const status = ESTADO_TO_STATUS[est] || "pendiente";
      const label = ESTADO_HALLAZGO_LABELS[est] || String(v || "Abierto");
      return <StatusBadge status={status}>{label}</StatusBadge>;
    },
  },
];

export const dynamic = "force-dynamic";

export default async function HSEQPage(props: {
  searchParams?: Promise<{ estado?: string }>;
}) {
  let tab = "todos";
  try {
    if (props.searchParams) {
      const resolved = await props.searchParams;
      if (resolved && resolved.estado) {
        tab = resolved.estado;
      }
    }
  } catch (e) {
    console.warn("Aviso resolviendo searchParams en HSEQ:", e);
    tab = "todos";
  }

  let allHallazgos: Hallazgo[] = [];
  try {
    const res = await getHallazgosDb();
    if (Array.isArray(res)) {
      allHallazgos = res;
    }
  } catch (e) {
    console.error("Error cargando hallazgos HSEQ:", e);
    allHallazgos = [];
  }

  const abiertos = allHallazgos.filter((h) => h?.estado !== "cerrado");
  const cerrados = allHallazgos.filter((h) => h?.estado === "cerrado");
  const criticos = allHallazgos.filter((h) => h?.severidad === "critica" && h?.estado !== "cerrado");

  const dataPorTab: Record<string, Hallazgo[]> = {
    todos: allHallazgos,
    abiertos,
    criticos,
    cerrados,
  };

  const displayData = dataPorTab[tab] ?? allHallazgos;

  return (
    <div className="space-y-6">
      {/* ── ENCABEZADO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert size={13} />
            <span>SG-SST & SEGURIDAD VIAL (PESV)</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            HSEQ · Calidad y Seguridad
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestión de hallazgos, inspecciones, incidentes y acciones correctivas con trazabilidad en vivo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/hseq/preoperacionales">
            <Button variant="outline" className="flex items-center gap-2 text-xs">
              <ClipboardList size={15} />
              <span>Ver Preoperacionales</span>
            </Button>
          </Link>
          <Link href="/hseq/nuevo">
            <Button variant="primary" className="flex items-center gap-2 shadow-apple-sm">
              <Plus size={16} />
              <span>Reportar Hallazgo</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── TARJETAS DE MÉTRICAS (APPLE STYLE) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Hallazgos"
          value={allHallazgos.length}
          subtitle="Histórico consolidado"
          icon={<ShieldAlert size={18} />}
          accent="cyan"
        />
        <StatCard
          label="Abiertos / En Proceso"
          value={abiertos.length}
          subtitle="Pendientes de cierre"
          icon={<AlertTriangle size={18} />}
          accent="amber"
        />
        <StatCard
          label="Críticos Activos"
          value={criticos.length}
          subtitle="Atención prioritaria"
          icon={<AlertTriangle size={18} />}
          accent="red"
        />
        <StatCard
          label="Cerrados / Resueltos"
          value={cerrados.length}
          subtitle="Acción implementada"
          icon={<CheckCircle2 size={18} />}
          accent="green"
        />
      </div>

      {/* ── SELECTOR DE PESTAÑAS ── */}
      <div className="flex items-center gap-1 border-b border-slate-200/80 pb-px">
        <Link
          href="/hseq?estado=todos"
          className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
            tab === "todos"
              ? "border-sky-600 text-sky-600 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Todos ({allHallazgos.length})
        </Link>
        <Link
          href="/hseq?estado=abiertos"
          className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
            tab === "abiertos"
              ? "border-amber-500 text-amber-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Abiertos ({abiertos.length})
        </Link>
        <Link
          href="/hseq?estado=criticos"
          className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
            tab === "criticos"
              ? "border-rose-500 text-rose-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Críticos ({criticos.length})
        </Link>
        <Link
          href="/hseq?estado=cerrados"
          className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
            tab === "cerrados"
              ? "border-emerald-500 text-emerald-700 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Cerrados ({cerrados.length})
        </Link>
      </div>

      {/* ── TABLA DE DATOS ── */}
      <Card className="p-0 overflow-hidden shadow-apple-sm">
        <DataTable
          columns={columns}
          data={displayData}
          emptyMessage="No se encontraron hallazgos registrados en esta categoría."
        />
      </Card>

      <p className="text-xs text-slate-400 font-medium">
        Trazabilidad continua y ciclo PHVA para auditorías del Ministerio de Transporte, Supertransporte y MinTrabajo.
      </p>
    </div>
  );
}
