"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Persona } from "@/lib/types/persona";
import { deletePersonaDb } from "@/lib/services/personas.service";

export function DeletePersonaTrigger({ persona }: { persona: Persona }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await deletePersonaDb(persona.id);
      if (res.success) {
        setIsOpen(false);
        router.push("/personas");
        router.refresh();
      } else {
        setError(res.error || "No se pudo eliminar el registro.");
      }
    } catch (err: any) {
      setError(err.message || "Error al comunicarse con el servidor.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="mt-2 w-full text-alert-red hover:bg-alert-red-dim hover:border-alert-red/40"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 size={14} /> Eliminar persona
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-line-600 bg-asphalt-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-alert-red-dim p-2.5 text-alert-red border border-alert-red/30">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  ¿Eliminar a {persona.nombres} {persona.apellidos}?
                </h3>
                <p className="text-xs text-fog-400 font-mono">
                  {persona.tipoDocumento}: {persona.numeroDocumento}
                </p>
              </div>
            </div>

            <p className="text-xs text-mist-200 leading-relaxed">
              Esta acción eliminará de forma permanente el expediente laboral, licencias de conducción, registros de salud y asignaciones asociadas a esta persona.
            </p>

            {error && (
              <div className="rounded border border-alert-red/40 bg-alert-red-dim p-3 text-xs text-alert-red">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-alert-red hover:bg-red-700 text-white border-transparent"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} /> Confirmar eliminación
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
