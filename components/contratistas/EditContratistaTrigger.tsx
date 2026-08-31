"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Contratista } from "@/lib/types/contratista";
import { EditContratistaModal } from "@/components/contratistas/EditContratistaModal";

export function EditContratistaTrigger({ contratista }: { contratista: Contratista }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="mt-6 w-full"
        onClick={() => setIsOpen(true)}
      >
        <Edit2 size={14} /> Editar contratista
      </Button>

      <EditContratistaModal
        contratista={contratista}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
