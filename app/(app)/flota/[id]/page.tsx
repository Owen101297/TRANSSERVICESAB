import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users2, ShieldAlert } from "lucide-react";
import {
  getVehiculoByIdDb,
  getAdjuntosVehiculoDb,
} from "@/lib/services/vehiculos.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import { getEventosGPSDb } from "@/lib/services/gps.service";
import {
  ESTADO_VEHICULO_LABELS,
  EstadoVehiculo,
  SERVICIO_LABELS,
  TIPO_LABELS,
} from "@/lib/types/vehiculo";
import { Card } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EditVehiculoTrigger } from "@/components/flota/EditVehiculoTrigger";
import { VehiculoDetailTabs } from "@/components/flota/VehiculoDetailTabs";

const ESTADO_TO_STATUS: Record<EstadoVehiculo, "activo" | "pendiente" | "cerrado"> = {
  activo: "activo",
  mantenimiento: "pendiente",
  inactivo: "cerrado",
};

export const dynamic = "force-dynamic";

export default async function VehiculoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehiculo = await getVehiculoByIdDb(id);
  if (!vehiculo) notFound();

  const allAsignaciones = await getAsignacionesDb();
  const historial = allAsignaciones.filter((a) => a.vehiculoId === id || a.placa === vehiculo.placa);
  const activa = historial.find((a) => a.estado === "activa");

  const adjuntos = await getAdjuntosVehiculoDb(id);
  const eventosGps = await getEventosGPSDb({ placa: vehiculo.placa });

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <Link
        href="/flota"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50 transition-colors"
      >
        <ArrowLeft size={15} /> Volver a Flota
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Columna Izquierda: Identidad del Vehículo */}
        <Card className="lg:w-80 shrink-0 self-start space-y-4">
          <div className="flex flex-col items-center text-center">
            <PlateTag plate={vehiculo.placa} />
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
              {vehiculo.marca} {vehiculo.modelo}
            </h1>
            <p className="mt-1 text-xs text-fog-400 font-mono">
              {TIPO_LABELS[vehiculo.tipo]} · Año {vehiculo.anio}
            </p>
            <div className="mt-3">
              <StatusBadge status={ESTADO_TO_STATUS[vehiculo.estado]}>
                {ESTADO_VEHICULO_LABELS[vehiculo.estado]}
              </StatusBadge>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-line-600 pt-4 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-fog-400">Capacidad:</span>
              <span className="text-paper-50 font-semibold">{vehiculo.capacidad} pasajeros</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fog-400">Modalidad:</span>
              <span className="text-paper-50 font-semibold">{SERVICIO_LABELS[vehiculo.servicio]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fog-400">Contratista:</span>
              <span className="text-radar-cyan font-semibold text-right max-w-[140px] truncate" title={vehiculo.contratistaNombre}>
                {vehiculo.contratistaNombre}
              </span>
            </div>
          </div>

          <div className="border-t border-line-600 pt-3">
            <EditVehiculoTrigger vehiculo={vehiculo} />
          </div>
        </Card>

        {/* Columna Derecha: Matriz 360° con Pestañas */}
        <div className="flex-1 min-w-0">
          <VehiculoDetailTabs
            vehiculo={vehiculo}
            adjuntosIniciales={adjuntos}
            asignacionActiva={activa}
            eventosGps={eventosGps}
          />
        </div>
      </div>
    </div>
  );
}
