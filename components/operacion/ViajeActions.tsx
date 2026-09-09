"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Gauge, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { RegistrarNovedadModal } from "@/components/operacion/RegistrarNovedadModal";
import { finalizarViajeAction } from "@/lib/services/operacion.service";

export function ViajeActions({ viajeId }: { viajeId: string }) {
  const [isNovedadOpen, setIsNovedadOpen] = useState(false);
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);
  const [kmLlegada, setKmLlegada] = useState<string>("");
  const [horaLlegada, setHoraLlegada] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleFinalizarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const kmNum = kmLlegada ? parseFloat(kmLlegada) : undefined;
      await finalizarViajeAction(viajeId, kmNum, horaLlegada || undefined);
      setIsFinalizarOpen(false);
      window.location.reload();
    });
  };

  return (
    <>
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => setIsNovedadOpen(true)}
        >
          <AlertTriangle size={15} /> Registrar novedad
        </Button>
        <Button
          type="button"
          variant="primary"
          className="flex-1 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-700"
          onClick={() => {
            const now = new Date();
            setHoraLlegada(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
            setIsFinalizarOpen(true);
          }}
          disabled={isPending}
        >
          <CheckCircle2 size={15} /> Finalizar / Cerrar viaje
        </Button>
      </div>

      <RegistrarNovedadModal
        viajeId={viajeId}
        isOpen={isNovedadOpen}
        onClose={() => setIsNovedadOpen(false)}
      />

      {/* Modal de Finalización y Cierre de Odómetro */}
      {isFinalizarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Cierre Oficial de Viaje (PESV)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFinalizarOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFinalizarSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 flex items-center gap-1.5">
                  <Gauge size={14} className="text-slate-500" /> Kilometraje Final (Odómetro de Llegada)
                </label>
                <input
                  type="number"
                  placeholder="Ej: 145280"
                  value={kmLlegada}
                  onChange={(e) => setKmLlegada(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Registra el odómetro final para liquidar kilometraje real recorrido.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-500" /> Hora Real de Llegada
                </label>
                <input
                  type="time"
                  value={horaLlegada}
                  onChange={(e) => setHoraLlegada(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsFinalizarOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-700"
                  disabled={isPending}
                >
                  {isPending ? "Guardando..." : "Confirmar Cierre"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
