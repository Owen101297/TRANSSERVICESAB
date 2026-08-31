"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Fuec, ContratoTransporte } from "@/lib/types/fuec";
import { Vehiculo } from "@/lib/types/vehiculo";
import { Persona } from "@/lib/types/persona";
import { FuecListModal } from "@/components/operacion/FuecListModal";

interface FuecTriggerProps {
  fuecs: Fuec[];
  contratos: ContratoTransporte[];
  vehiculos: Vehiculo[];
  conductores: Persona[];
}

export function FuecTrigger({
  fuecs,
  contratos,
  vehiculos,
  conductores,
}: FuecTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <FileText size={16} /> FUECs oficiales ({fuecs.length})
      </Button>

      <FuecListModal
        fuecs={fuecs}
        contratos={contratos}
        vehiculos={vehiculos}
        conductores={conductores}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
