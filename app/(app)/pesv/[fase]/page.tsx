"use client";

import { useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPasosPorFase } from "@/lib/data/pesv-pasos";
import {
  ESTADO_PASO_LABELS,
  EstadoPasoPESV,
  FASE_LABELS,
  FasePESV,
  NIVEL_LABELS,
  PasoPESV,
} from "@/lib/types/pesv";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocUploadSlot } from "@/components/ui/DocUploadSlot";

const ESTADO_TO_STATUS: Record<EstadoPasoPESV, "activo" | "pendiente" | "critico" | "cerrado" | "info"> = {
  cumple: "activo",
  cumple_parcial: "pendiente",
  no_cumple: "critico",
  no_aplica: "cerrado",
  pendiente: "info",
};

const ESTADO_OPTIONS: EstadoPasoPESV[] = [
  "pendiente",
  "cumple",
  "cumple_parcial",
  "no_cumple",
  "no_aplica",
];

const FASES_VALIDAS: FasePESV[] = ["planificacion", "implementacion", "seguimiento", "mejora"];

export default function FaseDetailPage({
  params,
}: {
  params: Promise<{ fase: string }>;
}) {
  const { fase } = use(params);

  if (!FASES_VALIDAS.includes(fase as FasePESV)) notFound();
  const faseTyped = fase as FasePESV;

  const [pasos, setPasos] = useState<PasoPESV[]>(getPasosPorFase(faseTyped));

  const updateEstado = (id: string, estado: EstadoPasoPESV) => {
    setPasos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
  };

  return (
    <div className="space-y-6">
      <Link
        href="/pesv"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a PESV
      </Link>

      <div>
        <p className="font-mono text-xs text-fog-400">Fase · PESV</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          {FASE_LABELS[faseTyped]}
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Sube el documento real de cada paso y actualiza su estado de cumplimiento.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-line-600">
          {pasos.map((paso) => (
            <div
              key={paso.id}
              className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:gap-4"
            >
              <span className="font-[family-name:var(--font-mono)] text-xs text-fog-400">
                Paso {paso.numero}
              </span>
              <div>
                <p className="text-sm text-paper-50">{paso.nombre}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {paso.aplicaNiveles.map((n) => (
                    <span
                      key={n}
                      className="rounded border border-line-600 bg-asphalt-800 px-1.5 py-0.5 text-[10px] text-fog-400"
                    >
                      {NIVEL_LABELS[n]}
                    </span>
                  ))}
                </div>
                {paso.observaciones && (
                  <p className="mt-1 text-xs text-radar-cyan">{paso.observaciones}</p>
                )}
              </div>
              <div className="w-44">
                <DocUploadSlot existingFileName={paso.documentoNombre} />
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={ESTADO_TO_STATUS[paso.estado]}>
                  {ESTADO_PASO_LABELS[paso.estado]}
                </StatusBadge>
                <select
                  value={paso.estado}
                  onChange={(e) => updateEstado(paso.id, e.target.value as EstadoPasoPESV)}
                  className="rounded-md border border-line-600 bg-asphalt-800 px-2 py-1.5 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none"
                >
                  {ESTADO_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {ESTADO_PASO_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-fog-400">
        Los cambios de esta pantalla no se guardan todavía — falta conectar el
        backend para persistir estado y documentos. Verifica siempre la
        redacción y numeración oficial contra el texto de la Resolución 40595
        de 2022 antes de reportar en VIGIA2.
      </p>
    </div>
  );
}
