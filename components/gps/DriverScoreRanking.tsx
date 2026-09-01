"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Medal,
  Award,
  AlertTriangle,
  ShieldCheck,
  Gauge,
  OctagonAlert,
  Zap,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { CalificacionConductorMensual } from "@/lib/types/gps";
import { NIVEL_SCORE_LABELS } from "@/lib/utils/gps-scoring";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";

interface DriverScoreRankingProps {
  scores: CalificacionConductorMensual[];
  mesSeleccionado: string;
  onCambiarMes: (mes: string) => void;
}

export function DriverScoreRanking({
  scores,
  mesSeleccionado,
  onCambiarMes,
}: DriverScoreRankingProps) {
  const top3 = scores.slice(0, 3);

  const columns: Column<CalificacionConductorMensual>[] = [
    {
      header: "Posición",
      accessor: "posicionRanking",
      render: (v) => {
        const pos = v as number;
        if (pos === 1) {
          return (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal-amber text-asphalt-950 font-bold text-xs shadow-md">
              🥇 1
            </span>
          );
        }
        if (pos === 2) {
          return (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mist-200 text-asphalt-950 font-bold text-xs shadow-sm">
              🥈 2
            </span>
          );
        }
        if (pos === 3) {
          return (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 text-paper-50 font-bold text-xs">
              🥉 3
            </span>
          );
        }
        return <span className="font-mono text-xs font-semibold text-fog-400">#{pos}</span>;
      },
    },
    {
      header: "Conductor",
      accessor: "conductorNombre",
      render: (_v, row) => (
        <div className="flex items-center gap-3">
          <Avatar initials={row.conductorFoto} size="sm" />
          <div>
            <Link
              href={`/personas/${row.conductorId}`}
              className="font-semibold text-paper-50 hover:text-radar-cyan transition-colors"
            >
              {row.conductorNombre}
            </Link>
            <p className="text-[11px] font-mono text-fog-400">
              Placa: {row.placaPrincipal} · {row.conductorTelefono}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Driver Score (PESV)",
      accessor: "puntajeTotal",
      render: (v, row) => {
        const pts = v as number;
        const config = NIVEL_SCORE_LABELS[row.nivel];
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-lg font-bold ${config.colorText}`}>
                {pts}/100
              </span>
              <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono border ${config.badgeClass}`}>
                {config.label.split("/")[0].trim()}
              </span>
            </div>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-asphalt-950 border border-line-600">
              <div
                className={`h-full rounded-full ${
                  pts >= 90 ? "bg-ok-green" : pts >= 75 ? "bg-radar-cyan" : pts >= 60 ? "bg-signal-amber" : "bg-alert-red"
                }`}
                style={{ width: `${pts}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: "Excesos Vel. (40%)",
      accessor: "conteoExcesoVelocidad",
      render: (v) => (
        <span
          className={`font-mono text-xs font-semibold ${
            (v as number) === 0 ? "text-ok-green" : "text-alert-red"
          }`}
        >
          {v as number} eventos
        </span>
      ),
    },
    {
      header: "Frenadas (25%)",
      accessor: "conteoFrenadaBrusca",
      render: (v) => (
        <span
          className={`font-mono text-xs ${
            (v as number) === 0 ? "text-ok-green" : "text-signal-amber font-semibold"
          }`}
        >
          {v as number} eventos
        </span>
      ),
    },
    {
      header: "Aceleradas (20%)",
      accessor: "conteoAceleradaBrusca",
      render: (v) => (
        <span
          className={`font-mono text-xs ${
            (v as number) === 0 ? "text-ok-green" : "text-mist-200"
          }`}
        >
          {v as number} eventos
        </span>
      ),
    },
    {
      header: "Vel. Promedio (15%)",
      accessor: "promedioVelocidad",
      render: (v) => (
        <span className="font-mono text-xs text-radar-cyan font-semibold">
          {v as number} km/h
        </span>
      ),
    },
    {
      header: "Acción",
      accessor: "conductorId",
      render: (v) => (
        <Link
          href={`/personas/${v}`}
          className="inline-flex items-center gap-1 text-xs text-radar-cyan hover:underline font-mono"
        >
          <span>Expediente</span>
          <ChevronRight size={13} />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabecera del Ranking con Selector de Mes */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line-600 bg-asphalt-900 p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-signal-amber/40 bg-signal-amber/10 text-signal-amber">
            <Trophy size={24} />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50 leading-tight">
              Calificación Mensual de Hábitos de Conducción (Driver Score)
            </h3>
            <p className="text-xs text-fog-400">
              Evaluación automatizada de seguridad vial PESV con base en telemetría satelital (Satelcopro)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-fog-400 font-mono">Mes de Evaluación:</label>
          <input
            type="month"
            value={mesSeleccionado}
            onChange={(e) => onCambiarMes(e.target.value)}
            className="rounded-lg border border-line-500 bg-asphalt-950 px-3 py-1.5 text-xs text-paper-50 font-mono focus:border-signal-amber focus:outline-none"
          />
        </div>
      </div>

      {/* Podio de los 3 Mejores Conductores */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {top3.map((cand, idx) => {
            const medalla = idx === 0 ? "🥇 1er Puesto" : idx === 1 ? "🥈 2do Puesto" : "🥉 3er Puesto";
            const borderAccent =
              idx === 0
                ? "border-signal-amber/60 bg-gradient-to-b from-signal-amber/15 to-asphalt-900 shadow-xl"
                : idx === 1
                ? "border-radar-cyan/40 bg-asphalt-900/90"
                : "border-line-500 bg-asphalt-900/80";

            return (
              <div
                key={cand.conductorId}
                className={`relative rounded-xl border p-5 transition-all hover:scale-[1.01] ${borderAccent}`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-asphalt-950 px-2.5 py-0.5 text-xs font-mono font-bold text-signal-amber border border-line-600">
                    {medalla}
                  </span>
                  <span className="font-mono text-2xl font-bold text-ok-green">
                    {cand.puntajeTotal} pts
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Avatar initials={cand.conductorFoto} size="md" />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-paper-50 text-sm truncate">
                      {cand.conductorNombre}
                    </h4>
                    <p className="text-xs font-mono text-fog-400">
                      Placa habitual: {cand.placaPrincipal}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line-600/70 pt-3 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-fog-400 font-mono">Excesos Vel.</p>
                    <p className="font-mono font-bold text-paper-50">{cand.conteoExcesoVelocidad}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-fog-400 font-mono">Frenadas</p>
                    <p className="font-mono font-bold text-paper-50">{cand.conteoFrenadaBrusca}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-fog-400 font-mono">Vel. Media</p>
                    <p className="font-mono font-bold text-radar-cyan">{cand.promedioVelocidad} km/h</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla Completa de Posiciones */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-line-600 flex items-center justify-between">
          <div>
            <h4 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
              Tabla General de Calificaciones ({scores.length} conductores evaluados)
            </h4>
            <p className="text-xs text-fog-400">
              Ponderación: Velocidad (40%) · Frenadas (25%) · Aceleradas (20%) · Promedio (15%)
            </p>
          </div>
        </div>
        <DataTable columns={columns} data={scores} />
      </Card>
    </div>
  );
}
