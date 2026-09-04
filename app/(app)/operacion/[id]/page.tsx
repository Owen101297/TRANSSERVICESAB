import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { getViajeByIdDb } from "@/lib/services/operacion.service";
import { ESTADO_VIAJE_LABELS, EstadoViaje } from "@/lib/types/viaje";
import { Card } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ViajeActions } from "@/components/operacion/ViajeActions";
import { formatFechaHora } from "@/lib/utils/formatters";

const ESTADO_TO_STATUS: Record<EstadoViaje, "activo" | "pendiente" | "cerrado" | "critico"> = {
  en_curso: "activo",
  programado: "pendiente",
  finalizado: "cerrado",
  con_novedad: "critico",
};

export default async function ViajeDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  let id = "";
  try {
    const resolved = await props.params;
    id = resolved?.id || "";
  } catch (e) {
    console.warn("Aviso resolviendo params en ViajeDetailPage:", e);
  }

  if (!id) notFound();

  const viaje = await getViajeByIdDb(id);
  if (!viaje) notFound();

  const activo = viaje.estado !== "finalizado";

  return (
    <div className="space-y-6">
      <Link
        href="/operacion"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={15} /> Volver a Operación
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="lg:w-96 shrink-0 shadow-apple-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={17} className="text-slate-400" />
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-slate-900">
                {viaje.origen} → {viaje.destino}
              </h1>
            </div>
            <StatusBadge status={ESTADO_TO_STATUS[viaje.estado] || "pendiente"}>
              {ESTADO_VIAJE_LABELS[viaje.estado] || viaje.estado}
            </StatusBadge>
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <Row label="Vehículo">
              <Link href={`/flota/${viaje.vehiculoId}`}>
                <PlateTag plate={viaje.placa} />
              </Link>
            </Row>
            <Row label="Conductor">
              <Link
                href={`/personas/${viaje.conductorId}`}
                className="text-sky-600 hover:underline font-semibold"
              >
                {viaje.conductorNombre}
              </Link>
            </Row>
            <Row label="Salida">
              <span className="font-mono text-xs text-slate-700">
                {formatFechaHora(viaje.fechaSalida)}
              </span>
            </Row>
            <Row label="Duración est.">
              <span className="font-mono text-xs text-slate-700">
                {viaje.duracionEstimadaHoras} horas
              </span>
            </Row>
            {viaje.fuecCodigo && (
              <Row label="FUEC">
                <span className="font-mono text-xs text-sky-600 font-semibold">
                  {viaje.fuecCodigo}
                </span>
              </Row>
            )}
          </div>
        </Card>

        <div className="flex-1 space-y-4">
          <Card className="shadow-apple-sm">
            <h2 className="font-semibold text-slate-900">Novedades en Ruta</h2>
            <div className="mt-3 space-y-2">
              {viaje.novedades && viaje.novedades.length > 0 ? (
                viaje.novedades.map((n, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-amber-200/80 bg-amber-50 text-amber-900 text-xs font-medium"
                  >
                    <p>{n.descripcion}</p>
                    <p className="font-mono text-[10px] text-amber-600 mt-1">
                      {formatFechaHora(n.fecha)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Sin novedades reportadas en este servicio.</p>
              )}
            </div>
          </Card>

          {activo && <ViajeActions viajeId={viaje.id} />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-xs">{label}</span>
      <div>{children}</div>
    </div>
  );
}
