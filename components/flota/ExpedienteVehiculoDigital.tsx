"use client";

import { useState } from "react";
import {
  FileText,
  Upload,
  Eye,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { Vehiculo } from "@/lib/types/vehiculo";
import { DocumentViewerModal } from "@/components/ui/DocumentViewerModal";
import {
  crearAdjuntoVehiculoDb,
  deleteAdjuntoVehiculoDb,
} from "@/lib/services/vehiculos.service";
import { calcularAlertaFecha } from "@/lib/utils/alertas-flota";

interface DocumentoCasillero {
  tipo: string;
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  vencimientoISO?: string;
}

const CASILLEROS_VEHICULO: DocumentoCasillero[] = [
  {
    tipo: "tarjeta_propiedad",
    nombre: "Tarjeta de Propiedad / Licencia de Tránsito",
    descripcion: "Documento oficial del RUNT que acredita la matrícula del vehículo",
    obligatorio: true,
  },
  {
    tipo: "soat",
    nombre: "Seguro Obligatorio (SOAT)",
    descripcion: "Póliza vigente de cobertura de daños corporales en accidentes",
    obligatorio: true,
  },
  {
    tipo: "rtm",
    nombre: "Revisión Técnico-Mecánica y Gases (RTM)",
    descripcion: "Certificado de CDA autorizado sobre el estado mecánico y ambiental",
    obligatorio: true,
  },
  {
    tipo: "tarjeta_operacion",
    nombre: "Tarjeta de Operación (T.O.)",
    descripcion: "Permiso emitido por el Ministerio de Transporte / Supertransporte",
    obligatorio: true,
  },
  {
    tipo: "poliza_rcc",
    nombre: "Póliza Contractual (RCC)",
    descripcion: "Responsabilidad civil contractual ante los usuarios y pasajeros",
    obligatorio: true,
  },
  {
    tipo: "poliza_rce",
    nombre: "Póliza Extracontractual (RCE)",
    descripcion: "Responsabilidad civil extracontractual ante terceros en la vía",
    obligatorio: true,
  },
  {
    tipo: "preventiva",
    nombre: "Certificado de Mantenimiento Preventivo",
    descripcion: "Constancia de revisión periódica bimestral o trimestral",
    obligatorio: false,
  },
];

interface ExpedienteVehiculoDigitalProps {
  vehiculo: Vehiculo;
  adjuntosIniciales?: any[];
}

export function ExpedienteVehiculoDigital({
  vehiculo,
  adjuntosIniciales = [],
}: ExpedienteVehiculoDigitalProps) {
  const [adjuntos, setAdjuntos] = useState<any[]>(adjuntosIniciales);
  const [selectedDocViewer, setSelectedDocViewer] = useState<{
    url: string;
    name: string;
    mimeType?: string;
  } | null>(null);
  const [uploadingTipo, setUploadingTipo] = useState<string | null>(null);

  // Mapear vencimientos desde el objeto vehiculo
  const getVencimientoCasillero = (tipo: string): string | undefined => {
    if (tipo === "soat") return vehiculo.documentos?.soatVencimiento;
    if (tipo === "rtm") return vehiculo.documentos?.rtmVencimiento;
    if (tipo === "poliza_rcc" || tipo === "poliza_rce") return vehiculo.documentos?.polizaVencimiento;
    return undefined;
  };

  // Cálculo de Completitud
  const obligatorios = CASILLEROS_VEHICULO.filter((c) => c.obligatorio);
  const cargados = obligatorios.filter((c) => adjuntos.some((a) => a.tipoDocumento === c.tipo));
  const porcentaje = Math.round((cargados.length / obligatorios.length) * 100);

  const handleSimularSubida = async (casillero: DocumentoCasillero) => {
    setUploadingTipo(casillero.tipo);
    const mockUrl = `https://transservices-docs.s3.amazonaws.com/flota/${vehiculo.placa}/${casillero.tipo}_${vehiculo.placa}.pdf`;
    const docNombre = `${casillero.nombre} - ${vehiculo.placa}.pdf`;

    try {
      const res = await crearAdjuntoVehiculoDb(
        vehiculo.id,
        casillero.tipo,
        docNombre,
        mockUrl,
        getVencimientoCasillero(casillero.tipo)
      );

      if (res.success && res.adjunto) {
        setAdjuntos((prev) => [res.adjunto, ...prev.filter((x) => x.tipoDocumento !== casillero.tipo)]);
      }
    } catch (err) {
      console.error("Error al subir documento:", err);
    } finally {
      setUploadingTipo(null);
    }
  };

  const handleEliminarAdjunto = async (adjuntoId: string) => {
    if (!confirm("¿Deseas eliminar este documento del expediente digital?")) return;
    try {
      const res = await deleteAdjuntoVehiculoDb(adjuntoId, vehiculo.id);
      if (res.success) {
        setAdjuntos((prev) => prev.filter((a) => a.id !== adjuntoId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Completitud HSEQ */}
      <div className="rounded-xl border border-line-600 bg-asphalt-900 p-5 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={22} className="text-signal-amber" />
            <div>
              <h4 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50 leading-tight">
                Completitud del Expediente Digital HSEQ
              </h4>
              <p className="text-xs text-fog-400">
                {cargados.length} de {obligatorios.length} documentos obligatorios cargados y verificados
              </p>
            </div>
          </div>

          <span className="font-mono text-xl font-bold text-ok-green">{porcentaje}%</span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-asphalt-950 border border-line-600">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              porcentaje === 100
                ? "bg-ok-green"
                : porcentaje >= 60
                ? "bg-radar-cyan"
                : "bg-signal-amber"
            }`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {/* Casilleros de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CASILLEROS_VEHICULO.map((casillero) => {
          const adjunto = adjuntos.find((a) => a.tipoDocumento === casillero.tipo);
          const vencimiento = getVencimientoCasillero(casillero.tipo);
          const alerta = calcularAlertaFecha(vencimiento, casillero.nombre);
          const isUploading = uploadingTipo === casillero.tipo;

          return (
            <div
              key={casillero.tipo}
              className={`relative rounded-xl border p-4 transition-all ${
                adjunto
                  ? "border-ok-green/40 bg-asphalt-900/95 shadow-md"
                  : "border-line-600 bg-asphalt-900/70 hover:border-line-500"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      adjunto
                        ? "border-ok-green/40 bg-ok-green-dim/30 text-ok-green"
                        : "border-line-500 bg-asphalt-950 text-fog-400"
                    }`}
                  >
                    <FileText size={18} />
                  </div>

                  <div>
                    <h5 className="font-semibold text-paper-50 text-xs flex items-center gap-1.5">
                      <span>{casillero.nombre}</span>
                      {casillero.obligatorio && (
                        <span className="text-[10px] text-alert-red font-mono font-bold">*</span>
                      )}
                    </h5>
                    <p className="text-[11px] text-fog-400 mt-0.5">{casillero.descripcion}</p>

                    {/* Semáforo de Vencimiento */}
                    {vencimiento && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono border ${alerta.badgeClass}`}>
                          {alerta.etiqueta}
                        </span>
                        <span className="text-[10px] font-mono text-fog-400">
                          Vence: {vencimiento}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones de Acción del Casillero */}
              <div className="mt-4 flex items-center justify-between border-t border-line-600/60 pt-3 text-xs">
                {adjunto ? (
                  <>
                    <div className="flex items-center gap-1.5 text-ok-green font-mono text-[11px]">
                      <CheckCircle2 size={13} />
                      <span className="truncate max-w-[140px]">{adjunto.nombre}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDocViewer({
                            url: adjunto.archivoUrl,
                            name: adjunto.nombre,
                            mimeType: "application/pdf",
                          })
                        }
                        className="inline-flex items-center gap-1 text-radar-cyan hover:underline font-mono text-[11px]"
                      >
                        <Eye size={12} />
                        <span>Ver</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEliminarAdjunto(adjunto.id)}
                        className="text-fog-400 hover:text-alert-red transition-colors p-1"
                        title="Eliminar documento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-fog-400 font-mono text-[11px]">Pendiente de carga</span>
                    <button
                      type="button"
                      onClick={() => handleSimularSubida(casillero)}
                      disabled={isUploading}
                      className="inline-flex items-center gap-1 rounded bg-asphalt-950 px-2.5 py-1 text-[11px] font-semibold text-signal-amber border border-signal-amber/40 hover:bg-signal-amber hover:text-asphalt-950 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Upload size={12} />
                      <span>{isUploading ? "Cargando..." : "Cargar PDF"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visor de Documentos Integrado */}
      <DocumentViewerModal
        isOpen={!!selectedDocViewer}
        onClose={() => setSelectedDocViewer(null)}
        title={selectedDocViewer?.name || "Documento de Flota"}
        documentUrl={selectedDocViewer?.url || ""}
        fileName={selectedDocViewer?.name || "documento.pdf"}
        fileType="pdf"
      />
    </div>
  );
}
