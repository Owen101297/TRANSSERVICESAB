"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Droplets,
  Calendar,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Printer,
  Check,
  Eye,
  Trash2,
  X,
  Sparkles,
  Car,
  AlertTriangle,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { Button } from "@/components/ui/Button";

interface LavadoRecord {
  id: string;
  fecha: string;
  hora: string;
  placa: string;
  tipoVehiculo: string;
  valor: number;
  empresa: string;
  conductorNombre: string;
  conductorDocumento?: string | null;
  conductorId?: string | null;
  firmaUrl?: string | null;
  estadoElaboro: boolean;
  estadoReviso: boolean;
  estadoAprobo: boolean;
  observaciones?: string | null;
  createdAt: string;
}

export default function ControlLavadosPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [records, setRecords] = useState<LavadoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPlaca, setSearchPlaca] = useState("");
  const [filterAprobado, setFilterAprobado] = useState<string>("todos");
  const [stats, setStats] = useState({
    totalCount: 0,
    totalValor: 0,
    avgValor: 0,
    totalRevisados: 0,
    totalAprobados: 0,
  });

  // Modal para ver firma en grande
  const [previewFirma, setPreviewFirma] = useState<{
    placa: string;
    conductor: string;
    firmaUrl: string;
  } | null>(null);

  // Modal para confirmar eliminación
  const [deletePending, setDeletePending] = useState<LavadoRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Cargar Registros ──
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/apps/lavado?mes=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.lavados || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Error al cargar registros de lavado:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // ── Cambiar Estado (Revisado / Aprobado) ──
  const handleToggleEstado = async (id: string, campo: "estadoReviso" | "estadoAprobo", valorActual: boolean) => {
    try {
      const res = await fetch("/api/apps/lavado", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          [campo]: !valorActual,
        }),
      });

      if (res.ok) {
        setRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, [campo]: !valorActual } : r))
        );
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    }
  };

  // ── Eliminar Registro ──
  const handleConfirmDelete = async () => {
    if (!deletePending) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/apps/lavado?id=${deletePending.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== deletePending.id));
        setDeletePending(null);
      }
    } catch (err) {
      console.error("Error al eliminar:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Filtrado Local ──
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchPlaca = !searchPlaca || r.placa.toLowerCase().includes(searchPlaca.toLowerCase().trim());
      const matchAprobado =
        filterAprobado === "todos"
          ? true
          : filterAprobado === "aprobados"
          ? r.estadoAprobo
          : !r.estadoAprobo;
      return matchPlaca && matchAprobado;
    });
  }, [records, searchPlaca, filterAprobado]);

  // ── Exportar Excel CSV ──
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ["Fecha", "Hora", "Placa", "Tipo Vehículo", "Valor", "Empresa", "Conductor", "Documento", "Revisado", "Aprobado"];
    const rows = filteredRecords.map((r) => [
      r.fecha,
      r.hora,
      r.placa,
      r.tipoVehiculo,
      r.valor,
      r.empresa || "N/A",
      r.conductorNombre,
      r.conductorDocumento || "—",
      r.estadoReviso ? "SÍ" : "NO",
      r.estadoAprobo ? "SÍ" : "NO",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Control_Lavados_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Imprimir Formato Físico Oficial ──
  const handlePrint = () => {
    window.print();
  };

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── ENCABEZADO Y ACCIONES (Oculto en Impresión) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-signal-amber bg-signal-amber-dim px-2 py-0.5 rounded border border-signal-amber/30">
              OPERACIÓN & FLOTA
            </span>
            <span className="text-xs text-fog-400 font-mono">OP-FOR-04</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-paper-50 uppercase mt-1">
            Control de Lavado de Flota
          </h1>
          <p className="text-sm text-mist-200">
            Registro, auditoría y liquidación mensual de lavados de vehículos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Mes */}
          <div className="flex items-center gap-1.5 bg-asphalt-900 border border-line-600 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar size={15} className="text-fog-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono text-paper-50 focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadRecords}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs text-ok-green hover:bg-ok-green/10 border-ok-green/30"
          >
            <FileSpreadsheet size={14} />
            <span>Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs text-radar-cyan hover:bg-radar-cyan/10 border-radar-cyan/30"
          >
            <Printer size={14} />
            <span>Imprimir Planilla</span>
          </Button>
        </div>
      </div>

      {/* ── STAT CARDS (Oculto en Impresión) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <StatCard
          label="TOTAL LAVADOS (MES)"
          value={stats.totalCount}
          subtitle={`En el período ${selectedMonth}`}
          icon={Droplets}
          status="normal"
        />
        <StatCard
          label="VALOR TOTAL RECAUDADO"
          value={formatCOP(stats.totalValor)}
          subtitle="Facturación bruta de lavados"
          icon={DollarSign}
          status="normal"
        />
        <StatCard
          label="PROMEDIO POR VEHÍCULO"
          value={formatCOP(stats.avgValor)}
          subtitle="Tarifa promedio del mes"
          icon={Car}
          status="normal"
        />
        <StatCard
          label="AUDITORÍA & APROBACIÓN"
          value={`${stats.totalAprobados} / ${stats.totalCount}`}
          subtitle={`${stats.totalRevisados} revisados formalmente`}
          icon={CheckCircle2}
          status={stats.totalAprobados === stats.totalCount && stats.totalCount > 0 ? "normal" : "warning"}
        />
      </div>

      {/* ── TABLA DE GESTIÓN Y AUDITORÍA (Oculto en Impresión) ── */}
      <Card className="p-0 overflow-hidden border-line-600 bg-asphalt-900/90 shadow-xl print:hidden">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-line-600 flex flex-wrap items-center justify-between gap-3 bg-asphalt-950/40">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" />
              <input
                type="text"
                value={searchPlaca}
                onChange={(e) => setSearchPlaca(e.target.value)}
                placeholder="Buscar por placa o conductor..."
                className="w-full bg-asphalt-900 border border-line-600 rounded-xl pl-9 pr-3 py-1.5 text-xs text-paper-50 placeholder:text-fog-400 focus:border-signal-amber focus:outline-none uppercase font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-fog-400 font-mono">Estado:</span>
            <select
              value={filterAprobado}
              onChange={(e) => setFilterAprobado(e.target.value)}
              className="bg-asphalt-900 border border-line-600 rounded-xl px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:outline-none"
            >
              <option value="todos">Todos los registros</option>
              <option value="aprobados">Solo Aprobados</option>
              <option value="pendientes">Pendientes de Aprobación</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line-600 bg-asphalt-950/60 font-mono text-[11px] uppercase tracking-wider text-fog-400">
                <th className="py-3 px-4">Fecha / Hora</th>
                <th className="py-3 px-4">Placa & Tipo</th>
                <th className="py-3 px-4">Conductor & Cédula</th>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-center">Firma Digital</th>
                <th className="py-3 px-4 text-center">Auditoría / Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-600/40 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-fog-400 font-mono">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-signal-amber" />
                    Cargando registros de lavado...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-fog-400 font-mono">
                    <Droplets size={24} className="mx-auto mb-2 opacity-30" />
                    No se encontraron lavados para el período {selectedMonth}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-asphalt-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono">
                      <div className="text-paper-50 font-bold">{r.fecha}</div>
                      <div className="text-[11px] text-fog-400">{r.hora}</div>
                    </td>
                    <td className="py-3 px-4">
                      <PlateTag plate={r.placa} />
                      <span className="text-[10px] text-fog-400 block mt-0.5 font-mono">
                        {r.tipoVehiculo}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-paper-50">{r.conductorNombre}</div>
                      <div className="text-[10px] text-fog-400 font-mono">
                        CC: {r.conductorDocumento || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-fog-400 font-mono text-[11px]">
                      {r.empresa || "N/A"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-ok-green">
                      {formatCOP(r.valor)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.firmaUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewFirma({
                              placa: r.placa,
                              conductor: r.conductorNombre,
                              firmaUrl: r.firmaUrl!,
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] text-radar-cyan hover:underline font-mono bg-radar-cyan-dim px-2 py-0.5 rounded border border-radar-cyan/30"
                        >
                          <Eye size={12} />
                          <span>Ver Firma</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-fog-400 font-mono">Sin firma</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botón Revisado */}
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(r.id, "estadoReviso", r.estadoReviso)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all border ${
                            r.estadoReviso
                              ? "bg-radar-cyan/15 text-radar-cyan border-radar-cyan/40"
                              : "bg-asphalt-950 text-fog-400 border-line-600 hover:text-paper-50"
                          }`}
                          title={r.estadoReviso ? "Marcar como no revisado" : "Marcar como revisado"}
                        >
                          {r.estadoReviso ? "✓ REVISADO" : "REVISAR"}
                        </button>

                        {/* Botón Aprobado */}
                        <button
                          type="button"
                          onClick={() => handleToggleEstado(r.id, "estadoAprobo", r.estadoAprobo)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all border ${
                            r.estadoAprobo
                              ? "bg-ok-green/15 text-ok-green border-ok-green/40"
                              : "bg-asphalt-950 text-fog-400 border-line-600 hover:text-paper-50"
                          }`}
                          title={r.estadoAprobo ? "Revertir aprobación" : "Aprobar lavado"}
                        >
                          {r.estadoAprobo ? "✓ APROBADO" : "APROBAR"}
                        </button>

                        {/* Botón Eliminar */}
                        <button
                          type="button"
                          onClick={() => setDeletePending(r)}
                          className="p-1 rounded text-fog-400 hover:text-alert-red hover:bg-alert-red/10 transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── FORMATO IMPRIMIBLE OFICIAL DE LAVADAS (Visible en Impresión / PDF) ── */}
      <div className="hidden print:block font-sans text-black p-4 bg-white">
        <style dangerouslySetInnerHTML={{ __html: `
          @page { size: letter landscape; margin: 8mm; }
          @media print {
            body { background: white !important; color: black !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        `}} />

        {/* Encabezado Físico Oficial */}
        <div className="border-2 border-black w-full mb-3 flex items-stretch">
          <div className="w-48 border-r-2 border-black p-2 flex flex-col items-center justify-center text-center">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto mb-1 object-contain" />
            <span className="font-bold text-[10px] leading-none block">TRANS SERVICES A&amp;B</span>
            <span className="text-[8px] font-mono block">NIT 900778421-1</span>
          </div>
          <div className="flex-1 border-r-2 border-black p-2 flex flex-col items-center justify-center text-center">
            <span className="font-bold text-xs uppercase tracking-tight">
              COOPERATIVA DE TRANSPORTES Y SERVICIOS A&amp;B
            </span>
            <h2 className="font-bold text-sm uppercase tracking-wider mt-0.5">
              PLANILLA DE REGISTRO Y CONTROL LAVADAS
            </h2>
          </div>
          <div className="w-36 p-1.5 flex flex-col justify-center text-[8px] font-mono leading-tight">
            <div><strong>CÓDIGO:</strong> OP-FOR-04</div>
            <div><strong>VERSIÓN:</strong> 01</div>
            <div><strong>MES:</strong> {selectedMonth}</div>
            <div><strong>FECHA:</strong> {new Date().toLocaleDateString("es-CO")}</div>
          </div>
        </div>

        {/* Tabla Imprimible */}
        <table className="w-full border-collapse border border-black text-[9px]">
          <thead>
            <tr className="bg-gray-100 border-b border-black font-bold text-center">
              <th className="border border-black p-1 w-16">FECHA</th>
              <th className="border border-black p-1 w-12">HORA</th>
              <th className="border border-black p-1 w-20">TIPO VEHÍCULO</th>
              <th className="border border-black p-1 w-16">N° PLACA</th>
              <th className="border border-black p-1 w-20">VALOR</th>
              <th className="border border-black p-1">EMPRESA / CONTRATISTA</th>
              <th className="border border-black p-1">NOMBRE CONDUCTOR</th>
              <th className="border border-black p-1 w-24">FIRMA</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((r, idx) => (
              <tr key={idx} className="border-b border-black text-center h-7">
                <td className="border border-black p-1 font-mono">{r.fecha}</td>
                <td className="border border-black p-1 font-mono">{r.hora}</td>
                <td className="border border-black p-1">{r.tipoVehiculo}</td>
                <td className="border border-black p-1 font-mono font-bold">{r.placa}</td>
                <td className="border border-black p-1 font-mono text-right">{formatCOP(r.valor)}</td>
                <td className="border border-black p-1 text-left px-1.5">{r.empresa || "N/A"}</td>
                <td className="border border-black p-1 text-left px-1.5">{r.conductorNombre}</td>
                <td className="border border-black p-0.5 text-center">
                  {r.firmaUrl ? (
                    <img src={r.firmaUrl} alt="Firma" className="max-h-6 max-w-full mx-auto object-contain" />
                  ) : (
                    <span className="text-[7px] text-gray-400">Sin firma</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold bg-gray-50">
              <td colSpan={4} className="border border-black p-1 text-right">TOTAL GENERAL MES:</td>
              <td className="border border-black p-1 text-right font-mono">
                {formatCOP(filteredRecords.reduce((acc, curr) => acc + (curr.valor || 0), 0))}
              </td>
              <td colSpan={3} className="border border-black p-1 text-left font-mono text-[8px]">
                {filteredRecords.length} servicios registrados en el período.
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Firmas de Cierre Administrativo */}
        <div className="grid grid-cols-2 gap-12 mt-8 text-center text-[10px]">
          <div className="border-t border-black pt-1">
            <span className="font-bold block">SUPERVISOR DE OPERACIONES / PATIO</span>
            <span className="text-[8px] text-gray-600 font-mono">Revisión y Conformidad del Servicio</span>
          </div>
          <div className="border-t border-black pt-1">
            <span className="font-bold block">DIRECTOR DE OPERACIONES / HSEQ</span>
            <span className="text-[8px] text-gray-600 font-mono">Aprobación para Liquidación</span>
          </div>
        </div>
      </div>

      {/* ── MODAL: VER FIRMA DIGITAL ── */}
      {previewFirma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line-600 pb-3">
              <div>
                <h3 className="font-bold text-paper-50 text-sm">Firma Digital del Conductor</h3>
                <p className="text-xs text-fog-400 font-mono">
                  Placa: {previewFirma.placa} · {previewFirma.conductor}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFirma(null)}
                className="text-fog-400 hover:text-paper-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="rounded-xl border border-line-600 bg-white p-4 flex items-center justify-center">
              <img
                src={previewFirma.firmaUrl}
                alt="Firma Digital"
                className="max-h-40 object-contain"
              />
            </div>

            <div className="text-right">
              <Button size="sm" variant="outline" onClick={() => setPreviewFirma(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR ELIMINACIÓN ── */}
      {deletePending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-alert-red/40 bg-asphalt-900 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-alert-red-dim text-alert-red flex items-center justify-center mx-auto border border-alert-red/30">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="font-bold text-paper-50 text-base">¿Eliminar Registro de Lavado?</h3>
              <p className="text-xs text-fog-400 mt-1">
                Se eliminará el servicio de la placa{" "}
                <strong className="text-paper-50 font-mono">{deletePending.placa}</strong> del día{" "}
                <strong className="text-paper-50 font-mono">{deletePending.fecha}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletePending(null)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
