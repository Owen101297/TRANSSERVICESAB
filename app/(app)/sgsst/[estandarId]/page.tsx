"use client";

import { useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEstandarById } from "@/lib/data/sgsst-estandares";
import { getItemsPorEstandar } from "@/lib/data/sgsst-items";
import { CICLO_LABELS, ESTADO_ITEM_LABELS, EstadoItemSGSST, ItemSGSST } from "@/lib/types/sgsst";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocUploadSlot } from "@/components/ui/DocUploadSlot";

const ESTADO_TO_STATUS: Record<EstadoItemSGSST, "activo" | "pendiente" | "critico" | "cerrado" | "info"> = {
  cumple: "activo",
  cumple_parcial: "pendiente",
  no_cumple: "critico",
  no_aplica: "cerrado",
  pendiente: "info",
};

const ESTADO_OPTIONS: EstadoItemSGSST[] = [
  "pendiente",
  "cumple",
  "cumple_parcial",
  "no_cumple",
  "no_aplica",
];

export default function EstandarDetailPage({
  params,
}: {
  params: Promise<{ estandarId: string }>;
}) {
  const { estandarId } = use(params);
  const estandar = getEstandarById(estandarId);
  const itemsIniciales = getItemsPorEstandar(estandarId);

  const [items, setItems] = useState<ItemSGSST[]>(itemsIniciales);

  if (!estandar) notFound();

  const updateEstado = (id: string, estado: EstadoItemSGSST) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, estado } : i)));
  };

  return (
    <div className="space-y-6">
      <Link
        href="/sgsst"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a SG-SST
      </Link>

      <div>
        <p className="font-mono text-xs text-fog-400">
          Estándar {estandar.numero} · {CICLO_LABELS[estandar.ciclo]} · {estandar.pesoPorcentual}% del sistema
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          {estandar.nombre}
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Sube el documento real de cada ítem y actualiza su estado de cumplimiento.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-line-600">
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:gap-4">
              <span className="font-[family-name:var(--font-mono)] text-xs text-fog-400">
                {item.numeral}
              </span>
              <span className="text-sm text-paper-50">{item.nombre}</span>
              <div className="w-44">
                <DocUploadSlot existingFileName={item.documentoNombre} />
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={ESTADO_TO_STATUS[item.estado]}>
                  {ESTADO_ITEM_LABELS[item.estado]}
                </StatusBadge>
                <select
                  value={item.estado}
                  onChange={(e) => updateEstado(item.id, e.target.value as EstadoItemSGSST)}
                  className="rounded-md border border-line-600 bg-asphalt-800 px-2 py-1.5 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none"
                >
                  {ESTADO_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {ESTADO_ITEM_LABELS[opt]}
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
        redacción oficial de cada ítem contra el texto de la Resolución 0312
        de 2019 antes de usar esto en una autoevaluación formal.
      </p>
    </div>
  );
}
