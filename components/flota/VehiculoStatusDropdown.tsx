"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  CheckCircle2,
  Wrench,
  PowerOff,
  Trash2,
  ChevronDown,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { EstadoVehiculo, ESTADO_VEHICULO_LABELS } from "@/lib/types/vehiculo";
import { cambiarEstadoVehiculoDb, deleteVehiculoDb } from "@/lib/services/vehiculos.service";

interface VehiculoStatusDropdownProps {
  vehiculoId: string;
  placa: string;
  estadoActual: EstadoVehiculo;
  onStatusChanged?: (nuevoEstado: EstadoVehiculo) => void;
  onDeleted?: () => void;
}

export function VehiculoStatusDropdown({
  vehiculoId,
  placa,
  estadoActual,
  onStatusChanged,
  onDeleted,
}: VehiculoStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 190;
      let left = rect.right - menuWidth;
      if (left < 10) left = 10;
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: left + window.scrollX,
      });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updateMenuPosition();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        const portalMenu = document.getElementById(`vehiculo-dropdown-${vehiculoId}`);
        if (portalMenu && !portalMenu.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, vehiculoId]);

  const handleCambiarEstado = async (nuevoEstado: EstadoVehiculo, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    setIsOpen(false);
    try {
      await cambiarEstadoVehiculoDb(vehiculoId, nuevoEstado);
      if (onStatusChanged) onStatusChanged(nuevoEstado);
    } catch (err) {
      console.error("Error al cambiar estado de vehículo:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEliminar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de eliminar el vehículo ${placa}? Esta acción no se puede deshacer.`)) {
      setIsLoading(true);
      setIsOpen(false);
      try {
        await deleteVehiculoDb(vehiculoId);
        if (onDeleted) onDeleted();
        else if (onStatusChanged) onStatusChanged("inactivo");
      } catch (err) {
        console.error("Error al eliminar vehículo:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const menuContent = isOpen && mounted && (
    <div
      id={`vehiculo-dropdown-${vehiculoId}`}
      style={{
        position: "absolute",
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-48 rounded-xl border border-line-500 bg-asphalt-900/98 p-1.5 shadow-2xl backdrop-blur-md animate-fadeIn"
    >
      <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-fog-400 border-b border-line-600/70 mb-1">
        Estado Operativo ({placa})
      </div>

      <button
        type="button"
        onClick={(e) => handleCambiarEstado("activo", e)}
        disabled={estadoActual === "activo" || isLoading}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          estadoActual === "activo"
            ? "bg-ok-green/15 text-ok-green font-semibold"
            : "text-paper-50 hover:bg-asphalt-800"
        }`}
      >
        <CheckCircle2 size={14} className="text-ok-green shrink-0" />
        <span>Activo (Operativo)</span>
      </button>

      <button
        type="button"
        onClick={(e) => handleCambiarEstado("mantenimiento", e)}
        disabled={estadoActual === "mantenimiento" || isLoading}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          estadoActual === "mantenimiento"
            ? "bg-signal-amber/15 text-signal-amber font-semibold"
            : "text-paper-50 hover:bg-asphalt-800"
        }`}
      >
        <Wrench size={14} className="text-signal-amber shrink-0" />
        <span>En mantenimiento</span>
      </button>

      <button
        type="button"
        onClick={(e) => handleCambiarEstado("inactivo", e)}
        disabled={estadoActual === "inactivo" || isLoading}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
          estadoActual === "inactivo"
            ? "bg-fog-400/15 text-fog-400 font-semibold"
            : "text-paper-50 hover:bg-asphalt-800"
        }`}
      >
        <PowerOff size={14} className="text-fog-400 shrink-0" />
        <span>Inactivo / Taller</span>
      </button>

      <div className="my-1 border-t border-line-600/70" />

      <button
        type="button"
        onClick={handleEliminar}
        disabled={isLoading}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-alert-red hover:bg-alert-red-dim/40 transition-colors"
      >
        <Trash2 size={14} className="text-alert-red shrink-0" />
        <span>Eliminar Vehículo</span>
      </button>
    </div>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-600 bg-asphalt-800 text-mist-200 hover:border-signal-amber hover:text-signal-amber transition-colors shadow-xs active:scale-95"
        title="Cambiar estado del vehículo"
      >
        {isLoading ? <Loader2 size={13} className="animate-spin text-signal-amber" /> : <MoreVertical size={14} />}
      </button>

      {mounted && typeof document !== "undefined" && createPortal(menuContent, document.body)}
    </div>
  );
}
