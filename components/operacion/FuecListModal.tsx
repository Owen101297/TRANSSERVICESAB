"use client";

import { useState } from "react";
import { X, FileText, Plus, QrCode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { Fuec, ContratoTransporte } from "@/lib/types/fuec";
import { Vehiculo } from "@/lib/types/vehiculo";
import { Persona } from "@/lib/types/persona";
import { NuevoFuecModal } from "@/components/operacion/NuevoFuecModal";

interface FuecListModalProps {
  fuecs: Fuec[];
  contratos: ContratoTransporte[];
  vehiculos: Vehiculo[];
  conductores: Persona[];
  isOpen: boolean;
  onClose: () => void;
}

export function FuecListModal({
  fuecs,
  contratos,
  vehiculos,
  conductores,
  isOpen,
  onClose,
}: FuecListModalProps) {
  const [isNuevoOpen, setIsNuevoOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/80 p-4 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-4xl my-8 rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-line-600 pb-4">
            <div className="flex items-center gap-2.5">
              <FileText size={22} className="text-radar-cyan" />
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
                  FUECs Emitidos (Extractos de Contrato)
                </h2>
                <p className="text-xs text-fog-400">
                  Documentos legales para transporte especial intermunicipal y nacional
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={() => setIsNuevoOpen(true)}>
                <Plus size={15} /> Emitir nuevo FUEC
              </Button>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            {fuecs.length === 0 ? (
              <p className="py-8 text-center text-sm text-fog-400">
                No hay FUECs emitidos aún. Puedes emitir el primero con el botón superior.
              </p>
            ) : (
              fuecs.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-line-600 bg-asphalt-800/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-mono)] text-xs text-radar-cyan font-bold">
                        N° {f.codigoFUEC}
                      </span>
                      <StatusBadge status={f.estado === "emitido" ? "activo" : "cerrado"}>
                        {f.estado === "emitido" ? "Vigente" : f.estado}
                      </StatusBadge>
                    </div>
                    <p className="text-sm font-semibold text-paper-50">
                      {f.contratante} · <span className="text-mist-200 font-normal">Contrato {f.contratoNumero}</span>
                    </p>
                    <p className="text-xs text-fog-400">
                      Ruta: <strong className="text-mist-200">{f.origen} → {f.destino}</strong> {f.rutaDetalle && `(${f.rutaDetalle})`}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-fog-400">
                      <div className="flex items-center gap-1.5">
                        <span>Vehículo:</span>
                        <PlateTag plate={f.placa} />
                        <span>({f.marca} {f.modelo})</span>
                      </div>
                      <div>
                        Conductor: <strong className="text-mist-200">{f.conductorPrincipalNombre}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col md:items-end gap-2 border-t md:border-t-0 border-line-600 pt-3 md:pt-0">
                    <div className="font-[family-name:var(--font-mono)] text-xs text-mist-200">
                      Vigencia: {new Date(f.fechaInicio).toLocaleDateString("es-CO")} → {new Date(f.fechaFin).toLocaleDateString("es-CO")}
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs text-ok-green">
                      <CheckCircle2 size={13} /> Verificado QR RUNT
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <NuevoFuecModal
        contratos={contratos}
        vehiculos={vehiculos}
        conductores={conductores}
        isOpen={isNuevoOpen}
        onClose={() => setIsNuevoOpen(false)}
      />
    </>
  );
}
