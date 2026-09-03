import Link from "next/link";
import { getAsistenciasDb } from "@/lib/services/capacitaciones.service";
import { ESTADO_ASISTENCIA_LABELS, EstadoAsistencia, RegistroAsistencia, TIPO_EVENTO_LABELS } from "@/lib/types/asistencia";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExternalLink, PenTool, Printer } from "lucide-react";

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
      <Link href={`/personas/${row.personaId}`} className="hover:text-radar-cyan font-medium text-paper-50 transition-colors">
        {v as string}
      </Link>
    ),
  },
  { 
    header: "Evento / Capacitación", 
    accessor: "evento",
    render: (v) => <span className="font-medium text-mist-200">{v as string}</span>
  },
  {
    header: "Tipo",
    accessor: "tipoEvento",
    render: (v) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-asphalt-800 text-mist-200 border border-line-600">
        {TIPO_EVENTO_LABELS[v as RegistroAsistencia["tipoEvento"]] || (v as string)}
      </span>
    ),
  },
  {
    header: "Fecha",
    accessor: "fecha",
    render: (v) => (
      <span className="font-[family-name:var(--font-mono)] text-xs text-fog-400">
        {v ? new Date(v as string).toLocaleDateString("es-CO") : "—"}
      </span>
    ),
  },
  {
    header: "Hora",
    accessor: "horaLlegada",
    render: (v) => (
      <span className="font-[family-name:var(--font-mono)] text-xs text-mist-200">
        {(v as string) || "—"}
      </span>
    ),
  },
  {
    header: "Estado",
    accessor: "estado",
    render: (v) => (
      <StatusBadge status={ESTADO_TO_STATUS[v as EstadoAsistencia] || "activo"}>
        {ESTADO_ASISTENCIA_LABELS[v as EstadoAsistencia] || (v as string)}
      </StatusBadge>
    ),
  },
];

export const dynamic = "force-dynamic";

export default async function AsistenciaPage() {
  const asistencias = await getAsistenciasDb();
  const presentes = asistencias.filter((a) => a.estado === "presente").length;
  const total = asistencias.length;
  const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50 tracking-wide">
            Control y Registro de Asistencia (TH-FOR-03)
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Módulo centralizado para la gestión de firmas, capacitaciones, charlas de 5 min y comités del SG-SST / PESV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/apps/asistencia"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-signal-amber hover:bg-amber-400 text-asphalt-950 font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <PenTool className="w-4 h-4" />
            <span>Toma de Firmas Móvil</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>

          <a
            href="/apps/asistencia/admin.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 border border-line-500 font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-radar-cyan" />
            <span>Generador de Actas TH-FOR-03</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Asistencias" value={total.toString()} accent="cyan" />
        <StatCard label="Participantes Presentes" value={`${presentes}/${total}`} accent="green" />
        <StatCard label="Tasa de Cumplimiento" value={`${porcentaje}%`} accent="amber" />
      </div>

      {/* Tabla Maestra de Registros */}
      <Card className="p-0 overflow-hidden border-line-600 bg-asphalt-900 shadow-xl">
        <div className="p-4 border-b border-line-600 flex items-center justify-between bg-asphalt-950/40">
          <div>
            <h2 className="text-sm font-bold text-paper-50 uppercase tracking-wider font-[family-name:var(--font-mono)]">
              Registros Consolidados
            </h2>
            <p className="text-xs text-fog-400">Firmas y participaciones sincronizadas en tiempo real desde campo.</p>
          </div>
          <span className="text-xs font-mono text-fog-400">{total} registros</span>
        </div>

        <DataTable columns={columns} data={asistencias} emptyMessage="No hay registros de asistencia en la base de datos." />
      </Card>
    </div>
  );
}
