"use client";

import { useState, useRef } from "react";
import { Upload, X, FileSpreadsheet, Download, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProfileTag } from "@/components/ui/ProfileTag";
import { Avatar } from "@/components/ui/Avatar";
import { Persona } from "@/lib/types/persona";
import {
  parseCSVText,
  analyzePersonaUpsertBatch,
  applyPersonaUpsert,
  generateCSVTemplate,
  UpsertPreviewItem,
  UpsertBatchResult,
} from "@/lib/data/personas-upsert";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Por favor selecciona un archivo con formato .csv");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSVText(text);
      const analyzed = analyzePersonaUpsertBatch(rows, currentPersons);
      setBatchResult(analyzed);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateCSVTemplate();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_carga_personas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmUpsert = () => {
    if (!batchResult) return;
    const updatedList = applyPersonaUpsert(batchResult.previewItems, currentPersons);
    onSuccess(updatedList);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFileName(null);
    setBatchResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewColumns: Column<UpsertPreviewItem>[] = [
    {
      header: "Acción",
      accessor: "action",
      render: (val) => {
        if (val === "create") {
          return <StatusBadge status="activo">Crear nuevo</StatusBadge>;
        }
        if (val === "update") {
          return <StatusBadge status="info">Actualizar</StatusBadge>;
        }
        return <StatusBadge status="critico">Error</StatusBadge>;
      },
    },
    {
      header: "Persona",
      accessor: "nombres",
      render: (_val, row) => (
        <div className="flex items-center gap-2.5">
          <Avatar initials={row.fotoIniciales} size="sm" />
          <div>
            <p className="font-medium text-paper-50">
              {row.nombres} {row.apellidos}
            </p>
            <p className="font-mono text-xs text-fog-400">
              {row.tipoDocumento} {row.numeroDocumento}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Perfil & Contacto",
      accessor: "telefono",
      render: (_val, row) => (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            {row.perfiles.map((p) => (
              <ProfileTag key={p} perfil={p} />
            ))}
          </div>
          <p className="font-mono text-xs text-fog-400">{row.telefono} · {row.email}</p>
        </div>
      ),
    },
    {
      header: "Diagnóstico / Cambios",
      accessor: "changesSummary",
      render: (_val, row) => {
        if (row.action === "error") {
          return <span className="text-xs text-alert-red">{row.errorMessage}</span>;
        }
        if (row.action === "create") {
          return (
            <span className="text-xs text-ok-green">
              Registro nuevo · Contratista: {row.contratistaNombre || "Transservices"}
            </span>
          );
        }
        return (
          <div className="text-xs text-mist-200">
            {row.changesSummary?.map((change, idx) => (
              <div key={idx} className="text-radar-cyan">• {change}</div>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/80 p-4 backdrop-blur-xs">
      <Card className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border-line-500 bg-asphalt-900 p-0 shadow-2xl">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-line-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-asphalt-800 text-radar-cyan">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
                Carga Masiva y Actualización (Upsert)
              </h2>
              <p className="text-xs text-fog-400">
                Crea conductores nuevos o actualiza registros existentes usando la cédula como llave.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="rounded-md p-1.5 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!batchResult ? (
            <div className="space-y-4">
              {/* Zona de Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? "border-radar-cyan bg-radar-cyan/5 text-radar-cyan"
                    : "border-line-600 bg-asphalt-800/30 text-fog-400 hover:border-radar-cyan hover:text-radar-cyan"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-asphalt-800 text-paper-50">
                  <Upload size={22} className="text-signal-amber" />
                </div>
                <div>
                  <p className="text-sm font-medium text-paper-50">
                    Arrastra tu archivo CSV aquí o haz clic para examinar
                  </p>
                  <p className="mt-1 font-mono text-xs text-fog-400">
                    Formato compatible: .CSV (separado por comas o punto y coma)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessFile(file);
                  }}
                />
              </div>

              {/* Descarga de plantilla */}
              <div className="flex items-center justify-between rounded-md border border-line-600 bg-asphalt-800/40 px-4 py-3">
                <div className="text-xs text-fog-400">
                  ¿No tienes el formato exacto? Descarga la plantilla oficial con los campos del sistema.
                </div>
                <Button variant="ghost" onClick={handleDownloadTemplate} className="text-xs">
                  <Download size={14} /> Descargar plantilla CSV
                </Button>
              </div>
            </div>
          ) : (
            /* Vista de Previsualización y Diagnóstico */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs text-fog-400">Archivo analizado:</span>
                  <span className="ml-2 font-medium text-paper-50">{fileName}</span>
                </div>
                <Button variant="ghost" onClick={handleReset} className="text-xs">
                  <RefreshCw size={13} /> Cargar otro archivo
                </Button>
              </div>

              {/* Métricas del lote */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Total en CSV" value={batchResult.stats.total} accent="cyan" />
                <StatCard label="A crear" value={batchResult.stats.toCreate} accent="green" />
                <StatCard label="A actualizar" value={batchResult.stats.toUpdate} accent="amber" />
                <StatCard label="Con error" value={batchResult.stats.errors} accent="amber" />
              </div>

              {/* Tabla de Preview */}
              <div>
                <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fog-400">
                  Previsualización de registros:
                </p>
                <div className="max-h-64 overflow-y-auto">
                  <DataTable columns={previewColumns} data={batchResult.previewItems} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="flex items-center justify-end gap-3 border-t border-line-600 bg-asphalt-800/40 px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              handleReset();
              onClose();
            }}
          >
            Cancelar
          </Button>
          {batchResult && (
            <Button
              variant="primary"
              onClick={handleConfirmUpsert}
              disabled={batchResult.stats.toCreate + batchResult.stats.toUpdate === 0}
            >
              <CheckCircle2 size={16} /> Confirmar e importar (
              {batchResult.stats.toCreate + batchResult.stats.toUpdate} registros)
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
