"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileQuestion,
  Calendar,
  Search,
  RefreshCw,
  Star,
  ThumbsUp,
  Car,
  FileSpreadsheet,
  Trash2,
  Eye,
  X,
  ExternalLink,
  QrCode,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

interface EncuestaItem {
  id: string;
  tipoEncuesta: string;
  titulo: string;
  fecha: string;
  hora: string;
  placa?: string | null;
  tipoVehiculo?: string | null;
  conductorNombre?: string | null;
  conductorDocumento?: string | null;
  nombreEncuestado?: string | null;
  emailEncuestado?: string | null;
  empresaCliente?: string | null;
  calificacionGeneral: number;
  limpiezaVehiculo: number;
  atencionConductor: number;
  puntualidad: number;
  seguridadConfort: number;
  seriaRecomendado: string;
  preguntasDetalle?: any;
  comentarios?: string | null;
  firma?: string | null;
  canal: string;
  estado: string;
  timestamp: string;
}

export default function EncuestasAdminPage() {
  const [encuestas, setEncuestas] = useState<EncuestaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMes, setSelectedMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [stats, setStats] = useState({
    total: 0,
    avgOverall: 5.0,
    avgLimpieza: 5.0,
    avgAtencion: 5.0,
    avgPuntualidad: 5.0,
    avgConfort: 5.0,
    pctRecomendacion: 100,
    vehiculosEvaluados: 0,
  });

  // Modal de detalle y modal de QR
  const [selectedEncuesta, setSelectedEncuesta] = useState<EncuestaItem | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrPlate, setQrPlate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/apps/encuesta?mes=${selectedMes}`;
      if (filterTipo !== "todos") {
        url += `&tipo=${filterTipo}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Error en el servidor (${res.status})`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "No se pudieron obtener las encuestas.");
      }
      setEncuestas(data.registros || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error("Error al cargar encuestas:", err);
      setError(err.message || "Error al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  }, [selectedMes, filterTipo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEncuestas = useMemo(() => {
    return encuestas.filter((e) => {
      const matchSearch =
        !searchQuery ||
        (e.placa && e.placa.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.conductorNombre && e.conductorNombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.nombreEncuestado && e.nombreEncuestado.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchSearch;
    });
  }, [encuestas, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este registro de encuesta?")) return;
    try {
      const res = await fetch(`/api/apps/encuesta?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setEncuestas((prev) => prev.filter((e) => e.id !== id));
        if (selectedEncuesta?.id === id) setSelectedEncuesta(null);
      } else {
        alert(data.error || "No se pudo eliminar.");
      }
    } catch (err) {
      console.error("Error al eliminar encuesta:", err);
      alert("Error al eliminar la encuesta.");
    }
  };

  const exportToCSV = () => {
    if (filteredEncuestas.length === 0) return;
    const headers = [
      "ID",
      "Fecha",
      "Hora",
      "Tipo Encuesta",
      "Placa",
      "Conductor",
      "Encuestado",
      "Email",
      "Calificación General",
      "Limpieza",
      "Atención Conductor",
      "Puntualidad",
      "Confort/Seguridad",
      "Recomendaría",
      "Comentarios",
    ];
    const rows = filteredEncuestas.map((e) => [
      e.id,
      e.fecha,
      e.hora,
      e.tipoEncuesta,
      e.placa || "",
      `"${e.conductorNombre || ""}"`,
      `"${e.nombreEncuestado || ""}"`,
      e.emailEncuestado || "",
      e.calificacionGeneral,
      e.limpiezaVehiculo,
      e.atencionConductor,
      e.puntualidad,
      e.seguridadConfort,
      e.seriaRecomendado,
      `"${(e.comentarios || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Encuestas_Satisfaccion_${selectedMes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStarRating = (val: number) => {
    return (
      <div className="flex items-center gap-1 font-mono font-bold text-xs text-amber-400">
        <span>{val.toFixed(1)}</span>
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line-600 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FileQuestion className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-asphalt-800 border border-line-600 text-radar-cyan">
                  PESV & Calidad
                </span>
                <h1 className="font-display font-bold text-2xl md:text-3xl text-paper-50 tracking-wide">
                  Encuestas y Percepción de Servicio
                </h1>
              </div>
              <p className="font-body text-xs md:text-sm text-fog-400 mt-0.5">
                Baterías de satisfacción al usuario, hábitos de conducción PESV y valoración del servicio de transporte
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/apps/encuesta/index.html"
            target="_blank"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-asphalt-800 hover:bg-asphalt-700 border border-line-600 text-mist-200 hover:text-paper-50 text-xs font-semibold transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4 text-indigo-400" />
            <span>Abrir App Pasajeros</span>
          </Link>

          <Button
            onClick={() => setShowQRModal(true)}
            variant="ghost"
            className="text-xs bg-asphalt-800 border border-line-600 text-mist-200 hover:text-paper-50"
          >
            <QrCode className="w-4 h-4 mr-1.5 text-radar-cyan" />
            Generar QR Flota
          </Button>

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
          label="Total Encuestas"
          value={stats.total}
          subtitle={`${stats.vehiculosEvaluados} vehículos calificados`}
          icon={<FileQuestion className="w-5 h-5 text-indigo-400" />}
        />
        <StatCard
          label="Promedio Calificación"
          value={`${stats.avgOverall} / 5.0`}
          subtitle="Satisfacción global del servicio"
          icon={<Star className="w-5 h-5 fill-amber-400 text-amber-400" />}
        />
        <StatCard
          label="% Recomendación (NPS)"
          value={`${stats.pctRecomendacion}%`}
          subtitle="Pasajeros que recomiendan el servicio"
          icon={<ThumbsUp className="w-5 h-5 text-ok-green" />}
        />
        <StatCard
          label="Atención Conductor"
          value={`${stats.avgAtencion} / 5.0`}
          subtitle={`Limpieza: ${stats.avgLimpieza} | Puntualidad: ${stats.avgPuntualidad}`}
          icon={<Sparkles className="w-5 h-5 text-radar-cyan" />}
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
                placeholder="Buscar por placa, conductor o encuestado..."
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
            <span className="text-xs text-fog-400 hidden lg:inline">Tipo:</span>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="h-10 px-3 rounded-lg bg-asphalt-950 border border-line-600 text-paper-50 text-xs focus:outline-none focus:border-radar-cyan"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="satisfaccion_servicio">Satisfacción del Servicio</option>
              <option value="riesgo_vial_pesv">Riesgo Vial PESV</option>
              <option value="clima_laboral">Clima Laboral</option>
              <option value="sgsst">SG-SST Condiciones</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ESTADOS DE INTERFAZ (REGLA 5: CARGA / ERROR / VACÍO / TABLA) */}
      {loading ? (
        <Card className="p-4 bg-asphalt-900 border-line-600">
          <TableSkeleton rows={6} cols={7} />
        </Card>
      ) : error ? (
        <ErrorState
          title="No se pudieron cargar las encuestas"
          message={error}
          onRetry={loadData}
        />
      ) : filteredEncuestas.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title={searchQuery ? "Sin coincidencias de búsqueda" : "No hay encuestas en este período"}
          description={
            searchQuery
              ? `No encontramos encuestas para '${searchQuery}'. Intente con otra placa o conductor.`
              : `Aún no se han registrado encuestas para el mes de ${selectedMes}.`
          }
          actionLabel={searchQuery ? "Limpiar Filtros" : "Abrir Formulario de Pasajeros"}
          onAction={() => {
            if (searchQuery) {
              setSearchQuery("");
              setFilterTipo("todos");
            } else {
              window.open("/apps/encuesta/index.html", "_blank");
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
                  <th className="py-3.5 px-4">Conductor</th>
                  <th className="py-3.5 px-4">Calificación</th>
                  <th className="py-3.5 px-4">Criterios Evaluados</th>
                  <th className="py-3.5 px-4 text-center">Recomendaría</th>
                  <th className="py-3.5 px-4">Comentarios</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-600 text-mist-200">
                {filteredEncuestas.map((encuesta) => (
                  <tr key={encuesta.id} className="hover:bg-asphalt-800/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      <div className="font-bold text-paper-50">{encuesta.fecha}</div>
                      <div className="text-[11px] text-fog-400">{encuesta.hora || "--:--"}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {encuesta.placa ? (
                        <PlateTag plate={encuesta.placa} />
                      ) : (
                        <span className="text-fog-400 italic">No especificada</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-paper-50">
                        {encuesta.conductorNombre || "Sin asignar"}
                      </div>
                      <div className="text-[11px] text-fog-400">
                        Por: {encuesta.nombreEncuestado || "Pasajero anónimo"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStarRating(encuesta.calificacionGeneral || 5)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5 text-[11px]">
                        <div className="text-fog-400">
                          Limpieza: <b className="text-paper-50">{encuesta.limpiezaVehiculo}★</b> | Atención:{" "}
                          <b className="text-paper-50">{encuesta.atencionConductor}★</b>
                        </div>
                        <div className="text-fog-400">
                          Puntualidad: <b className="text-paper-50">{encuesta.puntualidad}★</b> | Confort:{" "}
                          <b className="text-paper-50">{encuesta.seguridadConfort}★</b>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          encuesta.seriaRecomendado === "SI"
                            ? "bg-ok-green/10 text-ok-green border border-ok-green/30"
                            : encuesta.seriaRecomendado === "TAL_VEZ"
                            ? "bg-signal-amber/10 text-signal-amber border border-signal-amber/30"
                            : "bg-alert-red/10 text-alert-red border border-alert-red/30"
                        }`}
                      >
                        {encuesta.seriaRecomendado === "SI"
                          ? "👍 Sí"
                          : encuesta.seriaRecomendado === "TAL_VEZ"
                          ? "👌 Tal vez"
                          : "👎 No"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-[200px] truncate text-fog-400">
                      {encuesta.comentarios ? (
                        <span title={encuesta.comentarios}>{encuesta.comentarios}</span>
                      ) : (
                        <span className="italic text-fog-400/50">Sin comentarios</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          onClick={() => setSelectedEncuesta(encuesta)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-radar-cyan hover:bg-radar-cyan/10"
                          title="Ver Detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          onClick={() => handleDelete(encuesta.id)}
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
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL DE DETALLE DE ENCUESTA */}
      {selectedEncuesta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-asphalt-900 border border-line-600 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-line-600 flex items-center justify-between bg-asphalt-950">
              <div className="flex items-center gap-2">
                {selectedEncuesta.placa && <PlateTag plate={selectedEncuesta.placa} />}
                <h3 className="font-display font-bold text-base text-paper-50">
                  Calificación de Servicio
                </h3>
              </div>
              <button
                onClick={() => setSelectedEncuesta(null)}
                className="p-1.5 rounded-lg text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-asphalt-950 border border-line-600 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-fog-400 uppercase font-mono block">Calificación Global</span>
                  <div className="flex items-center gap-1.5 text-lg font-bold text-amber-400 font-mono mt-0.5">
                    <span>{selectedEncuesta.calificacionGeneral}</span>
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-fog-400 uppercase font-mono block">Fecha & Hora</span>
                  <span className="text-xs font-bold text-paper-50 font-mono">
                    {selectedEncuesta.fecha} {selectedEncuesta.hora}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-fog-400 uppercase tracking-wider text-[11px]">
                  Desglose por Criterio
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-asphalt-950 border border-line-600 flex justify-between items-center">
                    <span className="text-fog-400">Limpieza:</span>
                    <span className="font-bold text-amber-400 font-mono">{selectedEncuesta.limpiezaVehiculo} ★</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-asphalt-950 border border-line-600 flex justify-between items-center">
                    <span className="text-fog-400">Atención:</span>
                    <span className="font-bold text-amber-400 font-mono">{selectedEncuesta.atencionConductor} ★</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-asphalt-950 border border-line-600 flex justify-between items-center">
                    <span className="text-fog-400">Puntualidad:</span>
                    <span className="font-bold text-amber-400 font-mono">{selectedEncuesta.puntualidad} ★</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-asphalt-950 border border-line-600 flex justify-between items-center">
                    <span className="text-fog-400">Confort:</span>
                    <span className="font-bold text-amber-400 font-mono">{selectedEncuesta.seguridadConfort} ★</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-asphalt-950 border border-line-600 space-y-1">
                <span className="text-[10px] text-fog-400 uppercase font-mono block">
                  Comentarios del Usuario
                </span>
                <p className="text-mist-200 whitespace-pre-wrap">
                  {selectedEncuesta.comentarios || "Sin comentarios adicionales."}
                </p>
              </div>

              <div className="text-[11px] text-fog-400 pt-2 border-t border-line-600 flex justify-between">
                <span>Encuestado: <b className="text-paper-50">{selectedEncuesta.nombreEncuestado}</b></span>
                <span>Canal: <b className="text-paper-50 font-mono">{selectedEncuesta.canal}</b></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERADOR DE QR PARA FLOTA */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-asphalt-900 border border-line-600 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-line-600">
              <h3 className="font-display font-bold text-base text-paper-50">Generar QR de Vehículo</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1 rounded-lg text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-fog-400 uppercase mb-1">
                  Placa (Opcional para prellenar):
                </label>
                <input
                  type="text"
                  placeholder="Ej: WLM849"
                  value={qrPlate}
                  onChange={(e) => setQrPlate(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 rounded-lg bg-asphalt-950 border border-line-600 font-mono font-bold text-paper-50 focus:outline-none focus:border-radar-cyan uppercase"
                />
              </div>

              <div className="p-4 bg-white rounded-xl flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/apps/encuesta/index.html${
                      qrPlate ? `?placa=${qrPlate}` : ""
                    }`
                  )}`}
                  alt="QR Vehículo"
                  className="w-44 h-44 object-contain"
                />
              </div>

              <p className="text-[11px] text-fog-400 text-center">
                Imprima este código y ubíquelo en el respaldo de los asientos o en el parabrisas para que los pasajeros califiquen el viaje.
              </p>

              <Button
                onClick={() => window.print()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Imprimir Código QR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
