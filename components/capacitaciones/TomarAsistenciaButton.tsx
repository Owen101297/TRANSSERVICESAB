"use client";

import { useState } from "react";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TomarAsistenciaModal } from "@/components/capacitaciones/TomarAsistenciaModal";
import { Capacitacion } from "@/lib/types/capacitacion";

export function TomarAsistenciaButton({ capacitacion }: { capacitacion: Capacitacion }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        className="text-xs py-1 px-2.5 h-auto flex items-center gap-1"
        onClick={() => setIsOpen(true)}
      >
        <UserCheck size={13} /> {capacitacion.estado === "realizada" ? "Ver asistencia" : "Tomar lista"}
      </Button>

      <TomarAsistenciaModal
        capacitacion={capacitacion}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
