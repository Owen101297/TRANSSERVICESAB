"use client";

import { useState, useEffect, useTransition } from "react";
import { X, CheckCircle2, UserCheck, AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getPersonasDb } from "@/lib/services/personas.service";
import { tomarAsistenciaCapacitacionAction } from "@/lib/services/capacitaciones.service";
import { EstadoAsistencia } from "@/lib/types/asistencia";
import { Capacitacion } from "@/lib/types/capacitacion";
import { Persona } from "@/lib/types/persona";

interface TomarAsistenciaModalProps {
  capacitacion: Capacitacion;
  isOpen: boolean;
  onClose: () => void;
}

export function TomarAsistenciaModal({
  capacitacion,
  isOpen,
  onClose,
}: TomarAsistenciaModalProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [asistenciaMap, setAsistenciaMap] = useState<Record<string, EstadoAsistencia>>({});
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getPersonasDb().then((data) => {
        setPersonas(data || []);
        const initialMap: Record<string, EstadoAsistencia> = {};
        data?.forEach((p) => {
          initialMap[p.id] = "presente";
        });
        setAsistenciaMap(initialMap);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEstadoChange = (personaId: string, estado: EstadoAsistencia) => {
    setAsistenciaMap((prev) => ({ ...prev, [personaId]: estado }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const payload = personas.map((p) => ({
      personaId: p.id,
      personaNombre: `${p.nombres} ${p.apellidos}`,
      estado: asistenciaMap[p.id] || "presente",
    }));

    startTransition(async () => {
      const res = await tomarAsistenciaCapacitacionAction(capacitacion.id, payload);
      if (res.success) {
        onClose();
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Ocurrió un error al registrar la asistencia.");
      }
    });
  };

  const totalPresentes = Object.values(asistenciaMap).filter((e) => e === "presente" || e === "tardanza").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/80 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line-600 pb-4">
          <div className="flex items-center gap-2">
            <UserCheck size={20} className="text-radar-cyan" />
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
                Toma de Asistencia y Firmas
              </h2>
              <p className="text-xs text-fog-400">{capacitacion.nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-alert-red/30 bg-alert-red-dim/40 p-3 text-xs text-alert-red">
            <AlertCircle size={15} />
            {errorMsg}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between rounded-lg border border-line-600 bg-asphalt-800/60 px-4 py-2.5 text-sm">
          <span className="text-fog-400">Asistencia calculada:</span>
          <span className="font-mono font-medium text-radar-cyan">
            {totalPresentes} de {personas.length} presentes ({personas.length > 0 ? Math.round((totalPresentes / personas.length) * 100) : 0}%)
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {personas.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-line-600 bg-asphalt-800 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-paper-50">
                    {p.nombres} {p.apellidos}
                  </p>
                  <p className="text-[11px] text-fog-400 font-mono">
                    {p.perfiles?.join(", ") || "General"} · {p.numeroDocumento}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEstadoChange(p.id, "presente")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      asistenciaMap[p.id] === "presente"
                        ? "bg-ok-green/20 text-ok-green border border-ok-green/40"
                        : "bg-asphalt-700 text-fog-400 hover:text-paper-50"
                    }`}
                  >
                    Presente
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEstadoChange(p.id, "tardanza")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      asistenciaMap[p.id] === "tardanza"
                        ? "bg-signal-amber/20 text-signal-amber border border-signal-amber/40"
                        : "bg-asphalt-700 text-fog-400 hover:text-paper-50"
                    }`}
                  >
                    Tardanza
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEstadoChange(p.id, "ausente")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      asistenciaMap[p.id] === "ausente"
                        ? "bg-alert-red/20 text-alert-red border border-alert-red/40"
                        : "bg-asphalt-700 text-fog-400 hover:text-paper-50"
                    }`}
                  >
                    Ausente
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line-600">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={15} /> {isPending ? "Guardando..." : "Registrar acta y completar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
