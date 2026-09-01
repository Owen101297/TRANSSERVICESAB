"use client";

import { AlertTriangle, ShieldCheck, Clock, FileWarning, Filter } from "lucide-react";
import { Contratista } from "@/lib/types/contratista";
import { contarAlertasContratos } from "@/lib/utils/alertas-contratos";

interface AlertasContratosPanelProps {
  contratistas: Contratista[];
  onlyWithAlerts: boolean;
  onToggleOnlyWithAlerts: () => void;
}

export function AlertasContratosPanel({
  contratistas,
  onlyWithAlerts,
  onToggleOnlyWithAlerts,
}: AlertasContratosPanelProps) {
  const conteo = contarAlertasContratos(contratistas);

  return (
    <div className="rounded-xl border border-line-600 bg-asphalt-900/80 p-4 shadow-lg backdrop-blur-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-signal-amber/40 bg-signal-amber/10 text-signal-amber">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 leading-tight">
              Control Preventivo de Contratos de Vinculación
            </h3>
            <p className="text-xs text-fog-400">
              Seguimiento de fechas de expiración y convenios empresariales
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleOnlyWithAlerts}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            onlyWithAlerts
              ? "bg-signal-amber text-asphalt-950 border-signal-amber shadow-md"
              : "bg-asphalt-800 text-mist-200 hover:text-paper-50 hover:bg-asphalt-700 border-line-500"
          }`}
        >
          <Filter size={14} />
          {onlyWithAlerts ? "Viendo solo con alertas" : "Filtrar con alertas"}
          {conteo.totalConAlertas > 0 && (
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                onlyWithAlerts
                  ? "bg-asphalt-950 text-signal-amber"
                  : "bg-signal-amber text-asphalt-950"
              }`}
            >
              {conteo.totalConAlertas}
            </span>
          )}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Vencidos */}
        <div className="flex items-center gap-3 rounded-lg border border-alert-red/30 bg-alert-red-dim/20 p-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-alert-red-dim text-alert-red shrink-0">
            <FileWarning size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xl font-bold text-alert-red leading-none">
              {conteo.vencidos}
            </p>
            <p className="text-[11px] text-fog-400 truncate mt-0.5">Contratos Vencidos</p>
          </div>
        </div>

        {/* Urgentes <= 15 días */}
        <div className="flex items-center gap-3 rounded-lg border border-signal-amber/30 bg-signal-amber/10 p-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-amber/20 text-signal-amber shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xl font-bold text-signal-amber leading-none">
              {conteo.urgentes}
            </p>
            <p className="text-[11px] text-fog-400 truncate mt-0.5">Vencen en ≤ 15 días</p>
          </div>
        </div>

        {/* Preventivos <= 30 días */}
        <div className="flex items-center gap-3 rounded-lg border border-radar-cyan/30 bg-radar-cyan-dim/20 p-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-radar-cyan-dim text-radar-cyan shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xl font-bold text-radar-cyan leading-none">
              {conteo.preventivos}
            </p>
            <p className="text-[11px] text-fog-400 truncate mt-0.5">Vencen en ≤ 30 días</p>
          </div>
        </div>

        {/* Óptimos */}
        <div className="flex items-center gap-3 rounded-lg border border-ok-green/30 bg-ok-green-dim/20 p-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ok-green-dim text-ok-green shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xl font-bold text-ok-green leading-none">
              {conteo.optimos}
            </p>
            <p className="text-[11px] text-fog-400 truncate mt-0.5">Vigentes / Indefinidos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
