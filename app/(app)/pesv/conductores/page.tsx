import Link from "next/link";
import { getDriverScorecardsDb } from "@/lib/services/driver-scorecard.service";
import { Card, StatCard } from "@/components/ui/Card";
import { Award, ShieldAlert, CheckCircle2, AlertTriangle, ArrowLeft, Download, Car, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function PesvConductoresPage() {
  const scorecards = await getDriverScorecardsDb();

  const total = scorecards.length;
  const excelentes = scorecards.filter((s) => s.categoriaRating === "EXCELENTE").length;
  const conformes = scorecards.filter((s) => s.categoriaRating === "CONFORME").length;
  const enObservacion = scorecards.filter((s) => s.categoriaRating === "EN_OBSERVACION" || s.categoriaRating === "CRITICO").length;
  const promedioGeneral = total > 0 ? Math.round(scorecards.reduce((acc, s) => acc + s.scorecardRating, 0) / total) : 0;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-fog-400 mb-1">
            <Link href="/pesv" className="hover:text-radar-cyan flex items-center gap-1 transition-colors">
              <ArrowLeft size={14} /> PESV
            </Link>
            <span>/</span>
            <span className="text-paper-50">Conductores</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            PESV · Calificación y Scorecard de Conductores
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Paso 10 (Competencias) y Paso 14 (Despacho y Plan de Viaje) de la Resolución 40595 de 2022.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/reportes/sisi-pesv?format=csv" download>
            <Button variant="secondary" className="gap-2">
              <Download size={14} /> Exportar SISI-PESV
            </Button>
          </a>
        </div>
      </div>

      {/* Tarjetas de Resumen Global */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Promedio General Flota" value={`${promedioGeneral}/100`} accent="cyan" />
        <StatCard label="Conductores Excelentes" value={excelentes} accent="green" />
        <StatCard label="Conductores Conformes" value={conformes} accent="cyan" />
        <StatCard label="En Observación / Alerta" value={enObservacion} accent={enObservacion > 0 ? "red" : "amber"} />
      </div>

      {/* Lista de Tarjetas de Conductores */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scorecards.map((c) => {
          const badgeBg =
            c.badgeColor === "green"
              ? "bg-ok-green-dim text-ok-green border-ok-green/30"
              : c.badgeColor === "cyan"
              ? "bg-radar-cyan-dim text-radar-cyan border-radar-cyan/30"
              : c.badgeColor === "amber"
              ? "bg-signal-amber-dim text-signal-amber border-signal-amber/30"
              : "bg-alert-red-dim text-alert-red border-alert-red/30";

          return (
            <Card key={c.id} className="flex flex-col justify-between hover:border-line-500 transition-colors">
              <div>
                {/* Cabecera del Conductor */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-asphalt-700 font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 border border-line-600">
                      {c.nombres[0]}
                      {c.apellidos[0]}
                    </div>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 leading-tight">
                        {c.nombreCompleto}
                      </h3>
                      <p className="font-mono text-xs text-fog-400">CC: {c.numeroDocumento}</p>
                    </div>
                  </div>

                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold font-mono ${badgeBg}`}>
                    {c.scorecardRating} pts · {c.categoriaRating.replace("_", " ")}
                  </span>
                </div>

                {/* Semáforo de Licencia */}
                <div className="mt-4 rounded-lg bg-asphalt-950/60 p-2.5 border border-line-600/50 flex items-center justify-between text-xs">
                  <span className="text-fog-400">Licencia:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-paper-50 font-bold">{c.licenciaCategorias?.join(", ") || "C2/C3"}</span>
                    {c.licenciaEstado === "vigente" && (
                      <span className="text-ok-green flex items-center gap-1">
                        <CheckCircle2 size={12} /> Vigente ({c.licenciaVencimiento || "Al día"})
                      </span>
                    )}
                    {c.licenciaEstado === "por_vencer" && (
                      <span className="text-signal-amber flex items-center gap-1">
                        <AlertTriangle size={12} /> Vence en {c.diasVigenciaLicencia}d
                      </span>
                    )}
                    {c.licenciaEstado === "vencida" && (
                      <span className="text-alert-red flex items-center gap-1">
                        <ShieldAlert size={12} /> Vencida
                      </span>
                    )}
                    {c.licenciaEstado === "sin_licencia" && (
                      <span className="text-fog-400">No registrada</span>
                    )}
                  </div>
                </div>

                {/* Métricas Operativas */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-asphalt-800/80 p-2 border border-line-600/40">
                    <p className="text-fog-400">Viajes STE-F-010</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-paper-50">
                      {c.totalViajes} ({c.kmAcumulados} km)
                    </p>
                  </div>
                  <div className="rounded-md bg-asphalt-800/80 p-2 border border-line-600/40">
                    <p className="text-fog-400">Riesgo Promedio</p>
                    <p className={`mt-0.5 font-mono text-sm font-bold ${c.promedioRiesgo >= 24 ? "text-alert-red" : c.promedioRiesgo >= 16 ? "text-signal-amber" : "text-ok-green"}`}>
                      {c.promedioRiesgo} pts
                    </p>
                  </div>
                  <div className="rounded-md bg-asphalt-800/80 p-2 border border-line-600/40">
                    <p className="text-fog-400">Preoperacionales</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-radar-cyan">
                      {c.cumplimientoPreopPct}% aptos ({c.preoperacionalesAptos}/{c.totalPreoperacionales})
                    </p>
                  </div>
                  <div className="rounded-md bg-asphalt-800/80 p-2 border border-line-600/40">
                    <p className="text-fog-400">Capacitaciones</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-mist-200">
                      {c.capacitacionesAsistidas} asistidas
                    </p>
                  </div>
                </div>

                {/* Barra de Progreso Scorecard */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-fog-400 font-mono mb-1">
                    <span>Índice de Seguridad PESV</span>
                    <span className="text-paper-50 font-bold">{c.scorecardRating}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-asphalt-700">
                    <div
                      className={`h-full rounded-full ${
                        c.badgeColor === "green"
                          ? "bg-ok-green"
                          : c.badgeColor === "cyan"
                          ? "bg-radar-cyan"
                          : c.badgeColor === "amber"
                          ? "bg-signal-amber"
                          : "bg-alert-red"
                      }`}
                      style={{ width: `${c.scorecardRating}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Botón de Perfil */}
              <div className="mt-5 pt-3 border-t border-line-600/60 flex items-center justify-between">
                <span className="text-xs text-fog-400">Tel: {c.telefono || "N/A"}</span>
                <Link href={`/personas`}>
                  <Button variant="ghost" className="text-xs py-1 h-7">
                    Ver Expediente
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {scorecards.length === 0 && (
        <div className="rounded-xl border border-line-600 bg-asphalt-800/40 p-12 text-center">
          <Car size={32} className="mx-auto text-fog-400 mb-2 opacity-50" />
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
            No hay conductores registrados con perfil "conductor"
          </h3>
          <p className="text-sm text-fog-400 mt-1">
            Registra nuevos conductores en el módulo de personal para generar sus tarjetas de calificación PESV.
          </p>
        </div>
      )}
    </div>
  );
}
