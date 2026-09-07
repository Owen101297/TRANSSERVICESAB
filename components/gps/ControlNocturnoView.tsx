"use client";

import { useState } from "react";
import {
  Moon,
  AlertTriangle,
  Send,
  Phone,
  Clock,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Share2,
  Info,
  Car,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { EventoGPS, TIPO_EVENTO_LABELS, PRIORIDAD_EVENTO_LABELS } from "@/lib/types/gps";
import { Card } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { generarMensajeAlertaNocturnaAdmin } from "@/lib/utils/gps-scoring";

interface ControlNocturnoViewProps {
  eventos: EventoGPS[];
  onRefresh?: () => void;
}

export function ControlNocturnoView({ eventos, onRefresh }: ControlNocturnoViewProps) {
  // Números de administración por defecto para Trans Services A&B
  const [admin1Phone, setAdmin1Phone] = useState("3136332887"); // Coordinación HSEQ / Operaciones
  const [admin1Name, setAdmin1Name] = useState("HSE / Operaciones");

  const [admin2Phone, setAdmin2Phone] = useState("3157582522"); // Gerencia / Supervisión
  const [admin2Name, setAdmin2Name] = useState("Gerencia / Supervisión");

  const [enviandoPlaca, setEnviandoPlaca] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ tipo: "ok" | "info"; msg: string } | null>(null);

  // Filtrar eventos ocurridos entre 22:00 (10:00 PM) y 05:00 AM
  const eventosNocturnos = eventos.filter((e) => {
    const date = new Date(e.fechaHora);
    const hour = date.getHours();
    return hour >= 22 || hour < 5;
  });

  // Agrupar por placa
  const agrupadoPorPlaca: Record<
    string,
    {
      placa: string;
      conductorNombre: string;
      conductorTelefono?: string;
      eventos: EventoGPS[];
      ultimoEvento: EventoGPS;
    }
  > = {};

  eventosNocturnos.forEach((e) => {
    if (!agrupadoPorPlaca[e.placa]) {
      agrupadoPorPlaca[e.placa] = {
        placa: e.placa,
        conductorNombre: e.conductorNombre || "Sin conductor asignado",
        conductorTelefono: e.conductorTelefono,
        eventos: [],
        ultimoEvento: e,
      };
    }
    agrupadoPorPlaca[e.placa].eventos.push(e);
  });

  const vehiculosNocturnos = Object.values(agrupadoPorPlaca);

  // Enviar a un número específico
  const handleEnviarWhatsAppAdmin = (
    phone: string,
    adminName: string,
    placa: string,
    conductorNombre: string,
    conductorTel: string | undefined,
    evts: EventoGPS[]
  ) => {
    const rawDigits = phone.replace(/[^0-9]/g, "");
    const cleanPhone = rawDigits.startsWith("57") ? rawDigits : `57${rawDigits}`;
    const mensaje = generarMensajeAlertaNocturnaAdmin(placa, conductorNombre, conductorTel, evts, adminName);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");

    setStatusMsg({
      tipo: "ok",
      msg: `Alerta nocturna generada para ${adminName} (${phone}) respecto al vehículo ${placa}.`,
    });
  };

  // Enviar a ambos administradores
  const handleDifusionAmbosAdmins = (
    placa: string,
    conductorNombre: string,
    conductorTel: string | undefined,
    evts: EventoGPS[]
  ) => {
    handleEnviarWhatsAppAdmin(admin1Phone, admin1Name, placa, conductorNombre, conductorTel, evts);
    setTimeout(() => {
      handleEnviarWhatsAppAdmin(admin2Phone, admin2Name, placa, conductorNombre, conductorTel, evts);
    }, 1200);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Banner Normativo de Seguridad */}
      <div className="rounded-xl border border-signal-amber/40 bg-signal-amber-dim/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-amber/20 border border-signal-amber/40 text-signal-amber">
              <Moon size={22} className="animate-pulse" />
            </span>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 flex items-center gap-2">
                Control de Movilidad y Toque de Queda Nocturno (&gt;10:00 PM)
              </h3>
              <p className="text-xs text-fog-400 mt-0.5 max-w-2xl">
                Directriz Operativa PESV: Ningún vehículo de la flota debe registrar encendido, desplazamiento o
                novedades después de las <strong>10:00 PM</strong> y antes de las <strong>05:00 AM</strong> sin
                autorización expresa de gerencia.
              </p>
            </div>
          </div>

          {/* Configuración de los 2 Números de Admin */}
          <div className="rounded-lg border border-line-600 bg-asphalt-950 p-2.5 space-y-1.5 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-radar-cyan font-semibold text-[11px]">
              <Share2 size={12} />
              <span>Destinatarios WhatsApp Admin:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-fog-400 block">Admin 1 (HSE):</label>
                <input
                  type="text"
                  value={admin1Phone}
                  onChange={(e) => setAdmin1Phone(e.target.value)}
                  className="w-full rounded border border-line-600 bg-asphalt-900 px-2 py-0.5 text-xs text-paper-50 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-fog-400 block">Admin 2 (Gerencia):</label>
                <input
                  type="text"
                  value={admin2Phone}
                  onChange={(e) => setAdmin2Phone(e.target.value)}
                  className="w-full rounded border border-line-600 bg-asphalt-900 px-2 py-0.5 text-xs text-paper-50 font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`rounded-lg px-3 py-2 text-xs font-mono flex items-center justify-between border ${
            statusMsg.tipo === "ok"
              ? "bg-ok-green-dim/20 border-ok-green/40 text-ok-green"
              : "bg-radar-cyan-dim/20 border-radar-cyan/40 text-radar-cyan"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} />
            <span>{statusMsg.msg}</span>
          </div>
          <button type="button" onClick={() => setStatusMsg(null)} className="text-fog-400 hover:text-paper-50 text-[10px]">
            ✕
          </button>
        </div>
      )}

      {/* Métricas de Novedades Nocturnas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-line-600 bg-asphalt-900 p-3 space-y-1">
          <span className="text-[11px] font-mono text-fog-400 flex items-center gap-1.5">
            <Car size={13} className="text-radar-cyan" />
            Vehículos con Actividad
          </span>
          <div className="text-2xl font-bold text-paper-50 font-[family-name:var(--font-display)]">
            {vehiculosNocturnos.length}
          </div>
          <span className="text-[10px] text-fog-400 font-mono">En horario restringido</span>
        </div>

        <div className="rounded-xl border border-alert-red/30 bg-alert-red-dim/10 p-3 space-y-1">
          <span className="text-[11px] font-mono text-alert-red flex items-center gap-1.5">
            <AlertTriangle size={13} />
            Total Eventos Detectados
          </span>
          <div className="text-2xl font-bold text-alert-red font-[family-name:var(--font-display)]">
            {eventosNocturnos.length}
          </div>
          <span className="text-[10px] text-fog-400 font-mono">Fuera de turno laboral</span>
        </div>

        <div className="rounded-xl border border-signal-amber/30 bg-signal-amber-dim/10 p-3 space-y-1">
          <span className="text-[11px] font-mono text-signal-amber flex items-center gap-1.5">
            <Clock size={13} />
            Franja de Restricción
          </span>
          <div className="text-base font-bold text-paper-50 font-mono mt-1">
            22:00 — 05:00
          </div>
          <span className="text-[10px] text-fog-400 font-mono">Toque de queda oficial</span>
        </div>
      </div>

      {/* Lista de Vehículos Infractores de Horario */}
      {vehiculosNocturnos.length === 0 ? (
        <div className="rounded-xl border border-ok-green/30 bg-ok-green-dim/10 p-8 text-center space-y-2">
          <CheckCircle2 size={24} className="text-ok-green mx-auto" />
          <h4 className="font-bold text-sm text-paper-50">
            Excelente: No se registra actividad vehicular nocturna no autorizada
          </h4>
          <p className="text-xs text-fog-400 max-w-md mx-auto">
            Todos los vehículos de la flota se encuentran en reposo o no han generado eventos en la franja de 10:00 PM a
            5:00 AM para el lote consultado.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-fog-400 border-b border-line-600/70 pb-2">
            <span>Vehículos detectados en movimiento nocturno ({vehiculosNocturnos.length}):</span>
            <span className="text-signal-amber font-semibold">⚠️ Requieren verificación administrativa</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {vehiculosNocturnos.map((item) => {
              const ultEvt = item.ultimoEvento;
              const dateStr = new Date(ultEvt.fechaHora).toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              return (
                <Card key={item.placa} className="space-y-3 border-signal-amber/40 bg-asphalt-900/90">
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-2 border-b border-line-600/70 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <PlateTag plate={item.placa} />
                      <div>
                        <h4 className="font-bold text-sm text-paper-50">{item.conductorNombre}</h4>
                        {item.conductorTelefono ? (
                          <span className="text-[11px] font-mono text-fog-400">Tel: {item.conductorTelefono}</span>
                        ) : (
                          <span className="text-[10px] font-mono text-fog-400/60 italic">Sin teléfono registrado</span>
                        )}
                      </div>
                    </div>

                    <span className="rounded-full bg-alert-red-dim text-alert-red font-mono text-[10px] font-bold px-2 py-0.5 border border-alert-red/30 flex items-center gap-1">
                      <Moon size={11} /> {item.eventos.length} Novedades
                    </span>
                  </div>

                  {/* Resumen del Último Evento */}
                  <div className="rounded-lg bg-asphalt-950 p-2.5 text-xs font-mono space-y-1.5 text-fog-400">
                    <div className="flex justify-between items-center">
                      <span className="text-fog-400">Última novedad detectada:</span>
                      <span className="text-paper-50 font-bold">
                        {TIPO_EVENTO_LABELS[ultEvt.tipoEvento]?.label || ultEvt.tipoEvento}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-fog-400">Hora del reporte:</span>
                      <span className="text-alert-red font-bold">{dateStr}</span>
                    </div>

                    {ultEvt.velocidad !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-fog-400">Velocidad registrada:</span>
                        <span className="text-paper-50 font-bold">{ultEvt.velocidad} km/h</span>
                      </div>
                    )}

                    {ultEvt.ubicacion && (
                      <div className="flex items-start gap-1 pt-0.5 text-[11px] text-fog-400">
                        <MapPin size={12} className="shrink-0 text-radar-cyan mt-0.5" />
                        <span className="truncate">{ultEvt.ubicacion}</span>
                      </div>
                    )}
                  </div>

                  {/* Historial Cronológico Compacto del Vehículo en la Noche */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-fog-400 uppercase tracking-wider block">
                      Línea de tiempo nocturna ({item.eventos.length}):
                    </span>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {item.eventos.map((evt, idx) => {
                        const hStr = new Date(evt.fechaHora).toLocaleTimeString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const tipoLbl = TIPO_EVENTO_LABELS[evt.tipoEvento]?.label || evt.tipoEvento;
                        return (
                          <div
                            key={evt.id || idx}
                            className="flex items-center justify-between rounded bg-asphalt-950/60 px-2 py-1 text-[11px] font-mono"
                          >
                            <div className="flex items-center gap-1.5 text-paper-50">
                              <span className="text-fog-400">{hStr}</span>
                              <span>—</span>
                              <span className="font-semibold">{tipoLbl}</span>
                            </div>
                            {evt.velocidad !== undefined && (
                              <span className="text-signal-amber font-bold">{evt.velocidad} km/h</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Botones de Notificación a los 2 Administradores */}
                  <div className="pt-2 border-t border-line-600/70 space-y-1.5">
                    <div className="text-[10px] font-mono text-radar-cyan font-semibold flex items-center gap-1">
                      <Send size={11} />
                      <span>Despachar Alerta a WhatsApp de Administradores:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleEnviarWhatsAppAdmin(
                            admin1Phone,
                            admin1Name,
                            item.placa,
                            item.conductorNombre,
                            item.conductorTelefono,
                            item.eventos
                          )
                        }
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-line-500 bg-asphalt-800 hover:bg-radar-cyan/15 hover:border-radar-cyan/40 px-2.5 py-1.5 text-xs font-semibold text-paper-50 hover:text-radar-cyan transition-colors active:scale-95"
                        title={`Enviar reporte nocturno a ${admin1Name} (${admin1Phone})`}
                      >
                        <Send size={12} className="text-radar-cyan" />
                        <span>Admin 1 ({admin1Name})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleEnviarWhatsAppAdmin(
                            admin2Phone,
                            admin2Name,
                            item.placa,
                            item.conductorNombre,
                            item.conductorTelefono,
                            item.eventos
                          )
                        }
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-line-500 bg-asphalt-800 hover:bg-signal-amber/15 hover:border-signal-amber/40 px-2.5 py-1.5 text-xs font-semibold text-paper-50 hover:text-signal-amber transition-colors active:scale-95"
                        title={`Enviar reporte nocturno a ${admin2Name} (${admin2Phone})`}
                      >
                        <Send size={12} className="text-signal-amber" />
                        <span>Admin 2 ({admin2Name})</span>
                      </button>
                    </div>

                    {/* Botón de Difusión Simultánea a Ambos Administradores */}
                    <button
                      type="button"
                      onClick={() =>
                        handleDifusionAmbosAdmins(
                          item.placa,
                          item.conductorNombre,
                          item.conductorTelefono,
                          item.eventos
                        )
                      }
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-alert-red hover:bg-alert-red/90 text-white font-bold text-xs py-1.5 transition-colors active:scale-95 shadow-sm"
                    >
                      <Share2 size={13} />
                      <span>🚨 Notificar a Ambos Administradores (Difusión)</span>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
