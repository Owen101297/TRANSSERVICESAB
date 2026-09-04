"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  HeartPulse,
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
  PackageCheck,
  PackageX,
  ExternalLink,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

interface BotiquinChecklistItem {
  id: number;
  nombre: string;
  categoria: string;
  req: string;
  unidad: string;
  cantidad: number;
  estado: "BUENO" | "MALO" | "FALTANTE" | "NO_TIENE";
  tieneVencimiento: boolean;
  fechaVencimiento?: string | null;
}

interface BotiquinRecord {
  id: string;
  fecha: string;
  hora: string;
  placa: string;
  tipoVehiculo: string;
  conductorNombre: string;
  conductorDocumento?: string | null;
  conductorId?: string | null;
  responsableHseq?: string | null;
  ubicacionBotiquin: string;
  estadoGabinete: string;
  checklist: BotiquinChecklistItem[];
  fotosEvidencia?: string[] | null;
  observaciones?: string | null;
  firmaConductor?: string | null;
  firmaInspector?: string | null;
  conforme: boolean;
  itemsVencidosCount: number;
  itemsFaltantesCount: number;
  estadoReviso: boolean;
  estadoAprobo: boolean;
  timestamp: string;
}

export default function BotiquinesAdminPage() {
  const [registros, setRegistros] = useState<BotiquinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    totalItemsVencidos: 0,
    totalItemsFaltantes: 0,
  });

  // Modal para ver detalle del checklist y fotos
  const [selectedRecord, setSelectedRecord] = useState<BotiquinRecord | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Formato Físico Imprimible HSEQ-F-035
  const [printRecord, setPrintRecord] = useState<BotiquinRecord | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/apps/botiquin?mes=${selectedMes}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Error en el servidor (${res.status})`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "No se pudieron obtener las inspecciones de botiquín.");
      }
      setRegistros(data.registros || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error("Error al cargar registros de botiquín:", err);
      setError(err.message || "Error al conectar con la base de datos.");
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

  const handleToggleAprobar = async (record: BotiquinRecord) => {
    const nuevoEstado = !record.estadoAprobo;
    try {
      const res = await fetch("/api/apps/botiquin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          estadoAprobo: nuevoEstado,
          estadoReviso: true,
          responsableHseq: "Coordinador HSEQ",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRegistros((prev) =>
          prev.map((item) =>
            item.id === record.id
              ? { ...item, estadoAprobo: nuevoEstado, estadoReviso: true }
              : item
          )
        );
        if (selectedRecord && selectedRecord.id === record.id) {
          setSelectedRecord((prev) =>
            prev ? { ...prev, estadoAprobo: nuevoEstado, estadoReviso: true } : null
          );
        }
      }
    } catch (err) {
      console.error("Error al actualizar aprobación:", err);
      alert("Error al actualizar el estado de aprobación.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este registro de inspección de botiquín?")) return;
    try {
      const res = await fetch(`/api/apps/botiquin?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setRegistros((prev) => prev.filter((r) => r.id !== id));
        if (selectedRecord?.id === id) setSelectedRecord(null);
      } else {
        alert(data.error || "No se pudo eliminar.");
      }
    } catch (err) {
      console.error("Error al eliminar registro:", err);
      alert("Error al eliminar el registro.");
    }
  };

  const exportToCSV = () => {
    if (filteredRegistros.length === 0) return;
    const headers = [
      "ID",
      "Fecha",
      "Hora",
      "Placa",
      "Tipo Vehículo",
      "Conductor",
      "Documento",
      "Ubicación",
      "Gabinete",
      "Conforme",
      "Items Vencidos",
      "Items Faltantes",
      "Aprobado HSEQ",
      "Observaciones",
    ];
    const rows = filteredRegistros.map((r) => [
      r.id,
      r.fecha,
      r.hora,
      r.placa,
      r.tipoVehiculo,
      `"${r.conductorNombre}"`,
      r.conductorDocumento || "",
      `"${r.ubicacionBotiquin}"`,
      r.estadoGabinete,
      r.conforme ? "CONFORME" : "NO CONFORME",
      r.itemsVencidosCount,
      r.itemsFaltantesCount,
      r.estadoAprobo ? "APROBADO" : "PENDIENTE",
      `"${(r.observaciones || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inspecciones_Botiquines_${selectedMes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line-600 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-asphalt-800 border border-line-600 text-radar-cyan">
                  HSEQ-F-035 v04
                </span>
                <h1 className="font-display font-bold text-2xl md:text-3xl text-paper-50 tracking-wide">
                  Inspección de Botiquines
                </h1>
              </div>
              <p className="font-body text-xs md:text-sm text-fog-400 mt-0.5">
                Control de 21 insumos de primeros auxilios, caducidad, dotación obligatoria y validación HSEQ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/apps/botiquin/index.html"
            target="_blank"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-asphalt-800 hover:bg-asphalt-700 border border-line-600 text-mist-200 hover:text-paper-50 text-xs font-semibold transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4 text-orange-400" />
            <span>Abrir App Móvil</span>
          </Link>

          <Button
            onClick={exportToCSV}
            variant="ghost"
            className="text-xs bg-asphalt-800 border border-line-600 text-mist-200 hover:text-paper-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-ok-green" />
            Exportar CSV
          </Button>

          <Button
            onClick={loadData}
            variant="ghost"
            className="text-xs bg-asphalt-800 border border-line-600 text-mist-200 hover:text-paper-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin text-radar-cyan" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Inspecciones"
          value={stats.total}
          subtitle={`${stats.vehiculosUnicos} vehículos inspeccionados`}
          icon={<HeartPulse className="w-5 h-5 text-orange-400" />}
        />
        <StatCard
          label="Dotación 100% Conforme"
          value={stats.conformesCount}
          subtitle={`${stats.porcentajeCumplimiento}% del total registrado`}
          icon={<PackageCheck className="w-5 h-5 text-ok-green" />}
        />
        <StatCard
          label="Con Novedad / Vencidos"
          value={stats.noConformesCount}
          subtitle={`${stats.totalItemsVencidos} vencidos / ${stats.totalItemsFaltantes} faltantes`}
          icon={<PackageX className="w-5 h-5 text-alert-red" />}
        />
        <StatCard
          label="Aprobados HSEQ"
          value={stats.aprobadosCount}
          subtitle={`${stats.total - stats.aprobadosCount} pendientes de firma`}
          icon={<Award className="w-5 h-5 text-radar-cyan" />}
        />
      </div>

      {/* FILTROS Y CONTROLES */}
      <Card className="p-4 bg-asphalt-900 border-line-600">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" />
              <input
                type="text"
                placeholder="Buscar por placa o nombre de conductor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-asphalt-950 border border-line-600 text-paper-50 text-xs focus:outline-none focus:border-radar-cyan transition-colors placeholder:text-fog-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-fog-400 hidden sm:block" />
              <input
                type="month"
                value={selectedMes}
                onChange={(e) => setSelectedMes(e.target.value)}
                className="h-10 px-3 rounded-lg bg-asphalt-950 border border-line-600 text-paper-50 text-xs font-mono focus:outline-none focus:border-radar-cyan"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-fog-400 hidden lg:inline">Estado:</span>
            <div className="flex rounded-lg bg-asphalt-950 p-0.5 border border-line-600">
              <button
                onClick={() => setFilterConforme("todos")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filterConforme === "todos"
                    ? "bg-asphalt-800 text-paper-50 shadow-sm"
                    : "text-fog-400 hover:text-paper-50"
                }`}
              >
                Todos ({registros.length})
              </button>
              <button
                onClick={() => setFilterConforme("conforme")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filterConforme === "conforme"
                    ? "bg-ok-green/20 text-ok-green border border-ok-green/40 shadow-sm"
                    : "text-fog-400 hover:text-paper-50"
                }`}
              >
                Conformes
              </button>
              <button
                onClick={() => setFilterConforme("no_conforme")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filterConforme === "no_conforme"
                    ? "bg-alert-red/20 text-alert-red border border-alert-red/40 shadow-sm"
                    : "text-fog-400 hover:text-paper-50"
                }`}
              >
                No Conformes
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ESTADOS DE INTERFAZ (REGLA 5: CARGA / ERROR / VACÍO / TABLA) */}
      {loading ? (
        <Card className="p-4 bg-asphalt-900 border-line-600">
          <TableSkeleton rows={7} cols={8} />
        </Card>
      ) : error ? (
        <ErrorState
          title="No se pudieron cargar las inspecciones de botiquín"
          message={error}
          onRetry={loadData}
        />
      ) : filteredRegistros.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title={searchQuery ? "Sin coincidencias de búsqueda" : "No hay inspecciones en este período"}
          description={
            searchQuery
              ? `No encontramos registros de botiquín para '${searchQuery}'. Intente con otra placa o conductor.`
              : `Aún no se han registrado inspecciones de botiquín (HSEQ-F-035) para el mes de ${selectedMes}.`
          }
          actionLabel={searchQuery ? "Limpiar Filtros" : "Abrir App Móvil"}
          onAction={() => {
            if (searchQuery) {
              setSearchQuery("");
              setFilterConforme("todos");
            } else {
              window.open("/apps/botiquin/index.html", "_blank");
            }
          }}
        />
      ) : (
        <Card className="overflow-hidden bg-asphalt-900 border-line-600 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-asphalt-950 text-fog-400 uppercase font-mono text-[11px] border-b border-line-600">
                <tr>
                  <th className="py-3.5 px-4">Fecha / Hora</th>
                  <th className="py-3.5 px-4">Vehículo</th>
                  <th className="py-3.5 px-4">Conductor / Inspector</th>
                  <th className="py-3.5 px-4">Gabinete</th>
                  <th className="py-3.5 px-4">Dotación 21 Items</th>
                  <th className="py-3.5 px-4">Novedades</th>
                  <th className="py-3.5 px-4 text-center">Estado HSEQ</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-600 text-mist-200">
                {filteredRegistros.map((record) => {
                  const conformesCount = Array.isArray(record.checklist)
                    ? record.checklist.filter((i) => i.estado === "BUENO").length
                    : 21;

                  return (
                    <tr key={record.id} className="hover:bg-asphalt-800/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <div className="font-bold text-paper-50">{record.fecha}</div>
                        <div className="text-[11px] text-fog-400">{record.hora || "--:--"}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PlateTag plate={record.placa} />
                        <div className="text-[11px] text-fog-400 mt-1">{record.tipoVehiculo}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-paper-50">{record.conductorNombre}</div>
                        <div className="text-[11px] text-fog-400 font-mono">
                          CC: {record.conductorDocumento || "N/A"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            record.estadoGabinete === "BUENO"
                              ? "bg-ok-green/10 text-ok-green border border-ok-green/30"
                              : record.estadoGabinete === "REGULAR"
                              ? "bg-signal-amber/10 text-signal-amber border border-signal-amber/30"
                              : "bg-alert-red/10 text-alert-red border border-alert-red/30"
                          }`}
                        >
                          {record.estadoGabinete || "BUENO"}
                        </span>
                        <div className="text-[10px] text-fog-400 mt-0.5">{record.ubicacionBotiquin}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-xs ${
                              record.conforme ? "text-ok-green" : "text-signal-amber"
                            }`}
                          >
                            {conformesCount} / 21
                          </span>
                          <span className="text-[11px] text-fog-400">completos</span>
                        </div>
                        <div className="w-24 bg-asphalt-950 h-1.5 rounded-full overflow-hidden mt-1 border border-line-600">
                          <div
                            className={`h-full ${
                              record.conforme ? "bg-ok-green" : "bg-signal-amber"
                            }`}
                            style={{ width: `${(conformesCount / 21) * 100}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {record.itemsVencidosCount > 0 || record.itemsFaltantesCount > 0 ? (
                          <div className="space-y-0.5 text-[11px]">
                            {record.itemsVencidosCount > 0 && (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-alert-red/10 text-alert-red border border-alert-red/30 font-bold mr-1">
                                {record.itemsVencidosCount} vencido(s)
                              </span>
                            )}
                            {record.itemsFaltantesCount > 0 && (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-signal-amber/10 text-signal-amber border border-signal-amber/30 font-bold">
                                {record.itemsFaltantesCount} faltante(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-ok-green font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Sin novedades
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleAprobar(record)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                            record.estadoAprobo
                              ? "bg-ok-green/10 text-ok-green border-ok-green/30 hover:bg-ok-green/20"
                              : "bg-signal-amber/10 text-signal-amber border-signal-amber/30 hover:bg-signal-amber/20"
                          }`}
                        >
                          {record.estadoAprobo ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" /> Aprobado
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5" /> Pendiente
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => setSelectedRecord(record)}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-radar-cyan hover:bg-radar-cyan/10"
                            title="Ver Checklist Completo y Evidencias"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <Button
                            onClick={() => setPrintRecord(record)}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-mist-200 hover:bg-asphalt-700"
                            title="Imprimir Formato HSEQ-F-035"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>

                          <Button
                            onClick={() => handleDelete(record.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-alert-red hover:bg-alert-red/10"
                            title="Eliminar Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL DE DETALLE COMPLETO Y EVIDENCIAS */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-asphalt-900 border border-line-600 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header del Modal */}
            <div className="p-4 border-b border-line-600 flex items-center justify-between bg-asphalt-950">
              <div className="flex items-center gap-3">
                <PlateTag plate={selectedRecord.placa} />
                <div>
                  <h3 className="font-display font-bold text-base text-paper-50">
                    Inspección de Botiquín - {selectedRecord.fecha} ({selectedRecord.hora})
                  </h3>
                  <p className="text-xs text-fog-400">
                    Inspector: <span className="text-mist-200">{selectedRecord.conductorNombre}</span> | Gabinete:{" "}
                    <span className="text-mist-200">{selectedRecord.estadoGabinete}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleAprobar(selectedRecord)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedRecord.estadoAprobo
                      ? "bg-ok-green text-asphalt-950 border-ok-green"
                      : "bg-signal-amber text-asphalt-950 border-signal-amber"
                  }`}
                >
                  {selectedRecord.estadoAprobo ? "✓ Aprobado HSEQ" : "Aprobar Inspección"}
                </button>

                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-lg text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido Scrolleable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-asphalt-950 border border-line-600">
                  <span className="text-[10px] text-fog-400 font-mono uppercase block">Ubicación</span>
                  <span className="text-xs font-bold text-paper-50">{selectedRecord.ubicacionBotiquin}</span>
                </div>
                <div className="p-3 rounded-xl bg-asphalt-950 border border-line-600">
                  <span className="text-[10px] text-fog-400 font-mono uppercase block">Tipo Vehículo</span>
                  <span className="text-xs font-bold text-paper-50">{selectedRecord.tipoVehiculo}</span>
                </div>
                <div className="p-3 rounded-xl bg-asphalt-950 border border-line-600">
                  <span className="text-[10px] text-fog-400 font-mono uppercase block">Items Vencidos</span>
                  <span
                    className={`text-xs font-bold ${
                      selectedRecord.itemsVencidosCount > 0 ? "text-alert-red" : "text-ok-green"
                    }`}
                  >
                    {selectedRecord.itemsVencidosCount} detectados
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-asphalt-950 border border-line-600">
                  <span className="text-[10px] text-fog-400 font-mono uppercase block">Items Faltantes</span>
                  <span
                    className={`text-xs font-bold ${
                      selectedRecord.itemsFaltantesCount > 0 ? "text-signal-amber" : "text-ok-green"
                    }`}
                  >
                    {selectedRecord.itemsFaltantesCount} faltantes
                  </span>
                </div>
              </div>

              {/* Checklist de 21 Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-fog-400 mb-3 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-orange-400" /> Detalle de los 21 Elementos Normativos
                </h4>
                <div className="border border-line-600 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-asphalt-950 text-fog-400 font-mono text-[10px] uppercase border-b border-line-600">
                      <tr>
                        <th className="p-2.5">Ítem</th>
                        <th className="p-2.5">Categoría</th>
                        <th className="p-2.5 text-center">Req.</th>
                        <th className="p-2.5 text-center">Encontrado</th>
                        <th className="p-2.5 text-center">Estado</th>
                        <th className="p-2.5">Fecha Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-600 bg-asphalt-950/40">
                      {Array.isArray(selectedRecord.checklist) &&
                        selectedRecord.checklist.map((item, idx) => {
                          const isVencido =
                            item.tieneVencimiento &&
                            item.fechaVencimiento &&
                            item.fechaVencimiento <= selectedRecord.fecha;

                          return (
                            <tr key={idx} className="hover:bg-asphalt-800/40">
                              <td className="p-2.5 font-medium text-paper-50">{item.nombre}</td>
                              <td className="p-2.5 text-fog-400 text-[11px]">{item.categoria}</td>
                              <td className="p-2.5 text-center font-mono text-fog-400">
                                {item.req} {item.unidad}
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-paper-50">
                                {item.cantidad ?? item.req}
                              </td>
                              <td className="p-2.5 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.estado === "BUENO"
                                      ? "bg-ok-green/10 text-ok-green border border-ok-green/30"
                                      : item.estado === "MALO"
                                      ? "bg-alert-red/10 text-alert-red border border-alert-red/30"
                                      : "bg-signal-amber/10 text-signal-amber border border-signal-amber/30"
                                  }`}
                                >
                                  {item.estado}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-[11px]">
                                {item.tieneVencimiento ? (
                                  item.fechaVencimiento ? (
                                    <span className={isVencido ? "text-alert-red font-bold" : "text-mist-200"}>
                                      {item.fechaVencimiento} {isVencido ? "(VENCIDO)" : ""}
                                    </span>
                                  ) : (
                                    <span className="text-signal-amber">Sin fecha</span>
                                  )
                                ) : (
                                  <span className="text-fog-400">N/A</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fotos Evidencia */}
              {selectedRecord.fotosEvidencia && selectedRecord.fotosEvidencia.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-fog-400 mb-3">
                    Evidencias Fotográficas ({selectedRecord.fotosEvidencia.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedRecord.fotosEvidencia.map((foto, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedPreviewImage(foto)}
                        className="relative rounded-xl overflow-hidden border border-line-600 aspect-video cursor-pointer hover:border-radar-cyan transition-all group"
                      >
                        <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-5 h-5 text-paper-50" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observaciones y Firma */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-asphalt-950 border border-line-600">
                  <span className="text-[10px] text-fog-400 uppercase font-mono block mb-1">
                    Observaciones y Hallazgos
                  </span>
                  <p className="text-xs text-mist-200 whitespace-pre-wrap">
                    {selectedRecord.observaciones || "Sin observaciones registradas."}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-asphalt-950 border border-line-600 flex flex-col justify-between">
                  <span className="text-[10px] text-fog-400 uppercase font-mono block mb-2">
                    Firma del Inspector / Conductor
                  </span>
                  {selectedRecord.firmaConductor ? (
                    <div className="bg-white p-2 rounded-lg border border-line-600 flex items-center justify-center h-24">
                      <img
                        src={selectedRecord.firmaConductor}
                        alt="Firma"
                        className="max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-24 rounded-lg bg-asphalt-900 border border-dashed border-line-600 flex items-center justify-center text-xs text-fog-400">
                      Sin firma digital
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-4 border-t border-line-600 flex justify-end bg-asphalt-950">
              <Button
                onClick={() => {
                  setPrintRecord(selectedRecord);
                  setSelectedRecord(null);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-asphalt-950 font-bold text-xs"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Formato HSEQ-F-035
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX DE FOTO AMPLIADA */}
      {selectedPreviewImage && (
        <div
          onClick={() => setSelectedPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img
              src={selectedPreviewImage}
              alt="Evidencia"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-line-600"
            />
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-paper-50 hover:bg-black"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* DOCUMENTO OFICIAL PARA IMPRESIÓN FÍSICA (HSEQ-F-035 v04) */}
      {printRecord && (
        <div className="fixed inset-0 z-50 bg-white text-black p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="no-print flex justify-between items-center pb-4 border-b">
              <button
                onClick={() => setPrintRecord(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-bold text-black"
              >
                ← Volver al ERP
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 shadow-md"
              >
                🖨️ Imprimir / Guardar PDF
              </button>
            </div>

            {/* Encabezado Corporativo Oficial */}
            <div className="border border-black flex text-center">
              <div className="w-1/4 p-3 border-r border-black flex items-center justify-center font-bold text-sm">
                TRANS SERVICES A&B
              </div>
              <div className="w-1/2 p-3 border-r border-black flex flex-col justify-center">
                <h2 className="font-bold text-sm uppercase">SISTEMA DE GESTIÓN HSEQ</h2>
                <p className="text-xs font-bold uppercase mt-1">
                  FORMATO INSPECCIÓN DE BOTIQUINES DE PRIMEROS AUXILIOS
                </p>
              </div>
              <div className="w-1/4 text-[10px] text-left p-2 font-mono flex flex-col justify-center">
                <div><b>CÓDIGO:</b> HSEQ-F-035</div>
                <div><b>VERSIÓN:</b> 04</div>
                <div><b>FECHA:</b> 09/03/2026</div>
                <div><b>PÁGINA:</b> 1 de 1</div>
              </div>
            </div>

            {/* Metadatos del Vehículo e Inspector */}
            <div className="border border-black grid grid-cols-2 text-xs">
              <div className="p-2 border-r border-b border-black"><b>PLACA:</b> {printRecord.placa}</div>
              <div className="p-2 border-b border-black"><b>FECHA / HORA:</b> {printRecord.fecha} - {printRecord.hora}</div>
              <div className="p-2 border-r border-b border-black"><b>TIPO VEHÍCULO:</b> {printRecord.tipoVehiculo}</div>
              <div className="p-2 border-b border-black"><b>UBICACIÓN:</b> {printRecord.ubicacionBotiquin}</div>
              <div className="p-2 border-r border-black"><b>CONDUCTOR/INSPECTOR:</b> {printRecord.conductorNombre}</div>
              <div className="p-2"><b>ESTADO GABINETE:</b> {printRecord.estadoGabinete}</div>
            </div>

            {/* Tabla de 21 Items */}
            <table className="w-full border border-black text-[11px] text-left">
              <thead>
                <tr className="bg-gray-100 border-b border-black font-bold">
                  <th className="p-1.5 border-r border-black">Ítem</th>
                  <th className="p-1.5 border-r border-black">Elemento</th>
                  <th className="p-1.5 border-r border-black text-center">Req.</th>
                  <th className="p-1.5 border-r border-black text-center">Cant.</th>
                  <th className="p-1.5 border-r border-black text-center">Estado</th>
                  <th className="p-1.5">Vencimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {Array.isArray(printRecord.checklist) &&
                  printRecord.checklist.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-1 border-r border-black text-center">{idx + 1}</td>
                      <td className="p-1 border-r border-black">{item.nombre}</td>
                      <td className="p-1 border-r border-black text-center">{item.req} {item.unidad}</td>
                      <td className="p-1 border-r border-black text-center font-bold">{item.cantidad ?? item.req}</td>
                      <td className="p-1 border-r border-black text-center">{item.estado}</td>
                      <td className="p-1 text-[10px] font-mono">{item.fechaVencimiento || "N/A"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Observaciones y Firmas */}
            <div className="border border-black p-2 text-xs min-h-[50px]">
              <b>OBSERVACIONES / ACCIONES CORRECTIVAS:</b>
              <p className="mt-1">{printRecord.observaciones || "Ninguna."}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="border border-black p-3 text-center h-28 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase">FIRMA CONDUCTOR / INSPECTOR</span>
                {printRecord.firmaConductor && (
                  <img src={printRecord.firmaConductor} alt="Firma" className="max-h-12 mx-auto object-contain" />
                )}
                <span className="text-[10px] border-t border-black pt-1">{printRecord.conductorNombre}</span>
              </div>
              <div className="border border-black p-3 text-center h-28 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase">REVISÓ / APROBÓ (COORDINADOR HSEQ)</span>
                <span className="text-xs font-bold text-gray-600">
                  {printRecord.estadoAprobo ? "APROBADO DIGITALMENTE" : "PENDIENTE DE REVISIÓN"}
                </span>
                <span className="text-[10px] border-t border-black pt-1">Responsable HSEQ</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
