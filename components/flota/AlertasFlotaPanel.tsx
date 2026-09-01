"use client";

import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Filter,
} from "lucide-react";
import { Vehiculo } from "@/lib/types/vehiculo";
import { calcularMetricasFlotaAlertas } from "@/lib/utils/alertas-flota";

interface AlertasFlotaPanelProps {
  vehiculos: Vehiculo[];
  filtroSoloAlertas: boolean;
  onToggleSoloAlertas: () => void;
}

export function AlertasFlotaPanel({
  vehiculos,
  filtroSoloAlertas,
  onToggleSoloAlertas,
}: AlertasFlotaPanelProps) {
  const metricas = calcularMetricasFlotaAlertas(vehiculos);

  return (
    <div className="rounded-xl border border-line-600 bg-asphalt-900/90 p-4 shadow-lg backdrop-blur-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-signal-amber/40 bg-signal-amber/10 text-signal-amber">
            <ShieldAlert size={16} />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 leading-tight">
              Semáforo Preventivo de Vencimientos (SOAT · RTM · Pólizas RCC/RCE)
            </h3>
            <p className="text-[11px] text-fog-400">
              Monitoreo automatizado de documentos legales para evitar inmovilizaciones y multas normativas
            </p>
          </div>
        </div>

        {/* Botón Filtro con Alertas */}
        <button
          type="button"
          onClick={onToggleSoloAlertas}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
            filtroSoloAlertas
              ? "bg-signal-amber text-asphalt-950 border-signal-amber shadow-md"
              : "border-line-500 bg-asphalt-950 text-paper-50 hover:bg-asphalt-800"
          }`}
        >
          <Filter size={13} />
          <span>{filtroSoloAlertas ? "Mostrando solo con alertas" : `Filtrar con alertas (${metricas.conAlertas})`}</span>
        </button>
      </div>

      {/* Tarjetas de Semáforo */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Vencidos */}
        <div className="rounded-lg border border-alert-red/40 bg-alert-red-dim/30 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-alert-red mb-0.5">
            <AlertOctagon size={14} className="animate-pulse" />
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Vencidos (≤ 0d)</span>
          </div>
          <p className="font-mono text-xl font-bold text-alert-red">{metricas.vencidos}</p>
        </div>

        {/* 2. Urgentes */}
        <div className="rounded-lg border border-signal-amber/40 bg-signal-amber-dim/30 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-signal-amber mb-0.5">
            <AlertTriangle size={14} />
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Urgentes (≤ 15d)</span>
          </div>
          <p className="font-mono text-xl font-bold text-signal-amber">{metricas.urgentes}</p>
        </div>

        {/* 3. Preventivos */}
        <div className="rounded-lg border border-radar-cyan/40 bg-radar-cyan-dim/30 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-radar-cyan mb-0.5">
            <Clock size={14} />
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Preventivos (≤ 30d)</span>
          </div>
          <p className="font-mono text-xl font-bold text-radar-cyan">{metricas.preventivos}</p>
        </div>

        {/* 4. Vigentes */}
        <div className="rounded-lg border border-ok-green/40 bg-ok-green-dim/30 p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-ok-green mb-0.5">
            <CheckCircle2 size={14} />
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider">Al Día (&gt; 30d)</span>
          </div>
          <p className="font-mono text-xl font-bold text-ok-green">{metricas.vigentes}</p>
        </div>
      </div>
    </div>
  );
}
