"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { getAsignacionActiva } from "@/lib/data/asignaciones";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlateTag } from "@/components/ui/PlateTag";
import { DocUploadSlot } from "@/components/ui/DocUploadSlot";

const CONDUCTOR_ID = "p1";

const ITEMS_CHECKLIST = [
  "Llantas y presión de aire",
  "Frenos",
  "Luces delanteras y traseras",
  "Espejos",
  "Cinturones de seguridad",
  "Extintor vigente",
  "Botiquín completo",
  "Niveles de aceite y agua",
  "Documentos del vehículo",
  "Kit de carretera",
];

export default function PreoperacionalPage() {
  const asignacion = getAsignacionActiva(CONDUCTOR_ID);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hallazgoDetectado, setHallazgoDetectado] = useState(false);
  const [descripcionHallazgo, setDescripcionHallazgo] = useState("");
  const [enviado, setEnviado] = useState(false);

  const toggle = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const todosMarcados = ITEMS_CHECKLIST.every((i) => checked[i]);

  return (
    <div className="space-y-4">
      <Link
        href="/portal-conductor"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
          Preoperacional
        </h1>
        {asignacion && <PlateTag plate={asignacion.placa} />}
      </div>

      {!enviado ? (
        <>
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-line-600">
              {ITEMS_CHECKLIST.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-sm text-mist-200">{item}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        checked[item]
                          ? "border-ok-green bg-ok-green text-asphalt-950"
                          : "border-line-600"
                      }`}
                    >
                      {checked[item] && <Check size={13} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <label className="flex items-center gap-2 text-sm text-mist-200">
              <input
                type="checkbox"
                checked={hallazgoDetectado}
                onChange={(e) => setHallazgoDetectado(e.target.checked)}
                className="accent-signal-amber"
              />
              Se detectó un hallazgo durante la inspección
            </label>

            {hallazgoDetectado && (
              <div className="mt-3 space-y-3">
                <textarea
                  rows={3}
                  placeholder="Describe el hallazgo..."
                  value={descripcionHallazgo}
                  onChange={(e) => setDescripcionHallazgo(e.target.value)}
                  className="w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none"
                />
                <DocUploadSlot />
              </div>
            )}
          </Card>

          <Button
            variant="primary"
            className="w-full"
            disabled={!todosMarcados}
            onClick={() => setEnviado(true)}
          >
            {todosMarcados ? "Enviar preoperacional" : "Marca todos los ítems para continuar"}
          </Button>
        </>
      ) : (
        <Card className="text-center">
          <Check size={28} className="mx-auto text-ok-green" />
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
            Preoperacional enviado
          </h2>
          <p className="mt-1 text-sm text-fog-400">
            {hallazgoDetectado
              ? "Se creó un hallazgo en HSEQ y se notificó al responsable."
              : "Sin novedades — quedó registrado en el historial."}
          </p>
          <p className="mt-3 text-xs text-fog-400">
            (Simulado — falta conectar el backend para persistir y disparar la
            notificación real.)
          </p>
        </Card>
      )}
    </div>
  );
}
