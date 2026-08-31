"use client";

import { useState, useEffect, useTransition, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEstandarById } from "@/lib/data/sgsst-estandares";
import { getItemsPorEstandarDb, updateItemSgsstAction } from "@/lib/services/sgsst.service";
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
  const [items, setItems] = useState<ItemSGSST[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getItemsPorEstandarDb(estandarId).then((data) => setItems(data || []));
  }, [estandarId]);

  if (!estandar) notFound();

  const handleUpdateEstado = (id: string, nuevoEstado: EstadoItemSGSST) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, estado: nuevoEstado } : i)));
    startTransition(async () => {
      await updateItemSgsstAction(id, nuevoEstado);
    });
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
                  disabled={isPending}
                  onChange={(e) => handleUpdateEstado(item.id, e.target.value as EstadoItemSGSST)}
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
        Cumplimiento normativo Resolución 0312 de 2019 / Decreto 1072 de 2015.
      </p>
    </div>
  );
}

