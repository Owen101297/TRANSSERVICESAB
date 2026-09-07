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
import { TagComboboxMultiSelect, ComboboxOption } from "@/components/gps/TagComboboxMultiSelect";
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
type RangoPreset = "hoy" | "24h" | "7d" | "mes" | "todos" | "personalizado";

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

  // Filtros Avanzados (Multi-Tag / Token Combobox + Fechas)
  const [selectedPlacas, setSelectedPlacas] = useState<string[]>([]); // Vacío = todas
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]); // Vacío = todos
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>("todas");
  const [filtroGestion, setFiltroGestion] = useState<string>("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [rangoPreset, setRangoPreset] = useState<RangoPreset>("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ordenCronologico, setOrdenCronologico] = useState<"desc" | "asc">("desc");

  // Estados de exportación
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [mesRanking, setMesRanking] = useState(new Date().toISOString().slice(0, 7));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString("es-CO"));

  // Consulta optimizada a la API con soporte para filtros de servidor y orden cronológico
  const fetchEventos = useCallback(
    async (
      page: number = 1,
      size: number = pageSize,
      placas: string[] = selectedPlacas,
      tipos: string[] = selectedTipos,
      desde: string = fechaDesde,
      hasta: string = fechaHasta,
      rango: RangoPreset = rangoPreset,
      prioridad: string = filtroPrioridad,
      orden: "desc" | "asc" = ordenCronologico,
      queryText: string = searchTerm
    ) => {
      setIsRefreshing(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limite", String(size));
        params.set("orden", orden);
        if (queryText.trim()) params.set("q", queryText.trim());
        if (rango !== "todos" && rango !== "personalizado") params.set("rango", rango);
        if (placas.length > 0) params.set("placas", placas.join(","));
        if (tipos.length > 0) params.set("tipos", tipos.join(","));
        if (prioridad !== "todas") params.set("prioridad", prioridad);
        if (desde) params.set("desde", desde);
        if (hasta) params.set("hasta", hasta);

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
    [pageSize, selectedPlacas, selectedTipos, fechaDesde, fechaHasta, rangoPreset, filtroPrioridad, ordenCronologico, searchTerm]
  );

  // Aplicar rango rápido predefinido
  const handleSelectPresetFecha = (preset: RangoPreset) => {
    setRangoPreset(preset);
    let dDesde = "";
    let dHasta = "";
    const now = new Date();

    if (preset === "hoy") {
      dDesde = now.toISOString().slice(0, 10);
      dHasta = now.toISOString().slice(0, 10);
    } else if (preset === "24h") {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      dDesde = yesterday.toISOString().slice(0, 10);
      dHasta = now.toISOString().slice(0, 10);
    } else if (preset === "7d") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dDesde = past7.toISOString().slice(0, 10);
      dHasta = now.toISOString().slice(0, 10);
    } else if (preset === "mes") {
      dDesde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      dHasta = now.toISOString().slice(0, 10);
    }

    setFechaDesde(dDesde);
    setFechaHasta(dHasta);
    fetchEventos(1, pageSize, selectedPlacas, selectedTipos, dDesde, dHasta, preset);
  };

  // Alternar orden cronológico
  const handleToggleOrden = () => {
    const nuevoOrden = ordenCronologico === "desc" ? "asc" : "desc";
    setOrdenCronologico(nuevoOrden);
    fetchEventos(1, pageSize, selectedPlacas, selectedTipos, fechaDesde, fechaHasta, rangoPreset, filtroPrioridad, nuevoOrden);
  };

  // Limpiar todos los filtros
  const handleLimpiarFiltros = () => {
    setSelectedPlacas([]);
    setSelectedTipos([]);
    setFechaDesde("");
    setFechaHasta("");
    setRangoPreset("todos");
    setFiltroPrioridad("todas");
    setFiltroGestion("todas");
    setSearchTerm("");
    fetchEventos(1, pageSize, [], [], "", "", "todos", "todas", ordenCronologico, "");
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

  // Filtrado reactivo en memoria para estado de gestión y texto complementario
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

  // Opciones para el TagCombobox de Vehículos (Placas)
  const vehiculoComboboxOptions: ComboboxOption[] = vehiculos.map((v) => {
    const esGT = (v.contratistaNombre || "").toUpperCase().includes("GRAN TIERRA") || (v.contratistaNombre || "").toUpperCase().includes("GT");
    return {
      value: v.placa,
      label: v.placa,
      subtitle: v.marca ? `${v.marca} ${v.modelo || ""}` : v.contratistaNombre || "Vehículo",
      badge: esGT ? "Gran Tierra" : v.contratistaNombre ? v.contratistaNombre : undefined,
      badgeClass: esGT
        ? "bg-radar-cyan-dim text-radar-cyan border-radar-cyan/40 font-bold"
        : "bg-asphalt-950 text-fog-400 border-line-600",
    };
  });

  // Opciones para el TagCombobox de Tipos de Eventos
  const tipoEventoComboboxOptions: ComboboxOption[] = Object.entries(TIPO_EVENTO_LABELS).map(([key, val]) => ({
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
      header: "Fecha / Hora (Satélite)",
      accessor: "fechaHora",
      render: (v) => {
        const d = new Date(v as string);
        const hour = d.getHours();
        const esNocturno = hour >= 22 || hour < 5;
        const now = new Date();
        const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
        const esReciente = diffMin >= 0 && diffMin <= 15;

        return (
          <div className="flex flex-col font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-paper-50">{d.toLocaleDateString("es-CO")}</span>
              {esReciente && (
                <span className="inline-flex items-center gap-1 px-1 rounded bg-ok-green-dim text-ok-green text-[9px] font-bold border border-ok-green/30 animate-pulse">
                  ● En Vivo
                </span>
              )}
              {esNocturno && (
                <span
                  className="inline-flex items-center gap-0.5 px-1 rounded bg-signal-amber-dim text-signal-amber text-[9px] font-bold border border-signal-amber/30"
                  title="Evento fuera de horario permitido (>10:00 PM)"
                >
                  <Moon size={9} /> Noche
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-fog-400">
              <span>{d.toLocaleTimeString("es-CO")}</span>
              {diffMin >= 0 && diffMin < 120 && (
                <span className="text-[10px] text-radar-cyan/90">
                  (hace {diffMin < 1 ? "<1 min" : `${diffMin}m`})
                </span>
              )}
            </div>
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
            {/* Nueva Barra de Filtros Inteligente (Fechas + Multi-Tag Combobox + Orden) */}
            <div className="bg-asphalt-900 border border-line-600 rounded-2xl p-4 space-y-3 shadow-md">
              {/* Fila Principal: Fechas (Desde/Hasta) + Multi-Tag Vehículos + Multi-Tag Eventos */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                {/* 1. Selector de Fechas (Desde - Hasta + Botones Rápidos) */}
                <div className="lg:col-span-4 space-y-1.5 bg-asphalt-950/70 p-2.5 rounded-xl border border-line-600">
                  <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-fog-400">
                    <span className="flex items-center gap-1.5 text-paper-50">
                      <Calendar size={13} className="text-radar-cyan" />
                      Rango de Fechas
                    </span>
                    {(fechaDesde || fechaHasta || rangoPreset !== "todos") && (
                      <button
                        type="button"
                        onClick={() => handleSelectPresetFecha("todos")}
                        className="text-[10px] text-alert-red hover:underline lowercase font-normal"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Inputs Desde - Hasta */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-mono text-fog-400 mb-0.5">Desde:</span>
                      <input
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => {
                          setFechaDesde(e.target.value);
                          setRangoPreset("personalizado");
                          fetchEventos(1, pageSize, selectedPlacas, selectedTipos, e.target.value, fechaHasta, "personalizado");
                        }}
                        className="w-full rounded-lg border border-line-600 bg-asphalt-950 px-2 py-1 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-fog-400 mb-0.5">Hasta:</span>
                      <input
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => {
                          setFechaHasta(e.target.value);
                          setRangoPreset("personalizado");
                          fetchEventos(1, pageSize, selectedPlacas, selectedTipos, fechaDesde, e.target.value, "personalizado");
                        }}
                        className="w-full rounded-lg border border-line-600 bg-asphalt-950 px-2 py-1 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Presets Rápidos de 1-Toque */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectPresetFecha("hoy")}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                        rangoPreset === "hoy"
                          ? "bg-radar-cyan text-asphalt-950 font-bold"
                          : "bg-asphalt-900 text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPresetFecha("24h")}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                        rangoPreset === "24h"
                          ? "bg-radar-cyan text-asphalt-950 font-bold"
                          : "bg-asphalt-900 text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
                      }`}
                    >
                      24h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPresetFecha("7d")}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                        rangoPreset === "7d"
                          ? "bg-radar-cyan text-asphalt-950 font-bold"
                          : "bg-asphalt-900 text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
                      }`}
                    >
                      7 Días
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPresetFecha("mes")}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                        rangoPreset === "mes"
                          ? "bg-radar-cyan text-asphalt-950 font-bold"
                          : "bg-asphalt-900 text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
                      }`}
                    >
                      Este Mes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPresetFecha("todos")}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                        rangoPreset === "todos"
                          ? "bg-signal-amber text-asphalt-950 font-bold"
                          : "bg-asphalt-900 text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
                      }`}
                    >
                      Todo
                    </button>
                  </div>
                </div>

                {/* 2. Buscador Multi-Tag de Vehículos (Placas con chips dentro) */}
                <div className="lg:col-span-4 bg-asphalt-950/70 p-2.5 rounded-xl border border-line-600">
                  <TagComboboxMultiSelect
                    label="Vehículos / Placas"
                    placeholder="Clic para ver placas o buscar (ej: WDH, JOU)..."
                    options={vehiculoComboboxOptions}
                    selectedValues={selectedPlacas}
                    onChange={(nuevasPlacas) => {
                      setSelectedPlacas(nuevasPlacas);
                      fetchEventos(1, pageSize, nuevasPlacas, selectedTipos, fechaDesde, fechaHasta, rangoPreset);
                    }}
                    icon={<Gauge size={13} className="text-signal-amber" />}
                    emptyMessage="No se encontraron vehículos coincidentes"
                  />
                </div>

                {/* 3. Buscador Multi-Tag de Tipos de Novedad / Eventos */}
                <div className="lg:col-span-4 bg-asphalt-950/70 p-2.5 rounded-xl border border-line-600">
                  <TagComboboxMultiSelect
                    label="Novedades / Eventos PESV"
                    placeholder="Clic para ver eventos (ej: Exceso, Frenada)..."
                    options={tipoEventoComboboxOptions}
                    selectedValues={selectedTipos}
                    onChange={(nuevosTipos) => {
                      setSelectedTipos(nuevosTipos);
                      fetchEventos(1, pageSize, selectedPlacas, nuevosTipos, fechaDesde, fechaHasta, rangoPreset);
                    }}
                    icon={<AlertTriangle size={13} className="text-alert-red" />}
                    emptyMessage="No se encontraron tipos de evento"
                  />
                </div>
              </div>

              {/* Fila Secundaria: Buscador Universal + Severidad + Gestión + Alternador de Orden */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-line-600/70">
                {/* Buscador Universal Libre */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" />
                  <input
                    type="text"
                    placeholder="Buscar conductor, cédula o tramo en toda la BD..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      fetchEventos(1, pageSize, selectedPlacas, selectedTipos, fechaDesde, fechaHasta, rangoPreset, filtroPrioridad, ordenCronologico, e.target.value);
                    }}
                    className="w-full rounded-lg border border-line-600 bg-asphalt-950 pl-8 pr-3 py-1.5 text-xs text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none font-mono"
                  />
                </div>

                {/* Filtros de Estado & Severidad */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Selector de Severidad */}
                  <select
                    value={filtroPrioridad}
                    onChange={(e) => {
                      setFiltroPrioridad(e.target.value);
                      fetchEventos(1, pageSize, selectedPlacas, selectedTipos, fechaDesde, fechaHasta, rangoPreset, e.target.value);
                    }}
                    className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-signal-amber focus:outline-none"
                  >
                    <option value="todas">Todas Severidades</option>
                    <option value="alta">🔴 Crítica / Alta (&gt;80 km/h)</option>
                    <option value="media">🟡 Severidad Media</option>
                    <option value="baja">🔵 Informativa</option>
                  </select>

                  {/* Selector de Estado Gestión HSE */}
                  <select
                    value={filtroGestion}
                    onChange={(e) => setFiltroGestion(e.target.value)}
                    className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
                  >
                    <option value="todas">Toda Gestión HSE</option>
                    <option value="pendiente">⏳ Pendiente</option>
                    <option value="enviada_whatsapp">📲 Notificado WA</option>
                    <option value="resuelta">✅ Cerrado</option>
                  </select>

                  {/* Botón de Orden Cronológico Estricto */}
                  <button
                    type="button"
                    onClick={handleToggleOrden}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line-500 bg-asphalt-800 hover:bg-asphalt-700 px-3 py-1.5 text-xs font-mono font-semibold text-paper-50 transition-colors active:scale-95 shadow-xs"
                    title="Alternar orden cronológico de generación del satélite GPS"
                  >
                    <Clock size={13} className="text-radar-cyan" />
                    <span>
                      {ordenCronologico === "desc" ? "⏱️ Recientes primero ↓" : "⏱️ Antiguos primero ↑"}
                    </span>
                  </button>

                  {/* Botón Limpiar Todo si hay filtros */}
                  {(selectedPlacas.length > 0 || selectedTipos.length > 0 || fechaDesde || fechaHasta || filtroPrioridad !== "todas" || filtroGestion !== "todas" || searchTerm) && (
                    <button
                      type="button"
                      onClick={handleLimpiarFiltros}
                      className="px-2.5 py-1.5 text-xs font-mono text-alert-red hover:underline transition-colors"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>
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
                  onClick={handleLimpiarFiltros}
                  className="px-3.5 py-1.5 bg-radar-cyan text-asphalt-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm active:scale-95 transition-all"
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
