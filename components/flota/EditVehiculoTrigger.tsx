"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Vehiculo } from "@/lib/types/vehiculo";
import { EditVehiculoModal } from "@/components/flota/EditVehiculoModal";

export function EditVehiculoTrigger({ vehiculo }: { vehiculo: Vehiculo }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="mt-6 w-full"
        onClick={() => setIsOpen(true)}
      >
        <Edit2 size={14} /> Editar vehículo
      </Button>

      <EditVehiculoModal
        vehiculo={vehiculo}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
