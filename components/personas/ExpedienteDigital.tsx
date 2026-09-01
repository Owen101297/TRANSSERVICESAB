"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  UploadCloud,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DocumentoExpediente,
  getDocumentosPersonaDb,
  guardarDocumentoPersonaDb,
  eliminarDocumentoPersonaDb,
} from "@/lib/services/personas.service";
import { DocumentViewerModal } from "@/components/ui/DocumentViewerModal";

interface SlotConfig {
  id: string;
  label: string;
  descripcion: string;
  icono: string;
  obligatorio: boolean;
}

const SLOTS_EXPEDIENTE: SlotConfig[] = [
  {
    id: "cedula",
    label: "Cédula de Ciudadanía",
    descripcion: "Documento de identidad legible por ambas caras (PDF o Imagen)",
    icono: "🪪",
    obligatorio: true,
  },
  {
    id: "licencia",
    label: "Licencia de Conducción",
    descripcion: "Pase vigente por ambas caras con categorías visibles",
    icono: "🚗",
    obligatorio: true,
  },
  {
    id: "emo",
    label: "Examen Médico Ocupacional (EMO)",
    descripcion: "Certificado de aptitud médica periódica o de ingreso",
    icono: "🩺",
    obligatorio: true,
  },
  {
    id: "pila",
    label: "Seguridad Social (PILA)",
    descripcion: "Comprobante de pago o afiliación a EPS, ARL y Pensión",
    icono: "🏥",
    obligatorio: true,
  },
  {
    id: "contrato",
    label: "Hoja de Vida / Contrato",
    descripcion: "Hoja de vida con soportes, antecedentes o contrato suscrito",
    icono: "📄",
    obligatorio: false,
  },
];

export function ExpedienteDigital({ personaId }: { personaId: string }) {
  const [documentos, setDocumentos] = useState<DocumentoExpediente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [activeViewerDoc, setActiveViewerDoc] = useState<DocumentoExpediente | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDocumentos = async () => {
    setIsLoading(true);
    try {
      const data = await getDocumentosPersonaDb(personaId);
      setDocumentos(data || []);
    } catch (err: any) {
      console.error("Error al cargar expediente:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentos();
  }, [personaId]);

  const handleFileUpload = async (slotId: string, file: File) => {
    if (!file) return;

    // Límite de tamaño: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(`El archivo ${file.name} supera el límite de 10MB.`);
      return;
    }

    setUploadingSlot(slotId);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Url = e.target?.result as string;
      const tamanoKb = `${(file.size / 1024).toFixed(1)} KB`;

      try {
        const res = await guardarDocumentoPersonaDb(
          personaId,
          slotId,
          file.name,
          base64Url,
          tamanoKb,
          file.type
        );
        if (res.success) {
          await loadDocumentos();
        } else {
          setErrorMsg(res.error || "No se pudo guardar el archivo.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Error al subir el archivo.");
      } finally {
        setUploadingSlot(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (docId: string) => {
    try {
      const res = await eliminarDocumentoPersonaDb(docId, personaId);
      if (res.success) {
        setDocumentos((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al eliminar.");
    }
  };

  const getDocForSlot = (slotId: string) =>
    documentos.find((d) => d.tipoDocumento === slotId);

  const docsCargados = documentos.length;
  const docsTotal = SLOTS_EXPEDIENTE.length;
  const porcentaje = Math.round((docsCargados / docsTotal) * 100);

  return (
    <div className="space-y-4">
      {/* Progreso del Expediente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-line-600 bg-asphalt-900 p-4">
        <div>
          <h4 className="font-semibold text-paper-50 flex items-center gap-2 text-sm">
            <FileCheck size={18} className="text-radar-cyan" />
            Completitud del Expediente Digital HSEQ
          </h4>
          <p className="text-xs text-fog-400 mt-0.5">
            {docsCargados} de {docsTotal} documentos cargados en el expediente único.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32 bg-asphalt-950 rounded-full h-2.5 border border-line-600 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                porcentaje === 100
                  ? "bg-ok-green"
                  : porcentaje >= 60
                  ? "bg-radar-cyan"
                  : "bg-signal-amber"
              }`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-paper-50">{porcentaje}%</span>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded border border-alert-red/40 bg-alert-red-dim p-3 text-xs text-alert-red flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Cuadrícula de Casilleros Documentales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {SLOTS_EXPEDIENTE.map((slot) => {
          const doc = getDocForSlot(slot.id);
          const isUploading = uploadingSlot === slot.id;

          return (
            <Card
              key={slot.id}
              className={`p-4 transition-all border ${
                doc
                  ? "border-line-500 bg-asphalt-900/90 hover:border-radar-cyan/50"
                  : "border-dashed border-line-600 bg-asphalt-950/40 hover:border-line-500"
              }`}
            >
              {/* Encabezado del Slot */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl select-none">{slot.icono}</span>
                  <div>
                    <h5 className="text-xs font-bold text-paper-50 flex items-center gap-1.5">
                      {slot.label}
                      {slot.obligatorio && (
                        <span className="text-[10px] text-signal-amber font-normal">*Obligatorio</span>
                      )}
                    </h5>
                    <p className="text-[10.5px] text-fog-400 leading-tight mt-0.5">
                      {slot.descripcion}
                    </p>
                  </div>
                </div>

                {doc && (
                  <span className="rounded-full bg-ok-green-dim text-ok-green p-1" title="Documento cargado">
                    <CheckCircle2 size={14} />
                  </span>
                )}
              </div>

              {/* Contenido del Slot */}
              <div className="mt-3 pt-2.5 border-t border-line-600/60">
                {doc ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-fog-400 text-[11px] truncate max-w-[170px]" title={doc.nombre}>
                        {doc.nombre}
                      </span>
                      <span className="font-mono text-[10px] text-fog-400">{doc.tamano || ""}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1 text-xs h-7 gap-1 text-mist-200 hover:text-radar-cyan"
                        onClick={() => setActiveViewerDoc(doc)}
                      >
                        <Eye size={13} /> Ver documento
                      </Button>

                      <button
                        onClick={() => fileInputRefs.current[slot.id]?.click()}
                        disabled={isUploading}
                        className="p-1.5 rounded border border-line-600 text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors"
                        title="Reemplazar archivo"
                      >
                        <UploadCloud size={13} />
                      </button>

                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded border border-line-600 text-fog-400 hover:text-alert-red hover:bg-alert-red-dim transition-colors"
                        title="Eliminar documento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => fileInputRefs.current[slot.id]?.click()}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 rounded border border-line-600 bg-asphalt-900/60 hover:bg-asphalt-800 py-2.5 px-3 text-xs text-mist-200 hover:text-paper-50 transition-colors group"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-radar-cyan" />
                          <span>Subiendo documento...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={14} className="text-fog-400 group-hover:text-radar-cyan transition-colors" />
                          <span>Cargar PDF o Foto</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Input oculto para carga */}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  ref={(el) => {
                    fileInputRefs.current[slot.id] = el;
                  }}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(slot.id, file);
                    e.target.value = "";
                  }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Visor Modal Integrado */}
      {activeViewerDoc && (
        <DocumentViewerModal
          isOpen={!!activeViewerDoc}
          onClose={() => setActiveViewerDoc(null)}
          title={
            SLOTS_EXPEDIENTE.find((s) => s.id === activeViewerDoc.tipoDocumento)?.label ||
            "Documento del Expediente"
          }
          documentUrl={activeViewerDoc.archivoUrl}
          fileName={activeViewerDoc.nombre}
        />
      )}
    </div>
  );
}
