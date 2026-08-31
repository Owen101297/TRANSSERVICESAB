"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RegistrarNovedadModal } from "@/components/operacion/RegistrarNovedadModal";
import { finalizarViajeAction } from "@/lib/services/operacion.service";

export function ViajeActions({ viajeId }: { viajeId: string }) {
  const [isNovedadOpen, setIsNovedadOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFinalizar = () => {
    if (confirm("¿Estás seguro de marcar este viaje como finalizado?")) {
      startTransition(async () => {
        await finalizarViajeAction(viajeId);
        window.location.reload();
      });
    }
  };

  return (
    <>
      <div className="mt-6 flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setIsNovedadOpen(true)}
        >
          <AlertTriangle size={15} /> Registrar novedad
        </Button>
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={handleFinalizar}
          disabled={isPending}
        >
          <CheckCircle2 size={15} /> {isPending ? "Finalizando..." : "Finalizar viaje"}
        </Button>
      </div>

      <RegistrarNovedadModal
        viajeId={viajeId}
        isOpen={isNovedadOpen}
        onClose={() => setIsNovedadOpen(false)}
      />
    </>
  );
}
