"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Smartphone,
  Calendar,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Car,
} from "lucide-react";
import { EventoGPS } from "@/lib/types/gps";
import { generarMensajeCierreDiarioConductor } from "@/lib/utils/gps-scoring";

interface CierreDiarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventos: EventoGPS[];
  conductores?: { id: string; nombres: string; apellidos: string; numeroDocumento?: string; contratistaNombre?: string }[];
  vehiculos?: { id: string; placa: string; marca?: string; modelo?: string; contratistaNombre?: string }[];
}

export function CierreDiarioModal({
  isOpen,
  onClose,
  eventos,
  conductores = [],
  vehiculos = [],
}: CierreDiarioModalProps) {
  const [selectedConductorNombre, setSelectedConductorNombre] = useState<string>("");
  const [editableMessage, setEditableMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Agrupar eventos de hoy por conductor
  const conductoresConEventos = useMemo(() => {
    const mapa: Record<
      string,
      {
        conductorNombre: string;
        conductorTelefono?: string;
        placa: string;
        contratistaNombre?: string;
        eventos: EventoGPS[];
      }
    > = {};

    eventos.forEach((e) => {
      const nombre = e.conductorNombre || "Sin conductor asignado";
      if (!mapa[nombre]) {
        mapa[nombre] = {
          conductorNombre: nombre,
          conductorTelefono: e.conductorTelefono,
          placa: e.placa,
          eventos: [],
        };
      }
      mapa[nombre].eventos.push(e);
      if (e.conductorTelefono && !mapa[nombre].conductorTelefono) {
        mapa[nombre].conductorTelefono = e.conductorTelefono;
      }
    });

    return Object.values(mapa);
  }, [eventos]);

  // Conductor activo seleccionado
  const activeConductor = useMemo(() => {
    if (!conductoresConEventos.length) return null;
    return (
      conductoresConEventos.find((c) => c.conductorNombre === selectedConductorNombre) ||
      conductoresConEventos[0]
    );
  }, [conductoresConEventos, selectedConductorNombre]);

  useEffect(() => {
    if (activeConductor) {
      const vehiculoObj = vehiculos.find(
        (v) => v.placa.replace(/[^A-Z0-9]/g, "") === activeConductor.placa.replace(/[^A-Z0-9]/g, "")
      );
      const esGranTierra =
        (vehiculoObj?.contratistaNombre || "").toUpperCase().includes("GRAN TIERRA") ||
        (vehiculoObj?.contratistaNombre || "").toUpperCase().includes("GT");

      const msg = generarMensajeCierreDiarioConductor(
        activeConductor.conductorNombre,
        activeConductor.placa,
        activeConductor.eventos,
        esGranTierra
      );
      setEditableMessage(msg);
      setSelectedConductorNombre(activeConductor.conductorNombre);
    }
  }, [activeConductor, vehiculos]);

  if (!isOpen) return null;

  const rawPhone = (activeConductor?.conductorTelefono || "").replace(/[^0-9]/g, "");
  const phoneFormatted = rawPhone.length === 10 ? `57${rawPhone}` : rawPhone;

  const whatsappUrl = phoneFormatted
    ? `https://api.whatsapp.com/send?phone=${phoneFormatted}&text=${encodeURIComponent(editableMessage)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(editableMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(editableMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-asphalt-950/85 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl my-8 rounded-2xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl space-y-4">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-line-600 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-radar-cyan/40 bg-radar-cyan/15 text-radar-cyan">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50 leading-tight">
                Cierre de Jornada PESV — Balance Diario
              </h3>
              <p className="text-xs text-fog-400">
                Envío consolidado de desempeño al WhatsApp del conductor al finalizar el día
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {conductoresConEventos.length === 0 ? (
          <div className="p-8 text-center text-xs text-fog-400 space-y-2">
            <CheckCircle2 size={24} className="text-ok-green mx-auto" />
            <p className="text-paper-50 font-bold">No hay eventos registrados en la jornada para consolidar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selector de Conductor */}
            <div>
              <label className="block text-xs font-semibold text-fog-400 uppercase tracking-wider mb-1.5">
                Seleccionar Conductor para Balance:
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-line-600 rounded-xl bg-asphalt-950">
                {conductoresConEventos.map((c) => {
                  const isSelected = activeConductor?.conductorNombre === c.conductorNombre;
                  return (
                    <button
                      key={c.conductorNombre}
                      type="button"
                      onClick={() => setSelectedConductorNombre(c.conductorNombre)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-2 ${
                        isSelected
                          ? "bg-radar-cyan text-asphalt-950 font-bold shadow-sm"
                          : "bg-asphalt-900 text-paper-50 hover:bg-asphalt-800 border border-line-600"
                      }`}
                    >
                      <span>{c.conductorNombre}</span>
                      <span
                        className={`rounded px-1 text-[10px] ${
                          isSelected ? "bg-asphalt-950 text-radar-cyan" : "bg-asphalt-950 text-fog-400"
                        }`}
                      >
                        {c.placa} ({c.eventos.length} evts)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Previsualizador y Editor de Mensaje */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-paper-50">Mensaje Consolidado Formativo (Editable):</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] font-mono text-radar-cyan hover:underline flex items-center gap-1"
                >
                  {copied ? <Check size={12} className="text-ok-green" /> : <Copy size={12} />}
                  <span>{copied ? "¡Copiado!" : "Copiar texto"}</span>
                </button>
              </div>

              <textarea
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                rows={9}
                className="w-full rounded-xl border border-line-600 bg-asphalt-950 p-3.5 font-mono text-xs text-paper-50 focus:border-radar-cyan focus:outline-none leading-relaxed"
              />
            </div>

            {/* Destinatario y Botón de Envío */}
            <div className="rounded-xl border border-line-600 bg-asphalt-950 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="font-mono">
                <span className="text-fog-400">Teléfono destino: </span>
                <strong className={phoneFormatted ? "text-paper-50" : "text-signal-amber font-bold"}>
                  {activeConductor?.conductorTelefono || "No registrado (abrirá WhatsApp para elegir chat)"}
                </strong>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setSuccessMsg(`¡Balance diario enviado a ${activeConductor?.conductorNombre}!`);
                  setTimeout(() => setSuccessMsg(null), 2500);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-ok-green px-5 py-2.5 text-xs font-bold text-asphalt-950 hover:bg-ok-green/90 transition-all shadow-md active:scale-95"
              >
                <Smartphone size={15} />
                <span>Enviar Balance Diario por WhatsApp</span>
                <ExternalLink size={13} className="opacity-80" />
              </a>
            </div>

            {successMsg && (
              <div className="p-3 bg-ok-green-dim/30 border border-ok-green/40 rounded-xl text-ok-green text-xs font-mono flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
