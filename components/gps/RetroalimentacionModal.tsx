"use client";

import { useState, useEffect } from "react";
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
  Loader2,
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
  const [editableMessage, setEditableMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  // Sincronizar plantilla dinámica cada vez que cambia el evento o se abre el modal
  useEffect(() => {
    if (evento && isOpen) {
      setEditableMessage(generarMensajeWhatsApp(evento));
      setSuccessStatus(null);
    }
  }, [evento, isOpen]);

  if (!isOpen || !evento) return null;

  // Formatear número de teléfono para WhatsApp (Colombia +57)
  const rawPhone = evento.conductorTelefono?.replace(/[^0-9]/g, "") || "";
  let phoneFormatted = "";
  if (rawPhone.length === 10) {
    phoneFormatted = `57${rawPhone}`;
  } else if (rawPhone.length === 12 && rawPhone.startsWith("57")) {
    phoneFormatted = rawPhone;
  }

  // Generar URL directa de WhatsApp
  const whatsappUrl = phoneFormatted
    ? `https://api.whatsapp.com/send?phone=${phoneFormatted}&text=${encodeURIComponent(editableMessage)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(editableMessage)}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(editableMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarcarEnviado = async () => {
    setIsSending(true);
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
        <div className="mt-4 rounded-lg border border-line-600 bg-asphalt-950 p-3 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-600/60 pb-2">
            <div>
              <span className="text-fog-400">Conductor:</span>{" "}
              <strong className="text-paper-50 font-semibold">{evento.conductorNombre || "Sin asignar"}</strong>
            </div>
            <div>
              <span className="text-fog-400">Placa:</span>{" "}
              <strong className="text-radar-cyan font-mono">{evento.placa}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="text-fog-400">
              Teléfono:{" "}
              <span className={evento.conductorTelefono ? "text-paper-50 font-semibold" : "text-signal-amber font-bold"}>
                {evento.conductorTelefono || "No registrado (abrirá WhatsApp para elegir chat)"}
              </span>
            </div>
            <div className="text-fog-400">
              Severidad: <span className="text-signal-amber uppercase font-semibold">{evento.prioridad}</span>
            </div>
          </div>
        </div>

        {/* Editor / Previsualizador de Plantilla WhatsApp */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-paper-50 flex items-center gap-1.5">
              <span>Plantilla de Mensaje WhatsApp (Editable):</span>
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1 text-[11px] text-radar-cyan hover:underline font-mono"
            >
              {copied ? <Check size={12} className="text-ok-green" /> : <Copy size={12} />}
              <span>{copied ? "¡Copiado!" : "Copiar texto"}</span>
            </button>
          </div>

          <textarea
            value={editableMessage}
            onChange={(e) => setEditableMessage(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-line-600 bg-asphalt-950 p-3 font-mono text-xs text-paper-50 focus:border-ok-green focus:outline-none leading-relaxed"
          />
        </div>

        {successStatus && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-ok-green/40 bg-ok-green-dim/40 p-3 text-xs text-ok-green">
            <CheckCircle2 size={16} />
            <span>{successStatus}</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line-600 pt-4">
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSending}>
            Cancelar
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {evento.conductorEmail && (
              <Button
                variant="secondary"
                type="button"
                onClick={handleSendEmail}
                disabled={isSending}
              >
                <Mail size={15} />
                <span>Enviar por Correo</span>
              </Button>
            )}

            {/* Enlace Nativo Directo a WhatsApp sin bloqueo de popup */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleMarcarEnviado}
              className="inline-flex items-center gap-2 rounded-lg bg-ok-green px-4 py-2 text-xs font-bold text-asphalt-950 hover:bg-ok-green/90 transition-all shadow-md active:scale-95"
            >
              <Smartphone size={15} />
              <span>Enviar por WhatsApp</span>
              <ExternalLink size={13} className="opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
