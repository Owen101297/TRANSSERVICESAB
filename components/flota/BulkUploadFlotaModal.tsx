"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Download,
  Loader2,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import {
  analizarArchivoExcelFlota,
  ResultadoAnalisisLoteFlota,
  DiagnosticoFilaVehiculo,
} from "@/lib/data/flota-upsert";
import { bulkUpsertVehiculosDb } from "@/lib/services/vehiculos.service";

interface BulkUploadFlotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkUploadFlotaModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkUploadFlotaModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<ResultadoAnalisisLoteFlota | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsProcessing(true);
    setImportStatus(null);

    try {
      const buffer = await selected.arrayBuffer();
      const resultado = analizarArchivoExcelFlota(buffer);
      setAnalisis(resultado);
    } catch (err) {
      console.error("Error al leer archivo de flota:", err);
      alert("No se pudo leer el archivo. Asegúrate de que sea un Excel (.xlsx) o CSV válido.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!analisis || analisis.filasValidas.length === 0) return;

    setIsProcessing(true);
    try {
      const res = await bulkUpsertVehiculosDb(analisis.filasValidas);
      if (res.success) {
        setImportStatus(`¡Éxito! Se registraron y actualizaron ${res.count} vehículos en la base de datos.`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        alert(res.error || "Ocurrió un error al guardar los vehículos.");
      }
    } catch (err: any) {
      alert("Error al procesar la carga masiva: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPlantilla = () => {
    const plantilla = [
      [
        "PLACA",
        "MARCA",
        "MODELO",
        "AÑO",
        "TIPO",
        "CAPACIDAD",
        "SERVICIO",
        "CONTRATISTA",
        "SOAT",
        "RTM",
        "POLIZAS",
      ],
      [
        "WLM789",
        "Chevrolet",
        "NPR Buseta",
        2022,
        "buseta",
        24,
        "especial",
        "Transcaribe Express SAS",
        "2027-03-15",
        "2027-04-20",
        "2027-06-10",
      ],
      [
        "TLK456",
        "Renault",
        "Master Van",
        2023,
        "van",
        16,
        "escolar",
        "Transportes del Norte Ltda",
        "2026-11-05",
        "2026-10-18",
        "2027-01-30",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(plantilla);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Flota");
    XLSX.writeFile(wb, "Plantilla_Carga_Masiva_Flota_TransServicesAB.xlsx");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/85 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl animate-fadeIn">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-line-600 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-radar-cyan/40 bg-radar-cyan/10 text-radar-cyan">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50 leading-tight">
                Carga Masiva de Flota con Diagnóstico
              </h3>
              <p className="text-xs text-fog-400">
                Sube tu archivo Excel o CSV para importar o actualizar vehículos en un solo paso
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Zona de Drop / Carga de Archivo */}
        <div className="mt-4 space-y-4">
          {!file && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-500 bg-asphalt-950/50 p-8 text-center hover:border-signal-amber transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={40} className="text-radar-cyan mb-2" />
              <p className="text-sm font-semibold text-paper-50">
                Haz clic o arrastra tu archivo Excel / CSV aquí
              </p>
              <p className="text-xs text-fog-400 mt-1">
                Formatos soportados: .xlsx, .xls, .csv
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Banner de Descarga de Plantilla */}
          <div className="flex items-center justify-between rounded-lg border border-line-600 bg-asphalt-950 p-3 text-xs">
            <span className="text-fog-400">
              ¿No tienes el formato exacto? Descarga la plantilla oficial con ejemplos.
            </span>
            <button
              type="button"
              onClick={handleDownloadPlantilla}
              className="inline-flex items-center gap-1 text-signal-amber hover:underline font-mono font-semibold"
            >
              <Download size={13} />
              <span>Descargar Plantilla</span>
            </button>
          </div>

          {/* Informe de Diagnóstico */}
          {analisis && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg border border-ok-green/40 bg-ok-green-dim/30 p-2.5">
                  <p className="text-fog-400 font-mono text-[10px] uppercase">Filas Válidas</p>
                  <p className="font-mono text-xl font-bold text-ok-green">{analisis.filasValidas.length}</p>
                </div>
                <div className="rounded-lg border border-alert-red/40 bg-alert-red-dim/30 p-2.5">
                  <p className="text-fog-400 font-mono text-[10px] uppercase">Omitidas / Errores</p>
                  <p className="font-mono text-xl font-bold text-alert-red">{analisis.filasOmitidas.length}</p>
                </div>
                <div className="rounded-lg border border-line-600 bg-asphalt-950 p-2.5">
                  <p className="text-fog-400 font-mono text-[10px] uppercase">Total Filas Leídas</p>
                  <p className="font-mono text-xl font-bold text-paper-50">{analisis.totalFilasLeidas}</p>
                </div>
              </div>

              {/* Alerta de Placas Duplicadas */}
              {analisis.placasDuplicadasArchivo.length > 0 && (
                <div className="rounded-lg border border-signal-amber/40 bg-signal-amber-dim/30 p-3 text-xs text-signal-amber flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="block">Placas repetidas en el archivo:</strong>
                    <span>
                      {analisis.placasDuplicadasArchivo.join(", ")} (se procesará solo la primera ocurrencia de cada una).
                    </span>
                  </div>
                </div>
              )}

              {/* Vista Previa de Filas Válidas */}
              <div className="rounded-lg border border-line-600 bg-asphalt-950 p-3 max-h-48 overflow-y-auto space-y-2">
                <p className="text-xs font-mono font-bold text-fog-400 uppercase tracking-wider mb-2">
                  Vista Previa de Vehículos Listos para Importar:
                </p>
                {analisis.filasValidas.map((f) => (
                  <div
                    key={f.filaOriginal}
                    className="flex items-center justify-between text-xs border-b border-line-600/40 pb-1.5 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-fog-400">#{f.filaOriginal}</span>
                      <span className="font-mono font-bold text-radar-cyan">{f.placa}</span>
                      <span className="text-paper-50">{f.marca} {f.modelo} ({f.anio})</span>
                    </div>
                    <span className="text-[11px] text-fog-400">{f.contratistaNombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importStatus && (
            <div className="flex items-center gap-2 rounded-lg border border-ok-green/40 bg-ok-green-dim/40 p-3 text-xs text-ok-green">
              <CheckCircle2 size={16} />
              <span>{importStatus}</span>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="mt-5 flex items-center justify-between border-t border-line-600 pt-4">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>

          <Button
            variant="primary"
            type="button"
            onClick={handleConfirmImport}
            disabled={!analisis || analisis.filasValidas.length === 0 || isProcessing}
          >
            {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            <span>Confirmar Carga de {analisis?.filasValidas.length || 0} Vehículos</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
