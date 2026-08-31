"use client";

import { useState, useTransition } from "react";
import { X, AlertTriangle, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormField";
import { registrarNovedadViajeAction } from "@/lib/services/operacion.service";

interface RegistrarNovedadModalProps {
  viajeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RegistrarNovedadModal({
  viajeId,
  isOpen,
  onClose,
}: RegistrarNovedadModalProps) {
  const [isPending, startTransition] = useTransition();
  const [descripcion, setDescripcion] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!descripcion.trim()) {
      setErrorMsg("Debes ingresar el detalle de la novedad.");
      return;
    }

    startTransition(async () => {
      const res = await registrarNovedadViajeAction(viajeId, descripcion);
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
          window.location.reload();
        }, 600);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al registrar la novedad.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/80 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line-600 pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-signal-amber" />
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
              Registrar novedad en ruta
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

        {savedSuccess && (
          <div className="mt-4 rounded-lg border border-ok-green/40 bg-ok-green-dim/40 p-3 text-xs text-ok-green">
            ¡Novedad registrada con éxito!
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FormSection title="Descripción del suceso">
            <textarea
              name="descripcion"
              rows={4}
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe detalladamente el retraso, varada, cierre vial o incidente..."
              className="sm:col-span-2 w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none focus:ring-1 focus:ring-radar-cyan"
            />
          </FormSection>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line-600">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={15} /> {isPending ? "Registrando..." : "Guardar novedad"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
