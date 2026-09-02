"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Radio,
  AlertTriangle,
  Trophy,
  Zap,
  Gauge,
  OctagonAlert,
  Smartphone,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  MapPin,
  Building2,
  Calendar,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import {
  EventoGPS,
  TipoEventoGPS,
  PrioridadEventoGPS,
  CalificacionConductorMensual,
  TIPO_EVENTO_LABELS,
  PRIORIDAD_EVENTO_LABELS,
} from "@/lib/types/gps";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PlateTag } from "@/components/ui/PlateTag";
import { RetroalimentacionModal } from "@/components/gps/RetroalimentacionModal";
import { DriverScoreRanking } from "@/components/gps/DriverScoreRanking";
import { N8nConnectionGuide } from "@/components/gps/N8nConnectionGuide";
import { generarMensajeWhatsApp } from "@/lib/utils/gps-scoring";
import { marcarRetroalimentacionDb } from "@/lib/services/gps.service";

interface GpsMonitorClientViewProps {
  initialEventos: EventoGPS[];
  initialScores: CalificacionConductorMensual[];
}

type TabType = "eventos" | "reincidencias" | "ranking" | "conexion";

export function GpsMonitorClientView({
  initialEventos,
  initialScores,
}: GpsMonitorClientViewProps) {
  const [eventos, setEventos] = useState<EventoGPS[]>(initialEventos);
  const [scores, setScores] = useState<CalificacionConductorMensual[]>(initialScores);
  const [activeTab, setActiveTab] = useState<TabType>("eventos");
  const [selectedEventoFeedback, setSelectedEventoFeedback] = useState<EventoGPS | null>(null);
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("todas");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [mesRanking, setMesRanking] = useState(new Date().toISOString().slice(0, 7));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString("es-CO"));

  // Función para refrescar datos reales desde el Gateway
  const refrescarDatosReales = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/gps/eventos");
      if (res.ok) {
        const json = await res.json();
        if (json.eventos) {
          setEventos(json.eventos);
          setLastUpdated(new Date().toLocaleTimeString("es-CO"));
        }
      }
    } catch (err) {
      console.warn("Error al refrescar eventos GPS:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Polling periódico cada 20 segundos para reflejar las ejecuciones de n8n
  useEffect(() => {
    const interval = setInterval(() => {
      refrescarDatosReales();
    }, 20000);
    return () => clearInterval(interval);
  }, [refrescarDatosReales]);

  // Métricas en tiempo real
  const totalEventos = eventos.length;
  const criticos = eventos.filter((e) => e.prioridad === "alta").length;
  const pendientes = eventos.filter(
    (e) => e.estadoRetroalimentacion === "pendiente" && e.prioridad !== "baja"
  ).length;

  // Detección de Reincidencias por placa
  const reincidenciasMap: Record<string, EventoGPS[]> = {};
  eventos.forEach((e) => {
    if (!reincidenciasMap[e.placa]) reincidenciasMap[e.placa] = [];
    reincidenciasMap[e.placa].push(e);
  });

  const placasReincidentes = Object.entries(reincidenciasMap).filter(
    ([_, evts]) => evts.filter((x) => x.prioridad !== "baja").length >= 2
  );

  // Filtrado de la tabla de eventos
  const filteredEventos = eventos.filter((e) => {
    if (filtroPrioridad !== "todas" && e.prioridad !== filtroPrioridad) return false;
    if (filtroTipo !== "todos" && e.tipoEvento !== filtroTipo) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchPlaca = e.placa.toLowerCase().includes(q);
      const matchConductor = e.conductorNombre?.toLowerCase().includes(q);
      const matchDesc = e.descripcion?.toLowerCase().includes(q);
      const matchUbicacion = e.ubicacion?.toLowerCase().includes(q);
      return matchPlaca || matchConductor || matchDesc || matchUbicacion;
    }

    return true;
  });

  const columns: Column<EventoGPS>[] = [
    {
      header: "Vehículo / Placa",
      accessor: "placa",
      render: (v) => <PlateTag plate={v as string} />,
    },
    {
      header: "Conductor Asignado",
      accessor: "conductorNombre",
      render: (_v, row) => {
        const hasConductor = row.conductorId && row.conductorNombre !== "Sin conductor asignado";
        if (!hasConductor) {
          return (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-mono bg-asphalt-800 text-fog-400 border border-line-600">
              Sin conductor asignado
            </span>
          );
        }
        return (
          <div>
            <p className="font-semibold text-paper-50 text-xs">
              {row.conductorNombre}
            </p>
            <p className="text-[10px] font-mono text-fog-400">
              {row.conductorTelefono ? `Tel: ${row.conductorTelefono}` : "Sin teléfono"}
            </p>
          </div>
        );
      },
    },
    {
      header: "Tipo de Novedad (Satelcopro)",
      accessor: "tipoEvento",
      render: (_v, row) => {
        const conf = TIPO_EVENTO_LABELS[row.tipoEvento] || { label: row.tipoEvento };
        return (
          <div>
            <span className="font-semibold text-paper-50 text-xs">{conf.label}</span>
            <p className="text-[11px] text-fog-400 max-w-xs truncate" title={row.descripcion}>
              {row.descripcion}
            </p>
          </div>
        );
      },
    },
    {
      header: "Severidad",
      accessor: "prioridad",
      render: (v) => {
        const conf = PRIORIDAD_EVENTO_LABELS[v as PrioridadEventoGPS] || {
          label: v as string,
          badgeClass: "bg-asphalt-800 text-mist-200 border-line-600",
        };
        return (
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-mono border ${conf.badgeClass}`}>
            {conf.label}
          </span>
        );
      },
    },
    {
      header: "Fecha / Ubicación",
      accessor: "fechaHora",
      render: (_v, row) => (
        <div>
          <p className="text-xs font-mono text-paper-50">
            {new Date(row.fechaHora).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
          </p>
          <p className="text-[10px] text-fog-400 flex items-center gap-1 mt-0.5 truncate max-w-[170px]" title={row.ubicacion}>
            <MapPin size={10} className="shrink-0" />
            <span className="truncate">{row.ubicacion || "En ruta"}</span>
          </p>
        </div>
      ),
    },
    {
      header: "Estado PESV",
      accessor: "estadoRetroalimentacion",
      render: (v) => {
        if (v === "enviada_whatsapp") {
          return (
            <span className="inline-flex items-center gap-1 rounded bg-ok-green-dim px-2 py-0.5 text-[11px] font-mono font-semibold text-ok-green border border-ok-green/30">
              <CheckCircle2 size={12} /> Notificado WhatsApp
            </span>
          );
        }
        if (v === "enviada_correo") {
          return (
            <span className="inline-flex items-center gap-1 rounded bg-radar-cyan-dim px-2 py-0.5 text-[11px] font-mono font-semibold text-radar-cyan border border-radar-cyan/30">
              <CheckCircle2 size={12} /> Notificado Email
            </span>
          );
        }
        return (
          <span className="inline-flex items-center rounded bg-signal-amber-dim px-2 py-0.5 text-[11px] font-mono font-semibold text-signal-amber border border-signal-amber/30">
            Pendiente
          </span>
        );
      },
    },
    {
      header: "Acción",
      accessor: "id",
      render: (_v, row) => {
        // Formatear número de teléfono
        const rawPhone = row.conductorTelefono?.replace(/[^0-9]/g, "") || "";
        let phoneFormatted = "";
        if (rawPhone.length === 10) phoneFormatted = `57${rawPhone}`;
        else if (rawPhone.length === 12 && rawPhone.startsWith("57")) phoneFormatted = rawPhone;

        const msg = encodeURIComponent(generarMensajeWhatsApp(row));
        const directWaUrl = phoneFormatted
          ? `https://api.whatsapp.com/send?phone=${phoneFormatted}&text=${msg}`
          : `https://api.whatsapp.com/send?text=${msg}`;

        return (
          <div className="flex items-center gap-1.5">
            {/* Botón 1-Clic Directo a WhatsApp */}
            <a
              href={directWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await marcarRetroalimentacionDb(row.id, "whatsapp");
                  if (res.success && res.refreshedEventos) {
                    setEventos(res.refreshedEventos);
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-ok-green/40 bg-ok-green/10 text-ok-green hover:bg-ok-green hover:text-asphalt-950 transition-all shadow-xs"
              title="Abrir WhatsApp con plantilla directa"
            >
              <Smartphone size={14} />
            </a>

            {/* Botón para Abrir Modal y Personalizar */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEventoFeedback(row);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-line-500 bg-asphalt-800 px-2 py-1 text-xs font-medium text-paper-50 hover:bg-asphalt-700 transition-colors shadow-xs"
              title="Ver plantilla completa o enviar correo"
            >
              <MessageSquare size={12} className="text-signal-amber" />
              <span>Ver</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabecera Principal con Indicador de Sincronización en Vivo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-signal-amber font-semibold uppercase tracking-wider mb-1">
            <Radio size={16} className="animate-pulse text-signal-amber" />
            <span>Monitoreo Satelital &amp; Seguridad Vial PESV (Satelcopro / n8n)</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Telemetría GPS en Vivo
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Eventos reales capturados automáticamente desde el workflow de n8n cada 5 minutos.
          </p>
        </div>

        {/* Botón de Refresco Manual */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-fog-400 hidden sm:inline">
            Última sync: {lastUpdated}
          </span>
          <button
            type="button"
            onClick={refrescarDatosReales}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-line-500 bg-asphalt-900 px-3.5 py-2 text-xs font-semibold text-paper-50 hover:bg-asphalt-800 transition-colors active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-signal-amber" : "text-radar-cyan"} />
            <span>{isRefreshing ? "Consultando..." : "Actualizar"}</span>
          </button>
        </div>
      </div>

      {/* Métricas Principales Reales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
        <StatCard label="Total Novedades" value={totalEventos} accent="cyan" trend="Eventos Satelcopro" />
        <StatCard label="Eventos Críticos" value={criticos} accent="amber" trend="Velocidad / Pánico" />
        <StatCard label="Vehículos Reincidentes" value={placasReincidentes.length} accent="amber" trend="≥ 2 novedades" />
        <StatCard label="Pendientes Retroalimentación" value={pendientes} accent="green" trend="Por notificar" />
      </div>

      {/* Pestañas de Navegación del Módulo GPS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line-600 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("eventos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "eventos"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Radio size={16} className={activeTab === "eventos" ? "text-signal-amber" : ""} />
          <span>Monitor de Eventos en Vivo</span>
          <span className="ml-1 rounded-full bg-asphalt-950 px-2 py-0.2 text-xs font-mono text-fog-400 border border-line-600">
            {eventos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reincidencias")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "reincidencias"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <AlertTriangle size={16} className={activeTab === "reincidencias" ? "text-alert-red" : ""} />
          <span>Alertas de Reincidencia</span>
          {placasReincidentes.length > 0 && (
            <span className="ml-1 rounded-full bg-alert-red-dim px-2 py-0.2 text-xs font-mono text-alert-red font-bold border border-alert-red/30">
              {placasReincidentes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ranking")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "ranking"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Trophy size={16} className={activeTab === "ranking" ? "text-signal-amber" : ""} />
          <span>Calificación Mensual (Driver Score)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conexion")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "conexion"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Zap size={16} className={activeTab === "conexion" ? "text-radar-cyan" : ""} />
          <span>Conexión n8n &amp; API</span>
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div className="pt-2">
        {activeTab === "eventos" && (
          <div className="space-y-4">
            {/* Filtros de la Tabla */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filtroPrioridad}
                  onChange={(e) => setFiltroPrioridad(e.target.value)}
                  className="rounded-lg border border-line-600 bg-asphalt-900 px-3 py-1.5 text-xs text-paper-50 font-mono focus:border-signal-amber focus:outline-none"
                >
                  <option value="todas">Todas las severidades</option>
                  <option value="alta">🔴 Alta / Crítica</option>
                  <option value="media">🟡 Media</option>
                  <option value="baja">🔵 Informativa</option>
                </select>

                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="rounded-lg border border-line-600 bg-asphalt-900 px-3 py-1.5 text-xs text-paper-50 font-mono focus:border-signal-amber focus:outline-none"
                >
                  <option value="todos">Todos los eventos</option>
                  <option value="exceso_velocidad">Exceso de Velocidad (Overspeed)</option>
                  <option value="frenada_brusca">Frenada Brusca</option>
                  <option value="acelerada_brusca">Acelerada Brusca</option>
                  <option value="giro_brusco">Giro Brusco</option>
                  <option value="panico">Botón de Pánico / SOS</option>
                  <option value="desconexion">Desconexión Batería</option>
                  <option value="ralenti">Ralentí Prolongado</option>
                  <option value="salida_geocerca">Salida de Geocerca</option>
                  <option value="otro">Otros eventos</option>
                </select>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Buscar por placa, conductor, tramo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-line-600 bg-asphalt-900 px-3 py-1.5 text-xs text-paper-50 placeholder:text-fog-400 focus:border-signal-amber focus:outline-none"
                />
              </div>
            </div>

            {/* Banner Informativo si no hay eventos aún */}
            {eventos.length === 0 ? (
              <div className="rounded-xl border border-radar-cyan/30 bg-radar-cyan/10 p-8 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-radar-cyan/20 text-radar-cyan mx-auto">
                  <Radio size={24} className="animate-pulse" />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
                  Gateway Satelcopro Conectado &amp; Esperando Eventos
                </h3>
                <p className="text-xs text-fog-400 max-w-md mx-auto">
                  El webhook <code className="text-radar-cyan font-mono font-bold">/api/gps/eventos</code> está activo. Los eventos registrados por tu flujo de n8n cada 5 minutos aparecerán aquí en tiempo real.
                </p>
              </div>
            ) : (
              <Card className="p-0 overflow-hidden">
                <DataTable columns={columns} data={filteredEventos} />
              </Card>
            )}
          </div>
        )}

        {activeTab === "reincidencias" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-alert-red/40 bg-alert-red-dim/20 p-4">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 flex items-center gap-2">
                <AlertTriangle size={20} className="text-alert-red" />
                Vehículos y Conductores con Múltiples Novedades Registradas
              </h3>
              <p className="text-xs text-fog-400 mt-1">
                Requieren acompañamiento pedagógico prioritario según las directrices del PESV para evitar incidentes.
              </p>
            </div>

            {placasReincidentes.length === 0 ? (
              <div className="rounded-xl border border-ok-green/30 bg-ok-green/10 p-8 text-center space-y-2">
                <CheckCircle2 size={24} className="text-ok-green mx-auto" />
                <h4 className="font-semibold text-paper-50 text-sm">Sin Reincidencias Críticas</h4>
                <p className="text-xs text-fog-400">
                  Actualmente ningún vehículo ha acumulado 2 o más novedades de severidad media/alta.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {placasReincidentes.map(([placa, evts]) => {
                  const primerEvento = evts[0];
                  return (
                    <Card key={placa} className="space-y-3">
                      <div className="flex items-center justify-between border-b border-line-600/70 pb-3">
                        <div className="flex items-center gap-3">
                          <PlateTag plate={placa} />
                          <div>
                            <p className="text-sm font-semibold text-paper-50">
                              {primerEvento.conductorNombre || "Sin conductor"}
                            </p>
                            <p className="text-xs font-mono text-fog-400">
                              {primerEvento.conductorTelefono || "Sin teléfono"}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-alert-red-dim px-2.5 py-1 text-xs font-mono font-bold text-alert-red border border-alert-red/30">
                          {evts.length} Novedades
                        </span>
                      </div>

                      <div className="space-y-2">
                        {evts.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between rounded-lg border border-line-600 bg-asphalt-950 p-2.5 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-paper-50">{e.descripcion}</p>
                              <p className="text-[10px] font-mono text-fog-400">
                                {new Date(e.fechaHora).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedEventoFeedback(e)}
                              className="inline-flex items-center gap-1 rounded bg-ok-green-dim px-2 py-1 text-[11px] font-mono font-semibold text-ok-green hover:bg-ok-green hover:text-asphalt-950 transition-colors border border-ok-green/30"
                            >
                              <Smartphone size={12} /> WhatsApp
                            </button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "ranking" && (
          <DriverScoreRanking
            scores={scores}
            mesSeleccionado={mesRanking}
            onCambiarMes={setMesRanking}
          />
        )}

        {activeTab === "conexion" && <N8nConnectionGuide />}
      </div>

      {/* Modal de Retroalimentación en 1 Clic */}
      <RetroalimentacionModal
        evento={selectedEventoFeedback}
        isOpen={!!selectedEventoFeedback}
        onClose={() => setSelectedEventoFeedback(null)}
        onFeedbackSent={(refreshed) => setEventos(refreshed)}
      />
    </div>
  );
}
