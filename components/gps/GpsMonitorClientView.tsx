"use client";

import { useState, useEffect, useCallback } from "react";
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
  Calendar,
  Sparkles,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Moon,
  Send,
  Loader2,
  Check,
  Share2,
} from "lucide-react";
import {
  EventoGPS,
  TipoEventoGPS,
  PrioridadEventoGPS,
  CalificacionConductorMensual,
  TIPO_EVENTO_LABELS,
  PRIORIDAD_EVENTO_LABELS,
} from "@/lib/types/gps";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PlateTag } from "@/components/ui/PlateTag";
import { MultiSelectDropdown, MultiSelectOption } from "@/components/gps/MultiSelectDropdown";
import { RetroalimentacionModal } from "@/components/gps/RetroalimentacionModal";
import { ControlNocturnoView } from "@/components/gps/ControlNocturnoView";
import { DriverScoreRanking } from "@/components/gps/DriverScoreRanking";
import { N8nConnectionGuide } from "@/components/gps/N8nConnectionGuide";
import { generarMensajeReincidenciaWhatsApp } from "@/lib/utils/gps-scoring";
import { marcarRetroalimentacionDb } from "@/lib/services/gps.service";
import { generateTelemetriaPDF } from "@/lib/utils/pdfTelemetriaGenerator";
import { generateTelemetriaExcel } from "@/lib/utils/excelTelemetriaGenerator";
import { QuickAsignacionModal } from "@/components/asignaciones/QuickAsignacionModal";
import { CierreDiarioModal } from "@/components/gps/CierreDiarioModal";

interface GpsMonitorClientViewProps {
  initialEventos: EventoGPS[];
  initialTotalCount?: number;
  initialScores: CalificacionConductorMensual[];
  conductores?: { id: string; nombres: string; apellidos: string; numeroDocumento?: string; contratistaNombre?: string }[];
  vehiculos?: { id: string; placa: string; marca?: string; modelo?: string; contratistaNombre?: string }[];
}

type TabType = "eventos" | "reincidencias" | "nocturno" | "ranking" | "conexion";
type RangoFecha = "hoy" | "24h" | "7d" | "15d" | "mes" | "todos" | "personalizado";

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
  const [cierreDiarioModalOpen, setCierreDiarioModalOpen] = useState(false);

  // Filtros Multi-Criterio Flexibles
  const [selectedPlacas, setSelectedPlacas] = useState<string[]>([]); // vacio = todas
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]); // vacio = todos
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("todas");
  const [filtroGestion, setFiltroGestion] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [rangoFecha, setRangoFecha] = useState<RangoFecha>("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Estados de exportación
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [mesRanking, setMesRanking] = useState(new Date().toISOString().slice(0, 7));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString("es-CO"));

  // Consulta optimizada a la API con soporte para filtros múltiples
  const fetchEventos = useCallback(
    async (
      page: number = 1,
      size: number = 20,
      rango: RangoFecha = rangoFecha,
      placas: string[] = selectedPlacas,
      prioridad: string = filtroPrioridad,
      tipos: string[] = selectedTipos,
      desde: string = fechaDesde,
      hasta: string = fechaHasta
    ) => {
      setIsRefreshing(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limite", String(size));
        if (rango !== "todos") params.set("rango", rango);
        if (placas.length > 0) params.set("placas", placas.join(","));
        if (prioridad !== "todas") params.set("prioridad", prioridad);
        if (tipos.length > 0) params.set("tipos", tipos.join(","));
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
    },
    [rangoFecha, selectedPlacas, filtroPrioridad, selectedTipos, fechaDesde, fechaHasta]
  );

  // Refrescar al cambiar filtros principales
  const handleAplicarFiltros = (
    nuevoRango?: RangoFecha,
    nuevasPlacas?: string[],
    nuevaPrioridad?: string,
    nuevosTipos?: string[]
  ) => {
    const r = nuevoRango !== undefined ? nuevoRango : rangoFecha;
    const p = nuevasPlacas !== undefined ? nuevasPlacas : selectedPlacas;
    const pr = nuevaPrioridad !== undefined ? nuevaPrioridad : filtroPrioridad;
    const t = nuevosTipos !== undefined ? nuevosTipos : selectedTipos;

    if (nuevoRango !== undefined) setRangoFecha(nuevoRango);
    if (nuevasPlacas !== undefined) setSelectedPlacas(nuevasPlacas);
    if (nuevaPrioridad !== undefined) setFiltroPrioridad(nuevaPrioridad);
    if (nuevosTipos !== undefined) setSelectedTipos(nuevosTipos);

    fetchEventos(1, pageSize, r, p, pr, t);
  };

  // Polling periódico cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEventos(currentPage, pageSize);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchEventos, currentPage, pageSize]);

  // Métricas en tiempo real
  const totalEventos = totalCount;
  const criticos = eventos.filter((e) => e.prioridad === "alta").length;
  const nocturnos = eventos.filter((e) => {
    const h = new Date(e.fechaHora).getHours();
    return h >= 22 || h < 5;
  }).length;

  // Detección de Reincidencias por placa
  const reincidenciasMap: Record<string, EventoGPS[]> = {};
  eventos.forEach((e) => {
    if (!reincidenciasMap[e.placa]) reincidenciasMap[e.placa] = [];
    reincidenciasMap[e.placa].push(e);
  });

  const placasReincidentes = Object.entries(reincidenciasMap).filter(
    ([_, evts]) => evts.filter((x) => x.prioridad !== "baja").length >= 2
  );

  // Filtrado reactivo en memoria para búsqueda de texto y estado de gestión
  const filteredEventos = eventos.filter((e) => {
    if (filtroGestion !== "todas") {
      if (filtroGestion === "pendiente" && e.estadoRetroalimentacion !== "pendiente") return false;
      if (filtroGestion === "enviada_whatsapp" && e.estadoRetroalimentacion !== "enviada_whatsapp") return false;
      if (filtroGestion === "resuelta" && e.estadoRetroalimentacion !== "resuelta") return false;
    }

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchPlaca = e.placa.toLowerCase().includes(q);
    const matchConductor = e.conductorNombre?.toLowerCase().includes(q);
    const matchDesc = e.descripcion?.toLowerCase().includes(q);
    const matchUbicacion = e.ubicacion?.toLowerCase().includes(q);
    return matchPlaca || matchConductor || matchDesc || matchUbicacion;
  });

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Opciones para el MultiSelect de Vehículos
  const vehiculoOptions: MultiSelectOption[] = vehiculos.map((v) => ({
    value: v.placa,
    label: v.placa,
    subtitle: v.marca ? `${v.marca} ${v.modelo || ""}` : v.contratistaNombre || "Vehículo",
    badge: v.contratistaNombre ? "Contratista" : undefined,
  }));

  // Opciones para el MultiSelect de Tipos de Eventos
  const tipoEventoOptions: MultiSelectOption[] = Object.entries(TIPO_EVENTO_LABELS).map(([key, val]) => ({
    value: key,
    label: val.label,
    badge: val.defaultPrioridad === "alta" ? "Crítico" : val.defaultPrioridad === "media" ? "Medio" : "Info",
    badgeClass:
      val.defaultPrioridad === "alta"
        ? "bg-alert-red-dim text-alert-red border-alert-red/30"
        : val.defaultPrioridad === "media"
        ? "bg-signal-amber-dim text-signal-amber border-signal-amber/30"
        : "bg-radar-cyan-dim text-radar-cyan border-radar-cyan/30",
  }));

  // Manejador de Descarga en PDF
  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      let rangoDesc = "Historial Completo";
      if (rangoFecha === "hoy") rangoDesc = "Solo Hoy";
      else if (rangoFecha === "24h") rangoDesc = "Últimas 24h";
      else if (rangoFecha === "7d") rangoDesc = "Últimos 7 Días";
      else if (rangoFecha === "15d") rangoDesc = "Últimos 15 Días";
      else if (rangoFecha === "mes") rangoDesc = "Este Mes";
      else if (rangoFecha === "personalizado") rangoDesc = `${fechaDesde || "Inicio"} a ${fechaHasta || "Fin"}`;

      const vehDesc =
        selectedPlacas.length === 0
          ? "Todos los vehículos"
          : selectedPlacas.length <= 3
          ? selectedPlacas.join(", ")
          : `${selectedPlacas.length} vehículos seleccionados`;

      const evtsDesc =
        selectedTipos.length === 0
          ? "Todos los eventos"
          : selectedTipos.length <= 2
          ? selectedTipos.map((t) => TIPO_EVENTO_LABELS[t as TipoEventoGPS]?.label || t).join(", ")
          : `${selectedTipos.length} tipos de evento`;

      await generateTelemetriaPDF(filteredEventos, {
        rangoFechas: rangoDesc,
        vehiculosFiltrados: vehDesc,
        eventosFiltrados: evtsDesc,
        totalEventos: filteredEventos.length,
        criticosCount: filteredEventos.filter((e) => e.prioridad === "alta").length,
        nocturnosCount: filteredEventos.filter((e) => {
          const h = new Date(e.fechaHora).getHours();
          return h >= 22 || h < 5;
        }).length,
      });
    } catch (err) {
      console.error("Error al exportar PDF de telemetría:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Manejador de Descarga en Excel
  const handleExportExcel = () => {
    setIsExportingExcel(true);
    try {
      generateTelemetriaExcel(filteredEventos, {
        rangoFechas: rangoFecha,
        vehiculosFiltrados: selectedPlacas.join(", ") || "Todos",
        eventosFiltrados: selectedTipos.join(", ") || "Todos",
      });
    } catch (err) {
      console.error("Error al exportar Excel de telemetría:", err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Notificación de reincidencia directa por WhatsApp
  const handleNotificarReincidenciaWhatsApp = async (
    conductorNombre: string,
    placa: string,
    phone: string | undefined,
    evts: EventoGPS[]
  ) => {
    const rawDigits = (phone || "").replace(/[^0-9]/g, "");
    const cleanPhone = rawDigits.length === 10 ? `57${rawDigits}` : rawDigits;
    const msg = generarMensajeReincidenciaWhatsApp(conductorNombre, placa, evts);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank");

    // Marcar el último evento como gestionado
    if (evts[0]?.id) {
      await marcarRetroalimentacionDb(evts[0].id, "whatsapp", "Notificado por reincidencia reiterada.");
      fetchEventos(currentPage, pageSize);
    }
  };

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
        const hour = d.getHours();
        const esNocturno = hour >= 22 || hour < 5;

        return (
          <div className="flex flex-col font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-paper-50">{d.toLocaleDateString("es-CO")}</span>
              {esNocturno && (
                <span
                  className="inline-flex items-center gap-0.5 px-1 rounded bg-signal-amber-dim text-signal-amber text-[9px] font-bold border border-signal-amber/30"
                  title="Evento fuera de horario permitido (>10:00 PM)"
                >
                  <Moon size={9} /> Noche
                </span>
              )}
            </div>
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
        const conf = PRIORIDAD_EVENTO_LABELS[p] || {
          label: String(p),
          badgeClass: "bg-asphalt-800 text-fog-400 border-line-600",
        };
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${conf.badgeClass}`}
          >
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
                <span className={`font-bold ${exceso ? "text-alert-red" : "text-paper-50"}`}>{vel} km/h</span>
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
        const esGestionado = estado === "enviada_whatsapp" || estado === "resuelta";

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
    <div className="space-y-4">
      {/* Cabecera del Módulo & Métricas en Tiempo Real */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600/70 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-radar-cyan font-semibold uppercase tracking-wider">
            <Radio size={15} className="text-radar-cyan animate-pulse" />
            <span>Módulo de Telemetría Satelcopro en Vivo</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-paper-50 mt-0.5">
            Control de Flota, GPS &amp; Scoring PESV
          </h1>
        </div>

        {/* Acciones de Exportación, Balance Diario & Actualización */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Cierre Diario PESV */}
          <button
            type="button"
            onClick={() => setCierreDiarioModalOpen(true)}
            disabled={eventos.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-radar-cyan/40 bg-radar-cyan-dim/25 hover:bg-radar-cyan/20 px-3 py-1 text-xs font-semibold text-radar-cyan transition-colors active:scale-95 disabled:opacity-50"
            title="Generar y enviar balance consolidado diario por WhatsApp a los conductores"
          >
            <Sparkles size={13} className="text-radar-cyan animate-pulse" />
            <span>Cierre Diario PESV</span>
          </button>

          {/* Botón Exportar Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel || eventos.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ok-green/40 bg-ok-green-dim/20 hover:bg-ok-green/20 px-3 py-1 text-xs font-semibold text-ok-green transition-colors active:scale-95 disabled:opacity-50"
            title="Descargar reporte estructurado en Excel (.xlsx)"
          >
            {isExportingExcel ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
            <span>Exportar Excel</span>
          </button>

          {/* Botón Exportar PDF Oficial */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf || eventos.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-500 bg-asphalt-800 hover:bg-asphalt-700 px-3 py-1 text-xs font-semibold text-paper-50 transition-colors active:scale-95 disabled:opacity-50"
            title="Descargar informe oficial en PDF TEL-FOR-01"
          >
            {isExportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            <span>Descargar PDF</span>
          </button>

          {/* Botón de Sincronización */}
          <button
            type="button"
            onClick={() => fetchEventos(currentPage, pageSize)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line-500 bg-asphalt-800 hover:bg-asphalt-700 px-3 py-1 text-xs font-semibold text-paper-50 transition-colors active:scale-95 disabled:opacity-50"
            title={`Última sync: ${lastUpdated}`}
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-signal-amber" : "text-radar-cyan"} />
            <span>{isRefreshing ? "Sincronizando..." : "Actualizar"}</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo GPS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line-600 pb-1.5">
        <button
          type="button"
          onClick={() => setActiveTab("eventos")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "eventos"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Radio size={14} className={activeTab === "eventos" ? "text-signal-amber" : ""} />
          <span>Monitor de Eventos</span>
          <span className="ml-1 rounded-full bg-asphalt-950 px-1.5 py-0.2 text-[10px] font-mono text-fog-400 border border-line-600">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reincidencias")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "reincidencias"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <AlertTriangle size={14} className={activeTab === "reincidencias" ? "text-alert-red" : ""} />
          <span>Alertas de Reincidencia</span>
          {placasReincidentes.length > 0 && (
            <span className="ml-1 rounded-full bg-alert-red-dim px-1.5 py-0.2 text-[10px] font-mono text-alert-red font-bold border border-alert-red/30 animate-pulse">
              {placasReincidentes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("nocturno")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "nocturno"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Moon size={14} className={activeTab === "nocturno" ? "text-signal-amber" : ""} />
          <span>Control Nocturno (&gt;10 PM)</span>
          {nocturnos > 0 && (
            <span className="ml-1 rounded-full bg-signal-amber-dim px-1.5 py-0.2 text-[10px] font-mono text-signal-amber font-bold border border-signal-amber/30">
              {nocturnos}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ranking")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "ranking"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Trophy size={14} className={activeTab === "ranking" ? "text-signal-amber" : ""} />
          <span>Scoring Mensual (Driver Score)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conexion")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "conexion"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Zap size={14} className={activeTab === "conexion" ? "text-radar-cyan" : ""} />
          <span>Conexión n8n</span>
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div>
        {activeTab === "eventos" && (
          <div className="space-y-3">
            {/* Barra de Filtros Multi-Criterio Avanzados */}
            <div className="bg-asphalt-900 border border-line-600 rounded-xl p-3 space-y-2.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Buscador Universal */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" />
                  <input
                    type="text"
                    placeholder="Buscar por placa, conductor, tramo o novedad..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-line-600 bg-asphalt-950 pl-8 pr-3 py-1.5 text-xs text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none font-mono"
                  />
                </div>

                {/* Filtros Dropdowns Multi-Selección */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Selector de Rango Temporal */}
                  <select
                    value={rangoFecha}
                    onChange={(e) => handleAplicarFiltros(e.target.value as RangoFecha)}
                    className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                  >
                    <option value="todos">🌐 Todo el Historial</option>
                    <option value="hoy">📅 Solo Hoy</option>
                    <option value="24h">⏱️ Últimas 24h</option>
                    <option value="7d">📆 Últimos 7 Días</option>
                    <option value="15d">🗓️ Últimos 15 Días</option>
                    <option value="mes">🗓️ Este Mes</option>
                    <option value="personalizado">⚙️ Personalizado (Desde/Hasta)</option>
                  </select>

                  {/* MultiSelect de Vehículos */}
                  <MultiSelectDropdown
                    label="Vehículos"
                    options={vehiculoOptions}
                    selectedValues={selectedPlacas}
                    onChange={(vals) => handleAplicarFiltros(undefined, vals)}
                    allLabel="Todos los Vehículos"
                  />

                  {/* MultiSelect de Tipos de Eventos */}
                  <MultiSelectDropdown
                    label="Eventos"
                    options={tipoEventoOptions}
                    selectedValues={selectedTipos}
                    onChange={(vals) => handleAplicarFiltros(undefined, undefined, undefined, vals)}
                    allLabel="Todos los Eventos"
                  />

                  {/* Selector de Severidad */}
                  <select
                    value={filtroPrioridad}
                    onChange={(e) => handleAplicarFiltros(undefined, undefined, e.target.value)}
                    className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-signal-amber focus:outline-none"
                  >
                    <option value="todas">Todas Severidades</option>
                    <option value="alta">🔴 Crítica / Alta</option>
                    <option value="media">🟡 Media</option>
                    <option value="baja">🔵 Informativa</option>
                  </select>

                  {/* Selector de Estado Gestión HSE */}
                  <select
                    value={filtroGestion}
                    onChange={(e) => setFiltroGestion(e.target.value)}
                    className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                  >
                    <option value="todas">Toda Gestión</option>
                    <option value="pendiente">⏳ Pendiente</option>
                    <option value="enviada_whatsapp">📲 Notificado WA</option>
                    <option value="resuelta">✅ Cerrado</option>
                  </select>
                </div>
              </div>

              {/* Rango Personalizado de Fechas (Si seleccionó personalizado) */}
              {rangoFecha === "personalizado" && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line-600/60 text-xs font-mono">
                  <span className="text-fog-400">Desde:</span>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="rounded-md border border-line-600 bg-asphalt-950 px-2 py-1 text-xs text-paper-50"
                  />
                  <span className="text-fog-400">Hasta:</span>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="rounded-md border border-line-600 bg-asphalt-950 px-2 py-1 text-xs text-paper-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleAplicarFiltros("personalizado")}
                    className="px-3 py-1 bg-radar-cyan hover:bg-radar-cyan/90 text-asphalt-950 font-bold rounded-md uppercase tracking-wider text-[11px] transition-colors"
                  >
                    Aplicar Rango
                  </button>
                </div>
              )}

              {/* Resumen de Filtros Activos si hay selecciones */}
              {(selectedPlacas.length > 0 || selectedTipos.length > 0 || filtroPrioridad !== "todas" || filtroGestion !== "todas") && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono text-fog-400">
                  <span>Filtros activos:</span>
                  {selectedPlacas.length > 0 && (
                    <span className="rounded bg-asphalt-950 px-2 py-0.5 border border-line-600 text-paper-50">
                      {selectedPlacas.length} vehículos
                    </span>
                  )}
                  {selectedTipos.length > 0 && (
                    <span className="rounded bg-asphalt-950 px-2 py-0.5 border border-line-600 text-paper-50">
                      {selectedTipos.length} tipos de evento
                    </span>
                  )}
                  {filtroPrioridad !== "todas" && (
                    <span className="rounded bg-asphalt-950 px-2 py-0.5 border border-line-600 text-signal-amber font-bold">
                      Severidad: {filtroPrioridad}
                    </span>
                  )}
                  {filtroGestion !== "todas" && (
                    <span className="rounded bg-asphalt-950 px-2 py-0.5 border border-line-600 text-radar-cyan font-bold">
                      Gestión: {filtroGestion}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlacas([]);
                      setSelectedTipos([]);
                      setFiltroPrioridad("todas");
                      setFiltroGestion("todas");
                      handleAplicarFiltros("todos", [], "todas", []);
                    }}
                    className="text-alert-red hover:underline ml-2"
                  >
                    Limpiar todos los filtros
                  </button>
                </div>
              )}
            </div>

            {/* Banner Informativo si no hay eventos */}
            {eventos.length === 0 ? (
              <div className="rounded-xl border border-radar-cyan/30 bg-radar-cyan/10 p-8 text-center space-y-2">
                <Radio size={24} className="text-radar-cyan mx-auto animate-pulse" />
                <h3 className="font-bold text-sm text-paper-50">
                  No se encontraron eventos con los filtros seleccionados
                </h3>
                <p className="text-xs text-fog-400">
                  Prueba cambiando el rango temporal, los vehículos o los tipos de eventos elegidos.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlacas([]);
                    setSelectedTipos([]);
                    setFiltroPrioridad("todas");
                    setFiltroGestion("todas");
                    handleAplicarFiltros("todos", [], "todas", []);
                  }}
                  className="px-3.5 py-1.5 bg-radar-cyan text-asphalt-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm"
                >
                  Ver Todo el Historial ({totalCount})
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <Card className="p-0 overflow-hidden">
                  <DataTable columns={columns} data={filteredEventos} />
                </Card>

                {/* Barra de Paginación Compacta */}
                <div className="bg-asphalt-900 border border-line-600 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-mono text-fog-400">
                    <span>
                      Mostrando <strong className="text-paper-50">{(currentPage - 1) * pageSize + 1}</strong> –{" "}
                      <strong className="text-paper-50">{Math.min(currentPage * pageSize, totalCount)}</strong> de{" "}
                      <strong className="text-radar-cyan">{totalCount}</strong> eventos
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-mono text-fog-400">
                      <span>Ver:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          const newSize = parseInt(e.target.value, 10);
                          setPageSize(newSize);
                          fetchEventos(1, newSize);
                        }}
                        className="rounded-md border border-line-600 bg-asphalt-950 px-2 py-0.5 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                      >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => fetchEventos(currentPage - 1, pageSize)}
                        disabled={currentPage <= 1 || isRefreshing}
                        className="p-1 rounded-md border border-line-600 bg-asphalt-950 text-paper-50 hover:bg-asphalt-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        title="Página anterior"
                      >
                        <ChevronLeft size={15} />
                      </button>

                      <span className="font-mono text-xs text-paper-50 px-2 font-semibold">
                        {currentPage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => fetchEventos(currentPage + 1, pageSize)}
                        disabled={currentPage >= totalPages || isRefreshing}
                        className="p-1 rounded-md border border-line-600 bg-asphalt-950 text-paper-50 hover:bg-asphalt-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        title="Página siguiente"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Alertas de Reincidencia & Automatización WhatsApp */}
        {activeTab === "reincidencias" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-alert-red/40 bg-alert-red-dim/20 p-4">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 flex items-center gap-2">
                <AlertTriangle size={20} className="text-alert-red" />
                Matriz de Reincidencia en Seguridad Vial (PESV)
              </h3>
              <p className="text-xs text-fog-400 mt-1 max-w-3xl">
                Detección automática de conductores y vehículos que acumulan 2 o más novedades operativas (excesos de
                velocidad, frenadas o aceleradas bruscas). Permite generar retroalimentaciones pedagógicas con envío
                directo a WhatsApp y registro en base de datos.
              </p>
            </div>

            {placasReincidentes.length === 0 ? (
              <div className="rounded-xl border border-ok-green/30 bg-ok-green-dim/10 p-8 text-center text-xs text-ok-green flex flex-col items-center justify-center gap-2">
                <CheckCircle2 size={24} />
                <span className="font-bold text-sm">
                  Excelente: No hay vehículos con alertas críticas reincidentes en este lote.
                </span>
                <p className="text-fog-400 max-w-md">
                  El comportamiento de la flota se mantiene dentro de los umbrales seguros del PESV.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {placasReincidentes.map(([placa, evts]) => {
                  const conductor = evts.find((x) => x.conductorNombre)?.conductorNombre || "Sin conductor asignado";
                  const conductorTel = evts.find((x) => x.conductorTelefono)?.conductorTelefono;
                  const ultEvt = evts[0];
                  const nivelRiesgo = evts.length >= 3 ? "CRÍTICO (3+ Faltas)" : "ALTO (2 Faltas)";

                  return (
                    <Card key={placa} className="space-y-3 border-alert-red/40 bg-asphalt-900/90">
                      <div className="flex items-start justify-between gap-2 border-b border-line-600/70 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <PlateTag plate={placa} />
                          <div>
                            <h4 className="font-bold text-sm text-paper-50">{conductor}</h4>
                            <span className="text-[11px] font-mono text-fog-400">
                              {conductorTel ? `Tel: ${conductorTel}` : "Sin teléfono registrado"}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold border ${
                            evts.length >= 3
                              ? "bg-alert-red-dim text-alert-red border-alert-red/40 animate-pulse"
                              : "bg-signal-amber-dim text-signal-amber border-signal-amber/40"
                          }`}
                        >
                          {nivelRiesgo}
                        </span>
                      </div>

                      {/* Historial de Faltas */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-fog-400 uppercase tracking-wider block">
                          Historial de faltas acumuladas ({evts.length}):
                        </span>
                        <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {evts.map((evt, idx) => {
                            const fechaStr = new Date(evt.fechaHora).toLocaleString("es-CO", {
                              dateStyle: "short",
                              timeStyle: "short",
                            });
                            const tipoLbl = TIPO_EVENTO_LABELS[evt.tipoEvento]?.label || evt.tipoEvento;
                            return (
                              <div
                                key={evt.id || idx}
                                className="flex items-center justify-between rounded bg-asphalt-950 p-2 text-xs font-mono"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-fog-400 text-[11px]">{fechaStr}</span>
                                  <span className="text-paper-50 font-semibold">{tipoLbl}</span>
                                </div>
                                {evt.velocidad !== undefined && (
                                  <span className="text-alert-red font-bold">{evt.velocidad} km/h</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line-600/70">
                        <span className="text-[10px] font-mono text-fog-400">
                          {evts.filter((e) => e.estadoRetroalimentacion === "enviada_whatsapp").length} notificaciones
                          enviadas
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEventoFeedback(ultEvt)}
                            className="px-2.5 py-1.5 rounded-lg border border-line-500 bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <MessageSquare size={13} className="text-radar-cyan" />
                            <span>Ver Detalle</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleNotificarReincidenciaWhatsApp(conductor, placa, conductorTel, evts)}
                            className="px-3 py-1.5 rounded-lg bg-ok-green hover:bg-ok-green/90 text-asphalt-950 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md"
                          >
                            <Smartphone size={13} />
                            <span>WhatsApp Pedagógico PESV</span>
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pestaña: Control Nocturno (>10:00 PM) */}
        {activeTab === "nocturno" && (
          <ControlNocturnoView eventos={eventos} onRefresh={() => fetchEventos(currentPage, pageSize)} />
        )}

        {/* Pestaña: Scoring Mensual */}
        {activeTab === "ranking" && (
          <DriverScoreRanking scores={scores} mesSeleccionado={mesRanking} onCambiarMes={setMesRanking} />
        )}

        {/* Pestaña: Conexión n8n */}
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

      {/* Modal de Cierre Diario PESV */}
      <CierreDiarioModal
        isOpen={cierreDiarioModalOpen}
        onClose={() => setCierreDiarioModalOpen(false)}
        eventos={eventos}
        conductores={conductores}
        vehiculos={vehiculos}
      />
    </div>
  );
}
