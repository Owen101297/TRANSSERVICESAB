import { AlertTriangle, TrendingUp, Users } from "lucide-react";
import { SEED_VEHICULOS } from "@/lib/data/vehiculos";
import { SEED_ASIGNACIONES } from "@/lib/data/asignaciones";
import { SEED_HALLAZGOS } from "@/lib/data/hallazgos";
import { getEstadoDocumento } from "@/lib/types/vehiculo";
import { Card } from "@/components/ui/Card";

export default function IntelligencePage() {
  const vehiculosConRiesgoDocumental = SEED_VEHICULOS.filter((v) =>
    Object.values(v.documentos).some((f) => {
      const e = getEstadoDocumento(f);
      return e === "vencido" || e === "proximo";
    })
  );

  const conductoresEnDescanso = SEED_ASIGNACIONES.filter(
    (a) => a.estado === "programada"
  ).length;

  const hallazgosCriticosAbiertos = SEED_HALLAZGOS.filter(
    (h) => h.severidad === "critica" && h.estado !== "cerrado"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Intelligence
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Insights cruzados entre módulos — calculados en vivo a partir de los
          datos ya cargados en el sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-fog-400">
            <AlertTriangle size={16} />
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
            <Users size={16} />
            <span className="font-mono text-[11px] uppercase tracking-wider">Rotación</span>
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
            <TrendingUp size={16} />
            <span className="font-mono text-[11px] uppercase tracking-wider">HSEQ crítico</span>
          </div>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-alert-red">
            {hallazgosCriticosAbiertos.length}
          </p>
          <p className="mt-1 text-xs text-mist-200">
            hallazgo(s) de severidad crítica sin cerrar.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
          Próximos pasos para este módulo
        </h2>
        <p className="mt-3 text-sm text-fog-400">
          Con backend conectado, este espacio puede evolucionar a predicciones
          reales (probabilidad de siniestro por ruta, mantenimiento predictivo,
          vencimientos proyectados) en vez de solo agregaciones en vivo como
          las de arriba.
        </p>
      </Card>
    </div>
  );
}
