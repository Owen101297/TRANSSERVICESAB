import Link from "next/link";
import { ClipboardCheck, AlertTriangle, MapPin, CheckCircle2, Clock } from "lucide-react";
import { getPortalConductorInfo } from "@/lib/services/portal-conductor.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { PlateTag } from "@/components/ui/PlateTag";
import { TurnoTag } from "@/components/ui/TurnoTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConductorSwitcher } from "@/components/portal/ConductorSwitcher";

export default async function PortalConductorHome({
  searchParams,
}: {
  searchParams: Promise<{ conductorId?: string }>;
}) {
  const { conductorId: queryConductorId } = await searchParams;
  const personas = await getPersonasDb();
  const conductores = personas.filter((p) => p.perfiles.includes("conductor"));
  const currentConductorId = queryConductorId || (conductores[0]?.id ?? "");

  if (!currentConductorId) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-12 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
          Portal del Conductor
        </h1>
        <p className="text-sm text-fog-400">
          No hay conductores registrados en el sistema. Agrega personal con perfil &quot;Conductor&quot; desde el módulo de Personas para acceder a las inspecciones móviles.
        </p>
      </div>
    );
  }

  const { persona, asignacionActiva, viajeActivo, preoperacionalHoy } =
    await getPortalConductorInfo(currentConductorId);

  if (!persona) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-12 text-center">
        <p className="text-sm text-fog-400">Conductor no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <ConductorSwitcher
        conductores={conductores}
        currentConductorId={currentConductorId}
      />

      <div className="flex items-center gap-3">
        <Avatar initials={persona.fotoIniciales} size="md" />
        <div>
          <p className="text-sm text-fog-400">Hola,</p>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
            {persona.nombres}
          </h1>
        </div>
      </div>

      {/* Estado del Preoperacional de Hoy */}
      <Card
        className={`border ${
          preoperacionalHoy
            ? "border-ok-green/40 bg-ok-green-dim/10"
            : "border-signal-amber/40 bg-signal-amber-dim/10"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {preoperacionalHoy ? (
              <CheckCircle2 size={18} className="text-ok-green" />
            ) : (
              <Clock size={18} className="text-signal-amber" />
            )}
            <span className="text-sm font-semibold text-paper-50">
              {preoperacionalHoy ? "Preoperacional de hoy listo" : "Preoperacional pendiente hoy"}
            </span>
          </div>
          <StatusBadge status={preoperacionalHoy ? "cerrado" : "pendiente"}>
            {preoperacionalHoy ? "Completado" : "Requerido"}
          </StatusBadge>
        </div>
      </Card>

      <Card>
        <p className="font-mono text-[10px] uppercase tracking-wider text-fog-400">
          Mi asignación actual
        </p>
        {asignacionActiva ? (
          <div className="mt-2 flex items-center gap-3">
            <PlateTag plate={asignacionActiva.placa} />
            {asignacionActiva.tipoAsignacion === "fija" ? (
              <span className="text-sm text-mist-200">Asignación fija ({asignacionActiva.contratistaNombre})</span>
            ) : (
              asignacionActiva.turno && <TurnoTag turno={asignacionActiva.turno} />
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-fog-400">Sin vehículo asignado actualmente.</p>
        )}
      </Card>

      {viajeActivo && (
        <Card className="border-radar-cyan/40 bg-radar-cyan-dim/10">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-radar-cyan" />
            <p className="font-mono text-[10px] uppercase tracking-wider text-fog-400">
              Viaje en curso
            </p>
          </div>
          <p className="mt-2 text-sm font-medium text-paper-50">
            {viajeActivo.origen} → {viajeActivo.destino}
          </p>
          {viajeActivo.novedades.length > 0 && (
            <div className="mt-2">
              <StatusBadge status="critico">
                {viajeActivo.novedades.length} novedad(es) en ruta
              </StatusBadge>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/portal-conductor/preoperacional?conductorId=${currentConductorId}`}
          className="flex flex-col items-center gap-2 rounded-lg border border-line-600 bg-asphalt-900 p-5 hover:bg-asphalt-800 transition-colors text-center"
        >
          <ClipboardCheck size={24} className="text-radar-cyan" />
          <span className="text-sm font-medium text-paper-50">Preoperacional</span>
          <span className="text-[11px] text-fog-400">Inspección diaria</span>
        </Link>
        <Link
          href={`/portal-conductor/novedad?conductorId=${currentConductorId}`}
          className="flex flex-col items-center gap-2 rounded-lg border border-line-600 bg-asphalt-900 p-5 hover:bg-asphalt-800 transition-colors text-center"
        >
          <AlertTriangle size={24} className="text-signal-amber" />
          <span className="text-sm font-medium text-paper-50">Reportar novedad</span>
          <span className="text-[11px] text-fog-400">Falla / vía / incidente</span>
        </Link>
      </div>
    </div>
  );
}

