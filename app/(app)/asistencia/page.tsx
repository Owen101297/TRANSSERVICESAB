"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  RefreshCw, 
  Search, 
  PenTool, 
  Users, 
  CheckCircle2, 
  FileText, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface AsistenciaItem {
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

export default function AsistenciaAdminPage() {
  const [fecha, setFecha] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [proyecto, setProyecto] = useState<string>("TODOS");
  const [tipoEvento, setTipoEvento] = useState<string>("TODOS");
  const [registros, setRegistros] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"tabla" | "formato">("tabla");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [signatureModal, setSignatureModal] = useState<string | null>(null);

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

  const PAGE_SIZE = 20;

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fecha) params.set("fecha", fecha);
      if (proyecto && proyecto !== "TODOS") params.set("proyecto", proyecto);
      if (tipoEvento && tipoEvento !== "TODOS") params.set("tipoEvento", tipoEvento);

      const res = await fetch(`/api/apps/asistencia?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setRegistros(json.asistencias || []);
      }
    } catch (e) {
      console.error("Error cargando asistencias:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fecha, proyecto, tipoEvento]);

  // Filtrado por buscador
  const filteredRegistros = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return registros;
    return registros.filter(
      (r) =>
        (r.personaNombre && r.personaNombre.toLowerCase().includes(q)) ||
        (r.personaDocumento && r.personaDocumento.toLowerCase().includes(q)) ||
        (r.cargo && r.cargo.toLowerCase().includes(q)) ||
        (r.proyecto && r.proyecto.toLowerCase().includes(q))
    );
  }, [registros, searchQuery]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    const total = registros.length;
    const uniqueMap = new Set(registros.map((r) => r.personaDocumento || r.personaNombre));
    const icbf = registros.filter((r) => (r.proyecto || "").toUpperCase() === "ICBF").length;
    const gt = registros.filter((r) => (r.proyecto || "").toUpperCase() === "GT" || (r.proyecto || "").toUpperCase().includes("TIERRA")).length;
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
              Administración, consulta en tiempo real, actas oficiales y firmas digitales del SG-SST / PESV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/apps/asistencia"
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

        {/* Filtros y Selector de Vista */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-asphalt-900 border border-line-600 p-3 rounded-2xl">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro Fecha */}
            <div className="flex items-center gap-2 bg-asphalt-950 border border-line-600 px-3 py-1.5 rounded-xl">
              <Calendar className="w-4 h-4 text-radar-cyan" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-transparent text-xs font-mono text-paper-50 outline-none border-none cursor-pointer"
              />
            </div>

            {/* Filtro Proyecto */}
            <div className="flex items-center gap-2 bg-asphalt-950 border border-line-600 px-3 py-1.5 rounded-xl">
              <Filter className="w-4 h-4 text-fog-400" />
              <select
                value={proyecto}
                onChange={(e) => setProyecto(e.target.value)}
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
            <div className="flex items-center gap-2 bg-asphalt-950 border border-line-600 px-3 py-1.5 rounded-xl">
              <select
                value={tipoEvento}
                onChange={(e) => setTipoEvento(e.target.value)}
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

            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 bg-asphalt-800 hover:bg-asphalt-700 text-radar-cyan font-bold text-xs rounded-xl border border-line-500 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
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
              Mostrando {paginatedRegistros.length} de {filteredRegistros.length} registros
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-asphalt-950 text-fog-400 font-mono text-[11px] uppercase tracking-wider border-b border-line-600">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Nombre y Apellidos</th>
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Proyecto</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3 text-center">Firma</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-600/50 text-mist-200 font-[family-name:var(--font-body)]">
                {paginatedRegistros.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-fog-400">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-radar-cyan" />
                          <span>Cargando datos desde Railway...</span>
                        </div>
                      ) : (
                        "No se encontraron registros de asistencia para los filtros seleccionados."
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedRegistros.map((r, idx) => {
                    const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={r.id || idx} className="hover:bg-asphalt-800/50 transition-colors">
                        <td className="px-4 py-3 text-center font-mono text-fog-400 text-[11px]">{rowNum}</td>
                        <td className="px-4 py-3 font-medium text-paper-50">{r.personaNombre}</td>
                        <td className="px-4 py-3 font-mono text-fog-400">{r.personaDocumento || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-asphalt-950 border border-line-600 text-mist-200 uppercase">
                            {r.cargo || "CONDUCTOR"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-asphalt-800 border border-line-500 text-radar-cyan uppercase">
                            {r.proyecto || "TRANS SERVICES"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-mist-200">{r.horaLlegada || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          {r.firmaUrl ? (
                            <button
                              onClick={() => setSignatureModal(r.firmaUrl!)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-asphalt-950 border border-line-600 rounded text-[10px] font-mono text-radar-cyan hover:border-radar-cyan transition-colors"
                              title="Ver firma digital"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Firma</span>
                            </button>
                          ) : (
                            <span className="text-fog-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={r.estado === "ausente" ? "critico" : "activo"}>
                            {r.estado === "ausente" ? "Ausente" : "Presente"}
                          </StatusBadge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginador */}
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
        </Card>
      )}

      {/* ============================================================ */}
      {/* VISTA 2: FORMATO OFICIAL TH-FOR-03 PARA IMPRESIÓN Y AUDITORÍA*/}
      {/* ============================================================ */}
      {viewMode === "formato" && (
        <div className="space-y-6">
          {/* Controles de Metadatos del Formato */}
          <div className="no-print bg-asphalt-900 border border-line-600 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-line-600 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-paper-50 font-mono">
                Parámetros del Acta Imprimible (TH-FOR-03)
              </h3>
              <span className="text-xs text-fog-400">Los datos modificados se reflejan en las hojas membretadas</span>
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
                  onChange={(e) => setFormatoMeta({ ...formatoMeta, tema: e.target.value })}
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
                        TRANS SERVICES
                      </div>
                      <div className="text-[8px] font-bold text-slate-700 tracking-wider">COOPERATIVA A&B</div>
                      <div className="text-[7px] text-slate-500 font-mono mt-0.5">NIT: 900.560.825-9</div>
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
                              <td className="border-r border-black px-1.5 text-center font-mono text-[10px]">
                                {r ? r.personaDocumento || "—" : ""}
                              </td>
                              <td className="border-r border-black px-1 text-center uppercase text-[9px]">
                                {r ? r.cargo || "CONDUCTOR" : ""}
                              </td>
                              <td className="border-r border-black px-1 text-center uppercase font-bold text-[9px]">
                                {r ? r.proyecto || "TRANS SERVICES" : ""}
                              </td>
                              <td className="p-1 text-center">
                                {r?.firmaUrl ? (
                                  <img
                                    src={r.firmaUrl}
                                    alt="Firma"
                                    className="max-h-7 max-w-[110px] mx-auto object-contain"
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
