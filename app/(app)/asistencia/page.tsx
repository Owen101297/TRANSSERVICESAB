"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Calendar as CalendarIcon, 
  Filter, 
  Download, 
  Printer, 
  RefreshCw, 
  Search, 
  PenTool, 
  FileText, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Radio,
  Sparkles,
  Save,
  MapPin,
  MessageSquare,
  FileDown,
  Camera,
  Trash2,
  UserPlus,
  Edit3,
  X,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { generateAsistenciaPDF } from "@/lib/utils/pdfAsistenciaGenerator";

const PRESET_TEMAS = [
  "CHARLA 5 MINUTOS: PREVENCIÓN DE FATIGA Y CONTROL DE MICROSUEÑOS",
  "CHARLA 5 MINUTOS: INSPECCIÓN PREOPERACIONAL Y CONDICIONES DEL VEHÍCULO",
  "CAPACITACIÓN: MANEJO DEFENSIVO Y DISTANCIAS DE SEGURIDAD VIAL",
  "CAPACITACIÓN: ACTUACIÓN ANTE ACCIDENTES Y PRIMEROS AUXILIOS VIALES",
  "CHARLA 5 MINUTOS: LÍMITES DE VELOCIDAD Y CONDICIONES CLIMÁTICAS",
  "SOCIALIZACIÓN: POLÍTICA DE NO ALCOHOL, DROGAS Y TABAQUISMO",
  "CAPACITACIÓN: ATENCIÓN AL USUARIO Y SERVICIO EN TRANSPORTE ESPECIAL",
  "CHARLA 5 MINUTOS: USO OBLIGATORIO DE ELEMENTOS DE PROTECCIÓN Y CINTURÓN",
  "OTRO (PERSONALIZADO)",
];

export interface AsistenciaItem {
  id: string;
  personaId?: string;
  personaDocumento?: string;
  personaNombre: string;
  cargo?: string;
  proyecto?: string;
  evento?: string;
  tipoEvento?: string;
  fecha: string;
  horaLlegada?: string;
  estado?: string;
  firmaUrl?: string;
  fotoUrl?: string;
  observaciones?: string;
}

const getTodayColombia = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
};

export default function AsistenciaAdminPage() {
  const [fecha, setFecha] = useState<string>(getTodayColombia());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showCalendarDropdown, setShowCalendarDropdown] = useState<boolean>(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [proyecto, setProyecto] = useState<string>("TODOS");
  const [tipoEvento, setTipoEvento] = useState<string>("TODOS");
  const [actividadFiltro, setActividadFiltro] = useState<string>("TODAS");
  const [registros, setRegistros] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"tabla" | "formato">("tabla");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [signatureModal, setSignatureModal] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<{ url: string; nombre: string; documento: string; hora: string } | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ id: string; nombre: string } | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<boolean>(false);
  const [renameModal, setRenameModal] = useState<{ open: boolean; oldName: string; newName: string } | null>(null);
  const [renamingRecord, setRenamingRecord] = useState<boolean>(false);
  const [manualModal, setManualModal] = useState<boolean>(false);
  const [manualForm, setManualForm] = useState({
    documento: "",
    nombre: "",
    cargo: "CONDUCTOR",
    proyecto: "TRANS SERVICES A&B",
    hora: "07:30",
    fecha: getTodayColombia(),
    evento: "",
    estado: "presente",
  });
  const [searchingPersona, setSearchingPersona] = useState<boolean>(false);
  const [savingManual, setSavingManual] = useState<boolean>(false);
  const [datesSummary, setDatesSummary] = useState<Record<string, { total: number; proyectos: string[] }>>({});

  // Control y Divulgación del Tema Activo del Día
  const [temaActivo, setTemaActivo] = useState<string>("CHARLA 5 MINUTOS: PREVENCIÓN DE FATIGA Y CONTROL DE MICROSUEÑOS");
  const [lugarActivo, setLugarActivo] = useState<string>("VILLAGARZÓN (PUTUMAYO)");
  const [selectedPreset, setSelectedPreset] = useState<string>("CHARLA 5 MINUTOS: PREVENCIÓN DE FATIGA Y CONTROL DE MICROSUEÑOS");
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configSavedFeedback, setConfigSavedFeedback] = useState<boolean>(false);
  const [copiedLinkFeedback, setCopiedLinkFeedback] = useState<boolean>(false);

  // Metadatos sincronizados para el formato legal imprimible TH-FOR-03
  const [formatoMeta, setFormatoMeta] = useState({
    ciudad: "Villagarzón, Putumayo",
    horario: "07:30 - 08:30",
    duracion: "1 Hora",
    hh: "10 H.H.",
    tema: "Charla de Seguridad Vial y Manejo Defensivo (PESV / SG-SST)",
    facilitador: "COORDINADOR HSEQ",
    lugar: "Base Operativa Villagarzón",
  });

  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // ── Descarga Oficial Vectorial de PDF TH-FOR-03 ──
  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      await generateAsistenciaPDF(filteredRegistros, {
        fecha: fecha || new Date().toISOString().split("T")[0],
        tema: formatoMeta.tema || temaActivo,
        facilitador: formatoMeta.facilitador,
        ciudad: formatoMeta.ciudad,
        horario: formatoMeta.horario,
        duracion: formatoMeta.duracion,
        hh: formatoMeta.hh,
        proyecto,
        tipoEvento,
        codigo: "TH-FOR-03",
        version: "03",
      });
    } catch (err) {
      console.error("Error al generar PDF de asistencia:", err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const PAGE_SIZE = 20;

  // Cargar resumen de fechas activas
  const fetchDatesSummary = async () => {
    try {
      const res = await fetch("/api/apps/asistencia?datesSummary=true");
      if (res.ok) {
        const json = await res.json();
        if (json.datesSummary) {
          setDatesSummary(json.datesSummary);
        }
      }
    } catch (e) {
      console.warn("Aviso fechas activas:", e);
    }
  };

  // Cargar registros del día seleccionado
  const fetchData = async (forceSync = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fecha) params.set("fecha", fecha);
      if (proyecto && proyecto !== "TODOS") params.set("proyecto", proyecto);
      if (tipoEvento && tipoEvento !== "TODOS") params.set("tipoEvento", tipoEvento);
      if (forceSync) params.set("sync", "true");

      const res = await fetch(`/api/apps/asistencia?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Error en el servidor (${res.status})`);
      }
      const json = await res.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setRegistros(json.asistencias || []);
    } catch (e: any) {
      console.error("Error cargando asistencias:", e);
      setError(e.message || "Error al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar configuración activa del servidor
  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/apps/asistencia/config");
      if (res.ok) {
        const json = await res.json();
        if (json.config) {
          if (json.config.tema) {
            setTemaActivo(json.config.tema);
            if (PRESET_TEMAS.includes(json.config.tema)) {
              setSelectedPreset(json.config.tema);
            } else {
              setSelectedPreset("OTRO (PERSONALIZADO)");
            }
          }
          if (json.config.lugar) {
            setLugarActivo(json.config.lugar);
          }
        }
      }
    } catch (e) {
      console.warn("Aviso configuración activa:", e);
    }
  };

  // Guardar configuración activa
  const handleSaveConfig = async (nuevoTema?: string, nuevoLugar?: string) => {
    const temaToSave = (nuevoTema || temaActivo || "").trim().toUpperCase();
    const lugarToSave = (nuevoLugar || lugarActivo || "").trim().toUpperCase();
    if (!temaToSave) return;

    setSavingConfig(true);
    try {
      const res = await fetch("/api/apps/asistencia/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema: temaToSave,
          lugar: lugarToSave,
        }),
      });
      if (res.ok) {
        setConfigSavedFeedback(true);
        setTimeout(() => setConfigSavedFeedback(false), 3000);
      }
    } catch (e) {
      console.error("Error al guardar tema activo:", e);
    } finally {
      setSavingConfig(false);
    }
  };

  // Compartir por WhatsApp con texto oficial y parámetros inmutables
  const handleShareWhatsApp = () => {
    const fechaActual = new Date().toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const linkAsistir = `https://erp.transservicesab.com/asistir?tema=${encodeURIComponent(temaActivo)}&lugar=${encodeURIComponent(lugarActivo)}`;

    const mensaje = 
`🚚 *TRANS SERVICES S.A.S. - REGISTRO DE ASISTENCIA DIARIA*
📋 *Tema:* ${temaActivo}
📍 *Lugar / Base:* ${lugarActivo}
📅 *Fecha:* ${fechaActual}

Estimado equipo de trabajo y conductores en ruta, por favor ingresar al siguiente enlace oficial para registrar su asistencia, selfie y firma digital:
👉 ${linkAsistir}

_Cumplimiento SG-SST y PESV Res. 40595/2022_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  // Copiar Enlace Corto con Parámetros Inmutables
  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const linkAsistir = `https://erp.transservicesab.com/asistir?tema=${encodeURIComponent(temaActivo)}&lugar=${encodeURIComponent(lugarActivo)}`;
      navigator.clipboard.writeText(linkAsistir);
      setCopiedLinkFeedback(true);
      setTimeout(() => setCopiedLinkFeedback(false), 2500);
    }
  };

  // Actividades / Charlas del Día únicas
  const actividadesDelDia = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of registros) {
      const ev = (r.evento || "CHARLA GENERAL").trim();
      counts[ev] = (counts[ev] || 0) + 1;
    }
    return Object.entries(counts).map(([nombre, total]) => ({ nombre, total }));
  }, [registros]);

  // Sincronizar automáticamente el tema del formato TH-FOR-03
  useEffect(() => {
    if (actividadFiltro !== "TODAS") {
      setFormatoMeta((prev) => ({ ...prev, tema: actividadFiltro }));
    } else if (actividadesDelDia.length > 0) {
      setFormatoMeta((prev) => ({ ...prev, tema: actividadesDelDia[0].nombre }));
    }
    if (registros.length > 0 && registros[0].lugar) {
      setFormatoMeta((prev) => ({ ...prev, ciudad: `${registros[0].lugar}, Putumayo` }));
    }
  }, [actividadFiltro, actividadesDelDia]);

  // Eliminar asistente
  const handleDeleteAsistente = async () => {
    if (!deleteConfirmModal) return;
    setDeletingRecord(true);
    try {
      const res = await fetch(`/api/apps/asistencia?id=${deleteConfirmModal.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRegistros((prev) => prev.filter((r) => r.id !== deleteConfirmModal.id));
        fetchDatesSummary();
        setDeleteConfirmModal(null);
      } else {
        const json = await res.json();
        alert(json.error || "Error al eliminar el registro.");
      }
    } catch (e: any) {
      alert("Error al conectar con el servidor para eliminar.");
    } finally {
      setDeletingRecord(false);
    }
  };

  // Renombrar tema en lote
  const handleRenameTema = async () => {
    if (!renameModal || !renameModal.newName.trim()) return;
    setRenamingRecord(true);
    try {
      const res = await fetch("/api/apps/asistencia", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename_event",
          oldEvent: renameModal.oldName,
          newEvent: renameModal.newName.trim().toUpperCase(),
          fecha,
        }),
      });
      if (res.ok) {
        if (actividadFiltro === renameModal.oldName) {
          setActividadFiltro(renameModal.newName.trim().toUpperCase());
        }
        if (temaActivo === renameModal.oldName) {
          setTemaActivo(renameModal.newName.trim().toUpperCase());
        }
        setRenameModal(null);
        await fetchData();
      } else {
        const json = await res.json();
        alert(json.error || "Error al renombrar el tema.");
      }
    } catch (e: any) {
      alert("Error al conectar con el servidor para renombrar.");
    } finally {
      setRenamingRecord(false);
    }
  };

  // Búsqueda por cédula para autocompletado en asistente manual
  const handleSearchPersonaManual = async (cedula: string) => {
    const clean = cedula.replace(/[\.\s-]/g, "").trim();
    if (!clean || clean.length < 5) return;
    setSearchingPersona(true);
    try {
      const res = await fetch(`/api/apps/asistencia?cedula=${clean}`);
      if (res.ok) {
        const json = await res.json();
        if (json.persona) {
          setManualForm((prev) => ({
            ...prev,
            nombre: json.persona.nombreCompleto || prev.nombre,
            cargo: json.persona.cargo || prev.cargo,
            proyecto: json.persona.proyecto || prev.proyecto,
          }));
        }
      }
    } catch {} finally {
      setSearchingPersona(false);
    }
  };

  // Guardar asistente manual
  const handleSaveManualAsistente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.nombre.trim()) return alert("El nombre es obligatorio");
    setSavingManual(true);
    try {
      const res = await fetch("/api/apps/asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaDocumento: manualForm.documento.trim(),
          personaNombre: manualForm.nombre.trim().toUpperCase(),
          cargo: manualForm.cargo.toUpperCase(),
          proyecto: manualForm.proyecto.toUpperCase(),
          evento: (manualForm.evento || (actividadFiltro !== "TODAS" ? actividadFiltro : temaActivo)).trim().toUpperCase(),
          fecha: manualForm.fecha || fecha || getTodayColombia(),
          horaLlegada: manualForm.hora || "08:00",
          estado: manualForm.estado,
          observaciones: JSON.stringify({
            cedula: manualForm.documento,
            nombre: manualForm.nombre,
            cargo: manualForm.cargo,
            proyecto: manualForm.proyecto,
            actividad: manualForm.evento || temaActivo,
            manual: true,
          }),
        }),
      });

      if (res.ok) {
        setManualModal(false);
        setManualForm({
          documento: "",
          nombre: "",
          cargo: "CONDUCTOR",
          proyecto: "TRANS SERVICES A&B",
          hora: "07:30",
          fecha: getTodayColombia(),
          evento: "",
          estado: "presente",
        });
        await fetchData();
        fetchDatesSummary();
      } else {
        const json = await res.json();
        alert(json.error || "Error al guardar el asistente.");
      }
    } catch (err) {
      alert("Error de conexión al registrar asistente.");
    } finally {
      setSavingManual(false);
    }
  };

  useEffect(() => {
    fetchDatesSummary();
    fetchConfig();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fecha, proyecto, tipoEvento]);

  // Cerrar calendario al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendarDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrado por buscador y actividad
  const filteredRegistros = useMemo(() => {
    let list = registros;
    if (actividadFiltro !== "TODAS") {
      list = list.filter((r) => (r.evento || "").trim().toUpperCase() === actividadFiltro.trim().toUpperCase());
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (r) =>
        (r.personaNombre && r.personaNombre.toLowerCase().includes(q)) ||
        (r.personaDocumento && r.personaDocumento.toLowerCase().includes(q)) ||
        (r.cargo && r.cargo.toLowerCase().includes(q)) ||
        (r.proyecto && r.proyecto.toLowerCase().includes(q)) ||
        (r.evento && r.evento.toLowerCase().includes(q))
    );
  }, [registros, actividadFiltro, searchQuery]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const total = registros.length;
    const uniqueMap = new Set(registros.map((r) => r.personaDocumento || r.personaNombre));
    const icbf = registros.filter((r) => (r.proyecto || "").toUpperCase().includes("ICBF")).length;
    const gt = registros.filter((r) => {
      const p = (r.proyecto || "").toUpperCase();
      return p.includes("GT") || p.includes("TIERRA");
    }).length;
    const cond = registros.filter((r) => (r.cargo || "").toUpperCase().includes("CONDUCTOR")).length;
    return {
      total,
      unicos: uniqueMap.size,
      icbf,
      gt,
      conductores: cond,
    };
  }, [registros]);

  // Paginación para vista tabla
  const paginatedRegistros = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRegistros.slice(start, start + PAGE_SIZE);
  }, [filteredRegistros, currentPage]);

  const totalPages = Math.ceil(filteredRegistros.length / PAGE_SIZE) || 1;

  // Exportar a CSV
  const exportCsv = () => {
    if (registros.length === 0) return;
    const headers = ["No.", "Nombre y Apellidos", "Cédula", "Cargo", "Proyecto", "Evento", "Fecha", "Hora", "Estado"];
    const rows = registros.map((r, i) => [
      i + 1,
      `"${r.personaNombre}"`,
      `"${r.personaDocumento || "—"}"`,
      `"${r.cargo || "CONDUCTOR"}"`,
      `"${r.proyecto || "TRANS SERVICES"}"`,
      `"${r.evento || "Asistencia"}"`,
      r.fecha ? new Date(r.fecha).toLocaleDateString("es-CO") : "",
      r.horaLlegada || "",
      r.estado || "presente",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asistencia_${fecha || "consolidado"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Imprimir Formato Oficial
  const handlePrint = () => {
    setViewMode("formato");
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Dividir registros en páginas de 18 filas para impresión oficial de varias hojas
  const printPages = useMemo(() => {
    const rowsPerPage = 18;
    const pages = [];
    for (let i = 0; i < registros.length; i += rowsPerPage) {
      pages.push(registros.slice(i, i + rowsPerPage));
    }
    if (pages.length === 0) {
      pages.push([]);
    }
    return pages;
  }, [registros]);

  // Generador de días para el calendario mensual con marcadores
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 0: Dom, 1: Lun -> ajustado a Lunes = 0
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Relleno días mes anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        dateStr: "",
        hasData: false,
        count: 0,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${year}-${mStr}-${dStr}`;
      const data = datesSummary[dateStr];

      days.push({
        day: d,
        isCurrentMonth: true,
        dateStr,
        hasData: Boolean(data && data.total > 0),
        count: data ? data.total : 0,
      });
    }

    return days;
  }, [calendarMonth, datesSummary]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* BARRA SUPERIOR DE HERRAMIENTAS Y CONTROL (NO-PRINT)          */}
      {/* ============================================================ */}
      <div className="no-print space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-asphalt-900 border border-line-600 p-4 rounded-2xl shadow-xl">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl lg:text-3xl font-bold text-paper-50 tracking-wide flex items-center gap-3">
              <span className="p-2 bg-asphalt-800 rounded-xl border border-line-500 text-radar-cyan">
                <FileText className="w-6 h-6" />
              </span>
              Control Maestro de Asistencia (TH-FOR-03)
            </h1>
            <p className="mt-1 text-xs text-fog-400 font-medium">
              Gestión centralizada de asistencias, firmas digitales en alta definición y actas oficiales del SG-SST / PESV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/apps/asistencia/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-signal-amber hover:bg-amber-400 text-asphalt-950 font-bold text-xs rounded-xl shadow transition-colors"
            >
              <PenTool className="w-4 h-4" />
              <span>Toma de Firmas Móvil</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            <button
              onClick={exportCsv}
              disabled={registros.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-asphalt-800 hover:bg-asphalt-700 text-mist-200 border border-line-500 font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-ok-green" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 border border-line-500 font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4 text-radar-cyan" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD EJECUTIVA: CONTROL Y DIVULGACIÓN DE LA CHARLA DEL DÍA   */}
        {/* ============================================================ */}
        <div className="bg-asphalt-900 border border-radar-cyan/30 p-5 rounded-2xl shadow-xl relative overflow-hidden space-y-4">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-96 h-28 bg-gradient-to-l from-radar-cyan/10 via-emerald-500/5 to-transparent pointer-events-none rounded-tr-2xl" />

          {/* Encabezado de la Tarjeta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-asphalt-950 border border-radar-cyan/40 rounded-xl text-radar-cyan flex items-center justify-center shadow-inner">
                <Radio className="w-5 h-5 animate-pulse text-radar-cyan" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-paper-50 tracking-wide font-[family-name:var(--font-display)]">
                    Control y Divulgación de la Charla del Día
                  </h2>
                  <span className="px-2 py-0.5 bg-ok-green/15 text-ok-green border border-ok-green/30 text-[10px] font-mono font-bold rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ok-green animate-ping inline-block"></span>
                    Sincronizado en Vivo
                  </span>
                </div>
                <p className="text-xs text-fog-400 mt-0.5">
                  El tema guardado aquí se cargará automáticamente a todos los conductores y personal que abran el enlace sin necesidad de escribir parámetros.
                </p>
              </div>
            </div>

            {/* Acciones Rápidas: WhatsApp y Copiar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Abrir WhatsApp con mensaje oficial pre-diligenciado"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 border font-mono font-bold text-xs rounded-xl shadow-sm transition-all ${
                  copiedLinkFeedback
                    ? "bg-ok-green/20 text-ok-green border-ok-green"
                    : "bg-asphalt-950 hover:bg-asphalt-800 text-mist-200 border-line-500 hover:border-radar-cyan"
                }`}
                title="Copiar enlace corto oficial"
              >
                {copiedLinkFeedback ? <Check className="w-4 h-4 text-ok-green" /> : <Copy className="w-4 h-4 text-radar-cyan" />}
                <span>{copiedLinkFeedback ? "¡Enlace Copiado!" : "Copiar Enlace"}</span>
              </button>

              <a
                href="/asistir"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-asphalt-950 hover:bg-asphalt-800 text-fog-400 hover:text-radar-cyan border border-line-600 font-mono text-xs rounded-xl transition-colors"
                title="Abrir vista móvil de prueba"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Probar</span>
              </a>
            </div>
          </div>

          {/* Formulario de Configuración del Tema */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1 border-t border-line-600/80">
            {/* Selector de Temas Frecuentes / Preset */}
            <div className="lg:col-span-4 space-y-1">
              <label className="text-[11px] font-mono font-bold text-fog-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-signal-amber" />
                Temas Frecuentes (PESV / SST)
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPreset(val);
                  if (val !== "OTRO (PERSONALIZADO)") {
                    setTemaActivo(val);
                    handleSaveConfig(val, lugarActivo);
                  }
                }}
                className="w-full bg-asphalt-950 border border-line-600 focus:border-radar-cyan text-paper-50 rounded-xl px-3 py-2 text-xs font-mono font-medium outline-none transition-colors"
              >
                {PRESET_TEMAS.map((pt, i) => (
                  <option key={i} value={pt} className="bg-asphalt-900 text-paper-50">
                    {pt}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Editable de Tema */}
            <div className="lg:col-span-5 space-y-1">
              <label className="text-[11px] font-mono font-bold text-fog-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-radar-cyan" />
                Tema Activo a Transmitir
              </label>
              <input
                type="text"
                value={temaActivo}
                onChange={(e) => {
                  setTemaActivo(e.target.value.toUpperCase());
                  setSelectedPreset("OTRO (PERSONALIZADO)");
                }}
                placeholder="ESCRIBA EL TEMA DE LA CHARLA..."
                className="w-full bg-asphalt-950 border border-line-600 focus:border-radar-cyan text-paper-50 font-mono font-bold text-xs rounded-xl px-3 py-2 outline-none transition-colors uppercase tracking-wide placeholder:text-fog-400/40"
              />
            </div>

            {/* Input de Base / Lugar */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] font-mono font-bold text-fog-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-ok-green" />
                Lugar / Base
              </label>
              <input
                type="text"
                value={lugarActivo}
                onChange={(e) => setLugarActivo(e.target.value.toUpperCase())}
                placeholder="MUNICIPIO / BASE..."
                className="w-full bg-asphalt-950 border border-line-600 focus:border-radar-cyan text-paper-50 font-mono text-xs rounded-xl px-3 py-2 outline-none transition-colors uppercase tracking-wide"
              />
            </div>

            {/* Botón Guardar Cambios */}
            <div className="lg:col-span-1 flex items-end">
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={savingConfig}
                className={`w-full py-2 px-3 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 ${
                  configSavedFeedback
                    ? "bg-ok-green text-asphalt-950"
                    : "bg-radar-cyan hover:bg-cyan-400 text-asphalt-950"
                } disabled:opacity-50`}
                title="Guardar y actualizar tema para todos los enlaces"
              >
                {configSavedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Listo!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{savingConfig ? "..." : "Guardar"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Enlace Permanente y Estado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-line-600/50 text-[11px] font-mono text-fog-400">
            <div className="flex items-center gap-2">
              <span className="text-mist-200 font-bold">Enlace Único Oficial:</span>
              <code 
                onClick={handleCopyLink}
                className="px-2 py-0.5 bg-asphalt-950 hover:bg-asphalt-800 border border-line-600 hover:border-radar-cyan text-radar-cyan rounded-md cursor-pointer transition-colors"
                title="Hacer clic para copiar enlace corto"
              >
                https://erp.transservicesab.com/asistir
              </code>
            </div>
            <span className="text-fog-400/80 italic">
              * Compatible con teléfonos Android / iOS, toma de selfie y firma táctil en ruta.
            </span>
          </div>
        </div>

        {/* Filtros y Selector de Fecha con Calendario Popover */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-asphalt-900 border border-line-600 p-3 rounded-2xl">
          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Fecha Interactivo con Popover de Días Marcados */}
            <div className="relative" ref={calendarRef}>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCalendarDropdown(!showCalendarDropdown)}
                  className="flex items-center gap-2.5 bg-asphalt-950 border border-line-600 hover:border-radar-cyan px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-paper-50 shadow-sm transition-all"
                >
                  <CalendarIcon className="w-4 h-4 text-radar-cyan" />
                  <span>
                    {fecha === getTodayColombia()
                      ? `Hoy (${fecha})`
                      : (fecha || "Todas las fechas")}
                  </span>
                  {fecha && datesSummary[fecha] ? (
                    <span className="px-2 py-0.5 bg-ok-green/20 text-ok-green border border-ok-green/40 text-[10px] font-mono font-black rounded-md flex items-center gap-1">
                      ● {datesSummary[fecha].total} firmas
                    </span>
                  ) : fecha ? (
                    <span className="text-fog-400 text-[10px]">(0 firmas)</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-radar-cyan/20 text-radar-cyan border border-radar-cyan/40 text-[10px] font-mono font-black rounded-md">
                      Consolidado
                    </span>
                  )}
                </button>

                {/* Acceso rápido a Hoy */}
                <button
                  type="button"
                  onClick={() => {
                    const hoy = getTodayColombia();
                    setFecha(hoy);
                    setCalendarMonth(new Date());
                    setCurrentPage(1);
                    setShowCalendarDropdown(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    fecha === getTodayColombia()
                      ? "bg-radar-cyan text-asphalt-950 shadow-sm font-black"
                      : "bg-asphalt-950 border border-line-600 hover:border-radar-cyan text-mist-200"
                  }`}
                  title="Ver registros de hoy"
                >
                  Hoy
                </button>

                {/* Acceso rápido a Todas */}
                <button
                  type="button"
                  onClick={() => {
                    setFecha("");
                    setCurrentPage(1);
                    setShowCalendarDropdown(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    !fecha
                      ? "bg-radar-cyan text-asphalt-950 shadow-sm font-black"
                      : "bg-asphalt-950 border border-line-600 hover:border-radar-cyan text-fog-400 hover:text-paper-50"
                  }`}
                  title="Ver todas las asistencias históricas"
                >
                  Todas
                </button>

                {/* Enlace rápido al último día con registros si hoy aún no tiene */}
                {fecha === getTodayColombia() && !datesSummary[fecha] && Object.keys(datesSummary).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const latest = Object.keys(datesSummary).sort((a, b) => b.localeCompare(a))[0];
                      if (latest) {
                        setFecha(latest);
                        const [y, m] = latest.split("-").map(Number);
                        setCalendarMonth(new Date(y, m - 1, 1));
                        setCurrentPage(1);
                      }
                    }}
                    className="text-[11px] font-mono text-fog-400 hover:text-radar-cyan px-2.5 py-1.5 rounded-xl border border-line-600/60 hover:border-radar-cyan/60 bg-asphalt-950 transition-all flex items-center gap-1"
                    title="Ir a la fecha más reciente con registros"
                  >
                    <span>● Último activo: {Object.keys(datesSummary).sort((a, b) => b.localeCompare(a))[0]}</span>
                  </button>
                )}
              </div>

              {/* Menú Desplegable Calendario con Números Marcados */}
              {showCalendarDropdown && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-asphalt-900 border-2 border-line-600 rounded-2xl p-4 shadow-2xl w-80 text-paper-50">
                  {/* Encabezado Mes / Año */}
                  <div className="flex items-center justify-between pb-3 border-b border-line-600">
                    <button
                      onClick={() =>
                        setCalendarMonth(
                          new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                        )
                      }
                      className="p-1 rounded-lg hover:bg-asphalt-800 text-fog-400 hover:text-paper-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-paper-50">
                      {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                    </span>
                    <button
                      onClick={() =>
                        setCalendarMonth(
                          new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                        )
                      }
                      className="p-1 rounded-lg hover:bg-asphalt-800 text-fog-400 hover:text-paper-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Días de la semana */}
                  <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold text-fog-400 py-2">
                    <span>LU</span><span>MA</span><span>MI</span><span>JU</span><span>VI</span><span>SA</span><span>DO</span>
                  </div>

                  {/* Cuadrícula de Días con Marcadores */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {calendarDays.map((dItem, idx) => {
                      if (!dItem.isCurrentMonth) {
                        return (
                          <div key={idx} className="p-1.5 text-fog-400/30 text-[11px] font-mono">
                            {dItem.day}
                          </div>
                        );
                      }

                      const isSelected = fecha === dItem.dateStr;

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setFecha(dItem.dateStr);
                            setCurrentPage(1);
                            setShowCalendarDropdown(false);
                          }}
                          className={`relative p-1.5 rounded-lg text-xs font-mono font-bold transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-radar-cyan text-asphalt-950 font-black shadow-md scale-105"
                              : dItem.hasData
                              ? "bg-asphalt-800 text-paper-50 border border-ok-green/60 hover:bg-asphalt-700"
                              : "text-fog-400 hover:bg-asphalt-800 hover:text-paper-50"
                          }`}
                          title={dItem.hasData ? `${dItem.count} registros de asistencia` : "Sin registros"}
                        >
                          <span>{dItem.day}</span>
                          {dItem.hasData && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-ok-green absolute bottom-1"></span>
                          )}
                          {dItem.hasData && isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-asphalt-950 absolute bottom-1"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-2 border-t border-line-600 flex items-center justify-between text-[10px] text-fog-400 font-mono">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-ok-green inline-block"></span> Con actividad
                    </span>
                    <button
                      onClick={() => {
                        const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
                        setFecha(today);
                        setCalendarMonth(new Date());
                        setShowCalendarDropdown(false);
                      }}
                      className="text-radar-cyan hover:underline font-bold"
                    >
                      Hoy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Selector de Actividad / Charla Específica del Día */}
            {actividadesDelDia.length > 0 && (
              <div className="flex items-center gap-2 bg-asphalt-950 border border-line-600 px-3 py-2 rounded-xl">
                <Layers className="w-3.5 h-3.5 text-radar-cyan" />
                <select
                  value={actividadFiltro}
                  onChange={(e) => {
                    setActividadFiltro(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs font-bold text-paper-50 outline-none border-none uppercase cursor-pointer max-w-[200px] truncate"
                >
                  <option value="TODAS" className="bg-asphalt-900 text-paper-50">
                    CHARLAS: TODAS ({registros.length})
                  </option>
                  {actividadesDelDia.map((act) => (
                    <option key={act.nombre} value={act.nombre} className="bg-asphalt-900 text-paper-50">
                      {act.nombre.length > 30 ? act.nombre.slice(0, 30) + "..." : act.nombre} ({act.total})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Renombrar tema cuando se selecciona una actividad */}
            {actividadFiltro !== "TODAS" && (
              <button
                type="button"
                onClick={() => setRenameModal({ open: true, oldName: actividadFiltro, newName: actividadFiltro })}
                className="px-3 py-2 bg-asphalt-950 hover:bg-asphalt-800 text-radar-cyan font-bold text-xs rounded-xl border border-radar-cyan/40 transition-all flex items-center gap-1.5"
                title="Renombrar / Corregir este tema para todos los asistentes"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Renombrar</span>
              </button>
            )}

            {/* Filtro Proyecto */}
            <div className="flex items-center gap-2 bg-asphalt-950 border border-line-600 px-3 py-2 rounded-xl">
              <Filter className="w-4 h-4 text-fog-400" />
              <select
                value={proyecto}
                onChange={(e) => {
                  setProyecto(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-paper-50 outline-none border-none uppercase cursor-pointer"
              >
                <option value="TODOS" className="bg-asphalt-900 text-paper-50">PROYECTO: TODOS</option>
                <option value="ICBF" className="bg-asphalt-900 text-paper-50">ICBF</option>
                <option value="GT" className="bg-asphalt-900 text-paper-50">GRAN TIERRA (GT)</option>
                <option value="HOSPITAL" className="bg-asphalt-900 text-paper-50">HOSPITAL</option>
                <option value="CONSORCIO" className="bg-asphalt-900 text-paper-50">CONSORCIOS</option>
                <option value="OTRO" className="bg-asphalt-900 text-paper-50">OTRO</option>
              </select>
            </div>

            {/* Filtro Tipo Evento */}
            <div className="flex items-center gap-2 bg-asphalt-950 border border-line-600 px-3 py-2 rounded-xl">
              <select
                value={tipoEvento}
                onChange={(e) => {
                  setTipoEvento(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-paper-50 outline-none border-none uppercase cursor-pointer"
              >
                <option value="TODOS" className="bg-asphalt-900 text-paper-50">ACTIVIDAD: TODAS</option>
                <option value="charla_5min" className="bg-asphalt-900 text-paper-50">CHARLA 5 MIN</option>
                <option value="capacitacion" className="bg-asphalt-900 text-paper-50">CAPACITACIÓN</option>
                <option value="induccion" className="bg-asphalt-900 text-paper-50">INDUCCIÓN</option>
                <option value="comite" className="bg-asphalt-900 text-paper-50">COMITÉ</option>
                <option value="reunion" className="bg-asphalt-900 text-paper-50">REUNIÓN</option>
                <option value="epp" className="bg-asphalt-900 text-paper-50">ENTREGA EPP</option>
              </select>
            </div>

            {/* Botón Registrar Asistente Manual */}
            <button
              type="button"
              onClick={() => {
                setManualForm({
                  documento: "",
                  nombre: "",
                  cargo: "CONDUCTOR",
                  proyecto: proyecto !== "TODOS" ? (proyecto === "GT" ? "GRAN TIERRA (GT)" : proyecto) : "TRANS SERVICES A&B",
                  hora: new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" }),
                  fecha: fecha || getTodayColombia(),
                  evento: actividadFiltro !== "TODAS" ? actividadFiltro : (actividadesDelDia[0]?.nombre || temaActivo),
                  estado: "presente",
                });
                setManualModal(true);
              }}
              className="px-3.5 py-2 bg-radar-cyan hover:bg-cyan-400 text-asphalt-950 font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              title="Registrar asistente manualmente en la planilla"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Asistente Manual</span>
            </button>

            <button
              onClick={() => {
                fetchData(true);
                fetchDatesSummary();
              }}
              disabled={loading}
              className="px-3.5 py-2 bg-asphalt-800 hover:bg-asphalt-700 text-radar-cyan font-bold text-xs rounded-xl border border-line-500 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={generatingPdf || filteredRegistros.length === 0}
              className="px-3.5 py-2 bg-asphalt-950 hover:bg-asphalt-800 text-signal-amber font-bold text-xs rounded-xl border border-signal-amber/40 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Descargar Planilla Oficial TH-FOR-03 en PDF Vectorial (Carta)"
            >
              <FileDown className={`w-3.5 h-3.5 ${generatingPdf ? "animate-bounce" : ""}`} />
              <span>{generatingPdf ? "Generando..." : "Descargar PDF"}</span>
            </button>
          </div>

          {/* Toggle Vista */}
          <div className="flex items-center gap-1 bg-asphalt-950 p-1 rounded-xl border border-line-600">
            <button
              onClick={() => setViewMode("tabla")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "tabla"
                  ? "bg-radar-cyan text-asphalt-950 shadow-md"
                  : "text-fog-400 hover:text-paper-50"
              }`}
            >
              Vista Tabla
            </button>
            <button
              onClick={() => setViewMode("formato")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === "formato"
                  ? "bg-radar-cyan text-asphalt-950 shadow-md"
                  : "text-fog-400 hover:text-paper-50"
              }`}
            >
              Formato Oficial TH-FOR-03
            </button>
          </div>
        </div>

        {/* Tarjetas de Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total Registros" value={stats.total} accent="cyan" />
          <StatCard label="Asistentes Únicos" value={stats.unicos} accent="green" />
          <StatCard label="Registros ICBF" value={stats.icbf} accent="amber" />
          <StatCard label="Registros GT" value={stats.gt} accent="amber" />
          <StatCard label="Conductores" value={stats.conductores} accent="cyan" />
        </div>
      </div>

      {/* ============================================================ */}
      {/* VISTA 1: TABLA DINÁMICA INTERACTIVA                         */}
      {/* ============================================================ */}
      {viewMode === "tabla" && (
        <Card className="no-print p-0 overflow-hidden border-line-600 bg-asphalt-900 shadow-xl">
          {/* Barra de búsqueda interna */}
          <div className="p-4 border-b border-line-600 bg-asphalt-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-fog-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por nombre, cédula o cargo..."
                className="w-full pl-9 pr-4 py-2 bg-asphalt-900 border border-line-600 rounded-xl text-xs text-paper-50 placeholder-fog-400 outline-none focus:border-radar-cyan transition-colors"
              />
            </div>

            <div className="text-xs font-mono text-fog-400">
              Mostrando {paginatedRegistros.length} de {filteredRegistros.length} registros ({fecha})
            </div>
          </div>

          {/* Contenido / Estados */}
          {error ? (
            <div className="p-6">
              <ErrorState
                title="No se pudieron cargar los registros de asistencia"
                message={error}
                onRetry={() => fetchData(true)}
              />
            </div>
          ) : loading ? (
            <div className="p-4">
              <TableSkeleton rows={8} columns={9} />
            </div>
          ) : paginatedRegistros.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Search}
                title="No hay registros de asistencia"
                description={
                  searchQuery || proyecto !== "TODOS" || tipoEvento !== "TODOS" || actividadFiltro !== "TODAS"
                    ? `No se encontraron registros que coincidan con la búsqueda para el día ${fecha}.`
                    : `No se registraron firmas ni asistencias para el día ${fecha}. Prueba seleccionando otra fecha en el calendario.`
                }
                actionLabel={
                  searchQuery || proyecto !== "TODOS" || tipoEvento !== "TODOS" || actividadFiltro !== "TODAS"
                    ? "Restablecer Filtros"
                    : "Sincronizar Datos"
                }
                onAction={() => {
                  if (searchQuery || proyecto !== "TODOS" || tipoEvento !== "TODOS" || actividadFiltro !== "TODAS") {
                    setSearchQuery("");
                    setProyecto("TODOS");
                    setTipoEvento("TODOS");
                    setActividadFiltro("TODAS");
                  } else {
                    fetchData(true);
                  }
                }}
              />
            </div>
          ) : (
            <>
              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-asphalt-950 text-fog-400 font-mono text-[11px] uppercase tracking-wider border-b border-line-600">
                    <tr>
                      <th className="px-3 py-3 w-10 text-center">#</th>
                      <th className="px-3 py-3">Nombre y Apellidos</th>
                      <th className="px-3 py-3">Cédula</th>
                      <th className="px-3 py-3">Cargo</th>
                      <th className="px-3 py-3">Proyecto</th>
                      <th className="px-3 py-3">Tema / Actividad</th>
                      <th className="px-3 py-3">Hora</th>
                      <th className="px-3 py-3 text-center">Evidencias</th>
                      <th className="px-3 py-3 text-center">Estado</th>
                      <th className="px-3 py-3 text-center w-14">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-600/50 text-mist-200 font-[family-name:var(--font-body)]">
                    {paginatedRegistros.map((r, idx) => {
                      const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                      return (
                        <tr key={r.id || idx} className="hover:bg-asphalt-800/50 transition-colors">
                          <td className="px-3 py-3 text-center font-mono text-fog-400 text-[11px]">{rowNum}</td>
                          <td className="px-3 py-3 font-medium text-paper-50 uppercase">{r.personaNombre}</td>
                          <td className="px-3 py-3 font-mono font-bold text-paper-50">{r.personaDocumento || "—"}</td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-asphalt-950 border border-line-600 text-mist-200 uppercase">
                              {r.cargo || "CONDUCTOR"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-asphalt-800 border border-line-500 text-radar-cyan uppercase">
                              {r.proyecto || "TRANS SERVICES"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-asphalt-950 border border-line-600 text-mist-200 block truncate max-w-[180px]"
                              title={r.evento || "Charla General"}
                            >
                              {r.evento || "Charla General"}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-mist-200">{r.horaLlegada || "—"}</td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {r.firmaUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setSignatureModal(r.firmaUrl!)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-radar-cyan/10 hover:bg-radar-cyan/20 text-radar-cyan font-bold rounded-lg border border-radar-cyan/30 transition-colors text-[11px]"
                                  title="Ver Firma Digital"
                                >
                                  <PenTool className="w-3 h-3" />
                                  <span>Firma</span>
                                </button>
                              ) : (
                                <span className="text-fog-400 font-mono text-[10px]">Sin firma</span>
                              )}

                              {r.fotoUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setPhotoModal({
                                    url: r.fotoUrl!,
                                    nombre: r.personaNombre,
                                    documento: r.personaDocumento || "—",
                                    hora: r.horaLlegada || "—",
                                  })}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-ok-green/10 hover:bg-ok-green/20 text-ok-green font-bold rounded-lg border border-ok-green/30 transition-colors text-[11px]"
                                  title="Ver Evidencia Fotográfica / Selfie"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>Foto</span>
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge status={r.estado === "presente" ? "activo" : "inactivo"} />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmModal({ id: r.id, nombre: r.personaNombre })}
                              className="p-1.5 rounded-lg text-fog-400 hover:text-alert-red hover:bg-alert-red/10 transition-colors"
                              title="Eliminar este asistente de la lista"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-line-600 bg-asphalt-950/40 flex items-center justify-between">
                  <span className="text-xs text-fog-400 font-mono">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-line-600 bg-asphalt-900 text-xs font-bold text-paper-50 disabled:opacity-30 hover:bg-asphalt-800"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-line-600 bg-asphalt-900 text-xs font-bold text-paper-50 disabled:opacity-30 hover:bg-asphalt-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ============================================================ */}
      {/* VISTA 2: FORMATO OFICIAL TH-FOR-03 PARA IMPRESIÓN Y AUDITORÍA*/}
      {/* ============================================================ */}
      {viewMode === "formato" && (
        <div className="space-y-6">
          {/* Controles de Metadatos del Formato */}
          <div className="no-print bg-asphalt-900 border border-line-600 p-4 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between border-b border-line-600 pb-2 gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-paper-50 font-mono">
                  Parámetros del Acta Imprimible (TH-FOR-03)
                </h3>
                <span className="text-xs text-fog-400">Los datos modificados se sincronizan en las hojas oficiales</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={generatingPdf || filteredRegistros.length === 0}
                  className="px-3 py-1.5 bg-signal-amber hover:bg-signal-amber/90 text-asphalt-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Descargar Planilla Oficial en PDF Vectorial (Carta)"
                >
                  <FileDown className={`w-3.5 h-3.5 ${generatingPdf ? "animate-bounce" : ""}`} />
                  <span>{generatingPdf ? "Generando..." : "Descargar PDF (TH-FOR-03)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-asphalt-950 hover:bg-asphalt-800 text-radar-cyan font-bold text-xs rounded-xl border border-radar-cyan/40 transition-all flex items-center gap-1.5"
                  title="Imprimir formato físico"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-fog-400 text-[10px] uppercase font-bold block mb-1">Tema / Actividad</label>
                <input
                  type="text"
                  value={formatoMeta.tema}
                  onChange={(e) => setFormatoMeta({ ...formatoMeta, tema: e.target.value })}
                  className="w-full bg-asphalt-950 border border-line-600 rounded-lg px-3 py-1.5 text-paper-50 font-semibold"
                />
              </div>
              <div>
                <label className="text-fog-400 text-[10px] uppercase font-bold block mb-1">Facilitador / Expositor</label>
                <input
                  type="text"
                  value={formatoMeta.facilitador}
                  onChange={(e) => setFormatoMeta({ ...formatoMeta, facilitador: e.target.value })}
                  className="w-full bg-asphalt-950 border border-line-600 rounded-lg px-3 py-1.5 text-paper-50 font-semibold"
                />
              </div>
              <div>
                <label className="text-fog-400 text-[10px] uppercase font-bold block mb-1">Ciudad y Sede</label>
                <input
                  type="text"
                  value={formatoMeta.ciudad}
                  onChange={(e) => setFormatoMeta({ ...formatoMeta, ciudad: e.target.value })}
                  className="w-full bg-asphalt-950 border border-line-600 rounded-lg px-3 py-1.5 text-paper-50 font-semibold"
                />
              </div>
              <div>
                <label className="text-fog-400 text-[10px] uppercase font-bold block mb-1">Horario</label>
                <input
                  type="text"
                  value={formatoMeta.horario}
                  onChange={(e) => setFormatoMeta({ ...formatoMeta, horario: e.target.value })}
                  className="w-full bg-asphalt-950 border border-line-600 rounded-lg px-3 py-1.5 text-paper-50 font-semibold"
                />
              </div>
              <div>
                <label className="text-fog-400 text-[10px] uppercase font-bold block mb-1">Duración</label>
                <input
                  type="text"
                  value={formatoMeta.duracion}
                  onChange={(e) => setFormatoMeta({ ...formatoMeta, duracion: e.target.value })}
                  className="w-full bg-asphalt-950 border border-line-600 rounded-lg px-3 py-1.5 text-paper-50 font-semibold"
                />
              </div>
              <div>
                <label className="text-fog-400 text-[10px] uppercase font-bold block mb-1">Total Horas Hombre (H.H.)</label>
                <input
                  type="text"
                  value={formatoMeta.hh}
                  onChange={(e) => setFormatoMeta({ ...formatoMeta, hh: e.target.value })}
                  className="w-full bg-asphalt-950 border border-line-600 rounded-lg px-3 py-1.5 text-paper-50 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Hojas de Impresión Oficiales */}
          <div className="space-y-8 print-container">
            {printPages.map((pageRows, pageIdx) => {
              const startIdx = pageIdx * 18;
              return (
                <div
                  key={pageIdx}
                  className="bg-white text-black p-8 rounded-xl shadow-2xl border-2 border-black max-w-[950px] mx-auto page-break"
                  style={{ minHeight: "1050px", fontFamily: "Arial, Helvetica, sans-serif" }}
                >
                  {/* Encabezado Institucional */}
                  <div className="grid grid-cols-[160px_1fr_160px] border-2 border-black min-h-[75px] text-center">
                    <div className="border-r-2 border-black p-2 flex flex-col items-center justify-center">
                      <div className="text-[11px] font-black tracking-tight text-blue-900 leading-none uppercase">
                        TRANS SERVICES A&amp;B
                      </div>
                      <div className="text-[8px] font-bold text-slate-700 tracking-wider">S.A.S.</div>
                      <div className="text-[7px] text-slate-500 font-mono mt-0.5">NIT: 901.621.579-2</div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="border-b-2 border-black py-1 font-black text-xs uppercase tracking-wider">
                        SISTEMA INTEGRADO DE GESTIÓN (HSEQ - PESV)
                      </div>
                      <div className="py-1 font-black text-sm uppercase tracking-wide bg-slate-50">
                        REGISTRO DE ASISTENCIA Y CAPACITACIÓN
                      </div>
                    </div>

                    <div className="border-l-2 border-black flex flex-col justify-between text-[8px] text-left">
                      <div className="border-b border-black p-1 font-bold">
                        <span className="text-slate-500">CÓDIGO:</span> TH-FOR-03
                      </div>
                      <div className="border-b border-black p-1">
                        <span className="font-bold text-slate-500">VERSIÓN:</span> 03
                      </div>
                      <div className="p-1 font-bold">
                        <span className="text-slate-500">FECHA:</span> {fecha || "2026-09-03"}
                      </div>
                    </div>
                  </div>

                  {/* Cuadro de Información del Evento */}
                  <div className="border-2 border-t-0 border-black p-3 text-[11px] space-y-1.5 bg-slate-50/50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-bold">TEMA / OBJETIVO:</span> {formatoMeta.tema}
                      </div>
                      <div>
                        <span className="font-bold">FACILITADOR:</span> {formatoMeta.facilitador}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-300 text-[10px]">
                      <div>
                        <span className="font-bold">CIUDAD / LUGAR:</span> {formatoMeta.ciudad}
                      </div>
                      <div>
                        <span className="font-bold">HORARIO:</span> {formatoMeta.horario}
                      </div>
                      <div>
                        <span className="font-bold">DURACIÓN:</span> {formatoMeta.duracion}
                      </div>
                      <div>
                        <span className="font-bold">TOTAL H.H:</span> {formatoMeta.hh}
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Asistentes y Firmas */}
                  <div className="border-2 border-t-0 border-black">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-slate-200 border-b-2 border-black font-black uppercase text-center text-[9px]">
                          <th className="border-r border-black p-1 w-8">#</th>
                          <th className="border-r border-black p-1">NOMBRE Y APELLIDOS</th>
                          <th className="border-r border-black p-1 w-24">CÉDULA</th>
                          <th className="border-r border-black p-1 w-24">CARGO</th>
                          <th className="border-r border-black p-1 w-20">PROYECTO</th>
                          <th className="p-1 w-32">FIRMA DIGITAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black font-medium">
                        {Array.from({ length: 18 }).map((_, slotIdx) => {
                          const r = pageRows[slotIdx];
                          const num = startIdx + slotIdx + 1;
                          return (
                            <tr key={slotIdx} className="h-9">
                              <td className="border-r border-black text-center font-bold font-mono text-[9px]">
                                {num}
                              </td>
                              <td className="border-r border-black px-2 uppercase font-bold text-[10px]">
                                {r ? r.personaNombre : ""}
                              </td>
                              <td className="border-r border-black px-1.5 text-center font-mono font-bold text-[10px]">
                                {r ? (r.personaDocumento && r.personaDocumento !== "—" ? r.personaDocumento : "—") : ""}
                              </td>
                              <td className="border-r border-black px-1 text-center uppercase text-[9px]">
                                {r ? r.cargo || "CONDUCTOR" : ""}
                              </td>
                              <td className="border-r border-black px-1 text-center uppercase font-bold text-[9px]">
                                {r ? r.proyecto || "TRANS SERVICES" : ""}
                              </td>
                              <td className="p-1 text-center align-middle">
                                {r?.firmaUrl ? (
                                  <img
                                    src={r.firmaUrl}
                                    alt="Firma"
                                    className="max-h-7 max-w-[110px] mx-auto object-contain block"
                                    loading="eager"
                                  />
                                ) : (
                                  ""
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Cuadro Inferior de Cierre y Responsables */}
                  <div className="border-2 border-t-0 border-black p-3 grid grid-cols-2 gap-8 text-[10px] mt-0 bg-slate-50/50">
                    <div className="border-t border-black pt-1 text-center">
                      <div className="font-bold uppercase">{formatoMeta.facilitador}</div>
                      <div className="text-slate-500 text-[9px]">Firma del Facilitador / Capacitador</div>
                    </div>
                    <div className="border-t border-black pt-1 text-center">
                      <div className="font-bold uppercase">RESPONSABLE HSEQ / PESV</div>
                      <div className="text-slate-500 text-[9px]">Firma y Sello de Verificación</div>
                    </div>
                  </div>

                  {/* Pie de Página de Hoja */}
                  <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono mt-2 pt-1 border-t border-slate-200">
                    <span>COOPERATIVA DE TRANSPORTES TRANS SERVICES A&B R.L.</span>
                    <span>Página {pageIdx + 1} de {printPages.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal para Visualizar Firma Ampliada */}
      {signatureModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-asphalt-900 border border-line-600 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <h3 className="text-sm font-bold text-paper-50 uppercase tracking-wider font-mono">
              Firma Digital Registrada
            </h3>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <img src={signatureModal} alt="Firma" className="max-h-48 mx-auto object-contain" />
            </div>
            <button
              onClick={() => setSignatureModal(null)}
              className="w-full py-2 bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 font-bold text-xs rounded-xl border border-line-500 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal para Visualizar Fotografía / Selfie */}
      {photoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-asphalt-900 border border-line-600 rounded-2xl max-w-md w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between border-b border-line-600 pb-3">
              <div className="text-left">
                <h3 className="text-sm font-bold text-paper-50 uppercase tracking-wider font-mono">
                  Evidencia Fotográfica
                </h3>
                <p className="text-xs text-fog-400 font-mono">
                  {photoModal.nombre} — C.C. {photoModal.documento}
                </p>
              </div>
              <span className="text-[10px] font-mono bg-asphalt-950 border border-line-600 px-2 py-1 rounded text-radar-cyan">
                {photoModal.hora}
              </span>
            </div>
            <div className="bg-black/50 p-2 rounded-xl border border-line-600 flex items-center justify-center overflow-hidden">
              <img
                src={photoModal.url}
                alt={`Foto de ${photoModal.nombre}`}
                className="max-h-80 w-auto rounded-lg object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setPhotoModal(null)}
              className="w-full py-2.5 bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 font-bold text-xs rounded-xl border border-line-500 transition-colors"
            >
              Cerrar Evidencia
            </button>
          </div>
        </div>
      )}

      {/* Modal para Confirmar Eliminación de Asistente */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-asphalt-900 border border-alert-red/40 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-alert-red/10 border border-alert-red/30 flex items-center justify-center text-alert-red">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-paper-50">Eliminar Asistente</h3>
                <p className="text-xs text-fog-400">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <p className="text-xs text-mist-200">
              ¿Estás seguro de que deseas eliminar el registro de <span className="font-bold text-paper-50 uppercase">{deleteConfirmModal.nombre}</span> de esta lista de asistencia?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                disabled={deletingRecord}
                className="flex-1 py-2.5 bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 font-bold text-xs rounded-xl border border-line-500 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAsistente}
                disabled={deletingRecord}
                className="flex-1 py-2.5 bg-alert-red hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deletingRecord ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Renombrar Tema en Lote */}
      {renameModal && renameModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-asphalt-900 border border-line-600 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-line-600 pb-3">
              <div className="w-10 h-10 rounded-xl bg-radar-cyan/10 border border-radar-cyan/30 flex items-center justify-center text-radar-cyan">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-paper-50">Renombrar Tema / Charla</h3>
                <p className="text-xs text-fog-400">Actualiza el tema para todos los asistentes con este título.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-fog-400 block mb-1">Tema Actual</label>
                <div className="px-3 py-2 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-fog-400 font-mono truncate">
                  {renameModal.oldName}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-radar-cyan block mb-1">Nuevo Tema / Actividad</label>
                <input
                  type="text"
                  value={renameModal.newName}
                  onChange={(e) => setRenameModal({ ...renameModal, newName: e.target.value })}
                  placeholder="Escribe el nuevo nombre de la charla o actividad..."
                  className="w-full px-3 py-2.5 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-paper-50 placeholder-fog-400 outline-none focus:border-radar-cyan uppercase"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                disabled={renamingRecord}
                className="flex-1 py-2.5 bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 font-bold text-xs rounded-xl border border-line-500 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRenameTema}
                disabled={renamingRecord || !renameModal.newName.trim()}
                className="flex-1 py-2.5 bg-radar-cyan hover:bg-cyan-400 text-asphalt-950 font-black text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {renamingRecord ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Cambios</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Registrar Asistente Manual */}
      {manualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-asphalt-900 border border-line-600 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line-600 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-radar-cyan/10 border border-radar-cyan/30 flex items-center justify-center text-radar-cyan">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-paper-50">Registrar Asistente Manual</h3>
                  <p className="text-xs text-fog-400">Ingresa la cédula para autocompletar desde la base de datos.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualModal(false)}
                className="text-fog-400 hover:text-paper-50 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualAsistente} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-radar-cyan block mb-1">
                    Cédula / Documento {searchingPersona && <span className="animate-pulse text-xs">🔍 Buscando...</span>}
                  </label>
                  <input
                    type="text"
                    value={manualForm.documento}
                    onChange={(e) => {
                      const val = e.target.value;
                      setManualForm((prev) => ({ ...prev, documento: val }));
                      if (val.trim().length >= 5) {
                        handleSearchPersonaManual(val);
                      }
                    }}
                    placeholder="Ej: 1122784561"
                    className="w-full px-3 py-2 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-paper-50 placeholder-fog-400 font-mono outline-none focus:border-radar-cyan"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-radar-cyan block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.nombre}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="NOMBRES Y APELLIDOS"
                    className="w-full px-3 py-2 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-paper-50 placeholder-fog-400 outline-none focus:border-radar-cyan uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-fog-400 block mb-1">Cargo</label>
                  <input
                    type="text"
                    value={manualForm.cargo}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, cargo: e.target.value }))}
                    placeholder="CONDUCTOR"
                    className="w-full px-3 py-2 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-paper-50 placeholder-fog-400 outline-none focus:border-radar-cyan uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-fog-400 block mb-1">Proyecto</label>
                  <input
                    type="text"
                    value={manualForm.proyecto}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, proyecto: e.target.value }))}
                    placeholder="TRANS SERVICES A&B"
                    className="w-full px-3 py-2 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-paper-50 placeholder-fog-400 outline-none focus:border-radar-cyan uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-radar-cyan block mb-1">Tema / Actividad</label>
                <input
                  type="text"
                  value={manualForm.evento}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, evento: e.target.value }))}
                  placeholder="TEMA DE LA CHARLA O ACTIVIDAD"
                  className="w-full px-3 py-2 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-paper-50 placeholder-fog-400 outline-none focus:border-radar-cyan uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-fog-400 block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={manualForm.fecha}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, fecha: e.target.value }))}
                    className="w-full px-3 py-2 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-paper-50 font-mono outline-none focus:border-radar-cyan"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-fog-400 block mb-1">Hora</label>
                  <input
                    type="time"
                    value={manualForm.hora}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, hora: e.target.value }))}
                    className="w-full px-3 py-2 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-paper-50 font-mono outline-none focus:border-radar-cyan"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-fog-400 block mb-1">Estado</label>
                  <select
                    value={manualForm.estado}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, estado: e.target.value }))}
                    className="w-full px-3 py-2 bg-asphalt-950 border border-line-600 rounded-xl text-xs text-paper-50 outline-none focus:border-radar-cyan"
                  >
                    <option value="presente">PRESENTE</option>
                    <option value="justificado">JUSTIFICADO</option>
                    <option value="ausente">AUSENTE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-line-600">
                <button
                  type="button"
                  onClick={() => setManualModal(false)}
                  disabled={savingManual}
                  className="flex-1 py-2.5 bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 font-bold text-xs rounded-xl border border-line-500 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingManual || !manualForm.nombre.trim()}
                  className="flex-1 py-2.5 bg-radar-cyan hover:bg-cyan-400 text-asphalt-950 font-black text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {savingManual ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Registrar Asistente</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estilos CSS para Impresión Limpia sin Menús */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter portrait;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print,
          nav,
          header,
          aside,
          button {
            display: none !important;
          }
          .print-container {
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>
    </div>
  );
}
