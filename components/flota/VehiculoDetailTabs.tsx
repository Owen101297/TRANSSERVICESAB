"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  UserCheck,
  Wrench,
  Radio,
  Clock,
  ShieldAlert,
  MapPin,
  ExternalLink,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { Vehiculo } from "@/lib/types/vehiculo";
import { EventoGPS } from "@/lib/types/gps";
import { ExpedienteVehiculoDigital } from "@/components/flota/ExpedienteVehiculoDigital";
import { Card } from "@/components/ui/Card";
import { PlateTag } from "@/components/ui/PlateTag";
import { Avatar } from "@/components/ui/Avatar";

interface VehiculoDetailTabsProps {
  vehiculo: Vehiculo;
  adjuntosIniciales: any[];
  asignacionActiva?: any;
  eventosGps: EventoGPS[];
}

type TabType = "expediente" | "conductor" | "mantenimiento" | "telemetria";

export function VehiculoDetailTabs({
  vehiculo,
  adjuntosIniciales,
  asignacionActiva,
  eventosGps,
}: VehiculoDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("expediente");

  return (
    <div className="space-y-6">
      {/* Navegación por Pestañas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line-600 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("expediente")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "expediente"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <FileText size={16} className={activeTab === "expediente" ? "text-signal-amber" : ""} />
          <span>Expediente Digital</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conductor")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "conductor"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <UserCheck size={16} className={activeTab === "conductor" ? "text-radar-cyan" : ""} />
          <span>Conductor Asignado</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("mantenimiento")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "mantenimiento"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Wrench size={16} className={activeTab === "mantenimiento" ? "text-signal-amber" : ""} />
          <span>Mantenimiento &amp; Preoperacional</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("telemetria")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "telemetria"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Radio size={16} className={activeTab === "telemetria" ? "text-ok-green" : ""} />
          <span>Telemetría GPS (Satelcopro)</span>
          {eventosGps.length > 0 && (
            <span className="ml-1 rounded-full bg-asphalt-950 px-2 py-0.2 text-xs font-mono text-fog-400 border border-line-600">
              {eventosGps.length}
            </span>
          )}
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div>
        {activeTab === "expediente" && (
          <ExpedienteVehiculoDigital
            vehiculo={vehiculo}
            adjuntosIniciales={adjuntosIniciales}
          />
        )}

        {activeTab === "conductor" && (
          <div className="space-y-4">
            {asignacionActiva ? (
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-line-600 pb-3">
                  <h4 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                    Conductor Titular en Operación
                  </h4>
                  <span className="rounded bg-ok-green-dim px-2 py-0.5 text-xs font-mono text-ok-green border border-ok-green/30">
                    Asignación Activa
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <Avatar initials={asignacionActiva.conductorNombre?.slice(0, 2) || "CD"} size="lg" />
                  <div>
                    <h5 className="font-semibold text-paper-50 text-base">
                      {asignacionActiva.conductorNombre}
                    </h5>
                    <p className="text-xs font-mono text-fog-400">
                      C.C. {asignacionActiva.conductorDocumento || "N/A"} · Turno: {asignacionActiva.turno || "Completo"}
                    </p>
                    <p className="text-xs text-fog-400 mt-1">
                      Fecha de Asignación: {new Date(asignacionActiva.fechaInicio || Date.now()).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                </div>

                <div className="border-t border-line-600 pt-3 flex justify-end">
                  <Link
                    href={`/personas/${asignacionActiva.conductorId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-radar-cyan hover:underline font-mono"
                  >
                    <span>Ver Expediente del Conductor</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </Card>
            ) : (
              <div className="rounded-xl border border-line-600 bg-asphalt-900 p-8 text-center space-y-3">
                <UserCheck size={32} className="text-fog-400 mx-auto" />
                <h4 className="font-semibold text-paper-50 text-sm">Sin Conductor Asignado</h4>
                <p className="text-xs text-fog-400 max-w-sm mx-auto">
                  Este vehículo no tiene actualmente un conductor asignado en el módulo de Asignaciones.
                </p>
                <Link
                  href="/asignaciones/nueva"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-signal-amber px-3 py-1.5 text-xs font-semibold text-asphalt-950 hover:bg-signal-amber/90 transition-all shadow-md"
                >
                  <span>Asignar Conductor Ahora</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === "mantenimiento" && (
          <div className="space-y-4">
            <Card className="space-y-3">
              <h4 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                Plan de Mantenimiento Preventivo (PESV)
              </h4>
              <p className="text-xs text-fog-400">
                Registro y control de inspecciones periódicas de frenos, suspensión, fluidos y llantas.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="rounded-lg border border-line-600 bg-asphalt-950 p-3 text-center">
                  <p className="text-[10px] text-fog-400 font-mono uppercase">Última Revisión</p>
                  <p className="font-mono text-sm font-bold text-paper-50">Hace 18 días</p>
                </div>
                <div className="rounded-lg border border-line-600 bg-asphalt-950 p-3 text-center">
                  <p className="text-[10px] text-fog-400 font-mono uppercase">Próximo Mantenimiento</p>
                  <p className="font-mono text-sm font-bold text-signal-amber">En 42 días</p>
                </div>
                <div className="rounded-lg border border-line-600 bg-asphalt-950 p-3 text-center">
                  <p className="text-[10px] text-fog-400 font-mono uppercase">Estado de Inspección</p>
                  <p className="font-mono text-sm font-bold text-ok-green">Conforme</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "telemetria" && (
          <div className="space-y-4">
            {eventosGps.length > 0 ? (
              <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-line-600">
                  <h4 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                    Novedades de Telemetría Registradas en {vehiculo.placa}
                  </h4>
                  <p className="text-xs text-fog-400">
                    Eventos de velocidad, frenado y motor transmitidos por Satelcopro / n8n
                  </p>
                </div>

                <div className="divide-y divide-line-600/70">
                  {eventosGps.map((e) => (
                    <div key={e.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-asphalt-800/40 transition-colors">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-paper-50">{e.descripcion}</p>
                        <p className="text-[10px] font-mono text-fog-400">
                          {new Date(e.fechaHora).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })} · {e.ubicacion || "En ruta"}
                        </p>
                      </div>

                      <span className="rounded px-2 py-0.5 text-[10px] font-mono font-semibold border bg-signal-amber-dim text-signal-amber border-signal-amber/30">
                        {e.prioridad.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <div className="rounded-xl border border-line-600 bg-asphalt-900 p-8 text-center space-y-2">
                <Radio size={28} className="text-fog-400 mx-auto" />
                <h4 className="font-semibold text-paper-50 text-sm">Sin Novedades Críticas de GPS</h4>
                <p className="text-xs text-fog-400">
                  Este vehículo no presenta eventos de exceso de velocidad ni frenadas bruscas registradas recientemente.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
