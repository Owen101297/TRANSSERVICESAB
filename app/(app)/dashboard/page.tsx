import Link from "next/link";
import {
  Truck,
  Users,
  Building2,
  Radio,
  AlertTriangle,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Zap,
  Gauge,
  Calendar,
  AlertOctagon,
  ArrowUpRight,
} from "lucide-react";
import { StatCard, Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getContratistasDb } from "@/lib/services/contratistas.service";
import { getViajesDb } from "@/lib/services/operacion.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import { getEventosGPSConPaginacionDb, getResumenAlertasGPSDb } from "@/lib/services/gps.service";
import { getEstadoDocumento } from "@/lib/types/vehiculo";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    vehiculos,
    personas,
    contratistas,
    viajes,
    asignaciones,
    gpsResult,
    gpsResumen,
  ] = await Promise.all([
    getVehiculosDb(),
    getPersonasDb(),
    getContratistasDb(),
    getViajesDb(),
    getAsignacionesDb(),
    getEventosGPSConPaginacionDb({ limite: 8, rango: "hoy" }),
    getResumenAlertasGPSDb(),
  ]);

  const totalVehiculos = vehiculos.length;
  const vehiculosActivos = vehiculos.filter((v) => v.estado === "activo").length;
  const totalConductores = personas.filter((p) => p.perfiles?.includes("conductor")).length;
  const asignacionesActivas = asignaciones.filter((a) => a.estado === "activa").length;
  const viajesActivos = viajes.filter((v) => v.estado === "en_curso" || v.estado === "con_novedad").length;

  // 1. Análisis de Semáforo de Vencimientos (Vehículos + Personas)
  const hoy = new Date();
  const alertasVencimiento: {
    id: string;
    tipo: "vehiculo" | "persona";
    identificador: string;
    subtitulo: string;
    documento: string;
    fechaVencimiento: string;
    diasRestantes: number;
    estado: "vencido" | "proximo" | "vigente";
  }[] = [];

  // Vencimientos de Flota
  vehiculos.forEach((v) => {
    Object.entries(v.documentos || {}).forEach(([tipoDoc, fecha]) => {
      if (!fecha) return;
      const fDoc = new Date(fecha);
      const diffTime = fDoc.getTime() - hoy.getTime();
      const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const estado = dias < 0 ? "vencido" : dias <= 30 ? "proximo" : "vigente";

      if (estado !== "vigente") {
        alertasVencimiento.push({
          id: `veh-${v.id}-${tipoDoc}`,
          tipo: "vehiculo",
          identificador: v.placa,
          subtitulo: `${v.marca || ""} ${v.modelo || ""} · ${v.contratistaNombre || "Propio"}`,
          documento: tipoDoc.toUpperCase(),
          fechaVencimiento: fecha,
          diasRestantes: dias,
          estado,
        });
      }
    });
  });

  // Vencimientos de Personas (Licencias)
  personas.forEach((p) => {
    if (p.licenciaConduccion?.fechaVencimiento) {
      const fLic = new Date(p.licenciaConduccion.fechaVencimiento);
      const diffTime = fLic.getTime() - hoy.getTime();
      const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const estado = dias < 0 ? "vencido" : dias <= 30 ? "proximo" : "vigente";

      if (estado !== "vigente") {
        alertasVencimiento.push({
          id: `per-${p.id}-lic`,
          tipo: "persona",
          identificador: `${p.nombres} ${p.apellidos}`,
          subtitulo: `Cédula: ${p.numeroDocumento} · Cat. ${p.licenciaConduccion.categorias?.join("/") || "C2/C3"}`,
          documento: "LICENCIA CONDUCCIÓN",
          fechaVencimiento: p.licenciaConduccion.fechaVencimiento,
          diasRestantes: dias,
          estado,
        });
      }
    }
  });

  // Ordenar por urgencia (vencidos primero, luego los más próximos)
  alertasVencimiento.sort((a, b) => a.diasRestantes - b.diasRestantes);

  const totalVencidos = alertasVencimiento.filter((a) => a.estado === "vencido").length;
  const totalProximos = alertasVencimiento.filter((a) => a.estado === "proximo").length;

  return (
    <div className="space-y-6">
      {/* Cabecera del Centro de Mando */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-600/70 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-radar-cyan font-bold uppercase tracking-wider mb-1">
            <ShieldCheck size={16} className="text-radar-cyan" />
            <span>Centro de Mando Operacional 360°</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-paper-50">
            Trans Services A&amp;B
          </h1>
          <p className="text-xs sm:text-sm text-fog-400 mt-0.5">
            Monitoreo en tiempo real de flota, conductores, seguridad vial PESV y cumplimiento normativo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-line-600 bg-asphalt-900 px-3.5 py-2 text-right">
            <span className="text-[10px] font-mono text-fog-400 block leading-tight uppercase">Fecha del Sistema</span>
            <span className="text-xs font-mono font-bold text-paper-50">
              {hoy.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Franja de Métricas Ejecutivas Globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          label="Flota Operativa"
          value={`${vehiculosActivos}/${totalVehiculos}`}
          accent="cyan"
          trend={`${contratistas.length} contratistas vinculados`}
        />
        <StatCard
          label="Conductores Asignados"
          value={`${asignacionesActivas}/${totalConductores}`}
          accent="green"
          trend="Asignaciones en tiempo real"
        />
        <StatCard
          label="Telemetría GPS (Hoy)"
          value={gpsResult.totalCount}
          accent={gpsResumen.criticos > 0 ? "amber" : "cyan"}
          trend={`${gpsResumen.criticos} eventos críticos`}
        />
        <StatCard
          label="Vencimientos Críticos"
          value={totalVencidos + totalProximos}
          accent={totalVencidos > 0 ? "amber" : "green"}
          trend={`${totalVencidos} vencidos · ${totalProximos} próximos`}
        />
      </div>

      {/* Grid Principal: Semáforo de Cumplimiento & Radar de Telemetría */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Columna Izquierda (7/12): Semáforo de Vencimientos Documentales */}
        <Card className="lg:col-span-7 flex flex-col justify-between p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-line-600/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-amber/15 text-signal-amber border border-signal-amber/30">
                  <AlertTriangle size={17} />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                    Semáforo de Cumplimiento Documental
                  </h2>
                  <p className="text-xs text-fog-400">
                    Control preventivo de SOAT, Tecnomecánica, Tarjetas de Operación y Licencias.
                  </p>
                </div>
              </div>
              <Link
                href="/flota"
                className="text-xs font-mono font-semibold text-radar-cyan hover:underline flex items-center gap-1"
              >
                Ver Flota <ChevronRight size={13} />
              </Link>
            </div>

            {/* Listado de Documentos en Riesgo */}
            <div className="mt-3.5 space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {alertasVencimiento.length === 0 ? (
                <div className="rounded-xl border border-ok-green/30 bg-ok-green-dim/10 p-6 text-center text-xs text-ok-green flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Todos los documentos de la flota y conductores se encuentran 100% al día.</span>
                </div>
              ) : (
                alertasVencimiento.slice(0, 6).map((alerta) => (
                  <div
                    key={alerta.id}
                    className={`rounded-xl border p-3 flex items-center justify-between gap-3 transition-colors ${
                      alerta.estado === "vencido"
                        ? "border-alert-red/40 bg-alert-red-dim/15"
                        : "border-signal-amber/30 bg-signal-amber-dim/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {alerta.tipo === "vehiculo" ? (
                        <PlateTag plate={alerta.identificador} />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-asphalt-800 border border-line-600 text-radar-cyan font-bold text-xs">
                          <Users size={14} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-paper-50">{alerta.identificador}</span>
                          <span className="rounded bg-asphalt-950 px-1.5 py-0.5 text-[10px] font-mono font-bold text-fog-400 border border-line-600">
                            {alerta.documento}
                          </span>
                        </div>
                        <span className="text-[11px] text-fog-400 block">{alerta.subtitulo}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block font-mono text-xs font-bold ${
                          alerta.estado === "vencido" ? "text-alert-red" : "text-signal-amber"
                        }`}
                      >
                        {alerta.diasRestantes < 0
                          ? `Venció hace ${Math.abs(alerta.diasRestantes)}d`
                          : `Vence en ${alerta.diasRestantes}d`}
                      </span>
                      <span className="block font-mono text-[10px] text-fog-400">
                        {alerta.fechaVencimiento}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {alertasVencimiento.length > 6 && (
            <div className="pt-2 text-center border-t border-line-600/50">
              <span className="text-xs font-mono text-fog-400">
                + {alertasVencimiento.length - 6} documentos adicionales en estado preventivo
              </span>
            </div>
          )}
        </Card>

        {/* Columna Derecha (5/12): Radar de Telemetría GPS en Vivo (Hoy) */}
        <Card className="lg:col-span-5 flex flex-col justify-between p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-line-600/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-radar-cyan/15 text-radar-cyan border border-radar-cyan/30">
                  <Radio size={17} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                    Telemetría en Vivo (Hoy)
                  </h2>
                  <p className="text-xs text-fog-400">
                    Eventos de velocidad y alertas Satelcopro recibidas.
                  </p>
                </div>
              </div>
              <Link
                href="/gps"
                className="text-xs font-mono font-semibold text-radar-cyan hover:underline flex items-center gap-1"
              >
                Ver Todo <ChevronRight size={13} />
              </Link>
            </div>

            {/* Listado de Últimos Eventos de Hoy */}
            <div className="mt-3.5 space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {gpsResult.eventos.length === 0 ? (
                <div className="rounded-xl border border-radar-cyan/30 bg-radar-cyan/10 p-6 text-center text-xs text-fog-400 space-y-2">
                  <Radio size={20} className="text-radar-cyan mx-auto animate-pulse" />
                  <p>No se han registrado excesos de velocidad ni alertas críticas en el día de hoy.</p>
                </div>
              ) : (
                gpsResult.eventos.map((evt) => {
                  const d = new Date(evt.fechaHora);
                  return (
                    <div
                      key={evt.id}
                      className="rounded-xl border border-line-600 bg-asphalt-900/80 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <PlateTag plate={evt.placa} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-paper-50">
                              {evt.tipoEvento.replace(/_/g, " ").toUpperCase()}
                            </span>
                            {evt.prioridad === "alta" && (
                              <span className="rounded bg-alert-red-dim text-alert-red px-1.5 py-0.2 text-[9px] font-mono font-bold border border-alert-red/30">
                                CRÍTICO
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-fog-400 block font-mono">
                            {evt.conductorNombre || "Sin conductor"} · {d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>

                      {evt.velocidad !== undefined && (
                        <div className="text-right shrink-0 font-mono">
                          <span className={`text-xs font-bold ${evt.velocidad > (evt.limiteVelocidad || 80) ? "text-alert-red" : "text-paper-50"}`}>
                            {evt.velocidad} km/h
                          </span>
                          {evt.limiteVelocidad && (
                            <span className="text-[10px] text-fog-400 block">/ {evt.limiteVelocidad} máx</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/gps"
              className="w-full py-2 bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 border border-line-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Abrir Monitor de Telemetría Completo</span>
              <ArrowUpRight size={14} className="text-radar-cyan" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Atajos Rápidos Operativos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <Link
          href="/flota"
          className="group rounded-xl border border-line-600 bg-asphalt-900/60 p-3.5 hover:bg-asphalt-800/80 hover:border-line-500 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-asphalt-800 border border-line-600 text-radar-cyan group-hover:bg-radar-cyan group-hover:text-asphalt-950 transition-colors">
              <Truck size={16} />
            </div>
            <ArrowUpRight size={14} className="text-fog-400 group-hover:text-paper-50" />
          </div>
          <h3 className="font-bold text-xs text-paper-50 mt-2.5">Gestión de Flota</h3>
          <p className="text-[11px] text-fog-400 mt-0.5">Catálogo de vehículos y SOAT</p>
        </Link>

        <Link
          href="/personas"
          className="group rounded-xl border border-line-600 bg-asphalt-900/60 p-3.5 hover:bg-asphalt-800/80 hover:border-line-500 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-asphalt-800 border border-line-600 text-radar-cyan group-hover:bg-radar-cyan group-hover:text-asphalt-950 transition-colors">
              <Users size={16} />
            </div>
            <ArrowUpRight size={14} className="text-fog-400 group-hover:text-paper-50" />
          </div>
          <h3 className="font-bold text-xs text-paper-50 mt-2.5">Talento &amp; Conductores</h3>
          <p className="text-[11px] text-fog-400 mt-0.5">Expedientes y licencias C2/C3</p>
        </Link>

        <Link
          href="/gps"
          className="group rounded-xl border border-line-600 bg-asphalt-900/60 p-3.5 hover:bg-asphalt-800/80 hover:border-line-500 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-asphalt-800 border border-line-600 text-signal-amber group-hover:bg-signal-amber group-hover:text-asphalt-950 transition-colors">
              <Radio size={16} />
            </div>
            <ArrowUpRight size={14} className="text-fog-400 group-hover:text-paper-50" />
          </div>
          <h3 className="font-bold text-xs text-paper-50 mt-2.5">Telemetría Satelcopro</h3>
          <p className="text-[11px] text-fog-400 mt-0.5">Scoring y velocidad en vivo</p>
        </Link>

        <Link
          href="/portal-conductor"
          target="_blank"
          className="group rounded-xl border border-line-600 bg-asphalt-900/60 p-3.5 hover:bg-asphalt-800/80 hover:border-line-500 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-asphalt-800 border border-line-600 text-ok-green group-hover:bg-ok-green group-hover:text-asphalt-950 transition-colors">
              <ShieldCheck size={16} />
            </div>
            <ArrowUpRight size={14} className="text-fog-400 group-hover:text-paper-50" />
          </div>
          <h3 className="font-bold text-xs text-paper-50 mt-2.5">Portal del Conductor</h3>
          <p className="text-[11px] text-fog-400 mt-0.5">App móvil &amp; Preoperacionales</p>
        </Link>
      </div>
    </div>
  );
}
