import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, ShieldCheck, Gauge, Award, QrCode, ExternalLink } from "lucide-react";
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
  const riskInputs = (viaje.riskInputs as any) || {};
  const score = viaje.riskScore ?? 0;
  const isHighRisk = score >= 24;
  const isMedRisk = score >= 16 && score < 24;
  const riskLevel = viaje.riskLevel || (isHighRisk ? "ALTO" : (isMedRisk ? "MEDIO" : "BAJO"));

  const kmSalida = riskInputs.kmSalida != null ? riskInputs.kmSalida : null;
  const kmLlegada = riskInputs.kmLlegada != null ? riskInputs.kmLlegada : null;
  const kmRecorridos = (kmSalida != null && kmLlegada != null && kmLlegada >= kmSalida) ? (kmLlegada - kmSalida) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/operacion"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={15} /> Volver a Operación
        </Link>
        <Link
          href={`/verificar/viaje/${viaje.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl transition-colors"
        >
          <QrCode size={14} /> Ver Verificación QR Oficial <ExternalLink size={12} />
        </Link>
      </div>

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
                {formatFechaHora(viaje.fechaSalida)} {viaje.horaSalida ? `(${viaje.horaSalida})` : ''}
              </span>
            </Row>
            <Row label="Llegada">
              <span className="font-mono text-xs text-slate-700">
                {viaje.fechaLlegadaReal ? formatFechaHora(viaje.fechaLlegadaReal) : (viaje.horaLlegada || 'En curso')}
              </span>
            </Row>
            <Row label="Duración est.">
              <span className="font-mono text-xs text-slate-700">
                {viaje.duracionEstimadaHoras} horas
              </span>
            </Row>
            {viaje.distanciaKm && (
              <Row label="Distancia">
                <span className="font-mono text-xs text-slate-700 font-semibold">
                  {viaje.distanciaKm} km
                </span>
              </Row>
            )}
            {riskInputs.origenDivipola && (
              <Row label="DIVIPOLA">
                <span className="font-mono text-xs text-slate-600">
                  {riskInputs.origenDivipola} → {riskInputs.destinoDivipola || '—'}
                </span>
              </Row>
            )}
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
          {/* Tarjeta de Matriz de Riesgo y Odómetros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-apple-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Award size={16} className="text-purple-600" /> Matriz de Riesgo (STE-F-010)
                </h2>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                  isHighRisk ? 'bg-red-100 text-red-800' : isMedRisk ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Riesgo {riskLevel}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mb-1">
                {score} <span className="text-xs font-normal text-slate-500">Puntos</span>
              </div>
              <p className="text-xs text-slate-500">
                {isHighRisk ? 'Requiere autorización expresa de Gerencia General.' :
                 isMedRisk ? 'Requiere medidas de mitigación y visto bueno HSEQ.' :
                 'Autorización normal de despacho.'}
              </p>
            </Card>

            <Card className="shadow-apple-sm">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
                <Gauge size={16} className="text-emerald-600" /> Control de Odómetro
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">KM Salida</span>
                  <span className="font-mono font-bold text-slate-800">{kmSalida ? `${kmSalida} km` : '—'}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">KM Llegada</span>
                  <span className="font-mono font-bold text-slate-800">{kmLlegada ? `${kmLlegada} km` : '—'}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Recorridos</span>
                  <span className="font-mono font-bold text-emerald-600">{kmRecorridos ? `${kmRecorridos} km` : '—'}</span>
                </div>
              </div>
            </Card>
          </div>

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
