"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Persona } from "@/lib/types/persona";
import { retirarPersonaDb, reactivarPersonaDb } from "@/lib/services/personas.service";
import { RetirarPersonaModal } from "@/components/personas/RetirarPersonaModal";

export function DeletePersonaTrigger({ persona }: { persona: Persona }) {
  const [isRetirarModalOpen, setIsRetirarModalOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isRetirado = persona.estado === "retirado";

  const handleReactivar = async () => {
    setIsReactivating(true);
    setError(null);
    try {
      const res = await reactivarPersonaDb(persona.id);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || "No se pudo reactivar el registro.");
      }
    } catch (err: any) {
      setError(err.message || "Error al comunicarse con el servidor.");
    } finally {
      setIsReactivating(false);
    }
  };

  return (
    <>
      {isRetirado ? (
        <Button
          type="button"
          variant="primary"
          className="mt-2 w-full bg-ok-green text-asphalt-950 hover:bg-ok-green/90 font-semibold"
          onClick={handleReactivar}
          disabled={isReactivating}
        >
          {isReactivating ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Reactivando...
            </>
          ) : (
            <>
              <RotateCcw size={14} /> Reactivar en planta activa
            </>
          )}
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="mt-2 w-full text-mist-200 hover:text-signal-amber hover:border-signal-amber/40"
          onClick={() => setIsRetirarModalOpen(true)}
        >
          <Archive size={14} /> Retirar a Historial (Auditoría)
        </Button>
      )}

      {error && (
        <div className="rounded border border-alert-red/40 bg-alert-red-dim p-2.5 text-xs text-alert-red mt-2">
          {error}
        </div>
      )}

      <RetirarPersonaModal
        isOpen={isRetirarModalOpen}
        persona={persona}
        onClose={() => setIsRetirarModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
