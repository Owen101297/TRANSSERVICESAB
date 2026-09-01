"use client";

import { useState, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  Check,
  Archive,
  Loader2,
} from "lucide-react";
import { EstadoPersona, Persona } from "@/lib/types/persona";
import { cambiarEstadoPersonaDb } from "@/lib/services/personas.service";
import { Tooltip } from "@/components/ui/Tooltip";

interface StatusDropdownMenuProps {
  persona: Persona;
  onOpenRetirarModal: (persona: Persona) => void;
  onStatusChanged: (refreshedList: Persona[]) => void;
}

const ESTADOS_DISPONIBLES: {
  key: EstadoPersona;
  label: string;
  dotColor: string;
  description: string;
}[] = [
  {
    key: "activo",
    label: "Activo",
    dotColor: "bg-ok-green",
    description: "Habilitado en ruta / planta operativa",
  },
  {
    key: "descanso",
    label: "En descanso",
    dotColor: "bg-signal-amber",
    description: "Ciclo de descanso programado",
  },
  {
    key: "vacaciones",
    label: "Vacaciones",
    dotColor: "bg-radar-cyan",
    description: "Periodo vacacional activo",
  },
];

export function StatusDropdownMenu({
  persona,
  onOpenRetirarModal,
  onStatusChanged,
}: StatusDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectStatus = async (nuevoEstado: EstadoPersona) => {
    if (persona.estado === nuevoEstado) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      const res = await cambiarEstadoPersonaDb(persona.id, nuevoEstado);
      if (res.success && res.refreshedList) {
        onStatusChanged(res.refreshedList);
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    } finally {
      setIsChanging(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Tooltip content="Cambiar estado operativo" position="top">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          disabled={isChanging}
          className={`p-1.5 rounded-lg border transition-all duration-150 ${
            isOpen
              ? "bg-asphalt-700 text-signal-amber border-signal-amber/50 shadow-md"
              : "bg-asphalt-800 text-mist-200 hover:text-paper-50 hover:bg-asphalt-700 border-line-600"
          }`}
          aria-label="Cambiar estado operativo"
        >
          {isChanging ? (
            <Loader2 size={15} className="animate-spin text-signal-amber" />
          ) : (
            <SlidersHorizontal size={15} />
          )}
        </button>
      </Tooltip>

      {/* Menú Desplegable Flotante */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 bottom-full mb-1.5 z-50 w-56 rounded-xl border border-line-500 bg-asphalt-900 shadow-2xl p-1.5 animate-fadeIn"
        >
          <div className="px-2.5 py-1.5 border-b border-line-600/70 mb-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-fog-400">
              Estado Operativo
            </p>
            <p className="text-xs font-semibold text-paper-50 truncate">
              {persona.nombres} {persona.apellidos}
            </p>
          </div>

          <div className="space-y-0.5">
            {ESTADOS_DISPONIBLES.map((est) => {
              const isSelected = persona.estado === est.key;
              return (
                <button
                  key={est.key}
                  type="button"
                  onClick={() => handleSelectStatus(est.key)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    isSelected
                      ? "bg-asphalt-800 text-paper-50 font-semibold"
                      : "text-mist-200 hover:bg-asphalt-800 hover:text-paper-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${est.dotColor}`} />
                    <div className="text-left">
                      <p className="leading-tight">{est.label}</p>
                      <p className="text-[10px] text-fog-400 font-normal">{est.description}</p>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-ok-green ml-1 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-line-600/70 my-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenRetirarModal(persona);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-signal-amber hover:bg-signal-amber/10 transition-colors"
            >
              <Archive size={14} />
              <div className="text-left">
                <p className="font-semibold leading-tight">Retirar a Historial...</p>
                <p className="text-[10px] text-fog-400 font-normal">Archivo permanente para auditoría</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
