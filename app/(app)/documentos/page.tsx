import Link from "next/link";
import { getDocumentosDb } from "@/lib/services/documentos.service";
import { CATEGORIA_LABELS, Documento } from "@/lib/types/documento";
import { getEstadoDocumento } from "@/lib/types/vehiculo";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";

function estadoDeDocumento(doc: Documento): "vigente" | "proximo" | "vencido" | "sin_vencimiento" {
  if (!doc.fechaVencimiento) return "sin_vencimiento";
  return getEstadoDocumento(doc.fechaVencimiento);
}

const ESTADO_TO_STATUS = {
  vigente: "activo",
  proximo: "pendiente",
  vencido: "critico",
  sin_vencimiento: "cerrado",
} as const;

const ESTADO_LABEL = {
  vigente: "Vigente",
  proximo: "Por vencer",
  vencido: "Vencido",
  sin_vencimiento: "Sin vencimiento",
};

const columns: Column<Documento>[] = [
  {
    header: "Documento",
    accessor: "nombre",
    render: (v) => <span className="text-paper-50 font-medium">{v as string}</span>,
  },
  {
    header: "Categoría",
    accessor: "categoria",
    render: (v) => <span>{CATEGORIA_LABELS[v as Documento["categoria"]]}</span>,
  },
  {
    header: "Relacionado con",
    accessor: "entidadNombre",
    render: (v, row) => (
      <Link href={row.entidadHref} className="hover:text-radar-cyan text-radar-cyan/90 font-mono text-xs">
        {v as string}
      </Link>
    ),
  },
  {
    header: "Vencimiento",
    accessor: "fechaVencimiento",
    render: (v) => (
      <span className="font-[family-name:var(--font-mono)] text-xs">
        {v ? new Date(v as string).toLocaleDateString("es-CO") : "—"}
      </span>
    ),
  },
  {
    header: "Estado",
    accessor: "id",
    render: (_v, row) => {
      const estado = estadoDeDocumento(row);
      return <StatusBadge status={ESTADO_TO_STATUS[estado]}>{ESTADO_LABEL[estado]}</StatusBadge>;
    },
  },
];

export const dynamic = "force-dynamic";

export default async function DocumentosPage() {
  const documentos = await getDocumentosDb();
  const total = documentos.length;
  const vencidos = documentos.filter((d) => estadoDeDocumento(d) === "vencido").length;
  const proximos = documentos.filter((d) => estadoDeDocumento(d) === "proximo").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Repositorio Documental Centralizado
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Visibilidad transversal de expedientes de personas, vehículos, contratistas y permisos empresariales.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <StatCard label="Total documentos" value={total} accent="cyan" />
        <StatCard label="Por vencer (30 días)" value={proximos} accent="amber" />
        <StatCard label="Vencidos" value={vencidos} accent="amber" />
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={documentos} emptyMessage="No hay documentos registrados." />
      </Card>

      <p className="text-xs text-fog-400">
        Información consolidada en vivo a partir de los expedientes de Flota, Personas y Contratistas.
      </p>
    </div>
  );
}
