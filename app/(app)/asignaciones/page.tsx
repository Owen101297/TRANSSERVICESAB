import Link from "next/link";
import { Plus } from "lucide-react";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { AsignacionesActions } from "@/components/asignaciones/AsignacionesActions";
import {
  Asignacion,
  ESTADO_ASIGNACION_LABELS,
  EstadoAsignacion,
} from "@/lib/types/asignacion";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { TurnoTag } from "@/components/ui/TurnoTag";
import { evaluarAptitudConductor } from "@/lib/types/persona";

const ESTADO_TO_STATUS: Record<EstadoAsignacion, "activo" | "pendiente" | "cerrado"> = {
  activa: "activo",
  programada: "pendiente",
  finalizada: "cerrado",
};

function formatFecha(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO");
}

export const dynamic = "force-dynamic";

export default async function AsignacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const tab = (estado as EstadoAsignacion) ?? "activa";

  const allAsignaciones = await getAsignacionesDb();
  const allPersonas = await getPersonasDb();
  const allVehiculos = await getVehiculosDb();

  const activas = allAsignaciones.filter((a) => a.estado === "activa");
  const programadas = allAsignaciones.filter((a) => a.estado === "programada");
  const finalizadas = allAsignaciones.filter((a) => a.estado === "finalizada");

  const dataPorTab: Record<EstadoAsignacion, Asignacion[]> = {
    activa: activas,
    programada: programadas,
    finalizada: finalizadas,
  };

  const tabs: { key: EstadoAsignacion; label: string; count: number }[] = [
    { key: "activa", label: "Activas", count: activas.length },
    { key: "programada", label: "Programadas", count: programadas.length },
    { key: "finalizada", label: "Historial", count: finalizadas.length },
  ];

  const columns: Column<Asignacion>[] = [
    {
      header: "Conductor",
      accessor: "conductorNombre",
      render: (v, row) => (
        <Link href={`/personas/${row.conductorId}`} className="hover:text-radar-cyan font-medium">
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
      header: "Contratista",
      accessor: "contratistaNombre",
    },
    {
      header: "Tipo",
      accessor: "tipoAsignacion",
      render: (v, row) =>
        v === "fija" ? (
          <span className="text-mist-200">Fija</span>
        ) : (
          row.turno && <TurnoTag turno={row.turno} />
        ),
    },
    {
      header: "Idoneidad",
      accessor: "conductorId",
      render: (v) => {
        const persona = allPersonas.find((p) => p.id === v);
        if (!persona) return <span className="text-fog-400">—</span>;
        const aptitud = evaluarAptitudConductor(persona);
        if (aptitud.nivel === "optimo") {
          return <StatusBadge status="activo">Al día</StatusBadge>;
        }
        if (aptitud.nivel === "advertencia") {
          return <StatusBadge status="pendiente">Novedad</StatusBadge>;
        }
        return <StatusBadge status="critico">Revisar</StatusBadge>;
      },
    },
    {
      header: "Vigencia",
      accessor: "fechaInicio",
      render: (v, row) => (
        <span className="font-[family-name:var(--font-mono)] text-xs">
          {formatFecha(v as string)} → {formatFecha(row.fechaFin)}
        </span>
      ),
    },
    {
      header: "Estado",
      accessor: "estado",
      render: (v) => (
        <StatusBadge status={ESTADO_TO_STATUS[v as EstadoAsignacion]}>
          {ESTADO_ASIGNACION_LABELS[v as EstadoAsignacion]}
        </StatusBadge>
      ),
    },
  ];

  const conductoresList = allPersonas
    .filter((p) => p.perfiles?.includes("conductor"))
    .map((p) => ({
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      numeroDocumento: p.numeroDocumento,
      contratistaNombre: p.contratistaNombre,
    }));

  const vehiculosList = allVehiculos.map((v) => ({
    id: v.id,
    placa: v.placa,
    marca: v.marca,
    modelo: v.modelo,
    contratistaNombre: v.contratistaNombre,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Asignaciones
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Conductor ↔ Vehículo ↔ Contratista. Asignación inmediata y control de flota.
          </p>
        </div>
        <AsignacionesActions
          conductores={conductoresList}
          vehiculos={vehiculosList}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <StatCard label="Activas" value={activas.length} accent="green" />
        <StatCard label="Programadas" value={programadas.length} accent="amber" />
        <StatCard label="En historial" value={finalizadas.length} accent="cyan" />
      </div>

      <div className="flex gap-1 border-b border-line-600">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/asignaciones?estado=${t.key}`}
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
          data={dataPorTab[tab]}
          emptyMessage="No hay asignaciones en este estado."
        />
      </Card>

      <p className="text-xs text-fog-400">
        Datos de ejemplo (seed) — pendiente conectar a base de datos real.
      </p>
    </div>
  );
}
