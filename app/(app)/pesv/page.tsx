import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PASOS_PESV, getPasosPorFase } from "@/lib/data/pesv-pasos";
import { FASE_LABELS, FasePESV } from "@/lib/types/pesv";
import { Card, StatCard } from "@/components/ui/Card";

const FASES: FasePESV[] = ["planificacion", "implementacion", "seguimiento", "mejora"];

const FASE_DESC: Record<FasePESV, string> = {
  planificacion: "Líder, comité, política, diagnóstico, riesgos, objetivos.",
  implementacion: "Conductores, vehículos, infraestructura, capacitación.",
  seguimiento: "Indicadores, reporte de autogestión, auditoría anual.",
  mejora: "Acciones correctivas, preventivas y comunicación.",
};

function porcentajeCumplimiento(fase: string) {
  const pasos = getPasosPorFase(fase);
  if (pasos.length === 0) return 0;
  const cumplidos = pasos.filter((p) => p.estado === "cumple").length;
  return Math.round((cumplidos / pasos.length) * 100);
}

export default function PESVPage() {
  const total = PASOS_PESV.length;
  const cumplidos = PASOS_PESV.filter((p) => p.estado === "cumple").length;
  const avanceGlobal = Math.round((cumplidos / total) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            PESV
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Plan Estratégico de Seguridad Vial — Resolución 40595 de 2022, 4
            fases y 24 pasos bajo ciclo PHVA.
          </p>
        </div>
        <Link
          href="/pesv/indicadores"
          className="inline-flex items-center gap-2 rounded-md border border-line-600 bg-asphalt-800 px-4 py-2 text-sm text-mist-200 hover:bg-asphalt-700"
        >
          <BarChart3 size={16} /> Indicadores (VIGIA2 · Formulario 2)
        </Link>
      </div>

      <div className="rounded-lg border border-signal-amber/30 bg-signal-amber-dim p-4 text-sm text-mist-200">
        Este módulo trae la estructura general de los 24 pasos, todos en{" "}
        <span className="text-signal-amber">pendiente</span>. Entra a cada fase
        para subir tus documentos reales y actualizar el estado. Cada paso y
        cada indicador está pensado para mapear directamente a los dos
        formularios de <span className="text-paper-50">SINST-VIGIA 2</span>:
        diseño/implementación (anual, hasta el décimo día hábil de agosto) e
        indicadores periódicos (mensual/trimestral/anual).
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 max-w-2xl">
        <StatCard label="Avance global" value={`${avanceGlobal}%`} accent="cyan" />
        <StatCard label="Pasos cumplidos" value={cumplidos} accent="green" />
        <StatCard label="Total pasos" value={total} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FASES.map((fase) => {
          const pasos = getPasosPorFase(fase);
          const pct = porcentajeCumplimiento(fase);
          return (
            <Link key={fase} href={`/pesv/${fase}`}>
              <Card className="h-full hover:bg-asphalt-800/50">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-fog-400">
                    Pasos {pasos[0]?.numero}–{pasos[pasos.length - 1]?.numero}
                  </span>
                </div>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
                  {FASE_LABELS[fase]}
                </h3>
                <p className="mt-1 text-sm text-fog-400">{FASE_DESC[fase]}</p>
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-asphalt-700">
                    <div
                      className="h-full rounded-full bg-radar-cyan"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-fog-400">
                    {pct}% · {pasos.length} pasos
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
