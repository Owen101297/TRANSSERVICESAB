import Link from "next/link";
import { ClipboardCheck, AlertTriangle, MapPin } from "lucide-react";
import { getPersonaById } from "@/lib/data/personas";
import { getAsignacionActiva } from "@/lib/data/asignaciones";
import { SEED_VIAJES } from "@/lib/data/viajes";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { PlateTag } from "@/components/ui/PlateTag";
import { TurnoTag } from "@/components/ui/TurnoTag";
import { StatusBadge } from "@/components/ui/StatusBadge";

// Conductor de ejemplo — cuando haya autenticación real, esto vendrá de la
// sesión del usuario en lugar de un id fijo.
const CONDUCTOR_ID = "p1";

export default function PortalConductorHome() {
  const persona = getPersonaById(CONDUCTOR_ID);
  const asignacion = getAsignacionActiva(CONDUCTOR_ID);
  const viajeActivo = SEED_VIAJES.find(
    (v) => v.conductorId === CONDUCTOR_ID && (v.estado === "en_curso" || v.estado === "con_novedad")
  );

  if (!persona) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar initials={persona.fotoIniciales} size="md" />
        <div>
          <p className="text-sm text-fog-400">Hola,</p>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
            {persona.nombres}
          </h1>
        </div>
      </div>

      <Card>
        <p className="font-mono text-[10px] uppercase tracking-wider text-fog-400">
          Mi asignación actual
        </p>
        {asignacion ? (
          <div className="mt-2 flex items-center gap-3">
            <PlateTag plate={asignacion.placa} />
            {asignacion.tipoAsignacion === "fija" ? (
              <span className="text-sm text-mist-200">Asignación fija</span>
            ) : (
              asignacion.turno && <TurnoTag turno={asignacion.turno} />
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-fog-400">Sin asignación activa.</p>
        )}
      </Card>

      {viajeActivo && (
        <Card className="border-radar-cyan/40">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-radar-cyan" />
            <p className="font-mono text-[10px] uppercase tracking-wider text-fog-400">
              Viaje en curso
            </p>
          </div>
          <p className="mt-2 text-sm text-paper-50">
            {viajeActivo.origen} → {viajeActivo.destino}
          </p>
          {viajeActivo.novedades.length > 0 && (
            <StatusBadge status="critico">
              {viajeActivo.novedades.length} novedad(es)
            </StatusBadge>
          )}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/portal-conductor/preoperacional"
          className="flex flex-col items-center gap-2 rounded-lg border border-line-600 bg-asphalt-900 p-5 hover:bg-asphalt-800"
        >
          <ClipboardCheck size={24} className="text-radar-cyan" />
          <span className="text-sm text-paper-50">Preoperacional</span>
        </Link>
        <Link
          href="/portal-conductor/novedad"
          className="flex flex-col items-center gap-2 rounded-lg border border-line-600 bg-asphalt-900 p-5 hover:bg-asphalt-800"
        >
          <AlertTriangle size={24} className="text-signal-amber" />
          <span className="text-sm text-paper-50">Reportar novedad</span>
        </Link>
      </div>
    </div>
  );
}
