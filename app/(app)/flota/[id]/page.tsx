import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users2 } from "lucide-react";
import { getVehiculoByIdDb } from "@/lib/services/vehiculos.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import {
  ESTADO_VEHICULO_LABELS,
  EstadoVehiculo,
  SERVICIO_LABELS,
  TIPO_LABELS,
} from "@/lib/types/vehiculo";
import { ESTADO_ASIGNACION_LABELS, EstadoAsignacion } from "@/lib/types/asignacion";
import { Card } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocExpiryBadge } from "@/components/ui/DocExpiryBadge";
import { TurnoTag } from "@/components/ui/TurnoTag";
import { EditVehiculoTrigger } from "@/components/flota/EditVehiculoTrigger";

const ESTADO_TO_STATUS: Record<EstadoVehiculo, "activo" | "pendiente" | "cerrado"> = {
  activo: "activo",
  mantenimiento: "pendiente",
  inactivo: "cerrado",
};

const ESTADO_ASIG_TO_STATUS: Record<EstadoAsignacion, "activo" | "pendiente" | "cerrado"> = {
  activa: "activo",
  programada: "pendiente",
  finalizada: "cerrado",
};

export default async function VehiculoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehiculo = await getVehiculoByIdDb(id);
  if (!vehiculo) notFound();

  const allAsignaciones = await getAsignacionesDb();
  const historial = allAsignaciones.filter((a) => a.vehiculoId === id);
  const activa = historial.find((a) => a.estado === "activa");

  return (
    <div className="space-y-6">
      <Link
        href="/flota"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Flota
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Columna izquierda: identidad del vehículo */}
        <Card className="lg:w-80 shrink-0">
          <div className="flex flex-col items-center text-center">
            <PlateTag plate={vehiculo.placa} />
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
              {vehiculo.marca} {vehiculo.modelo}
            </h1>
            <p className="mt-1 text-sm text-fog-400">
              {TIPO_LABELS[vehiculo.tipo]} · {vehiculo.anio}
            </p>
            <div className="mt-3">
              <StatusBadge status={ESTADO_TO_STATUS[vehiculo.estado]}>
                {ESTADO_VEHICULO_LABELS[vehiculo.estado]}
              </StatusBadge>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-line-600 pt-4 text-sm">
            <Row label="Capacidad" value={`${vehiculo.capacidad} pasajeros`} />
            <Row label="Servicio" value={SERVICIO_LABELS[vehiculo.servicio]} />
            <Row label="Contratista" value={vehiculo.contratistaNombre} />
          </div>

          <EditVehiculoTrigger vehiculo={vehiculo} />
        </Card>

        {/* Columna derecha */}
        <div className="flex-1 space-y-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users2 size={17} className="text-fog-400" />
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  Conductor asignado
                </h2>
              </div>
              <Link href="/asignaciones" className="text-xs text-radar-cyan hover:underline">
                Ver módulo Asignaciones
              </Link>
            </div>
            {activa ? (
              <div className="flex items-center gap-3">
                <Link
                  href={`/personas/${activa.conductorId}`}
                  className="text-sm text-radar-cyan hover:underline"
                >
                  {activa.conductorNombre}
                </Link>
                {activa.tipoAsignacion === "rotativa" && activa.turno && (
                  <TurnoTag turno={activa.turno} />
                )}
              </div>
            ) : (
              <p className="text-sm text-fog-400">Sin conductor asignado actualmente.</p>
            )}

            {historial.length > 0 && (
              <div className="mt-5 border-t border-line-600 pt-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fog-400">
                  Historial de conductores
                </p>
                <ul className="space-y-2">
                  {historial.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-md border border-line-600 bg-asphalt-800/50 px-3 py-2 text-sm"
                    >
                      <div>
                        <Link
                          href={`/personas/${a.conductorId}`}
                          className="text-mist-200 hover:text-radar-cyan"
                        >
                          {a.conductorNombre}
                        </Link>
                        <p className="text-xs text-fog-400">
                          {new Date(a.fechaInicio).toLocaleDateString("es-CO")}
                          {a.fechaFin && ` → ${new Date(a.fechaFin).toLocaleDateString("es-CO")}`}
                        </p>
                      </div>
                      <StatusBadge status={ESTADO_ASIG_TO_STATUS[a.estado]}>
                        {ESTADO_ASIGNACION_LABELS[a.estado]}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
              Documentos
            </h2>
            <div className="space-y-2">
              <DocExpiryBadge
                label="SOAT"
                vencimientoISO={vehiculo.documentos.soatVencimiento}
              />
              <DocExpiryBadge
                label="RTM (Revisión Técnico-Mecánica)"
                vencimientoISO={vehiculo.documentos.rtmVencimiento}
              />
              <DocExpiryBadge
                label="Póliza de responsabilidad civil"
                vencimientoISO={vehiculo.documentos.polizaVencimiento}
              />
            </div>
          </Card>

          <Card>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
              Mantenimiento e inspecciones
            </h2>
            <p className="mt-3 text-sm text-fog-400">
              Pendiente conectar al módulo Mantenimiento — historial de
              preoperacionales, hallazgos, lavado, aseo, extintor, llantas.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-fog-400">{label}</span>
      <span className="text-mist-200">{value}</span>
    </div>
  );
}
