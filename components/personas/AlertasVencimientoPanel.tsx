"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { Persona } from "@/lib/types/persona";
import {
  obtenerResumenAlertasPersonas,
  PersonaConAlertas,
} from "@/lib/utils/alertas-vencimiento";
import { Button } from "@/components/ui/Button";

interface AlertasVencimientoPanelProps {
  personas: Persona[];
  onlyWithAlerts: boolean;
  onToggleOnlyWithAlerts: () => void;
}

export function AlertasVencimientoPanel({
  personas,
  onlyWithAlerts,
  onToggleOnlyWithAlerts,
}: AlertasVencimientoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const resumen = obtenerResumenAlertasPersonas(personas);
  const personasConAlerta = resumen.evaluadas.filter((p) => p.tieneAlertas);

  if (resumen.totalConAlertas === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-ok-green/30 bg-ok-green-dim/40 px-4 py-2.5 text-xs text-paper-50 animate-fadeIn">
        <div className="flex items-center gap-2 text-ok-green">
          <CheckCircle2 size={16} />
          <span className="font-semibold">
            Semáforo Preventivo HSEQ 100% al día
          </span>
          <span className="text-fog-400 font-normal">
            — Todos los conductores activos cuentan con licencias y exámenes médicos vigentes.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line-600 bg-asphalt-900 overflow-hidden shadow-lg animate-fadeIn">
      {/* Barra de Resumen del Semáforo */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-asphalt-950/60">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-signal-amber/10 p-1.5 text-signal-amber border border-signal-amber/30">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h4 className="font-bold text-xs text-paper-50 flex items-center gap-1.5">
                Centro de Alertas Preventivas de Vencimiento
                <span className="rounded-full bg-signal-amber text-asphalt-950 px-2 py-0.5 text-[10px] font-mono font-bold">
                  {resumen.totalConAlertas}
                </span>
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {resumen.criticos > 0 && (
              <span className="rounded bg-alert-red-dim border border-alert-red/40 px-2 py-0.5 text-alert-red font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-alert-red animate-pulse" />
                {resumen.criticos} Vencidos
              </span>
            )}

            {resumen.urgentes > 0 && (
              <span className="rounded bg-signal-amber/10 border border-signal-amber/40 px-2 py-0.5 text-signal-amber font-semibold">
                {resumen.urgentes} en &lt;15 días
              </span>
            )}

            {resumen.preventivos > 0 && (
              <span className="rounded bg-radar-cyan/10 border border-radar-cyan/40 px-2 py-0.5 text-radar-cyan font-semibold">
                {resumen.preventivos} en &lt;30 días
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={onlyWithAlerts ? "primary" : "secondary"}
            onClick={onToggleOnlyWithAlerts}
            className={`text-xs h-7 gap-1.5 ${
              onlyWithAlerts ? "bg-signal-amber text-asphalt-950 hover:bg-signal-amber/90 font-semibold" : ""
            }`}
          >
            <Filter size={13} />
            {onlyWithAlerts ? "Mostrando solo alertas" : "Filtrar con alertas"}
          </Button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors"
            title={isExpanded ? "Contraer detalle" : "Expandir detalle de alertas"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Detalle Expandible de Alertas */}
      {isExpanded && (
        <div className="border-t border-line-600/70 p-3.5 bg-asphalt-900/90 space-y-2 max-h-64 overflow-y-auto">
          {personasConAlerta.map(({ persona, alertas }) => (
            <div
              key={persona.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-line-600/50 bg-asphalt-950 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-semibold text-paper-50 truncate">
                  {persona.nombres} {persona.apellidos}
                </span>
                <span className="font-mono text-[11px] text-fog-400">
                  ({persona.tipoDocumento} {persona.numeroDocumento})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {alertas.map((al, idx) => (
                  <span
                    key={idx}
                    className={`rounded px-2 py-0.5 text-[11px] font-mono font-medium border ${
                      al.nivel === "critico"
                        ? "bg-alert-red-dim border-alert-red/40 text-alert-red"
                        : al.nivel === "urgente"
                        ? "bg-signal-amber/10 border-signal-amber/40 text-signal-amber"
                        : "bg-radar-cyan/10 border-radar-cyan/40 text-radar-cyan"
                    }`}
                  >
                    {al.titulo}: {al.badgeLabel}
                  </span>
                ))}

                <Link
                  href={`/personas/${persona.id}`}
                  className="text-radar-cyan hover:underline flex items-center gap-0.5 text-[11px] ml-1"
                >
                  Ver ficha <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
