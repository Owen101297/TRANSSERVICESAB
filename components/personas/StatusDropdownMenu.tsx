"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calcular posición exacta en pantalla (fixed) para que NUNCA se corte por overflow de la tabla
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 230; // Ancho del menú
    const menuHeight = 220; // Altura estimada

    // Calcular si cabe abajo o arriba
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = placeAbove
      ? rect.top - menuHeight - 6
      : rect.bottom + 6;

    // Alinear borde derecho del menú con el borde derecho del botón
    let left = rect.right - menuWidth;
    if (left < 10) left = 10; // Evitar salir de pantalla por la izquierda

    setMenuCoords({ top, left });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Cerrar al hacer clic afuera o scroll
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      if (isOpen) {
        updatePosition();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
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
    <>
      <Tooltip content="Cambiar estado operativo" position="top">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
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

      {/* Renderizado mediante Portal en document.body para máxima elevación z-index sobre tablas y tarjetas */}
      {mounted &&
        isOpen &&
        menuCoords &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
              width: "230px",
              zIndex: 99999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl border border-line-500 bg-asphalt-900 shadow-2xl p-1.5 animate-fadeIn backdrop-blur-md"
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
          </div>,
          document.body
        )}
    </>
  );
}
