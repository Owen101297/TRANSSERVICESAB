"use client";

import { useState, useMemo, useTransition } from "react";
import { X, Zap, Search, Check, AlertCircle, User, Truck, ArrowRight } from "lucide-react";
import { quickAsignarConductorVehiculoAction } from "@/lib/services/asignaciones.service";

interface QuickAsignacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlaca?: string;
  initialConductorId?: string;
  conductores?: { id: string; nombres: string; apellidos: string; numeroDocumento?: string; contratistaNombre?: string }[];
  vehiculos?: { id: string; placa: string; marca?: string; modelo?: string; contratistaNombre?: string }[];
  onSuccess?: (res: { conductorNombre?: string; placa?: string }) => void;
}

export function QuickAsignacionModal({
  isOpen,
  onClose,
  initialPlaca = "",
  initialConductorId = "",
  conductores = [],
  vehiculos = [],
  onSuccess,
}: QuickAsignacionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedConductorId, setSelectedConductorId] = useState(initialConductorId);
  const [selectedVehiculo, setSelectedVehiculo] = useState(initialPlaca);
  const [conductorSearch, setConductorSearch] = useState("");
  const [vehiculoSearch, setVehiculoSearch] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtrado reactivo de conductores
  const filteredConductores = useMemo(() => {
    if (!conductorSearch.trim()) return conductores;
    const q = conductorSearch.toLowerCase();
    return conductores.filter(
      (c) =>
        `${c.nombres} ${c.apellidos}`.toLowerCase().includes(q) ||
        (c.numeroDocumento && c.numeroDocumento.includes(q)) ||
        (c.contratistaNombre && c.contratistaNombre.toLowerCase().includes(q))
    );
  }, [conductores, conductorSearch]);

  // Filtrado reactivo de vehículos
  const filteredVehiculos = useMemo(() => {
    if (!vehiculoSearch.trim()) return vehiculos;
    const q = vehiculoSearch.toLowerCase().replace(/[^a-z0-9]/g, "");
    return vehiculos.filter((v) => {
      const cleanPlaca = v.placa.toLowerCase().replace(/[^a-z0-9]/g, "");
      const full = `${v.placa} ${v.marca || ""} ${v.modelo || ""} ${v.contratistaNombre || ""}`.toLowerCase();
      return cleanPlaca.includes(q) || full.includes(vehiculoSearch.toLowerCase());
    });
  }, [vehiculos, vehiculoSearch]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedConductorId) {
      setErrorMsg("Por favor selecciona un conductor de la lista.");
      return;
    }
    if (!selectedVehiculo) {
      setErrorMsg("Por favor selecciona un vehículo o escribe su placa.");
      return;
    }

    startTransition(async () => {
      const res = await quickAsignarConductorVehiculoAction({
        conductorId: selectedConductorId,
        vehiculoIdOrPlaca: selectedVehiculo,
        observaciones: observaciones || "Asignación rápida 1-Click",
      });

      if (res.success) {
        setSuccessMsg(`¡Asignado exitosamente! ${res.conductorNombre} ➔ ${res.placa}`);
        if (onSuccess) onSuccess(res);
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 1200);
      } else {
        setErrorMsg(res.error || "Error al realizar la asignación.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-asphalt-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-asphalt-900 border border-line-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-line-600 bg-asphalt-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-signal-amber/15 border border-signal-amber/30 flex items-center justify-center text-signal-amber">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-paper-50 font-display tracking-wide uppercase">
                Asignación Rápida 1-Click
              </h2>
              <p className="text-xs text-fog-400">
                Vinculación inmediata entre Conductor y Vehículo sin formularios largos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-alert-red/15 border border-alert-red/30 rounded-xl text-alert-red text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-ok-green/15 border border-ok-green/30 rounded-xl text-ok-green text-xs flex items-center gap-2">
              <Check size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Paso 1: Seleccionar Conductor */}
          <div>
            <label className="block text-xs font-semibold text-fog-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-radar-cyan" /> 1. Conductor
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" size={15} />
              <input
                type="text"
                value={conductorSearch}
                onChange={(e) => setConductorSearch(e.target.value)}
                placeholder="Buscar por nombre, cédula o contratista..."
                className="w-full bg-asphalt-950 border border-line-600 rounded-xl pl-9 pr-3 py-2 text-xs text-paper-50 placeholder:text-fog-400/50 focus:border-radar-cyan focus:outline-none"
              />
            </div>
            <div className="max-h-36 overflow-y-auto border border-line-600 rounded-xl bg-asphalt-950/60 divide-y divide-line-600/50">
              {filteredConductores.length === 0 ? (
                <div className="p-3 text-center text-xs text-fog-400">No se encontraron conductores.</div>
              ) : (
                filteredConductores.map((c) => {
                  const isSelected = selectedConductorId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedConductorId(c.id)}
                      className={`w-full p-2.5 text-left flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? "bg-radar-cyan/15 text-radar-cyan font-semibold"
                          : "text-paper-50 hover:bg-asphalt-800"
                      }`}
                    >
                      <div>
                        <p className="font-medium">{c.nombres} {c.apellidos}</p>
                        <p className="text-[10px] text-fog-400 font-mono">
                          CC: {c.numeroDocumento || "—"} · {c.contratistaNombre || "Propio"}
                        </p>
                      </div>
                      {isSelected && <Check size={16} className="text-radar-cyan shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Paso 2: Seleccionar Vehículo */}
          <div>
            <label className="block text-xs font-semibold text-fog-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Truck size={14} className="text-signal-amber" /> 2. Vehículo / Placa
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" size={15} />
              <input
                type="text"
                value={vehiculoSearch}
                onChange={(e) => {
                  setVehiculoSearch(e.target.value);
                  setSelectedVehiculo(e.target.value);
                }}
                placeholder="Buscar o escribir placa (ej. NSY-352, WGM-212)..."
                className="w-full bg-asphalt-950 border border-line-600 rounded-xl pl-9 pr-3 py-2 text-xs text-paper-50 placeholder:text-fog-400/50 font-mono focus:border-signal-amber focus:outline-none"
              />
            </div>
            <div className="max-h-36 overflow-y-auto border border-line-600 rounded-xl bg-asphalt-950/60 divide-y divide-line-600/50">
              {filteredVehiculos.length === 0 ? (
                <div className="p-3 text-center text-xs text-fog-400">
                  Usa la placa escrita en el buscador: <span className="font-mono text-paper-50">{vehiculoSearch || "—"}</span>
                </div>
              ) : (
                filteredVehiculos.map((v) => {
                  const isSelected =
                    selectedVehiculo === v.id ||
                    selectedVehiculo.toUpperCase().replace(/[^A-Z0-9]/g, "") ===
                      v.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVehiculo(v.placa);
                        setVehiculoSearch(v.placa);
                      }}
                      className={`w-full p-2.5 text-left flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? "bg-signal-amber/15 text-signal-amber font-semibold"
                          : "text-paper-50 hover:bg-asphalt-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-asphalt-800 border border-line-600 font-mono font-bold text-paper-50">
                          {v.placa}
                        </span>
                        <span className="text-fog-400 text-[11px]">
                          {v.marca} {v.modelo} · {v.contratistaNombre || "Propio"}
                        </span>
                      </div>
                      {isSelected && <Check size={16} className="text-signal-amber shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="p-4 sm:p-5 border-t border-line-600 bg-asphalt-950/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold text-fog-400 hover:text-paper-50 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || !selectedConductorId || !selectedVehiculo}
            className="px-5 py-2.5 bg-radar-cyan hover:bg-radar-cyan/90 text-asphalt-950 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-radar-cyan/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? (
              <span>Asignando...</span>
            ) : (
              <>
                <Zap size={15} />
                <span>Asignar Ahora</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
