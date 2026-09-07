"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X, Search } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
}

interface MultiSelectDropdownProps {
  label: string;
  placeholder?: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  icon?: React.ReactNode;
  className?: string;
  allLabel?: string;
}

export function MultiSelectDropdown({
  label,
  placeholder = "Seleccionar...",
  options,
  selectedValues,
  onChange,
  icon,
  className = "",
  allLabel = "Todos",
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(search.toLowerCase())) ||
      opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const isAllSelected = selectedValues.length === 0 || (options.length > 0 && selectedValues.length === options.length);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange([]); // [] significa todos
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Botón Activador */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono hover:border-radar-cyan focus:border-radar-cyan focus:outline-none transition-colors"
      >
        {icon}
        <span className="text-fog-400 font-normal">{label}:</span>
        <span className="font-semibold text-paper-50 truncate max-w-[130px]">
          {isAllSelected ? (
            <span className="text-radar-cyan">{allLabel}</span>
          ) : selectedValues.length === 1 ? (
            options.find((o) => o.value === selectedValues[0])?.label || selectedValues[0]
          ) : (
            <span className="text-signal-amber font-bold">{selectedValues.length} sel.</span>
          )}
        </span>
        <ChevronDown size={13} className={`text-fog-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-line-500 bg-asphalt-900 shadow-xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95">
          {/* Buscador interno si hay más de 5 opciones */}
          {options.length > 5 && (
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fog-400" />
              <input
                type="text"
                placeholder="Buscar opción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-line-600 bg-asphalt-950 pl-7 pr-2 py-1 text-xs text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none"
              />
            </div>
          )}

          {/* Acciones Rápidas */}
          <div className="flex items-center justify-between border-b border-line-600/70 pb-1.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={handleSelectAll}
              className={`hover:underline font-semibold ${isAllSelected ? "text-radar-cyan" : "text-fog-400"}`}
            >
              ✓ Marcar Todos
            </button>
            {selectedValues.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-fog-400 hover:text-alert-red transition-colors flex items-center gap-0.5"
              >
                <X size={10} /> Limpiar
              </button>
            )}
          </div>

          {/* Lista de Opciones con Scroll */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-center text-xs text-fog-400">No hay coincidencias</div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = isAllSelected ? true : selectedValues.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (isAllSelected) {
                        // Si estaban todos seleccionados y el usuario hace clic en uno, dejar solo los demás
                        onChange(options.map((o) => o.value).filter((v) => v !== opt.value));
                      } else {
                        toggleOption(opt.value);
                      }
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left ${
                      checked
                        ? "bg-asphalt-800 text-paper-50 font-medium"
                        : "text-fog-400 hover:bg-asphalt-950 hover:text-paper-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          checked
                            ? "bg-radar-cyan border-radar-cyan text-asphalt-950"
                            : "border-line-500 bg-asphalt-950"
                        }`}
                      >
                        {checked && <Check size={11} className="stroke-[3]" />}
                      </span>
                      <div className="truncate">
                        <div className="text-paper-50 truncate">{opt.label}</div>
                        {opt.subtitle && <div className="text-[10px] text-fog-400 truncate">{opt.subtitle}</div>}
                      </div>
                    </div>
                    {opt.badge && (
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase border ${
                          opt.badgeClass || "bg-asphalt-950 text-fog-400 border-line-600"
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
