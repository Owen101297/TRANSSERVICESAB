import Link from "next/link";
import { Plus } from "lucide-react";
import { SEED_CONTRATISTAS } from "@/lib/data/contratistas";
import { SEED_VEHICULOS } from "@/lib/data/vehiculos";
import { SEED_PERSONAS } from "@/lib/data/personas";
import {
  Contratista,
  ESTADO_CONTRATISTA_LABELS,
  EstadoContratista,
  TIPO_OPERACION_LABELS,
} from "@/lib/types/contratista";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";

const ESTADO_TO_STATUS: Record<EstadoContratista, "activo" | "cerrado"> = {
  activo: "activo",
  inactivo: "cerrado",
};

function contarVehiculos(contratistaId: string) {
  return SEED_VEHICULOS.filter((v) => v.contratistaId === contratistaId).length;
}

function contarConductores(contratistaId: string) {
  return SEED_PERSONAS.filter((p) => p.contratistaId === contratistaId).length;
}

export default function ContratistasPage() {
  const total = SEED_CONTRATISTAS.length;
  const activos = SEED_CONTRATISTAS.filter((c) => c.estado === "activo").length;
  const rotativos = SEED_CONTRATISTAS.filter((c) => c.tipoOperacion === "rotativa").length;

  const columns: Column<Contratista>[] = [
    {
      header: "Contratista",
      accessor: "nombre",
      render: (v, row) => (
        <Link
          href={`/contratistas/${row.id}`}
          className="font-medium text-paper-50 hover:text-radar-cyan"
        >
          {v as string}
        </Link>
      ),
    },
    {
      header: "NIT",
      accessor: "nit",
      className: "font-[family-name:var(--font-mono)] text-xs",
    },
    {
      header: "Operación",
      accessor: "tipoOperacion",
      render: (v) => <span>{TIPO_OPERACION_LABELS[v as Contratista["tipoOperacion"]]}</span>,
    },
    {
      header: "Vehículos",
      accessor: "id",
      render: (v) => <span>{contarVehiculos(v as string)}</span>,
    },
    {
      header: "Conductores",
      accessor: "id",
      render: (v) => <span>{contarConductores(v as string)}</span>,
    },
    {
      header: "Estado",
      accessor: "estado",
      render: (v) => (
        <StatusBadge status={ESTADO_TO_STATUS[v as EstadoContratista]}>
          {ESTADO_CONTRATISTA_LABELS[v as EstadoContratista]}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Contratistas
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Empresas vinculadas — vehículos, conductores y contratos.
          </p>
        </div>
        <Link href="/contratistas/nuevo">
          <Button variant="primary">
            <Plus size={16} /> Nuevo contratista
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <StatCard label="Total" value={total} accent="cyan" />
        <StatCard label="Activos" value={activos} accent="green" />
        <StatCard label="Con rotación" value={rotativos} accent="amber" />
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={SEED_CONTRATISTAS} />
      </Card>

      <p className="text-xs text-fog-400">
        Datos de ejemplo (seed) — reemplaza cada contratista con su información
        real desde su ficha, o agrégalos de nuevo con &quot;Nuevo contratista&quot;.
      </p>
    </div>
  );
}
