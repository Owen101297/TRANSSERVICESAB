"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Persona } from "@/lib/types/persona";
import { EditPersonaModal } from "@/components/personas/EditPersonaModal";

export function EditPersonaTrigger({ persona }: { persona: Persona }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="mt-6 w-full"
        onClick={() => setIsOpen(true)}
      >
        <Edit2 size={14} /> Editar información
      </Button>

      <EditPersonaModal
        persona={persona}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
