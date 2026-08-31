"use client";

import { useState, useTransition } from "react";
import { X, CheckCircle2, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormField";
import { updateHallazgoAction } from "@/lib/services/hseq.service";

interface AccionCorrectivaModalProps {
  hallazgoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AccionCorrectivaModal({
  hallazgoId,
  isOpen,
  onClose,
}: AccionCorrectivaModalProps) {
  const [isPending, startTransition] = useTransition();
  const [accionCorrectiva, setAccionCorrectiva] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!accionCorrectiva.trim()) {
      setErrorMsg("Debes detallar la acción correctiva implementada.");
      return;
    }

    startTransition(async () => {
      const res = await updateHallazgoAction(hallazgoId, "cerrado", accionCorrectiva);
      if (res.success) {
        onClose();
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Ocurrió un error al cerrar el hallazgo.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/80 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line-600 pb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-ok-green" />
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
              Registrar acción correctiva y cerrar
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-alert-red/30 bg-alert-red-dim/40 p-3 text-xs text-alert-red">
            <AlertCircle size={15} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FormSection title="Plan de Acción Implementado">
            <textarea
              name="accionCorrectiva"
              rows={4}
              required
              value={accionCorrectiva}
              onChange={(e) => setAccionCorrectiva(e.target.value)}
              placeholder="Describe las medidas tomadas para corregir y prevenir la recurrencia del hallazgo..."
              className="sm:col-span-2 w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none focus:ring-1 focus:ring-radar-cyan"
            />
          </FormSection>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line-600">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={15} /> {isPending ? "Guardando..." : "Cerrar hallazgo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
