"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuickAsignacionModal } from "./QuickAsignacionModal";

interface AsignacionesActionsProps {
  conductores: { id: string; nombres: string; apellidos: string; numeroDocumento?: string; contratistaNombre?: string }[];
  vehiculos: { id: string; placa: string; marca?: string; modelo?: string; contratistaNombre?: string }[];
}

export function AsignacionesActions({ conductores, vehiculos }: AsignacionesActionsProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setModalOpen(true)}
        className="px-4 py-2 bg-signal-amber hover:bg-signal-amber/90 text-asphalt-950 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-signal-amber/20 transition-all active:scale-[0.98]"
      >
        <Zap size={15} />
        <span>Asignación Rápida</span>
      </button>

      <Link href="/asignaciones/nueva">
        <Button variant="secondary" className="text-xs">
          <Plus size={15} /> Formulario Completo
        </Button>
      </Link>

      <QuickAsignacionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        conductores={conductores}
        vehiculos={vehiculos}
      />
    </div>
  );
}
