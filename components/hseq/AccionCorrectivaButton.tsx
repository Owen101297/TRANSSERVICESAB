"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccionCorrectivaModal } from "@/components/hseq/AccionCorrectivaModal";

export function AccionCorrectivaButton({ hallazgoId }: { hallazgoId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        className="mt-5 w-full"
        onClick={() => setIsOpen(true)}
      >
        <CheckCircle2 size={16} /> Registrar acción correctiva y cerrar
      </Button>

      <AccionCorrectivaModal
        hallazgoId={hallazgoId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
