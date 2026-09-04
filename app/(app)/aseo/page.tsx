"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  Check,
  Eye,
  Trash2,
  X,
  Car,
  AlertTriangle,
  Award,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { Button } from "@/components/ui/Button";

interface ChecklistItem {
  item: string;
  estado: "SI" | "NO" | "NA";
}

interface AseoRecord {
  id: string;
  fecha: string;
  hora: string;
  placa: string;
  tipoVehiculo: string;
  conductorNombre: string;
  conductorDocumento?: string | null;
  conductorId?: string | null;
  responsableHseq?: string | null;
  kilometraje?: number | null;
  checklist: ChecklistItem[];
  fotosEvidencia?: string[] | null;
  observaciones?: string | null;
  firmaConductor?: string | null;
  firmaInspector?: string | null;
  conforme: boolean;
  estadoReviso: boolean;
  estadoAprobo: boolean;
  timestamp: string;
}

export default function AseoDesinfeccionPage() {
  const [registros, setRegistros] = useState<AseoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMes, setSelectedMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterConforme, setFilterConforme] = useState<"todos" | "conforme" | "no_conforme">("todos");
  const [stats, setStats] = useState({
    total: 0,
    conformesCount: 0,
    noConformesCount: 0,
    porcentajeCumplimiento: 100,
    vehiculosUnicos: 0,
    aprobadosCount: 0,
  });

  // Modal para ver detalle del checklist
  const [selectedRecord, setSelectedRecord] = useState<AseoRecord | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Formato Físico Imprimible HSEQ-F-097
  const [printRecord, setPrintRecord] = useState<AseoRecord | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/apps/aseo?mes=${selectedMes}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRegistros(data.registros || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Error al cargar registros de aseo:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMes]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRegistros = useMemo(() => {
    return registros.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.placa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.conductorNombre.toLowerCase().includes(searchQuery.toLowerCase());

      const matchConforme =
        filterConforme === "todos"
          ? true
          : filterConforme === "conforme"
          ? r.conforme
          : !r.conforme;

      return matchSearch && matchConforme;
    });
  }, [registros, searchQuery, filterConforme]);

  const handleToggleAprobar = async (id: string, currentAprobo: boolean) => {
    try {
      const res = await fetch("/api/apps/aseo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estadoAprobo: !currentAprobo, estadoReviso: true }),
      });
      if (res.ok) {
        setRegistros((prev) =>
          prev.map((r) => (r.id === id ? { ...r, estadoAprobo: !currentAprobo, estadoReviso: true } : r))
        );
      }
    } catch (err) {
      console.error("Error al aprobar:", err);
    }
  };

  const handleDelete = async (id: string, placa: string) => {
    if (!confirm(`¿Estás seguro de eliminar la inspección de aseo del vehículo ${placa}?`)) return;
    try {
      const res = await fetch(`/api/apps/aseo?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setRegistros((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  const handlePrint = (record: AseoRecord) => {
    setPrintRecord(record);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const exportToCSV = () => {
    if (filteredRegistros.length === 0) return;
    const headers = ["Fecha", "Hora", "Placa", "Tipo Vehiculo", "Conductor", "KM", "Conforme", "Aprobado HSEQ", "Observaciones"];
    const rows = filteredRegistros.map((r) => [
      r.fecha,
      r.hora,
      r.placa,
      r.tipoVehiculo,
      `"${r.conductorNombre}"`,
      r.kilometraje || 0,
      r.conforme ? "CONFORME" : "NO CONFORME",
      r.estadoAprobo ? "APROBADO" : "PENDIENTE",
      `"${r.observaciones || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aseo_Desinfeccion_${selectedMes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── ENCABEZADO (Oculto en Impresión) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-radar-cyan bg-radar-cyan/10 px-2 py-0.5 rounded border border-radar-cyan/30">
              HSEQ & BIOSEGURIDAD
            </span>
            <span className="text-xs text-fog-400 font-mono">HSEQ-F-097</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-paper-50 uppercase mt-1">
            Control de Aseo y Desinfección
          </h1>
          <p className="text-sm text-mist-200">
            Registro periódico de limpieza de cabina, desinfección de superficies, tapicería y protocolos de bioseguridad.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="flex items-center gap-1.5 text-xs text-ok-green hover:bg-ok-green-dim/30 border-ok-green/30"
          >
            <FileSpreadsheet size={14} />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* ── STAT CARDS (Oculto en Impresión) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <StatCard
          label="TOTAL INSPECCIONES"
          value={stats.total}
          subtitle={`Mes ${selectedMes}`}
          icon={Sparkles}
          status="normal"
        />
        <StatCard
          label="CUMPLIMIENTO CONFORME"
          value={`${stats.porcentajeCumplimiento}%`}
          subtitle={`${stats.conformesCount} conformes / ${stats.noConformesCount} no conformes`}
          icon={ShieldCheck}
          status={stats.porcentajeCumplimiento >= 90 ? "normal" : "warning"}
        />
        <StatCard
          label="VEHÍCULOS AUDITADOS"
          value={stats.vehiculosUnicos}
          subtitle="Placas registradas"
          icon={Car}
          status="normal"
        />
        <StatCard
          label="APROBADOS POR HSEQ"
          value={stats.aprobadosCount}
          subtitle={`${stats.total - stats.aprobadosCount} pendientes de revisión`}
          icon={Award}
          status="normal"
        />
      </div>

      {/* ── BARRA DE FILTROS (Oculto en Impresión) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600 pb-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-asphalt-900 border border-line-600 rounded-xl px-3 py-1.5 text-xs">
            <Calendar size={14} className="text-fog-400" />
            <span className="font-mono text-fog-400">Mes:</span>
            <input
              type="month"
              value={selectedMes}
              onChange={(e) => setSelectedMes(e.target.value)}
              className="bg-transparent text-paper-50 font-mono focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-asphalt-900 border border-line-600 rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilterConforme("todos")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterConforme === "todos"
                  ? "bg-paper-50 text-asphalt-950 shadow-sm"
                  : "text-fog-400 hover:text-paper-50"
              }`}
            >
              Todos ({registros.length})
            </button>
            <button
              onClick={() => setFilterConforme("conforme")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterConforme === "conforme"
                  ? "bg-ok-green text-asphalt-950 shadow-sm"
                  : "text-fog-400 hover:text-paper-50"
              }`}
            >
              Conformes ({stats.conformesCount})
            </button>
            <button
              onClick={() => setFilterConforme("no_conforme")}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filterConforme === "no_conforme"
                  ? "bg-alert-red text-paper-50 shadow-sm"
                  : "text-fog-400 hover:text-paper-50"
              }`}
            >
              No Conformes ({stats.noConformesCount})
            </button>
          </div>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" />
          <input
            type="text"
            placeholder="Buscar por placa o conductor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-asphalt-900 border border-line-600 rounded-xl pl-9 pr-3 py-1.5 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none"
          />
        </div>
      </div>

      {/* ── TABLA DE INSPECCIONES (Oculto en Impresión) ── */}
      <Card className="p-0 overflow-hidden border-line-600 bg-asphalt-900 print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-asphalt-950 text-fog-400 uppercase font-mono text-[11px] border-b border-line-600">
              <tr>
                <th className="p-3.5">Fecha / Hora</th>
                <th className="p-3.5">Vehículo</th>
                <th className="p-3.5">Conductor</th>
                <th className="p-3.5 text-center">Kilometraje</th>
                <th className="p-3.5 text-center">Estado Conformidad</th>
                <th className="p-3.5 text-center">Evidencias</th>
                <th className="p-3.5 text-center">Firma</th>
                <th className="p-3.5 text-center">Auditoría HSEQ</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-600">
              {filteredRegistros.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-fog-400">
                    {loading
                      ? "Cargando inspecciones de aseo..."
                      : "No se encontraron registros de aseo y desinfección en este período."}
                  </td>
                </tr>
              ) : (
                filteredRegistros.map((reg) => (
                  <tr key={reg.id} className="hover:bg-asphalt-800/60 transition-colors group">
                    <td className="p-3.5 font-mono text-mist-200">
                      <div>{reg.fecha}</div>
                      <div className="text-[10px] text-fog-400">{reg.hora}</div>
                    </td>
                    <td className="p-3.5">
                      <PlateTag plate={reg.placa} />
                      <div className="text-[10px] text-fog-400 mt-0.5">{reg.tipoVehiculo}</div>
                    </td>
                    <td className="p-3.5 font-medium text-paper-50">
                      <div>{reg.conductorNombre}</div>
                      {reg.conductorDocumento && (
                        <div className="text-[10px] font-mono text-fog-400">
                          CC: {reg.conductorDocumento}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono text-mist-200">
                      {reg.kilometraje ? `${reg.kilometraje.toLocaleString()} km` : "—"}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          reg.conforme
                            ? "bg-ok-green/10 text-ok-green border-ok-green/30"
                            : "bg-alert-red-dim/40 text-alert-red border-alert-red/30"
                        }`}
                      >
                        {reg.conforme ? "CONFORME" : "NO CONFORME"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {Array.isArray(reg.fotosEvidencia) && reg.fotosEvidencia.length > 0 ? (
                        <span className="text-[10px] font-mono text-radar-cyan font-bold bg-radar-cyan/10 border border-radar-cyan/30 px-2 py-0.5 rounded">
                          📷 {reg.fotosEvidencia.length} fotos
                        </span>
                      ) : (
                        <span className="text-[10px] text-fog-400 font-mono">Sin fotos</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {reg.firmaConductor ? (
                        <span className="text-[10px] text-ok-green font-mono flex items-center justify-center gap-1">
                          <Check size={12} /> Firmado
                        </span>
                      ) : (
                        <span className="text-[10px] text-fog-400">Sin firma</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleToggleAprobar(reg.id, reg.estadoAprobo)}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all border ${
                          reg.estadoAprobo
                            ? "bg-ok-green/20 text-ok-green border-ok-green/40 hover:bg-ok-green/30"
                            : "bg-asphalt-800 text-fog-400 border-line-600 hover:text-paper-50"
                        }`}
                        title="Clic para cambiar estado de aprobación"
                      >
                        {reg.estadoAprobo ? "APROBADO" : "PENDIENTE"}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRecord(reg)}
                          className="p-1.5 rounded-lg text-fog-400 hover:text-radar-cyan hover:bg-asphalt-800 transition-colors"
                          title="Ver Checklist Completo"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handlePrint(reg)}
                          className="p-1.5 rounded-lg text-fog-400 hover:text-radar-cyan hover:bg-asphalt-800 transition-colors"
                          title="Imprimir Formato Físico HSEQ-F-097"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(reg.id, reg.placa)}
                          className="p-1.5 rounded-lg text-fog-400 hover:text-alert-red hover:bg-asphalt-800 transition-colors"
                          title="Eliminar Registro"
                        >
                          <Trash2 size={15} />
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

      {/* ── MODAL: VER CHECKLIST DETALLADO, FOTOS & FIRMA (Oculto en Impresión) ── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn print:hidden">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-line-600 bg-asphalt-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-line-600 p-5 bg-asphalt-950/60">
              <div className="flex items-center gap-3">
                <PlateTag plate={selectedRecord.placa} />
                <div>
                  <h3 className="font-bold text-paper-50 text-base">
                    Inspección de Aseo y Desinfección (24 Ítems Oficiales)
                  </h3>
                  <p className="text-xs text-fog-400">
                    {selectedRecord.fecha} · {selectedRecord.hora} · Conductor: {selectedRecord.conductorNombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRecord(null);
                  setSelectedPreviewImage(null);
                }}
                className="text-fog-400 hover:text-paper-50 p-2 rounded-lg hover:bg-asphalt-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              {/* Galería de Evidencias Fotográficas */}
              {Array.isArray(selectedRecord.fotosEvidencia) && selectedRecord.fotosEvidencia.length > 0 && (
                <div className="border border-line-600 rounded-xl p-4 bg-asphalt-950">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-mono font-bold uppercase text-radar-cyan flex items-center gap-1.5">
                      <span>📸 Evidencias Fotográficas ({selectedRecord.fotosEvidencia.length})</span>
                    </h4>
                    <span className="text-[10px] text-fog-400">Clic en una foto para ampliar</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedRecord.fotosEvidencia.map((foto, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedPreviewImage(foto)}
                        className="group relative cursor-pointer aspect-video rounded-lg overflow-hidden border border-line-600 bg-black/40 hover:border-radar-cyan transition-all"
                      >
                        <img
                          src={foto}
                          alt={`Evidencia ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye size={18} className="text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist evaluado (24 items) */}
              <div className="border border-line-600 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-asphalt-950 text-fog-400 uppercase font-mono text-[11px] border-b border-line-600">
                    <tr>
                      <th className="p-2.5 w-10 text-center">N°</th>
                      <th className="p-2.5">Ítem / Componente Evaluado (HSEQ-F-097)</th>
                      <th className="p-2.5 text-center w-28">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-600 bg-asphalt-900/60">
                    {selectedRecord.checklist?.map((item, i) => (
                      <tr key={i} className="hover:bg-asphalt-800/40">
                        <td className="p-2.5 text-center font-mono text-fog-400 font-bold">{i + 1}</td>
                        <td className="p-2.5 text-mist-200">{item.item}</td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              item.estado === "SI"
                                ? "bg-ok-green/10 text-ok-green border border-ok-green/30"
                                : item.estado === "NO"
                                ? "bg-alert-red-dim/40 text-alert-red border border-alert-red/30"
                                : "bg-asphalt-800 text-fog-400"
                            }`}
                          >
                            {item.estado === "SI" ? "LIMPIO (SI)" : item.estado === "NO" ? "SUCIO (NO)" : "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Observaciones */}
              {selectedRecord.observaciones && (
                <div className="p-3 rounded-xl border border-line-600 bg-asphalt-950 text-xs">
                  <span className="font-mono font-bold text-fog-400 uppercase">Observaciones:</span>
                  <p className="text-mist-200 mt-1">{selectedRecord.observaciones}</p>
                </div>
              )}

              {/* Firmas */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-xl border border-line-600 bg-asphalt-950 text-center space-y-2">
                  <span className="text-[11px] font-mono text-fog-400 uppercase">Firma Conductor</span>
                  {selectedRecord.firmaConductor ? (
                    <img
                      src={selectedRecord.firmaConductor}
                      alt="Firma Conductor"
                      className="h-12 max-w-[140px] object-contain mx-auto bg-white/95 p-1 rounded border border-line-600"
                    />
                  ) : (
                    <div className="h-12 flex items-center justify-center text-xs text-fog-400 font-mono">
                      Sin firma
                    </div>
                  )}
                  <div className="text-[10px] text-mist-200 font-bold">{selectedRecord.conductorNombre}</div>
                </div>

                <div className="p-3 rounded-xl border border-line-600 bg-asphalt-950 text-center space-y-2">
                  <span className="text-[11px] font-mono text-fog-400 uppercase">Firma Inspector HSEQ</span>
                  {selectedRecord.firmaInspector ? (
                    <img
                      src={selectedRecord.firmaInspector}
                      alt="Firma Inspector"
                      className="h-12 max-w-[140px] object-contain mx-auto bg-white/95 p-1 rounded border border-line-600"
                    />
                  ) : (
                    <div className="h-12 flex items-center justify-center text-xs text-fog-400 font-mono">
                      Pendiente
                    </div>
                  )}
                  <div className="text-[10px] text-mist-200 font-bold">
                    {selectedRecord.responsableHseq || "Coordinador HSEQ"}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-line-600 bg-asphalt-950/60 flex items-center justify-between">
              <span className="text-xs text-fog-400 font-mono">
                Registrado en PostgreSQL (Railway)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint(selectedRecord)}
                  className="text-xs flex items-center gap-1.5 text-radar-cyan border-radar-cyan/30"
                >
                  <Printer size={13} />
                  <span>Imprimir HSEQ-F-097</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRecord(null);
                    setSelectedPreviewImage(null);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX / VISOR DE FOTO COMPLETA ── */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-line-600 bg-asphalt-950 shadow-2xl">
            <img
              src={selectedPreviewImage}
              alt="Evidencia Ampliada"
              className="w-full h-full max-h-[80vh] object-contain"
            />
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black/90 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── FORMATO FÍSICO IMPRIMIBLE HSEQ-F-097 (SOLO EN IMPRESIÓN) ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {printRecord && (
        <div className="hidden print:block text-black bg-white p-2 text-xs">
          {/* Encabezado Físico Oficial */}
          <div className="border-2 border-black mb-4">
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-3 border-r border-black p-2 flex flex-col items-center justify-center text-center">
                <div className="font-bold text-base tracking-tighter">TRANS SERVICES A&B</div>
                <div className="text-[9px] font-bold">NIT: 900778421-1</div>
                <div className="text-[8px] text-gray-700">COOPERATIVA DE TRANSPORTE</div>
              </div>
              <div className="col-span-6 border-r border-black p-2 flex flex-col items-center justify-center text-center">
                <div className="font-bold text-xs uppercase tracking-wide">
                  SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO & PESV
                </div>
                <div className="font-black text-sm uppercase mt-1">
                  INSPECCIÓN DE ORDEN, ASEO Y DESINFECCIÓN VEHICULAR
                </div>
              </div>
              <div className="col-span-3 p-2 text-[9px] space-y-1">
                <div><strong>CÓDIGO:</strong> HSEQ-F-097</div>
                <div><strong>VERSIÓN:</strong> 03</div>
                <div><strong>FECHA:</strong> {printRecord.fecha}</div>
              </div>
            </div>

            {/* Datos del Vehículo */}
            <div className="grid grid-cols-2 p-2 gap-2 text-[10px] bg-gray-50 border-b border-black">
              <div>
                <div><strong>PLACA VEHÍCULO:</strong> {printRecord.placa}</div>
                <div><strong>TIPO DE VEHÍCULO:</strong> {printRecord.tipoVehiculo}</div>
                <div><strong>CONDUCTOR:</strong> {printRecord.conductorNombre}</div>
              </div>
              <div>
                <div><strong>KILOMETRAJE:</strong> {printRecord.kilometraje?.toLocaleString() || "—"} KM</div>
                <div><strong>HORA DE INSPECCIÓN:</strong> {printRecord.hora}</div>
                <div><strong>ESTADO:</strong> {printRecord.conforme ? "CONFORME" : "NO CONFORME"}</div>
              </div>
            </div>
          </div>

          {/* Tabla de Checklist Imprimible (24 items) */}
          <table className="w-full border-collapse border border-black text-[9px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black p-1 text-center w-8">N°</th>
                <th className="border border-black p-1 text-left">ÍTEM / CRITERIO DE ASEO Y BIOSEGURIDAD (HSEQ-F-097)</th>
                <th className="border border-black p-1 text-center w-16">SI</th>
                <th className="border border-black p-1 text-center w-16">NO</th>
                <th className="border border-black p-1 text-center w-16">N/A</th>
              </tr>
            </thead>
            <tbody>
              {printRecord.checklist?.map((item, idx) => (
                <tr key={idx} className="h-5">
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1">{item.item}</td>
                  <td className="border border-black p-1 text-center font-bold">
                    {item.estado === "SI" ? "X" : ""}
                  </td>
                  <td className="border border-black p-1 text-center font-bold">
                    {item.estado === "NO" ? "X" : ""}
                  </td>
                  <td className="border border-black p-1 text-center font-bold">
                    {item.estado === "NA" ? "X" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Galería de Fotos en Impresión */}
          {Array.isArray(printRecord.fotosEvidencia) && printRecord.fotosEvidencia.length > 0 && (
            <div className="border border-black p-2 mt-2">
              <div className="font-bold text-[9px] uppercase mb-1">EVIDENCIAS FOTOGRÁFICAS ADJUNTAS:</div>
              <div className="grid grid-cols-4 gap-2">
                {printRecord.fotosEvidencia.map((foto, idx) => (
                  <div key={idx} className="border border-black p-0.5">
                    <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-16 object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones */}
          {printRecord.observaciones && (
            <div className="border border-black p-2 mt-2 text-[10px]">
              <strong>OBSERVACIONES:</strong> {printRecord.observaciones}
            </div>
          )}

          {/* Firmas de Cierre */}
          <div className="grid grid-cols-2 gap-8 mt-10 text-[10px]">
            <div className="border-t border-black pt-2 text-center">
              {printRecord.firmaConductor ? (
                <img
                  src={printRecord.firmaConductor}
                  alt="Firma Conductor"
                  className="h-10 max-w-[120px] object-contain mx-auto mb-1"
                />
              ) : null}
              <div className="font-bold">{printRecord.conductorNombre}</div>
              <div>Firma del Conductor / Operador</div>
            </div>
            <div className="border-t border-black pt-2 text-center">
              {printRecord.firmaInspector ? (
                <img
                  src={printRecord.firmaInspector}
                  alt="Firma Inspector"
                  className="h-10 max-w-[120px] object-contain mx-auto mb-1"
                />
              ) : null}
              <div className="font-bold">{printRecord.responsableHseq || "Coordinador HSEQ"}</div>
              <div>Firma del Inspector / Auditor HSEQ</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

