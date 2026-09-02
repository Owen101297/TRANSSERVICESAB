"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { X, Zap, Search, Check, AlertCircle, User, Truck, ArrowRight, RefreshCw } from "lucide-react";
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
  const [isChangingVehicle, setIsChangingVehicle] = useState(!initialPlaca);
  const [isChangingConductor, setIsChangingConductor] = useState(!initialConductorId);
  const [conductorSearch, setConductorSearch] = useState("");
  const [vehiculoSearch, setVehiculoSearch] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlaca) {
      setSelectedVehiculo(initialPlaca);
      setIsChangingVehicle(false);
    } else {
      setIsChangingVehicle(true);
    }
    if (initialConductorId) {
      setSelectedConductorId(initialConductorId);
      setIsChangingConductor(false);
    } else {
      setIsChangingConductor(true);
    }
  }, [initialPlaca, initialConductorId, isOpen]);

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

  const selectedConductorObj = useMemo(
    () => conductores.find((c) => c.id === selectedConductorId),
    [conductores, selectedConductorId]
  );

  const selectedVehiculoObj = useMemo(
    () =>
      vehiculos.find(
        (v) =>
          v.id === selectedVehiculo ||
          v.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") ===
            selectedVehiculo.toUpperCase().replace(/[^A-Z0-9]/g, "")
      ),
    [vehiculos, selectedVehiculo]
  );

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
                {initialPlaca ? `Asignando conductor a la placa ${initialPlaca}` : "Vinculación inmediata entre Conductor y Vehículo"}
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

          {/* Sección Vehículo: Fijo contextual o Selector */}
          {!isChangingVehicle && selectedVehiculo ? (
            <div className="p-3 bg-asphalt-950 border border-signal-amber/40 rounded-xl flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-signal-amber/15 border border-signal-amber/30 flex items-center justify-center text-signal-amber">
                  <Truck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-paper-50 px-2 py-0.5 rounded bg-asphalt-800 border border-line-600">
                      {selectedVehiculo}
                    </span>
                    <span className="text-[11px] text-ok-green font-medium">✓ Vehículo fijado</span>
                  </div>
                  {selectedVehiculoObj && (
                    <p className="text-[11px] text-fog-400 mt-0.5">
                      {selectedVehiculoObj.marca} {selectedVehiculoObj.modelo} · {selectedVehiculoObj.contratistaNombre || "Propio"}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingVehicle(true)}
                className="text-[11px] text-signal-amber hover:underline font-mono px-2 py-1 rounded bg-asphalt-900 border border-line-600 hover:border-signal-amber"
              >
                Cambiar vehículo
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-fog-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Truck size={14} className="text-signal-amber" /> Vehículo / Placa
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
              <div className="max-h-32 overflow-y-auto border border-line-600 rounded-xl bg-asphalt-950/60 divide-y divide-line-600/50">
                {filteredVehiculos.length === 0 ? (
                  <div className="p-2.5 text-center text-xs text-fog-400">
                    Usa la placa escrita: <span className="font-mono text-paper-50">{vehiculoSearch || "—"}</span>
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
                          setIsChangingVehicle(false);
                        }}
                        className={`w-full p-2 text-left flex items-center justify-between text-xs transition-colors ${
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
          )}

          {/* Sección Conductor: Fijo contextual o Selector */}
          {!isChangingConductor && selectedConductorId && selectedConductorObj ? (
            <div className="p-3 bg-asphalt-950 border border-radar-cyan/40 rounded-xl flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-radar-cyan/15 border border-radar-cyan/30 flex items-center justify-center text-radar-cyan font-bold font-display text-sm">
                  {selectedConductorObj.nombres[0]}{selectedConductorObj.apellidos[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-paper-50">
                      {selectedConductorObj.nombres} {selectedConductorObj.apellidos}
                    </span>
                    <span className="text-[11px] text-ok-green font-medium">✓ Conductor fijado</span>
                  </div>
                  <p className="text-[11px] text-fog-400 font-mono mt-0.5">
                    CC: {selectedConductorObj.numeroDocumento || "—"} · {selectedConductorObj.contratistaNombre || "Propio"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangingConductor(true)}
                className="text-[11px] text-radar-cyan hover:underline font-mono px-2 py-1 rounded bg-asphalt-900 border border-line-600 hover:border-radar-cyan"
              >
                Cambiar conductor
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-fog-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-radar-cyan" /> Seleccionar Conductor
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" size={15} />
                <input
                  type="text"
                  autoFocus={!initialConductorId}
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
                        onClick={() => {
                          setSelectedConductorId(c.id);
                          if (initialPlaca) {
                            // Si la placa ya estaba fijada, mantener cerrado el selector de conductor
                            setIsChangingConductor(false);
                          }
                        }}
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
          )}
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
