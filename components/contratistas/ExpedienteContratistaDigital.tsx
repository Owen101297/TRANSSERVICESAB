"use client";

import { useState } from "react";
import {
  FileText,
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  FileCheck,
  CreditCard,
  Briefcase,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Contratista } from "@/lib/types/contratista";
import {
  ContratistaDocumentoAdjunto,
  guardarDocumentoContratistaDb,
  eliminarDocumentoContratistaDb,
} from "@/lib/services/contratistas.service";
import { DocumentViewerModal } from "@/components/ui/DocumentViewerModal";

interface ExpedienteContratistaDigitalProps {
  contratista: Contratista;
  initialDocumentos: ContratistaDocumentoAdjunto[];
}

interface DocumentSlotConfig {
  tipo: string;
  titulo: string;
  descripcion: string;
  icono: any;
  obligatorio: boolean;
}

const DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  {
    tipo: "rut",
    titulo: "RUT (DIAN)",
    descripcion: "Registro Único Tributario con actividad económica de transporte",
    icono: FileText,
    obligatorio: true,
  },
  {
    tipo: "camara_comercio",
    titulo: "Cámara de Comercio",
    descripcion: "Certificado de existencia y representación legal (< 30 días)",
    icono: Building2,
    obligatorio: true,
  },
  {
    tipo: "cedula_rep_legal",
    titulo: "Cédula del Representante Legal",
    descripcion: "Documento de identidad legible del firmante",
    icono: CreditCard,
    obligatorio: true,
  },
  {
    tipo: "certificacion_bancaria",
    titulo: "Certificación Bancaria",
    descripcion: "Para transferencias y liquidación de servicios de transporte",
    icono: FileCheck,
    obligatorio: true,
  },
  {
    tipo: "contrato_vinculacion",
    titulo: "Contrato / Convenio de Vinculación",
    descripcion: "Acuerdo bilateral firmado de prestación de servicios y términos",
    icono: Briefcase,
    obligatorio: true,
  },
  {
    tipo: "poliza_rce_rcc",
    titulo: "Pólizas de Seguros (RCE / RCC)",
    descripcion: "Pólizas de responsabilidad civil contractual y extracontractual",
    icono: ShieldAlert,
    obligatorio: false,
  },
];

export function ExpedienteContratistaDigital({
  contratista,
  initialDocumentos,
}: ExpedienteContratistaDigitalProps) {
  const [documentos, setDocumentos] = useState<ContratistaDocumentoAdjunto[]>(initialDocumentos);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);
  const [activeViewerDoc, setActiveViewerDoc] = useState<ContratistaDocumentoAdjunto | null>(null);

  // Calcular porcentaje de completitud
  const obligatorios = DOCUMENT_SLOTS.filter((s) => s.obligatorio);
  const obligatoriosCargados = obligatorios.filter((s) =>
    documentos.some((d) => d.tipoDocumento === s.tipo)
  ).length;
  const porcentaje = Math.round((obligatoriosCargados / obligatorios.length) * 100);

  const handleFileUpload = async (tipo: string, file: File) => {
    setUploadingTipo(tipo);
    try {
      // Convertir a Data URL para almacenamiento y visualización inmediata
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const tamanoKb = `${(file.size / 1024).toFixed(1)} KB`;

        const res = await guardarDocumentoContratistaDb(
          contratista.id,
          tipo,
          file.name,
          dataUrl,
          tamanoKb,
          file.type
        );

        if (res.success && res.docId) {
          const nuevoDoc: ContratistaDocumentoAdjunto = {
            id: res.docId,
            tipoDocumento: tipo,
            nombre: file.name,
            archivoUrl: dataUrl,
            tamano: tamanoKb,
            mimeType: file.type,
            createdAt: new Date().toISOString(),
          };

          setDocumentos((prev) => [
            ...prev.filter((d) => d.tipoDocumento !== tipo),
            nuevoDoc,
          ]);
        }
        setUploadingTipo(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error al cargar documento:", error);
      setUploadingTipo(null);
    }
  };

  const handleDeleteDocument = async (docId: string, tipo: string) => {
    if (!confirm("¿Deseas eliminar este documento del expediente?")) return;

    try {
      const res = await eliminarDocumentoContratistaDb(docId, contratista.id);
      if (res.success) {
        setDocumentos((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch (error) {
      console.error("Error al eliminar documento:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior de Cumplimiento Legal HSEQ */}
      <div className="rounded-xl border border-line-600 bg-asphalt-900/90 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                porcentaje === 100
                  ? "border-ok-green/40 bg-ok-green/10 text-ok-green"
                  : "border-signal-amber/40 bg-signal-amber/10 text-signal-amber"
              }`}
            >
              {porcentaje === 100 ? <ShieldCheck size={26} /> : <AlertCircle size={26} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
                  Expediente Legal &amp; Cumplimiento Contractual
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold border ${
                    porcentaje === 100
                      ? "bg-ok-green-dim text-ok-green border-ok-green/30"
                      : "bg-signal-amber-dim text-signal-amber border-signal-amber/30"
                  }`}
                >
                  {porcentaje === 100 ? "● Carpeta HSEQ Completa" : `● ${porcentaje}% Completado`}
                </span>
              </div>
              <p className="text-xs text-fog-400 mt-0.5">
                Requisitos legales para habilitación de contratos en Trans Services A&amp;B
              </p>
            </div>
          </div>

          <div className="w-full sm:w-56 space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-fog-400">Requisitos obligatorios:</span>
              <span className="font-semibold text-paper-50">
                {obligatoriosCargados} / {obligatorios.length}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-asphalt-950 border border-line-600">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  porcentaje === 100 ? "bg-ok-green" : "bg-signal-amber"
                }`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Casilleros Documentales */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_SLOTS.map((slot) => {
          const doc = documentos.find((d) => d.tipoDocumento === slot.tipo);
          const Icon = slot.icono;
          const isUploading = uploadingTipo === slot.tipo;

          return (
            <div
              key={slot.tipo}
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
                doc
                  ? "border-line-500 bg-asphalt-900 shadow-md hover:border-radar-cyan/50"
                  : slot.obligatorio
                  ? "border-signal-amber/30 bg-asphalt-900/60"
                  : "border-line-600 bg-asphalt-900/40"
              }`}
            >
              {/* Encabezado del Casillero */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        doc
                          ? "bg-radar-cyan/10 text-radar-cyan border border-radar-cyan/30"
                          : "bg-asphalt-800 text-fog-400 border border-line-600"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-paper-50 leading-tight">
                        {slot.titulo}
                      </h4>
                      <span
                        className={`text-[10px] font-mono font-medium ${
                          slot.obligatorio ? "text-signal-amber" : "text-fog-400"
                        }`}
                      >
                        {slot.obligatorio ? "* Requisito Obligatorio" : "Opcional"}
                      </span>
                    </div>
                  </div>

                  {doc ? (
                    <span className="flex items-center gap-1 rounded bg-ok-green-dim px-2 py-0.5 text-[10px] font-mono font-semibold text-ok-green border border-ok-green/30 shrink-0">
                      <CheckCircle2 size={12} /> Cargado
                    </span>
                  ) : (
                    <span className="rounded bg-asphalt-800 px-2 py-0.5 text-[10px] font-mono text-fog-400 border border-line-600 shrink-0">
                      Pendiente
                    </span>
                  )}
                </div>

                <p className="mt-2.5 text-xs text-fog-400 leading-relaxed">
                  {slot.descripcion}
                </p>
              </div>

              {/* Acciones del Casillero */}
              <div className="mt-4 pt-3 border-t border-line-600/70">
                {doc ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-mist-200 truncate" title={doc.nombre}>
                        {doc.nombre}
                      </p>
                      <p className="text-[10px] font-mono text-fog-400">{doc.tamano || "Archivo digital"}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveViewerDoc(doc)}
                        className="p-1.5 rounded-lg border border-radar-cyan/40 bg-radar-cyan/10 text-radar-cyan hover:bg-radar-cyan/20 transition-colors"
                        title="Ver documento en visor interactivo"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id, slot.tipo)}
                        className="p-1.5 rounded-lg border border-alert-red/40 bg-alert-red-dim text-alert-red hover:bg-alert-red hover:text-white transition-colors"
                        title="Eliminar documento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed py-2 px-3 text-xs font-medium transition-all ${
                        isUploading
                          ? "border-signal-amber bg-signal-amber/10 text-signal-amber"
                          : "border-line-500 bg-asphalt-800/60 text-mist-200 hover:border-signal-amber hover:bg-asphalt-800 hover:text-paper-50"
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-signal-amber" />
                          <span>Cargando...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          <span>Subir archivo (PDF / Imagen)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(slot.tipo, file);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Visor Interactivo Integrado */}
      {activeViewerDoc && (
        <DocumentViewerModal
          isOpen={true}
          onClose={() => setActiveViewerDoc(null)}
          title={`Expediente Legal: ${DOCUMENT_SLOTS.find((s) => s.tipo === activeViewerDoc.tipoDocumento)?.titulo || activeViewerDoc.nombre}`}
          fileName={activeViewerDoc.nombre}
          documentUrl={activeViewerDoc.archivoUrl}
        />
      )}
    </div>
  );
}
