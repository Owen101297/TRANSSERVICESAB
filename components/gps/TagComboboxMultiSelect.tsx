"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Search, X, ChevronDown, Check } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeClass?: string;
  icon?: React.ReactNode;
}

interface TagComboboxMultiSelectProps {
  label: string;
  placeholder?: string;
  options: ComboboxOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  icon?: React.ReactNode;
  maxChipsDisplay?: number;
  emptyMessage?: string;
}

export function TagComboboxMultiSelect({
  label,
  placeholder = "Buscar y seleccionar...",
  options,
  selectedValues,
  onChange,
  icon,
  maxChipsDisplay = 4,
  emptyMessage = "No se encontraron resultados",
}: TagComboboxMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Deduplicación defensiva estricta de opciones por clave alfanumérica
  const uniqueOptions = Array.from(
    new Map(
      options.map((opt) => [
        opt.value.toUpperCase().replace(/[^A-Z0-9]/g, "") || opt.value,
        opt,
      ])
    ).values()
  );

  // Opciones filtradas por búsqueda de texto
  const filteredOptions = uniqueOptions.filter((opt) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    const qClean = q.replace(/[^a-z0-9]/g, "");
    const optClean = opt.value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchLabel = opt.label.toLowerCase().includes(q);
    const matchSub = opt.subtitle?.toLowerCase().includes(q);
    const matchVal = opt.value.toLowerCase().includes(q);
    const matchClean = qClean.length >= 2 && optClean.includes(qClean);
    return matchLabel || matchSub || matchVal || matchClean;
  });

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
    setQuery("");
    inputRef.current?.focus();
  };

  const handleRemoveChip = (val: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(selectedValues.filter((v) => v !== val));
    inputRef.current?.focus();
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !query && selectedValues.length > 0) {
      // Elimina el último chip si el input está vacío
      handleRemoveChip(selectedValues[selectedValues.length - 1]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && filteredOptions[highlightedIndex]) {
        handleToggleOption(filteredOptions[highlightedIndex].value);
      } else if (query.trim()) {
        const val = query.trim().toUpperCase();
        if (!selectedValues.includes(val)) {
          onChange([...selectedValues, val]);
        }
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const selectedOptionsMap = new Map(options.map((o) => [o.value, o]));

  return (
    <div className="relative space-y-1" ref={containerRef}>
      {/* Etiqueta del Campo */}
      <div className="flex items-center justify-between text-[11px] font-mono font-semibold uppercase tracking-wider text-fog-400">
        <span className="flex items-center gap-1.5 text-paper-50">
          {icon}
          {label}
        </span>
        {selectedValues.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[10px] text-alert-red hover:underline lowercase font-normal transition-colors"
          >
            Limpiar ({selectedValues.length})
          </button>
        )}
      </div>

      {/* Input Contenedor de Chips y Buscador */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex min-h-[38px] w-full flex-wrap items-center gap-1.5 rounded-lg border bg-asphalt-950 px-2.5 py-1.5 text-xs transition-all cursor-text ${
          isOpen
            ? "border-radar-cyan shadow-[0_0_0_1px_rgba(0,229,255,0.25)]"
            : "border-line-600 hover:border-line-500"
        }`}
      >
        {/* Chips Renderizados de Selecciones Activas */}
        {selectedValues.slice(0, maxChipsDisplay).map((val) => {
          const opt = selectedOptionsMap.get(val);
          const labelText = opt?.label || val;
          return (
            <span
              key={val}
              className="inline-flex items-center gap-1 rounded bg-asphalt-800 border border-radar-cyan/40 px-2 py-0.5 text-[11px] font-mono font-bold text-paper-50 shadow-xs animate-in fade-in zoom-in-95 duration-100"
            >
              {opt?.icon && <span className="shrink-0">{opt.icon}</span>}
              <span className="truncate max-w-[130px]">{labelText}</span>
              <button
                type="button"
                onClick={(e) => handleRemoveChip(val, e)}
                className="rounded p-0.5 text-fog-400 hover:bg-alert-red/20 hover:text-alert-red transition-colors"
                title="Remover"
              >
                <X size={11} />
              </button>
            </span>
          );
        })}

        {/* Indicador de más chips si excede el display */}
        {selectedValues.length > maxChipsDisplay && (
          <span className="inline-flex items-center rounded bg-asphalt-800 border border-line-500 px-1.5 py-0.5 text-[10px] font-mono text-signal-amber font-bold">
            +{selectedValues.length - maxChipsDisplay} más
          </span>
        )}

        {/* Input de Búsqueda Integrado */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedValues.length === 0 ? placeholder : "Agregar más..."}
          className="min-w-[90px] flex-1 bg-transparent text-xs text-paper-50 placeholder:text-fog-400/60 focus:outline-none font-mono py-0.5"
        />

        {/* Flecha Toggle */}
        <div className="flex items-center gap-1 ml-auto text-fog-400 shrink-0">
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-radar-cyan" : ""}`}
          />
        </div>
      </div>

      {/* Menú Desplegable Flotante (Popover) */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-[240px] overflow-y-auto rounded-xl border border-line-500 bg-asphalt-900 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 custom-scrollbar">
          {/* Opción rápida para agregar el término tecleado si no existe en opciones exactas */}
          {query.trim() && !options.some((o) => o.value.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => {
                const val = query.trim().toUpperCase();
                if (!selectedValues.includes(val)) {
                  onChange([...selectedValues, val]);
                }
                setQuery("");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 mb-1 text-left text-xs bg-radar-cyan-dim/30 border border-radar-cyan/40 text-radar-cyan hover:bg-radar-cyan/25 font-mono font-semibold transition-colors"
            >
              <Search size={13} className="text-radar-cyan" />
              <span>Buscar en BD: <strong className="text-paper-50">{query.trim().toUpperCase()}</strong> (Enter)</span>
            </button>
          )}

          {filteredOptions.length === 0 && !query.trim() ? (
            <div className="p-3 text-center text-xs text-fog-400 font-mono">
              {emptyMessage}
            </div>
          ) : filteredOptions.length === 0 && query.trim() ? (
            <div className="p-2 text-center text-xs text-fog-400 font-mono">
              Presiona <strong className="text-radar-cyan">Enter</strong> para buscar <strong className="text-paper-50 font-bold">{query.trim().toUpperCase()}</strong> en toda la base de datos.
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredOptions.map((opt, idx) => {
                const isSelected = selectedValues.includes(opt.value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleOption(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-radar-cyan/15 text-paper-50 border border-radar-cyan/30 font-semibold"
                        : isHighlighted
                        ? "bg-asphalt-800 text-paper-50"
                        : "text-fog-400 hover:bg-asphalt-800/80 hover:text-paper-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isSelected
                            ? "border-radar-cyan bg-radar-cyan text-asphalt-950 font-bold"
                            : "border-line-600 bg-asphalt-950"
                        }`}
                      >
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>

                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}

                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-mono text-xs text-paper-50">
                          {opt.label}
                        </span>
                        {opt.subtitle && (
                          <span className="truncate text-[10px] text-fog-400/80">
                            {opt.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {opt.badge && (
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border ${
                          opt.badgeClass || "bg-asphalt-950 text-fog-400 border-line-600"
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
