"use client";

import { useState } from "react";
import {
  X,
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EventoGPS } from "@/lib/types/gps";
import { generarMensajeWhatsApp } from "@/lib/utils/gps-scoring";
import { marcarRetroalimentacionDb } from "@/lib/services/gps.service";

interface RetroalimentacionModalProps {
  evento: EventoGPS | null;
  isOpen: boolean;
  onClose: () => void;
  onFeedbackSent?: (refreshedEventos: EventoGPS[]) => void;
}

export function RetroalimentacionModal({
  evento,
  isOpen,
  onClose,
  onFeedbackSent,
}: RetroalimentacionModalProps) {
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  if (!isOpen || !evento) return null;

  const defaultMessage = generarMensajeWhatsApp(evento);
  const [editableMessage, setEditableMessage] = useState(defaultMessage);

  // Limpiar número de teléfono para wa.me (Colombia +57)
  const rawPhone = evento.conductorTelefono?.replace(/[^0-9]/g, "") || "";
  const phoneFormatted = rawPhone.length === 10 ? `57${rawPhone}` : rawPhone;
  const whatsappUrl = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(editableMessage)}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(editableMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = async () => {
    setIsSending(true);
    // Abrir WhatsApp en nueva pestaña
    window.open(whatsappUrl, "_blank");

    // Registrar trazabilidad en el ERP
    try {
      const res = await marcarRetroalimentacionDb(evento.id, "whatsapp");
      if (res.success && res.refreshedEventos && onFeedbackSent) {
        onFeedbackSent(res.refreshedEventos);
      }
      setSuccessStatus("¡Retroalimentación marcada como enviada vía WhatsApp!");
      setTimeout(() => {
        setSuccessStatus(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      const res = await marcarRetroalimentacionDb(evento.id, "correo");
      if (res.success && res.refreshedEventos && onFeedbackSent) {
        onFeedbackSent(res.refreshedEventos);
      }
      setSuccessStatus("¡Notificación formal enviada al correo del conductor!");
      setTimeout(() => {
        setSuccessStatus(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/85 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl animate-fadeIn">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-line-600 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-ok-green/40 bg-ok-green/10 text-ok-green">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50 leading-tight">
                Retroalimentación PESV al Conductor
              </h3>
              <p className="text-xs text-fog-400">
                Notificación pedagógica orientada a la seguridad vial y hábitos de manejo defensivo
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

        {/* Resumen del Evento */}
        <div className="mt-4 rounded-lg border border-line-600 bg-asphalt-950/70 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-fog-400 font-mono uppercase">Conductor Asignado:</span>
            <span className="font-semibold text-paper-50">{evento.conductorNombre || "Sin asignar"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fog-400 font-mono uppercase">Vehículo / Placa:</span>
            <span className="font-mono font-bold text-radar-cyan">{evento.placa}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fog-400 font-mono uppercase">Teléfono Contacto:</span>
            <span className="font-mono text-paper-50">{evento.conductorTelefono || "No registrado"}</span>
          </div>
          <div className="flex items-center justify-between border-t border-line-600/60 pt-1.5">
            <span className="text-fog-400 font-mono uppercase">Evento Satelcopro:</span>
            <span className="font-semibold text-signal-amber">{evento.descripcion}</span>
          </div>
        </div>

        {/* Mensaje Editable */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-mono text-fog-400 uppercase tracking-wider">
              Plantilla de Mensaje Pedagógico
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1 text-xs text-radar-cyan hover:underline"
            >
              {copied ? <Check size={13} className="text-ok-green" /> : <Copy size={13} />}
              <span>{copied ? "¡Copiado!" : "Copiar texto"}</span>
            </button>
          </div>
          <textarea
            rows={7}
            value={editableMessage}
            onChange={(e) => setEditableMessage(e.target.value)}
            className="w-full rounded-lg border border-line-500 bg-asphalt-950 p-3 font-mono text-xs text-paper-50 leading-relaxed focus:border-signal-amber focus:outline-none"
          />
        </div>

        {successStatus && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-ok-green/40 bg-ok-green-dim/40 p-3 text-xs text-ok-green">
            <CheckCircle2 size={16} />
            <span>{successStatus}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-600 pt-4">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSending}>
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            {evento.conductorEmail && (
              <Button
                variant="secondary"
                type="button"
                onClick={handleSendEmail}
                disabled={isSending}
              >
                <Mail size={16} />
                <span>Enviar por Correo</span>
              </Button>
            )}

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isSending || !evento.conductorTelefono}
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-asphalt-950 hover:bg-[#20bd5a] transition-all shadow-md active:scale-95 disabled:opacity-40"
            >
              <Smartphone size={16} />
              <span>Enviar por WhatsApp</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
