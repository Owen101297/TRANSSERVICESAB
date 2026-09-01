"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Contratista, TIPO_OPERACION_LABELS } from "@/lib/types/contratista";
import {
  ContratistaUpsertPreviewItem,
  ContratistaBatchAnalysisResult,
  analyzeContratistaUpsertBatch,
  parseContratistasFile,
} from "@/lib/data/contratistas-upsert";
import { bulkUpsertContratistasAction } from "@/lib/services/contratistas.service";

interface BulkUploadContratistasModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingContratistas: Contratista[];
  onUploadSuccess?: (refreshedList: Contratista[]) => void;
}

export function BulkUploadContratistasModal({
  isOpen,
  onClose,
  existingContratistas,
  onUploadSuccess,
}: BulkUploadContratistasModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<ContratistaBatchAnalysisResult | null>(null);
  const [filterTab, setFilterTab] = useState<"all" | "create" | "update">("all");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    setFileName(file.name);
    setIsAnalyzing(true);

    try {
      const rawRows = await parseContratistasFile(file);
      if (rawRows.length === 0) {
        throw new Error("El archivo no contiene filas de datos o está vacío.");
      }

      const result = analyzeContratistaUpsertBatch(rawRows, existingContratistas);
      setBatchResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al procesar el archivo Excel / CSV.");
      setBatchResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleConfirmImport = async () => {
    if (!batchResult || batchResult.items.length === 0) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await bulkUpsertContratistasAction(batchResult.items);
      if (res.success) {
        setSaveSuccessMsg(
          `¡Importación completada con éxito! Se registraron ${res.createdCount} empresas nuevas y se actualizaron ${res.updatedCount} empresas existentes.`
        );
        if (onUploadSuccess && res.refreshedList) {
          onUploadSuccess(res.refreshedList);
        }
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1800);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al persistir los registros en la base de datos.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error inesperado al guardar contratistas.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      ["TRANS SERVICES A&B", "", "", "PLANTILLA OFICIAL DE CARGA MASIVA DE CONTRATISTAS"],
      [],
      [
        "Razón Social",
        "NIT",
        "Tipo Operación",
        "Contacto Principal",
        "Teléfono",
        "Email",
        "Fecha Vinculación (YYYY-MM-DD)",
        "Fecha Fin Contrato (YYYY-MM-DD)",
        "Estado (activo/inactivo)",
        "Notas / Observaciones",
      ],
      [
        "Transportes Especiales del Norte S.A.S.",
        "900123456-7",
        "fija",
        "Carlos Mario Gómez",
        "3001234567",
        "contacto@transnorte.com",
        "2024-01-15",
        "2026-12-31",
        "activo",
        "Contratista con flota de 5 vans para rutas empresariales",
      ],
      [
        "Cooperativa Cooptax A&B",
        "890987654-3",
        "rotativa",
        "Marta Elena Ríos",
        "3119876543",
        "gerencia@cooptax.com",
        "2023-06-01",
        "",
        "activo",
        "Operación de microbuses en turnos rotativos",
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    ws["!cols"] = [
      { wch: 35 },
      { wch: 18 },
      { wch: 18 },
      { wch: 25 },
      { wch: 18 },
      { wch: 30 },
      { wch: 22 },
      { wch: 22 },
      { wch: 15 },
      { wch: 40 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Contratistas");
    XLSX.writeFile(wb, "Plantilla_Carga_Masiva_Contratistas_AB.xlsx");
  };

  const handleReset = () => {
    setFileName(null);
    setBatchResult(null);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewColumns: Column<ContratistaUpsertPreviewItem>[] = [
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
          return (
            <span className="inline-flex items-center gap-1 rounded bg-radar-cyan-dim px-2 py-0.5 text-xs font-mono font-semibold text-radar-cyan border border-radar-cyan/30">
              <RefreshCw size={11} /> Actualizar
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded bg-alert-red-dim px-2 py-0.5 text-xs font-mono font-semibold text-alert-red border border-alert-red/30">
            <AlertTriangle size={11} /> Error
          </span>
        );
      },
    },
    {
      header: "Razón Social",
      accessor: "nombre",
      render: (v) => <span className="font-semibold text-paper-50">{v as string}</span>,
    },
    {
      header: "NIT",
      accessor: "nit",
      className: "font-mono text-xs text-mist-200",
    },
    {
      header: "Operación",
      accessor: "tipoOperacion",
      render: (v) => <span>{TIPO_OPERACION_LABELS[v as Contratista["tipoOperacion"]] || (v as string)}</span>,
    },
    {
      header: "Contacto / Teléfono",
      accessor: "contactoNombre",
      render: (_v, row) => (
        <div>
          <p className="text-xs text-paper-50">{row.contactoNombre}</p>
          <p className="text-[10px] font-mono text-fog-400">{row.contactoTelefono}</p>
        </div>
      ),
    },
    {
      header: "Diagnóstico",
      accessor: "changesSummary",
      render: (_v, row) => {
        if (row.action === "error") {
          return <span className="text-xs text-alert-red font-mono">{row.errorMessage}</span>;
        }
        if (row.action === "create") {
          return (
            <span className="text-xs text-ok-green font-mono">
              Se creará expediente con NIT {row.nit}
            </span>
          );
        }
        return (
          <ul className="text-[11px] font-mono text-radar-cyan space-y-0.5">
            {row.changesSummary?.map((chg, i) => (
              <li key={i}>• {chg}</li>
            ))}
          </ul>
        );
      },
    },
  ];

  const filteredItems = batchResult
    ? batchResult.items.filter((item) => {
        if (filterTab === "create") return item.action === "create";
        if (filterTab === "update") return item.action === "update";
        return true;
      })
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/85 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-line-600 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-signal-amber/40 bg-signal-amber/10 text-signal-amber">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50 leading-tight">
                Carga Masiva de Contratistas (Excel / CSV)
              </h2>
              <p className="text-xs text-fog-400">
                Importa o sincroniza empresas aliadas con detección automática de NITs y control de duplicados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mensajes de Alerta */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-alert-red/40 bg-alert-red-dim/40 p-3 text-xs text-alert-red">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-ok-green/40 bg-ok-green-dim/40 p-3 text-xs text-ok-green">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Cuerpo del Modal */}
        <div className="mt-5 space-y-6">
          {!batchResult ? (
            <div className="space-y-4">
              {/* Zona de Carga Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragging
                    ? "border-signal-amber bg-signal-amber/10"
                    : "border-line-500 bg-asphalt-950/60 hover:border-line-400"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-asphalt-800 text-signal-amber mb-3 border border-line-600">
                  <Upload size={28} />
                </div>
                <h3 className="text-sm font-semibold text-paper-50">
                  Arrastra tu archivo de Excel o CSV aquí
                </h3>
                <p className="mt-1 text-xs text-fog-400 max-w-sm">
                  Formatos soportados: .xlsx, .xls, .csv. El sistema detectará automáticamente las columnas de Razón Social, NIT y Contacto.
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <label className="cursor-pointer">
                    <Button
                      variant="primary"
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Analizando base de datos...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span>Seleccionar archivo</span>
                        </>
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>

                  <Button variant="secondary" type="button" onClick={handleDownloadTemplate}>
                    <Download size={16} /> Descargar plantilla oficial
                  </Button>
                </div>
              </div>

              {/* Guía Rápida */}
              <div className="rounded-xl border border-line-600 bg-asphalt-800/40 p-4">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-signal-amber">
                  Reglas de Homologación de Contratistas
                </h4>
                <ul className="mt-2 space-y-1 text-xs text-fog-400 list-disc list-inside">
                  <li>
                    <strong className="text-paper-50">NIT único:</strong> Si el NIT ya existe en la base de datos, se actualizará su contacto y vigencia.
                  </li>
                  <li>
                    <strong className="text-paper-50">Empresas nuevas:</strong> Si el NIT no existe, se creará un nuevo contratista habilitado.
                  </li>
                  <li>
                    <strong className="text-paper-50">Fechas:</strong> Formato sugerido <code className="text-radar-cyan font-mono">YYYY-MM-DD</code>.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Tarjetas de Resumen Diagnóstico */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="Total empresas"
                  value={batchResult.stats.total}
                  accent="amber"
                  trend={fileName || ""}
                />
                <StatCard
                  label="Nuevas a crear"
                  value={batchResult.stats.toCreate}
                  accent="green"
                  trend="Se insertarán en DB"
                />
                <StatCard
                  label="Por actualizar"
                  value={batchResult.stats.toUpdate}
                  accent="cyan"
                  trend="NIT ya existente"
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
                    <span>Informe de Diagnóstico por Fila ({batchResult.diagnostico.length} observaciones)</span>
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
                        ? "bg-radar-cyan-dim text-radar-cyan border border-radar-cyan/30"
                        : "text-fog-400 hover:text-paper-50"
                    }`}
                  >
                    Por actualizar ({batchResult.stats.toUpdate})
                  </button>
                </div>

                <button
                  onClick={handleReset}
                  className="text-xs text-fog-400 hover:text-paper-50 underline transition-colors"
                >
                  Cargar otro archivo
                </button>
              </div>

              {/* Tabla de Vista Previa */}
              <div className="max-h-72 overflow-y-auto rounded-lg border border-line-600">
                <DataTable columns={previewColumns} data={filteredItems} />
              </div>

              {/* Acciones Finales */}
              <div className="flex items-center justify-end gap-3 border-t border-line-600 pt-4">
                <Button variant="ghost" type="button" onClick={onClose} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isSaving || (batchResult.stats.toCreate === 0 && batchResult.stats.toUpdate === 0)}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Guardando en base de datos...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle size={16} />
                      <span>
                        Confirmar e importar ({batchResult.stats.toCreate + batchResult.stats.toUpdate} empresas)
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
