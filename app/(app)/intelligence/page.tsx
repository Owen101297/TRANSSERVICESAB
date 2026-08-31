import { AlertTriangle, TrendingUp, Users } from "lucide-react";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import { getHallazgosDb } from "@/lib/services/hseq.service";
import { getEstadoDocumento } from "@/lib/types/vehiculo";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const [vehiculos, asignaciones, hallazgos] = await Promise.all([
    getVehiculosDb(),
    getAsignacionesDb(),
    getHallazgosDb(),
  ]);

  const vehiculosConRiesgoDocumental = vehiculos.filter((v) =>
    Object.values(v.documentos).some((f) => {
      const e = getEstadoDocumento(f);
      return e === "vencido" || e === "proximo";
    })
  );

  const conductoresEnDescanso = asignaciones.filter(
    (a) => a.estado === "programada"
  ).length;

  const hallazgosCriticosAbiertos = hallazgos.filter(
    (h) => (h.severidad === "critica" || h.severidad === "alta") && h.estado !== "cerrado"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Intelligence & Analítica Predictiva
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Insights cruzados entre flota, asignaciones, novedades y HSEQ calculados en tiempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-fog-400">
            <AlertTriangle size={16} className="text-signal-amber" />
            <span className="font-mono text-[11px] uppercase tracking-wider">Riesgo documental</span>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-signal-amber">
            {vehiculosConRiesgoDocumental.length}
          </p>
          <p className="mt-1 text-xs text-mist-200">
            vehículos con SOAT/RTM/póliza vencido o por vencer en 30 días.
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-fog-400">
            <Users size={16} className="text-radar-cyan" />
            <span className="font-mono text-[11px] uppercase tracking-wider">Rotación & Fatiga</span>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-radar-cyan">
            {conductoresEnDescanso}
          </p>
          <p className="mt-1 text-xs text-mist-200">
            conductor(es) con turno programado tras su ciclo de descanso.
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-fog-400">
            <TrendingUp size={16} className="text-alert-red" />
            <span className="font-mono text-[11px] uppercase tracking-wider">HSEQ Crítico</span>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-alert-red">
            {hallazgosCriticosAbiertos.length}
          </p>
          <p className="mt-1 text-xs text-mist-200">
            hallazgo(s) de severidad alta/crítica sin cerrar.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
          Diagnóstico y Proyecciones de Seguridad Operativa
        </h2>
        <p className="mt-3 text-sm text-mist-200">
          La correlación de datos en tiempo real entre el preoperacional móvil, las alertas de vencimiento y el plan de acción HSEQ garantiza la trazabilidad exigida por la Resolución 40595 de 2022 y la Supertransporte.
        </p>
      </Card>
    </div>
  );
}

