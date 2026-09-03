"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
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
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
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
import { QuickAsignacionModal } from "@/components/asignaciones/QuickAsignacionModal";

interface GpsMonitorClientViewProps {
  initialEventos: EventoGPS[];
  initialTotalCount?: number;
  initialScores: CalificacionConductorMensual[];
  conductores?: { id: string; nombres: string; apellidos: string; numeroDocumento?: string; contratistaNombre?: string }[];
  vehiculos?: { id: string; placa: string; marca?: string; modelo?: string; contratistaNombre?: string }[];
}

type TabType = "eventos" | "reincidencias" | "ranking" | "conexion";
type RangoFecha = "hoy" | "24h" | "7d" | "mes" | "todos" | "personalizado";

export function GpsMonitorClientView({
  initialEventos,
  initialTotalCount,
  initialScores,
  conductores = [],
  vehiculos = [],
}: GpsMonitorClientViewProps) {
  const [eventos, setEventos] = useState<EventoGPS[]>(initialEventos);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount || initialEventos.length);
  const [scores, setScores] = useState<CalificacionConductorMensual[]>(initialScores);
  const [activeTab, setActiveTab] = useState<TabType>("eventos");
  const [selectedEventoFeedback, setSelectedEventoFeedback] = useState<EventoGPS | null>(null);
  const [quickAssignModalOpen, setQuickAssignModalOpen] = useState(false);
  const [quickAssignPlaca, setQuickAssignPlaca] = useState("");
  
  // Filtros de Consulta
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("todas");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroPlaca, setFiltroPlaca] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [rangoFecha, setRangoFecha] = useState<RangoFecha>("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Paginación Ligera (20 por defecto)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [mesRanking, setMesRanking] = useState(new Date().toISOString().slice(0, 7));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString("es-CO"));

  // Función optimizada para consultar eventos con filtros en el backend
  const fetchEventos = useCallback(async (
    page: number = 1,
    size: number = 20,
    rango: RangoFecha = rangoFecha,
    placa: string = filtroPlaca,
    prioridad: string = filtroPrioridad,
    tipo: string = filtroTipo,
    desde: string = fechaDesde,
    hasta: string = fechaHasta
  ) => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limite", String(size));
      if (rango !== "todos") params.set("rango", rango);
      if (placa !== "todas") params.set("placa", placa);
      if (prioridad !== "todas") params.set("prioridad", prioridad);
      if (tipo !== "todos") params.set("tipo", tipo);
      if (rango === "personalizado") {
        if (desde) params.set("desde", desde);
        if (hasta) params.set("hasta", hasta);
      }

      const res = await fetch(`/api/gps/eventos?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.eventos) {
          setEventos(json.eventos);
          setTotalCount(json.totalCount || json.totalEventos || json.eventos.length);
          setCurrentPage(page);
          setLastUpdated(new Date().toLocaleTimeString("es-CO"));
        }
      }
    } catch (err) {
      console.warn("Error al consultar eventos GPS:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [rangoFecha, filtroPlaca, filtroPrioridad, filtroTipo, fechaDesde, fechaHasta]);

  // Refrescar al cambiar filtros principales
  const handleAplicarFiltros = (nuevoRango?: RangoFecha, nuevaPlaca?: string, nuevaPrioridad?: string, nuevoTipo?: string) => {
    const r = nuevoRango !== undefined ? nuevoRango : rangoFecha;
    const p = nuevaPlaca !== undefined ? nuevaPlaca : filtroPlaca;
    const pr = nuevaPrioridad !== undefined ? nuevaPrioridad : filtroPrioridad;
    const t = nuevoTipo !== undefined ? nuevoTipo : filtroTipo;
    
    if (nuevoRango !== undefined) setRangoFecha(nuevoRango);
    if (nuevaPlaca !== undefined) setFiltroPlaca(nuevaPlaca);
    if (nuevaPrioridad !== undefined) setFiltroPrioridad(nuevaPrioridad);
    if (nuevoTipo !== undefined) setFiltroTipo(nuevoTipo);

    fetchEventos(1, pageSize, r, p, pr, t);
  };

  // Polling periódico cada 25 segundos para reflejar n8n sin sobrecargar
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEventos(currentPage, pageSize);
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchEventos, currentPage, pageSize]);

  // Métricas en tiempo real
  const totalEventos = totalCount;
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

  // Filtrado local reactivo por búsqueda de texto
  const filteredEventos = eventos.filter((e) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchPlaca = e.placa.toLowerCase().includes(q);
    const matchConductor = e.conductorNombre?.toLowerCase().includes(q);
    const matchDesc = e.descripcion?.toLowerCase().includes(q);
    const matchUbicacion = e.ubicacion?.toLowerCase().includes(q);
    return matchPlaca || matchConductor || matchDesc || matchUbicacion;
  });

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const columns: Column<EventoGPS>[] = [
    {
      header: "Vehículo / Placa",
      accessor: "placa",
      render: (v) => <PlateTag plate={v as string} />,
    },
    {
      header: "Conductor Asignado",
      accessor: "conductorNombre",
      render: (v, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-paper-50">{v || "Sin conductor asignado"}</span>
            {!v || v === "Sin conductor asignado" ? (
              <button
                type="button"
                onClick={() => {
                  setQuickAssignPlaca(row.placa);
                  setQuickAssignModalOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded bg-signal-amber/20 hover:bg-signal-amber/30 text-signal-amber border border-signal-amber/40 px-1.5 py-0.5 text-[10px] font-bold font-mono transition-colors active:scale-95"
                title="Asignar conductor a este vehículo con 1 clic"
              >
                <Zap size={11} /> Asignar
              </button>
            ) : null}
          </div>
          {row.conductorTelefono ? (
            <span className="font-mono text-[10px] text-fog-400">Tel: {row.conductorTelefono}</span>
          ) : (
            <span className="font-mono text-[10px] text-fog-400/60 italic">Fuente: Asignación ERP</span>
          )}
        </div>
      ),
    },
    {
      header: "Fecha / Hora",
      accessor: "fechaHora",
      render: (v) => {
        const d = new Date(v as string);
        return (
          <div className="flex flex-col font-mono text-xs">
            <span className="font-medium text-paper-50">{d.toLocaleDateString("es-CO")}</span>
            <span className="text-fog-400 text-[11px]">{d.toLocaleTimeString("es-CO")}</span>
          </div>
        );
      },
    },
    {
      header: "Tipo de Novedad",
      accessor: "tipoEvento",
      render: (v, row) => {
        const tipo = v as TipoEventoGPS;
        const config = TIPO_EVENTO_LABELS[tipo] || { label: String(tipo), defaultPrioridad: "baja" };
        
        let Icon = Radio;
        let iconColor = "text-fog-400";
        if (tipo === "exceso_velocidad") {
          Icon = Gauge;
          iconColor = "text-alert-red";
        } else if (tipo === "frenada_brusca") {
          Icon = OctagonAlert;
          iconColor = "text-signal-amber";
        } else if (tipo === "acelerada_brusca") {
          Icon = Zap;
          iconColor = "text-signal-amber";
        } else if (tipo === "panico" || tipo === "desconexion") {
          Icon = AlertTriangle;
          iconColor = "text-alert-red";
        }

        let badgeBg = "bg-asphalt-800 border-line-600";
        if (row.prioridad === "alta") badgeBg = "bg-alert-red-dim border-alert-red/30";
        if (row.prioridad === "media") badgeBg = "bg-signal-amber-dim border-signal-amber/30";

        return (
          <div className="flex items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${badgeBg} ${iconColor}`}>
              <Icon size={14} />
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-xs text-paper-50 leading-tight">{config.label}</span>
              {row.descripcion && (
                <span className="text-[10px] text-fog-400 line-clamp-1 max-w-[180px]">{row.descripcion}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Severidad",
      accessor: "prioridad",
      render: (v) => {
        const p = v as PrioridadEventoGPS;
        const conf = PRIORIDAD_EVENTO_LABELS[p] || { label: String(p), badgeClass: "bg-asphalt-800 text-fog-400 border-line-600" };
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${conf.badgeClass}`}>
            {conf.label}
          </span>
        );
      },
    },
    {
      header: "Telemetría (Vel / Km)",
      accessor: "velocidad",
      render: (v, row) => {
        const vel = v as number | undefined;
        const lim = row.limiteVelocidad;
        const exceso = vel !== undefined && lim !== undefined && vel > lim;

        return (
          <div className="flex flex-col font-mono text-xs">
            {vel !== undefined ? (
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${exceso ? "text-alert-red" : "text-paper-50"}`}>
                  {vel} km/h
                </span>
                {lim && <span className="text-fog-400 text-[10px]">/ Máx {lim}</span>}
              </div>
            ) : (
              <span className="text-fog-400/60">—</span>
            )}
            {row.ubicacion && (
              <span className="text-[10px] text-fog-400 line-clamp-1 max-w-[160px] flex items-center gap-1">
                <MapPin size={10} className="shrink-0 text-radar-cyan" />
                {row.ubicacion}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Gestión HSE",
      accessor: "estadoRetroalimentacion",
      render: (v, row) => {
        const estado = (v || "pendiente") as string;
        const esGestionado = estado === "completada";

        return (
          <div className="flex items-center gap-2">
            {esGestionado ? (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold bg-ok-green-dim text-ok-green border border-ok-green/30">
                <CheckCircle2 size={12} /> Gestionado
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedEventoFeedback(row)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line-500 bg-asphalt-800 hover:bg-radar-cyan/15 hover:border-radar-cyan/40 px-2.5 py-1 text-xs font-semibold text-paper-50 hover:text-radar-cyan transition-colors active:scale-95"
              >
                <MessageSquare size={13} className="text-radar-cyan" />
                <span>Notificar</span>
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-radar-cyan font-semibold uppercase tracking-wider mb-1">
            <Radio size={16} className="text-radar-cyan animate-pulse" />
            <span>Módulo de Telemetría Satelcopro en Vivo</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-paper-50">
            Control de Flota, GPS &amp; Scoring de Conductores
          </h1>
          <p className="text-xs sm:text-sm text-fog-400 mt-1 max-w-2xl">
            Monitoreo en tiempo real de excesos de velocidad, frenadas bruscas y eventos de seguridad vial.
          </p>
        </div>

        {/* Botón de Refresco Manual */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-fog-400 hidden sm:inline">
            Última sync: {lastUpdated}
          </span>
          <button
            type="button"
            onClick={() => fetchEventos(currentPage, pageSize)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-line-500 bg-asphalt-900 px-3.5 py-2 text-xs font-semibold text-paper-50 hover:bg-asphalt-800 transition-colors active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-signal-amber" : "text-radar-cyan"} />
            <span>{isRefreshing ? "Consultando..." : "Actualizar"}</span>
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
        <StatCard label="Total en Base de Datos" value={totalCount} accent="cyan" trend="Eventos Satelcopro" />
        <StatCard label="Críticos del Lote" value={criticos} accent="amber" trend="Velocidad / Pánico" />
        <StatCard label="Vehículos Reincidentes" value={placasReincidentes.length} accent="amber" trend="≥ 2 novedades" />
        <StatCard label="Pendientes Gestión" value={pendientes} accent="green" trend="Por notificar" />
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
          <span>Monitor de Eventos ({totalCount})</span>
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
            {/* Barra de Filtros Rápida por Rango Temporal */}
            <div className="bg-asphalt-900 border border-line-600 rounded-xl p-3 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-mono font-semibold text-fog-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                    <Calendar size={13} className="text-radar-cyan" /> Rango:
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleAplicarFiltros("hoy")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      rangoFecha === "hoy"
                        ? "bg-radar-cyan text-asphalt-950 font-bold shadow-sm"
                        : "bg-asphalt-800 text-fog-400 hover:text-paper-50 hover:bg-asphalt-700 border border-line-600"
                    }`}
                  >
                    📅 Hoy
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAplicarFiltros("24h")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      rangoFecha === "24h"
                        ? "bg-radar-cyan text-asphalt-950 font-bold shadow-sm"
                        : "bg-asphalt-800 text-fog-400 hover:text-paper-50 hover:bg-asphalt-700 border border-line-600"
                    }`}
                  >
                    ⏱️ Últimas 24h
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAplicarFiltros("7d")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      rangoFecha === "7d"
                        ? "bg-radar-cyan text-asphalt-950 font-bold shadow-sm"
                        : "bg-asphalt-800 text-fog-400 hover:text-paper-50 hover:bg-asphalt-700 border border-line-600"
                    }`}
                  >
                    📆 7 Días
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAplicarFiltros("mes")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      rangoFecha === "mes"
                        ? "bg-radar-cyan text-asphalt-950 font-bold shadow-sm"
                        : "bg-asphalt-800 text-fog-400 hover:text-paper-50 hover:bg-asphalt-700 border border-line-600"
                    }`}
                  >
                    🗓️ Este Mes
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAplicarFiltros("todos")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      rangoFecha === "todos"
                        ? "bg-radar-cyan text-asphalt-950 font-bold shadow-sm"
                        : "bg-asphalt-800 text-fog-400 hover:text-paper-50 hover:bg-asphalt-700 border border-line-600"
                    }`}
                  >
                    🌐 Todo el Historial
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAplicarFiltros("personalizado")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                      rangoFecha === "personalizado"
                        ? "bg-radar-cyan text-asphalt-950 font-bold shadow-sm"
                        : "bg-asphalt-800 text-fog-400 hover:text-paper-50 hover:bg-asphalt-700 border border-line-600"
                    }`}
                  >
                    ⚙️ Personalizado
                  </button>
                </div>

                {/* Selector de Placa Rápido */}
                <div className="flex items-center gap-2">
                  <select
                    value={filtroPlaca}
                    onChange={(e) => handleAplicarFiltros(undefined, e.target.value)}
                    className="rounded-lg border border-line-600 bg-asphalt-950 px-3 py-1.5 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                  >
                    <option value="todas">Todos los Vehículos ({vehiculos.length})</option>
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.placa}>
                        {v.placa} ({v.marca || "Vehículo"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rango Personalizado de Fechas (Si aplica) */}
              {rangoFecha === "personalizado" && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line-600/60 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fog-400 font-mono">Desde:</span>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fog-400 font-mono">Hasta:</span>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAplicarFiltros("personalizado")}
                    className="px-3 py-1 bg-radar-cyan text-asphalt-950 font-bold rounded-lg text-xs uppercase tracking-wider"
                  >
                    Filtrar Rango
                  </button>
                </div>
              )}

              {/* Filtros Secundarios: Severidad, Tipo y Búsqueda */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line-600/60">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filtroPrioridad}
                    onChange={(e) => handleAplicarFiltros(undefined, undefined, e.target.value)}
                    className="rounded-lg border border-line-600 bg-asphalt-950 px-3 py-1.5 text-xs text-paper-50 font-mono focus:border-signal-amber focus:outline-none"
                  >
                    <option value="todas">Todas las severidades</option>
                    <option value="alta">🔴 Alta / Crítica</option>
                    <option value="media">🟡 Media</option>
                    <option value="baja">🔵 Informativa</option>
                  </select>

                  <select
                    value={filtroTipo}
                    onChange={(e) => handleAplicarFiltros(undefined, undefined, undefined, e.target.value)}
                    className="rounded-lg border border-line-600 bg-asphalt-950 px-3 py-1.5 text-xs text-paper-50 font-mono focus:border-signal-amber focus:outline-none"
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
                    placeholder="Filtrar por conductor, tramo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-line-600 bg-asphalt-950 px-3 py-1.5 text-xs text-paper-50 placeholder:text-fog-400 focus:border-signal-amber focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Banner Informativo si no hay eventos */}
            {eventos.length === 0 ? (
              <div className="rounded-xl border border-radar-cyan/30 bg-radar-cyan/10 p-8 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-radar-cyan/20 text-radar-cyan mx-auto">
                  <Radio size={24} className="animate-pulse" />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
                  No se encontraron eventos con los filtros seleccionados
                </h3>
                <p className="text-xs text-fog-400 max-w-md mx-auto">
                  Prueba cambiando el rango temporal o seleccionando &quot;Todo el Historial&quot; para consultar los {totalCount} registros de la base de datos.
                </p>
                <button
                  type="button"
                  onClick={() => handleAplicarFiltros("todos", "todas", "todas", "todos")}
                  className="px-4 py-2 bg-radar-cyan text-asphalt-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Card className="p-0 overflow-hidden">
                  <DataTable columns={columns} data={filteredEventos} />
                </Card>

                {/* Barra de Paginación Inteligente */}
                <div className="bg-asphalt-900 border border-line-600 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-mono text-fog-400">
                    <span>
                      Mostrando <strong className="text-paper-50">{(currentPage - 1) * pageSize + 1}</strong> –{" "}
                      <strong className="text-paper-50">
                        {Math.min(currentPage * pageSize, totalCount)}
                      </strong>{" "}
                      de <strong className="text-radar-cyan">{totalCount}</strong> eventos
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Selector de Tamaño de Página */}
                    <div className="flex items-center gap-1.5 font-mono text-fog-400">
                      <span>Ver:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          const newSize = parseInt(e.target.value, 10);
                          setPageSize(newSize);
                          fetchEventos(1, newSize);
                        }}
                        className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                      >
                        <option value={20}>20 por página</option>
                        <option value={50}>50 por página</option>
                        <option value={100}>100 por página</option>
                      </select>
                    </div>

                    {/* Botones de Navegación de Página */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fetchEventos(currentPage - 1, pageSize)}
                        disabled={currentPage <= 1 || isRefreshing}
                        className="p-1.5 rounded-lg border border-line-600 bg-asphalt-950 text-paper-50 hover:bg-asphalt-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        title="Página anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <span className="font-mono text-xs text-paper-50 px-2 font-semibold">
                        {currentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => fetchEventos(currentPage + 1, pageSize)}
                        disabled={currentPage >= totalPages || isRefreshing}
                        className="p-1.5 rounded-lg border border-line-600 bg-asphalt-950 text-paper-50 hover:bg-asphalt-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        title="Página siguiente"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="rounded-xl border border-ok-green/30 bg-ok-green-dim/10 p-6 text-center text-xs text-ok-green flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                <span>Excelente: No hay vehículos con alertas críticas reincidentes en este lote.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {placasReincidentes.map(([placa, evts]) => {
                  const conductor = evts.find((x) => x.conductorNombre)?.conductorNombre || "Sin conductor asignado";
                  const ultEvt = evts[0];
                  return (
                    <Card key={placa} className="space-y-3 border-alert-red/30">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <PlateTag plate={placa} />
                          <div>
                            <h4 className="font-bold text-sm text-paper-50">{conductor}</h4>
                            <span className="text-[10px] font-mono text-fog-400">
                              {evts.length} novedades detectadas
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full bg-alert-red-dim text-alert-red font-mono text-[10px] font-bold px-2 py-0.5 border border-alert-red/30">
                          {evts.length} Alertas
                        </span>
                      </div>

                      <div className="rounded-lg bg-asphalt-950 p-2.5 text-xs font-mono space-y-1 text-fog-400">
                        <div className="flex justify-between">
                          <span>Última novedad:</span>
                          <span className="text-paper-50 font-semibold">{ultEvt.tipoEvento}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Velocidad reg.:</span>
                          <span className="text-alert-red font-bold">{ultEvt.velocidad || "—"} km/h</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedEventoFeedback(ultEvt)}
                          className="px-3 py-1.5 rounded-lg bg-radar-cyan hover:bg-radar-cyan/90 text-asphalt-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Smartphone size={13} />
                          <span>Retroalimentar Conductor</span>
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "ranking" && (
          <DriverScoreRanking scores={scores} mesSeleccionado={mesRanking} onCambiarMes={setMesRanking} />
        )}

        {activeTab === "conexion" && <N8nConnectionGuide />}
      </div>

      {/* Modal de Retroalimentación HSE */}
      <RetroalimentacionModal
        isOpen={!!selectedEventoFeedback}
        evento={selectedEventoFeedback}
        onClose={() => setSelectedEventoFeedback(null)}
        onFeedbackSent={() => {
          setSelectedEventoFeedback(null);
          fetchEventos(currentPage, pageSize);
        }}
      />

      {/* Modal de Asignación Rápida 1-Click */}
      <QuickAsignacionModal
        isOpen={quickAssignModalOpen}
        initialPlaca={quickAssignPlaca}
        conductores={conductores}
        vehiculos={vehiculos}
        onClose={() => {
          setQuickAssignModalOpen(false);
          setQuickAssignPlaca("");
        }}
        onSuccess={() => {
          fetchEventos(currentPage, pageSize);
        }}
      />
    </div>
  );
}
