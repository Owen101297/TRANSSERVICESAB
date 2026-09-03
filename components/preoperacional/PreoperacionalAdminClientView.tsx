"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  X,
  Truck,
  User,
  Gauge,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  InspeccionPreoperacionalDto,
  PREOPERACIONAL_SECCIONES,
  TOTAL_ITEMS_PREOPERACIONAL,
} from "@/lib/types/preoperacional";
import { PlateTag } from "@/components/ui/PlateTag";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Card } from "@/components/ui/Card";
import { Vehiculo } from "@/lib/types/vehiculo";

interface PreoperacionalAdminClientViewProps {
  initialPreoperacionales: InspeccionPreoperacionalDto[];
  totalCount: number;
  vehiculos: Vehiculo[];
}

export function PreoperacionalAdminClientView({
  initialPreoperacionales,
  totalCount: initialTotal,
  vehiculos,
}: PreoperacionalAdminClientViewProps) {
  const [items, setItems] = useState<InspeccionPreoperacionalDto[]>(initialPreoperacionales);
  const [totalCount, setTotalCount] = useState<number>(initialTotal);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [rangoFecha, setRangoFecha] = useState<string>("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroPlaca, setFiltroPlaca] = useState<string>("todas");
  const [filtroConcepto, setFiltroConcepto] = useState<string>("todos");

  // Inspección Seleccionada para Modal de Detalle
  const [selectedInspection, setSelectedInspection] = useState<InspeccionPreoperacionalDto | null>(null);

  // Filtrado reactivo en memoria / fetch
  const filteredItems = items.filter((item) => {
    if (filtroPlaca !== "todas" && !item.placa.includes(filtroPlaca)) return false;
    if (filtroConcepto !== "todos" && item.estadoConcepto !== filtroConcepto) return false;

    if (rangoFecha === "hoy") {
      const today = new Date().toISOString().split("T")[0];
      if (!item.fecha.startsWith(today)) return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchPlaca = item.placa.toLowerCase().includes(q);
      const matchConductor = item.conductorNombre.toLowerCase().includes(q);
      const matchHallazgo = item.descripcionHallazgo?.toLowerCase().includes(q) || false;
      return matchPlaca || matchConductor || matchHallazgo;
    }

    return true;
  });

  // Métricas rápidas
  const countAptos = items.filter((x) => x.estadoConcepto === "apto").length;
  const countNoAptos = items.filter((x) => x.estadoConcepto === "no_apto").length;
  const countObservaciones = items.filter((x) => x.estadoConcepto === "apto_con_observacion").length;

  // Exportar a Excel
  const handleExportExcel = () => {
    const dataToExport = filteredItems.map((ins, idx) => ({
      No: idx + 1,
      Fecha: new Date(ins.fecha).toLocaleDateString("es-CO"),
      Hora: new Date(ins.fecha).toLocaleTimeString("es-CO"),
      Placa: ins.placa,
      Conductor: ins.conductorNombre,
      "Concepto HSEQ":
        ins.estadoConcepto === "apto"
          ? "APTO"
          : ins.estadoConcepto === "no_apto"
          ? "NO APTO"
          : "APTO CON NOVEDAD",
      "Kilometraje (KM)": ins.kilometraje || "—",
      "Hallazgos Reportados": ins.descripcionHallazgo || "Ninguno",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Preoperacionales");
    XLSX.writeFile(wb, `Consolidado_Preoperacionales_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Imprimir Formato Individual
  const handlePrint = () => {
    window.print();
  };

  const columns: Column<InspeccionPreoperacionalDto>[] = [
    {
      header: "Fecha / Hora",
      accessor: "fecha",
      render: (v) => {
        const d = new Date(v as string);
        return (
          <div className="space-y-0.5 font-mono text-xs">
            <span className="text-paper-50 font-semibold block">
              {d.toLocaleDateString("es-CO")}
            </span>
            <span className="text-fog-400 text-[11px] block">
              {d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      },
    },
    {
      header: "Vehículo",
      accessor: "placa",
      render: (v) => <PlateTag plate={v as string} />,
    },
    {
      header: "Conductor",
      accessor: "conductorNombre",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-asphalt-800 text-fog-400 font-bold text-xs border border-line-600">
            <User size={13} />
          </div>
          <span className="text-xs font-semibold text-paper-50">{v as string}</span>
        </div>
      ),
    },
    {
      header: "Odómetro",
      accessor: "kilometraje",
      render: (v) => (
        <div className="font-mono text-xs text-fog-400">
          {v ? (
            <span className="text-paper-50 font-bold">
              {Number(v).toLocaleString()} <span className="text-[10px] text-signal-amber">KM</span>
            </span>
          ) : (
            "—"
          )}
        </div>
      ),
    },
    {
      header: "Concepto HSEQ",
      accessor: "estadoConcepto",
      render: (v, row) => {
        if (v === "no_apto") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-alert-red-dim text-alert-red border border-alert-red/30">
              <AlertTriangle size={12} />
              <span>NO APTO</span>
            </span>
          );
        }
        if (v === "apto_con_observacion") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-signal-amber-dim text-signal-amber border border-signal-amber/30">
              <AlertTriangle size={12} />
              <span>CON OBSERVACIÓN</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-ok-green-dim text-ok-green border border-ok-green/30">
            <CheckCircle2 size={12} />
            <span>APTO</span>
          </span>
        );
      },
    },
    {
      header: "Hallazgos / Novedad",
      accessor: "descripcionHallazgo",
      render: (v) => (
        <span className="text-xs text-fog-400 truncate max-w-xs block">
          {(v as string) || "Sin novedades"}
        </span>
      ),
    },
    {
      header: "Acciones",
      accessor: "id",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => setSelectedInspection(row)}
          className="px-2.5 py-1 rounded-lg bg-asphalt-800 hover:bg-asphalt-700 text-radar-cyan border border-line-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Eye size={13} />
          <span>Ver 32 Puntos</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cabecera del Módulo */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600/70 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-radar-cyan font-semibold uppercase tracking-wider">
            <ShieldCheck size={15} className="text-radar-cyan" />
            <span>HSEQ-FOR-08 · PESV PASO 14</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-paper-50 mt-0.5">
            Inspecciones Preoperacionales
          </h1>
        </div>

        {/* Píldoras de Conteo Rápido */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="rounded-lg bg-asphalt-900 border border-line-600 px-2.5 py-1 text-fog-400">
            Total: <strong className="text-paper-50">{filteredItems.length}</strong>
          </span>
          <span className="rounded-lg bg-ok-green-dim border border-ok-green/30 px-2.5 py-1 text-ok-green">
            Aptos: <strong className="font-bold">{countAptos}</strong>
          </span>
          <span className="rounded-lg bg-alert-red-dim border border-alert-red/30 px-2.5 py-1 text-alert-red">
            No Aptos: <strong className="font-bold">{countNoAptos}</strong>
          </span>
          <span className="rounded-lg bg-signal-amber-dim border border-signal-amber/30 px-2.5 py-1 text-signal-amber">
            Con Novedad: <strong className="font-bold">{countObservaciones}</strong>
          </span>
        </div>
      </div>

      {/* Barra de Control Unificada en 1 Sola Línea */}
      <div className="rounded-xl border border-line-600 bg-asphalt-900 p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[300px]">
          {/* Buscador Rápido */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-2.5 top-2.5 text-fog-400" />
            <input
              type="text"
              placeholder="Buscar por placa, conductor o hallazgo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-line-600 bg-asphalt-950 pl-8 pr-3 py-1.5 text-xs text-paper-50 placeholder:text-fog-400/50 focus:border-radar-cyan focus:outline-none"
            />
          </div>

          {/* Selector de Rango Temporal */}
          <div className="flex items-center rounded-lg border border-line-600 bg-asphalt-950 p-0.5 text-xs font-mono">
            {["todos", "hoy"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRangoFecha(r)}
                className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                  rangoFecha === r
                    ? "bg-radar-cyan text-asphalt-950 font-bold shadow-sm"
                    : "text-fog-400 hover:text-paper-50"
                }`}
              >
                {r === "todos" ? "Todos" : "Hoy"}
              </button>
            ))}
          </div>

          {/* Filtro por Vehículo */}
          <select
            value={filtroPlaca}
            onChange={(e) => setFiltroPlaca(e.target.value)}
            className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none max-w-[140px]"
          >
            <option value="todas">Todos los Vehículos</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.placa}>
                {v.placa} ({v.tipo})
              </option>
            ))}
          </select>

          {/* Filtro por Concepto */}
          <select
            value={filtroConcepto}
            onChange={(e) => setFiltroConcepto(e.target.value)}
            className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none max-w-[150px]"
          >
            <option value="todos">Todos los Conceptos</option>
            <option value="apto">Solo Aptos</option>
            <option value="no_apto">Solo No Aptos</option>
            <option value="apto_con_observacion">Con Observación</option>
          </select>
        </div>

        {/* Botón de Exportar Excel */}
        <button
          type="button"
          onClick={handleExportExcel}
          className="px-3 py-1.5 rounded-lg border border-line-600 bg-asphalt-950 hover:bg-asphalt-800 text-paper-50 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <FileSpreadsheet size={14} className="text-ok-green" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* Tabla de Resultados */}
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filteredItems} />
      </Card>

      {/* Modal de Detalle Completo de los 32 Puntos (HSEQ-FOR-08) */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl border border-line-600 bg-asphalt-900 shadow-2xl flex flex-col overflow-hidden">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-line-600 p-4 bg-asphalt-950">
              <div className="flex items-center gap-3">
                <PlateTag plate={selectedInspection.placa} />
                <div>
                  <h3 className="text-sm font-bold text-paper-50">
                    Formato de Inspección Preoperacional HSEQ-FOR-08
                  </h3>
                  <span className="text-[11px] font-mono text-fog-400">
                    Conductor: <strong className="text-paper-50">{selectedInspection.conductorNombre}</strong> · Fecha: {new Date(selectedInspection.fecha).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-1.5 rounded-lg border border-line-600 bg-asphalt-900 text-paper-50 hover:bg-asphalt-800"
                  title="Imprimir / Guardar PDF"
                >
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInspection(null)}
                  className="p-1.5 rounded-lg border border-line-600 bg-asphalt-900 text-fog-400 hover:text-paper-50"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Contenido del Formato Técnico de 32 Puntos */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 print:p-0">
              {/* Bloque de Metadatos del Vehículo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-asphalt-950 border border-line-600 text-xs font-mono">
                <div>
                  <span className="text-fog-400 block text-[10px]">VEHÍCULO</span>
                  <strong className="text-paper-50">{selectedInspection.placa}</strong>
                </div>
                <div>
                  <span className="text-fog-400 block text-[10px]">ODÓMETRO</span>
                  <strong className="text-paper-50">{selectedInspection.kilometraje ? `${selectedInspection.kilometraje.toLocaleString()} KM` : "—"}</strong>
                </div>
                <div>
                  <span className="text-fog-400 block text-[10px]">CONCEPTO HSEQ</span>
                  <strong className={selectedInspection.estadoConcepto === "no_apto" ? "text-alert-red" : "text-ok-green"}>
                    {selectedInspection.estadoConcepto.toUpperCase()}
                  </strong>
                </div>
                <div>
                  <span className="text-fog-400 block text-[10px]">ESTADO PESV</span>
                  <strong className="text-radar-cyan">PASO 14 VÁLIDO</strong>
                </div>
              </div>

              {/* Las 7 Secciones del Formato (A a G) */}
              <div className="space-y-4">
                {Object.entries(PREOPERACIONAL_SECCIONES).map(([secKey, sec]) => (
                  <div key={secKey} className="rounded-xl border border-line-600/70 bg-asphalt-950/60 p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-line-600/50 pb-1.5">
                      <span className="font-bold text-xs text-signal-amber font-mono">
                        {sec.codigo}. {sec.titulo}
                      </span>
                      <span className="text-[10px] text-fog-400">{sec.subtitulo}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {sec.items.map((item) => {
                        const val = selectedInspection.checklist[item.id] || "C";
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-2 rounded-lg border ${
                              val === "NC"
                                ? "border-alert-red/60 bg-alert-red-dim/20 text-alert-red"
                                : val === "C"
                                ? "border-line-600/40 bg-asphalt-900/50 text-paper-50"
                                : "border-line-600/20 bg-asphalt-900/20 text-fog-400"
                            }`}
                          >
                            <span className="truncate pr-2">{item.nombre}</span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] shrink-0 ${
                                val === "C"
                                  ? "bg-ok-green-dim text-ok-green"
                                  : val === "NC"
                                  ? "bg-alert-red text-paper-50"
                                  : "bg-asphalt-800 text-fog-400"
                              }`}
                            >
                              {val === "C" ? "CUMPLE" : val === "NC" ? "NO CUMPLE" : "N/A"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Observaciones */}
              {selectedInspection.descripcionHallazgo && (
                <div className="rounded-xl border border-line-600 bg-asphalt-950 p-3 space-y-1">
                  <span className="text-[10px] font-mono text-fog-400 block uppercase">
                    Observaciones y Hallazgos Registrados
                  </span>
                  <p className="text-xs text-paper-50">{selectedInspection.descripcionHallazgo}</p>
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div className="border-t border-line-600 p-4 bg-asphalt-950 flex items-center justify-between">
              <span className="text-[11px] font-mono text-fog-400">
                TRANS SERVICES COOPERATIVA A&amp;B · SISTEMA HSEQ PESV
              </span>
              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="px-4 py-2 rounded-xl bg-asphalt-800 hover:bg-asphalt-700 text-paper-50 font-bold text-xs border border-line-600"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
