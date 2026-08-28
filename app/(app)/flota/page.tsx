import Link from "next/link";
import { Plus } from "lucide-react";
import { SEED_VEHICULOS } from "@/lib/data/vehiculos";
import { getHistorialPorVehiculo } from "@/lib/data/asignaciones";
import {
  ESTADO_VEHICULO_LABELS,
  EstadoVehiculo,
  SERVICIO_LABELS,
  TIPO_LABELS,
  Vehiculo,
  getEstadoDocumento,
} from "@/lib/types/vehiculo";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";

const ESTADO_TO_STATUS: Record<EstadoVehiculo, "activo" | "pendiente" | "cerrado"> = {
  activo: "activo",
  mantenimiento: "pendiente",
  inactivo: "cerrado",
};

export default function FlotaPage() {
  const total = SEED_VEHICULOS.length;
  const activos = SEED_VEHICULOS.filter((v) => v.estado === "activo").length;
  const contratistas = new Set(SEED_VEHICULOS.map((v) => v.contratistaId)).size;
  const documentosCriticos = SEED_VEHICULOS.filter((v) => {
    const estados = Object.values(v.documentos).map(getEstadoDocumento);
    return estados.includes("vencido") || estados.includes("proximo");
  }).length;

  const columns: Column<Vehiculo>[] = [
    {
      header: "Placa",
      accessor: "placa",
      render: (v, row) => (
        <Link href={`/flota/${row.id}`}>
          <PlateTag plate={v as string} />
        </Link>
      ),
    },
    {
      header: "Vehículo",
      accessor: "marca",
      render: (_v, row) => (
        <div>
          <p className="text-paper-50">
            {row.marca} {row.modelo}
          </p>
          <p className="text-xs text-fog-400">
            {TIPO_LABELS[row.tipo]} · {row.anio} · {row.capacidad} pas.
          </p>
        </div>
      ),
    },
    {
      header: "Servicio",
      accessor: "servicio",
      render: (v) => <span>{SERVICIO_LABELS[v as Vehiculo["servicio"]]}</span>,
    },
    {
      header: "Contratista",
      accessor: "contratistaNombre",
    },
    {
      header: "Conductor",
      accessor: "id",
      render: (v) => {
        const activa = getHistorialPorVehiculo(v as string).find((a) => a.estado === "activa");
        return <span>{activa ? activa.conductorNombre : "Sin asignar"}</span>;
      },
    },
    {
      header: "Documentos",
      accessor: "documentos",
      render: (_v, row) => {
        const estados = Object.values(row.documentos).map(getEstadoDocumento);
        if (estados.includes("vencido"))
          return <StatusBadge status="critico">Vencido</StatusBadge>;
        if (estados.includes("proximo"))
          return <StatusBadge status="pendiente">Por vencer</StatusBadge>;
        return <StatusBadge status="activo">Al día</StatusBadge>;
      },
    },
    {
      header: "Estado",
      accessor: "estado",
      render: (v) => (
        <StatusBadge status={ESTADO_TO_STATUS[v as EstadoVehiculo]}>
          {ESTADO_VEHICULO_LABELS[v as EstadoVehiculo]}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Flota
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Vehículos, documentos y estado operativo.
          </p>
        </div>
        <Link href="/flota/nuevo">
          <Button variant="primary">
            <Plus size={16} /> Nuevo vehículo
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-2xl">
        <StatCard label="Vehículos" value={total} accent="cyan" />
        <StatCard label="Activos" value={activos} accent="green" />
        <StatCard label="Contratistas" value={contratistas} accent="cyan" />
        <StatCard label="Doc. por revisar" value={documentosCriticos} accent="amber" />
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={SEED_VEHICULOS} />
      </Card>

      <p className="text-xs text-fog-400">
        Datos de ejemplo (seed) — pendiente conectar a base de datos real.
      </p>
    </div>
  );
}
