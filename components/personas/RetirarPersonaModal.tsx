"use client";

import { useState } from "react";
import { AlertTriangle, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Persona } from "@/lib/types/persona";
import { retirarPersonaDb } from "@/lib/services/personas.service";

const MOTIVOS_RETIRO = [
  "Renuncia voluntaria",
  "Fin de contrato / Convenio",
  "Terminación con justa causa",
  "Desvinculación operativa",
  "Incapacidad médica permanente / Pensión",
  "Ajuste o depuración de personal",
];

interface RetirarPersonaModalProps {
  isOpen: boolean;
  persona: Persona | null;
  onClose: () => void;
  onSuccess: (refreshedList: Persona[]) => void;
}

export function RetirarPersonaModal({
  isOpen,
  persona,
  onClose,
  onSuccess,
}: RetirarPersonaModalProps) {
  const [motivo, setMotivo] = useState(MOTIVOS_RETIRO[0]);
  const [observaciones, setObservaciones] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !persona) return null;

  const handleRetirar = async () => {
    setIsProcessing(true);
    setError(null);

    const motivoCompleto = observaciones.trim()
      ? `${motivo} - ${observaciones.trim()}`
      : motivo;

    try {
      const res = await retirarPersonaDb(persona.id, motivoCompleto);
      if (res.success && res.refreshedList) {
        onSuccess(res.refreshedList);
        onClose();
      } else {
        setError(res.error || "No se pudo procesar el retiro.");
      }
    } catch (err: any) {
      setError(err.message || "Error al comunicarse con el servidor.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-lg border border-line-600 bg-asphalt-900 shadow-2xl p-6 space-y-4">
        {/* Cabecera */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-signal-amber/10 p-2.5 text-signal-amber border border-signal-amber/30">
            <Archive size={22} />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
              Retirar a Historial de Auditoría
            </h3>
            <p className="text-xs text-fog-400 font-mono">
              {persona.nombres} {persona.apellidos} ({persona.tipoDocumento} {persona.numeroDocumento})
            </p>
          </div>
        </div>

        <div className="rounded border border-line-600 bg-asphalt-950 p-3 text-xs text-mist-200">
          <p className="font-semibold text-paper-50 mb-1 flex items-center gap-1.5 text-signal-amber">
            <AlertTriangle size={14} /> Preservación Legal PESV / HSEQ
          </p>
          La persona pasará al archivo histórico. Sus licencias, exámenes médicos, FUECs y viajes quedarán guardados permanentemente para futuras auditorías.
        </div>

        {/* Formulario */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-fog-400 mb-1">
              Motivo principal del retiro
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded border border-line-600 bg-asphalt-950 px-3 py-2 text-xs text-paper-50 focus:border-signal-amber focus:outline-none"
            >
              {MOTIVOS_RETIRO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-fog-400 mb-1">
              Observaciones adicionales (Opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalle o nota interna sobre el retiro..."
              rows={2}
              className="w-full rounded border border-line-600 bg-asphalt-950 px-3 py-2 text-xs text-paper-50 focus:border-signal-amber focus:outline-none resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded border border-alert-red/40 bg-alert-red-dim p-2.5 text-xs text-alert-red">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleRetirar}
            disabled={isProcessing}
            className="bg-signal-amber text-asphalt-950 hover:bg-signal-amber/90 font-semibold"
          >
            {isProcessing ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <Archive size={15} /> Confirmar Retiro a Historial
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
