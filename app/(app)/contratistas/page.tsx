import Link from "next/link";
import { Plus } from "lucide-react";
import { getContratistasDb } from "@/lib/services/contratistas.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
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

export default async function ContratistasPage() {
  const contratistas = await getContratistasDb();
  const vehiculos = await getVehiculosDb();
  const personas = await getPersonasDb();

  const total = contratistas.length;
  const activos = contratistas.filter((c) => c.estado === "activo").length;
  const rotativos = contratistas.filter((c) => c.tipoOperacion === "rotativa").length;

  const contarVehiculos = (contratistaId: string) => {
    return vehiculos.filter((v) => v.contratistaId === contratistaId).length;
  };

  const contarConductores = (contratistaId: string) => {
    return personas.filter((p) => p.contratistaId === contratistaId).length;
  };

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
        <DataTable columns={columns} data={contratistas} />
      </Card>

      <p className="text-xs text-fog-400">
        Gestión de aliados estratégicos y monitoreo de contratos de operación.
      </p>
    </div>
  );
}

