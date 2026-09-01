"use client";

import { useState, useRef } from "react";
import {
  Upload,
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProfileTag } from "@/components/ui/ProfileTag";
import { Avatar } from "@/components/ui/Avatar";
import { Persona } from "@/lib/types/persona";
import {
  parseExcelOrCSVBuffer,
  analyzePersonaUpsertBatch,
  generateExcelTemplateBlob,
  generateCSVTemplate,
  UpsertPreviewItem,
  UpsertBatchResult,
} from "@/lib/data/personas-upsert";
import { batchUpsertPersonasDb } from "@/lib/services/personas.service";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPersons: Persona[];
  onSuccess: (updatedList: Persona[]) => void;
}

export function BulkUploadModal({
  isOpen,
  onClose,
  currentPersons,
  onSuccess,
}: BulkUploadModalProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<UpsertBatchResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "create" | "update" | "error">("all");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = (file: File) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isCsv = file.name.endsWith(".csv");

    if (!isExcel && !isCsv) {
      alert("Por favor selecciona un archivo con formato Excel (.xlsx, .xls) o CSV (.csv)");
      return;
    }

    setFileName(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const rows = parseExcelOrCSVBuffer(buffer);
        if (rows.length === 0) {
          setErrorMessage("El archivo seleccionado está vacío o no contiene filas con datos.");
          return;
        }
        const analyzed = analyzePersonaUpsertBatch(rows, currentPersons);
        setBatchResult(analyzed);
      } catch (err: any) {
        console.error("Error al procesar archivo:", err);
        setErrorMessage("Error al leer el archivo. Asegúrate de que no esté protegido con contraseña.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDownloadExcel = () => {
    const blob = generateExcelTemplateBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Plantilla_Carga_Personal_Transservices.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const csvContent = generateCSVTemplate();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Plantilla_Carga_Personal_Transservices.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmUpsert = async () => {
    if (!batchResult || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await batchUpsertPersonasDb(batchResult.previewItems);
      if (res.success && res.refreshedList) {
        onSuccess(res.refreshedList);
        handleReset();
        onClose();
      } else {
        setErrorMessage(res.error || "Ocurrió un error al guardar los registros en base de datos.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error de conexión.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFileName(null);
    setBatchResult(null);
    setErrorMessage(null);
    setFilterTab("all");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewColumns: Column<UpsertPreviewItem>[] = [
    {
      header: "Fila",
      accessor: "rowNumber",
      render: (_val, row) => (
        <span className="font-mono text-xs text-fog-400 font-semibold">
          #{row.rowNumber || "—"}
        </span>
      ),
    },
    {
      header: "Acción",
      accessor: "action",
      render: (val) => {
        if (val === "create") {
          return <StatusBadge status="activo">Nuevo registro</StatusBadge>;
        }
        if (val === "update") {
          return <StatusBadge status="info">Actualizar</StatusBadge>;
        }
        return <StatusBadge status="critico">Omitido</StatusBadge>;
      },
    },
    {
      header: "Documento",
      accessor: "numeroDocumento",
      render: (val, row) => (
        <span className="font-[family-name:var(--font-mono)] text-xs text-paper-50 font-semibold">
          {row.tipoDocumento} {val as string}
        </span>
      ),
    },
    {
      header: "Nombre completo",
      accessor: "nombres",
      render: (_val, row) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={row.fotoIniciales} size="sm" />
          <div>
            <p className="font-medium text-paper-50 leading-snug">
              {row.nombres} {row.apellidos}
            </p>
            <p className="text-[11px] text-fog-400">
              {row.email} {row.telefono ? `· ${row.telefono}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Perfiles",
      accessor: "perfiles",
      render: (val) => (
        <div className="flex flex-wrap gap-1">
          {(val as string[]).map((p) => (
            <ProfileTag key={p} perfil={p as any} />
          ))}
        </div>
      ),
    },
    {
      header: "Licencia / Salud",
      accessor: "numeroLicencia",
      render: (_val, row) => (
        <div className="text-xs">
          {row.numeroLicencia ? (
            <p className="text-mist-200 font-mono">
              Lic: {row.numeroLicencia} ({row.categoriasLicencia?.join("/") || "C2"})
              {row.vencimientoLicencia ? ` · Venc: ${row.vencimientoLicencia}` : ""}
            </p>
          ) : (
            <p className="text-fog-400">Sin licencia</p>
          )}
          {(row.eps || row.arl) && (
            <p className="text-[10px] text-fog-400 mt-0.5">
              EPS: {row.eps || "—"} · ARL: {row.arl || "—"}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Diagnóstico / Observaciones",
      accessor: "changesSummary",
      render: (_val, row) => {
        if (row.action === "error") {
          return (
            <span className="text-xs text-alert-red flex items-center gap-1 font-medium">
              <AlertTriangle size={13} className="shrink-0" /> {row.errorMessage}
            </span>
          );
        }
        if (row.action === "create") {
          return <span className="text-xs text-ok-green">Se creará en la base de datos</span>;
        }
        return (
          <ul className="text-xs text-mist-200 list-disc list-inside space-y-0.5">
            {row.changesSummary?.map((ch, idx) => (
              <li key={idx}>{ch}</li>
            ))}
          </ul>
        );
      },
    },
  ];

  const filteredPreviewItems = batchResult
    ? batchResult.previewItems.filter((item) => {
        if (filterTab === "all") return true;
        return item.action === filterTab;
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-lg border border-line-600 bg-asphalt-900 shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-line-600 px-6 py-4 bg-asphalt-950/80">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-signal-amber/10 p-2 text-signal-amber border border-signal-amber/30">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50 tracking-wide">
                Importación Masiva de Personal (Excel / CSV)
              </h2>
              <p className="text-xs text-fog-400">
                Crea o actualiza conductores, personal administrativo y operativo mediante tu plantilla.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Barra de Descarga de Plantillas Oficiales */}
          <div className="rounded-lg border border-line-600 bg-asphalt-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="text-radar-cyan shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-semibold text-paper-50">
                  Descarga la plantilla oficial preconfigurada
                </p>
                <p className="text-xs text-fog-400 mt-0.5">
                  Incluye columnas formateadas, ejemplos reales y la guía de valores permitidos (licencias, estados y perfiles).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="primary" onClick={handleDownloadExcel} className="text-xs h-9">
                <Download size={15} /> Descargar Plantilla Excel (.xlsx)
              </Button>
              <Button variant="secondary" onClick={handleDownloadCSV} className="text-xs h-9">
                <FileText size={15} /> CSV (.csv)
              </Button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-alert-red/40 bg-alert-red-dim p-4 text-xs text-alert-red flex items-center gap-2.5">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!batchResult ? (
            /* Zona de Carga / Drag and Drop */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-150 ${
                isDragging
                  ? "border-signal-amber bg-signal-amber/5"
                  : "border-line-600 hover:border-signal-amber/50 hover:bg-asphalt-800/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessFile(file);
                }}
              />
              <div className="rounded-full bg-asphalt-800 p-4 text-signal-amber mb-3 border border-line-600 shadow-inner">
                <Upload size={32} />
              </div>
              <p className="text-base font-semibold text-paper-50">
                Arrastra tu archivo Excel (.xlsx) o CSV aquí
              </p>
              <p className="text-xs text-fog-400 mt-1">
                o haz clic para explorar en tu computador
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-fog-400 bg-asphalt-950/80 px-3 py-1.5 rounded-full border border-line-600 font-mono">
                <span>Formatos soportados:</span>
                <span className="text-signal-amber font-bold">.XLSX</span>
                <span>·</span>
                <span className="text-radar-cyan font-bold">.CSV</span>
                <span>·</span>
                <span className="text-mist-200">.XLS</span>
              </div>
            </div>
          ) : (
            /* Vista Previa y Diagnóstico */
            <div className="space-y-5">
              {/* Tarjetas de Resumen Diagnóstico */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="Total filas"
                  value={batchResult.stats.total}
                  accent="amber"
                  trend={fileName || ""}
                />
                <StatCard
                  label="Nuevos a crear"
                  value={batchResult.stats.toCreate}
                  accent="green"
                  trend="Se insertarán en DB"
                />
                <StatCard
                  label="Por actualizar"
                  value={batchResult.stats.toUpdate}
                  accent="cyan"
                  trend="Cédula ya existente"
                />
                <StatCard
                  label="Inconsistencias"
                  value={batchResult.stats.errors}
                  accent={batchResult.stats.errors > 0 ? "amber" : "cyan"}
                  trend={batchResult.stats.errors > 0 ? "Requieren revisión" : "0 errores"}
                />
              </div>

              {/* Panel de Diagnóstico Detallado por Fila */}
              {batchResult.diagnostico && batchResult.diagnostico.length > 0 && (
                <div className="rounded-lg border border-signal-amber/40 bg-signal-amber/10 p-4 text-xs text-paper-50 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-signal-amber font-semibold">
                    <AlertTriangle size={16} />
                    <span>Informe de Diagnóstico por Fila ({batchResult.diagnostico.length} observaciones encontradas)</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-mist-200 max-h-36 overflow-y-auto font-mono text-[11.5px] bg-asphalt-950/70 p-2.5 rounded border border-line-600">
                    {batchResult.diagnostico.map((diag, i) => (
                      <li key={i}>{diag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Barra de Filtro de Vista Previa */}
              <div className="flex items-center justify-between border-b border-line-600 pb-2">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setFilterTab("all")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filterTab === "all"
                        ? "bg-asphalt-700 text-paper-50 border border-line-500"
                        : "text-fog-400 hover:text-paper-50"
                    }`}
                  >
                    Todos ({batchResult.stats.total})
                  </button>
                  <button
                    onClick={() => setFilterTab("create")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filterTab === "create"
                        ? "bg-ok-green-dim text-ok-green border border-ok-green/30"
                        : "text-fog-400 hover:text-paper-50"
                    }`}
                  >
                    Nuevos ({batchResult.stats.toCreate})
                  </button>
                  <button
                    onClick={() => setFilterTab("update")}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filterTab === "update"
                        ? "bg-asphalt-700 text-radar-cyan border border-radar-cyan/30"
                        : "text-fog-400 hover:text-paper-50"
                    }`}
                  >
                    Actualizaciones ({batchResult.stats.toUpdate})
                  </button>
                  {batchResult.stats.errors > 0 && (
                    <button
                      onClick={() => setFilterTab("error")}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        filterTab === "error"
                          ? "bg-alert-red-dim text-alert-red border border-alert-red/30"
                          : "text-fog-400 hover:text-paper-50"
                      }`}
                    >
                      Errores ({batchResult.stats.errors})
                    </button>
                  )}
                </div>

                <button
                  onClick={handleReset}
                  className="text-xs text-fog-400 hover:text-paper-50 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw size={13} /> Cargar otro archivo
                </button>
              </div>

              {/* Tabla de Registros */}
              <Card className="p-0 overflow-hidden border-line-600">
                <DataTable
                  columns={previewColumns}
                  data={filteredPreviewItems}
                  emptyMessage="No hay registros en esta pestaña de filtro."
                />
              </Card>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="flex items-center justify-between border-t border-line-600 bg-asphalt-950 px-6 py-4">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>

          {batchResult && (
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleReset} disabled={isSaving}>
                Descartar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmUpsert}
                disabled={isSaving || (batchResult.stats.toCreate === 0 && batchResult.stats.toUpdate === 0)}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Guardando en Base de Datos...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Confirmar e Importar (
                    {batchResult.stats.toCreate + batchResult.stats.toUpdate} registros)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
