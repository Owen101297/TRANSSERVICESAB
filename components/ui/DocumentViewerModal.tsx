"use client";

import { useState } from "react";
import {
  X,
  Download,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentUrl: string;
  fileType?: "pdf" | "image" | "other";
  fileName?: string;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  title,
  documentUrl,
  fileType = "pdf",
  fileName = "documento",
}: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const isPdf = fileType === "pdf" || documentUrl.startsWith("data:application/pdf") || documentUrl.endsWith(".pdf");
  const isImage = fileType === "image" || documentUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|svg)$/i.test(documentUrl);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = documentUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open(documentUrl, "_blank");
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
      <div className="flex flex-col w-full max-w-5xl h-[92vh] rounded-xl border border-line-600 bg-asphalt-900 shadow-2xl overflow-hidden">
        {/* Cabecera del Visor */}
        <div className="flex items-center justify-between border-b border-line-600 px-5 py-3.5 bg-asphalt-950">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-md bg-radar-cyan/10 p-2 text-radar-cyan border border-radar-cyan/30 shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 truncate">
                {title}
              </h2>
              <p className="text-xs text-fog-400 font-mono truncate">{fileName}</p>
            </div>
          </div>

          {/* Herramientas del Visor */}
          <div className="flex items-center gap-2 shrink-0">
            {isImage && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-1.5 rounded text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors"
                  title="Alejar"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono text-fog-400 px-1">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(200, z + 25))}
                  className="p-1.5 rounded text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors"
                  title="Acercar"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 rounded text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors"
                  title="Rotar 90°"
                >
                  <RotateCw size={16} />
                </button>
                <div className="h-4 w-px bg-line-600 mx-1" />
              </>
            )}

            <Button variant="secondary" onClick={handlePrint} className="h-8 text-xs px-2.5">
              <Printer size={14} /> Imprimir
            </Button>
            <Button variant="primary" onClick={handleDownload} className="h-8 text-xs px-2.5">
              <Download size={14} /> Descargar
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenedor del Documento */}
        <div className="flex-1 overflow-auto bg-asphalt-950/80 p-4 flex items-center justify-center relative">
          {isPdf ? (
            <iframe
              src={`${documentUrl}#toolbar=1`}
              className="w-full h-full rounded border border-line-600 bg-white"
              title={title}
            />
          ) : isImage ? (
            <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-4">
              <img
                src={documentUrl}
                alt={title}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease-out",
                }}
                className="max-h-[75vh] max-w-full object-contain rounded border border-line-600 shadow-lg"
              />
            </div>
          ) : (
            <div className="text-center p-8 space-y-4">
              <FileText size={48} className="mx-auto text-fog-400" />
              <p className="text-sm text-paper-50 font-medium">
                No hay vista previa disponible para este formato de archivo.
              </p>
              <Button variant="primary" onClick={handleDownload}>
                <Download size={16} /> Descargar archivo para verlo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
