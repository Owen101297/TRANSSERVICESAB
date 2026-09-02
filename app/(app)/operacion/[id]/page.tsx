import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Clock, AlertTriangle } from "lucide-react";
import { getViajeByIdDb } from "@/lib/services/operacion.service";
import { ESTADO_VIAJE_LABELS, EstadoViaje } from "@/lib/types/viaje";
import { Card } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViajeActions } from "@/components/operacion/ViajeActions";

const ESTADO_TO_STATUS: Record<EstadoViaje, "activo" | "pendiente" | "cerrado" | "critico"> = {
  en_curso: "activo",
  programado: "pendiente",
  finalizado: "cerrado",
  con_novedad: "critico",
};

function formatFechaHora(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ViajeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viaje = await getViajeByIdDb(id);
  if (!viaje) notFound();

  const activo = viaje.estado !== "finalizado";

  return (
    <div className="space-y-6">
      <Link
        href="/operacion"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Operación
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="lg:w-96 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={17} className="text-fog-400" />
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
                {viaje.origen} → {viaje.destino}
              </h1>
            </div>
            <StatusBadge status={ESTADO_TO_STATUS[viaje.estado]}>
              {ESTADO_VIAJE_LABELS[viaje.estado]}
            </StatusBadge>
          </div>

          <div className="mt-5 space-y-3 border-t border-line-600 pt-4 text-sm">
            <Row label="Conductor">
              <Link
                href={`/personas/${viaje.conductorId}`}
                className="text-radar-cyan hover:underline font-medium"
              >
                {viaje.conductorNombre}
              </Link>
            </Row>
            <Row label="Vehículo">
              <Link href={`/flota/${viaje.vehiculoId}`}>
                <PlateTag plate={viaje.placa} />
              </Link>
            </Row>
            <Row label="Contratista">
              <span className="text-mist-200">{viaje.contratistaNombre}</span>
            </Row>
            <Row label="Salida">
              <span className="text-mist-200">{formatFechaHora(viaje.fechaSalida)}</span>
            </Row>
            <Row label="Duración estimada">
              <span className="text-mist-200">{viaje.duracionEstimadaHoras}h</span>
            </Row>
            {viaje.fechaLlegadaReal && (
              <Row label="Llegada real">
                <span className="text-mist-200">{formatFechaHora(viaje.fechaLlegadaReal)}</span>
              </Row>
            )}
          </div>

          {activo && <ViajeActions viajeId={viaje.id} />}
        </Card>

        <div className="flex-1 space-y-6">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={17} className="text-fog-400" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                Novedades ({viaje.novedades.length})
              </h2>
            </div>
            {viaje.novedades.length === 0 ? (
              <p className="text-sm text-fog-400">Sin novedades registradas en este viaje.</p>
            ) : (
              <ul className="space-y-2">
                {viaje.novedades.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-md border border-signal-amber/30 bg-signal-amber-dim px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-xs text-fog-400">
                      <Clock size={12} />
                      {formatFechaHora(n.fecha)}
                    </div>
                    <p className="mt-1 text-sm text-paper-50">{n.descripcion}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
              Trazabilidad
            </h2>
            <p className="mt-3 text-sm text-fog-400">
              Pendiente conectar al módulo Auditoría — quién registró el viaje,
              quién registró cada novedad, y hora exacta de finalización.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-fog-400">{label}</span>
      {children}
    </div>
  );
}
