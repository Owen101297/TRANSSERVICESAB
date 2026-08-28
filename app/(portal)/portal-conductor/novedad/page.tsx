"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/FormField";

const TIPO_OPTIONS = [
  { value: "mecanica", label: "Falla mecánica" },
  { value: "vial", label: "Condición de la vía" },
  { value: "seguridad", label: "Seguridad / comportamiento en la vía" },
  { value: "otro", label: "Otro" },
];

export default function NovedadPage() {
  const [enviado, setEnviado] = useState(false);

  if (enviado) {
    return (
      <div className="space-y-4">
        <Card className="text-center">
          <Check size={28} className="mx-auto text-ok-green" />
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
            Novedad reportada
          </h2>
          <p className="mt-1 text-sm text-fog-400">
            Se notificó al supervisor y quedó registrada en el viaje/asignación activa.
          </p>
          <Link href="/portal-conductor">
            <Button variant="secondary" className="mt-4">
              Volver al inicio
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/portal-conductor"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver
      </Link>

      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
        Reportar novedad
      </h1>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setEnviado(true);
          }}
        >
          <SelectField label="Tipo de novedad" name="tipo" required options={TIPO_OPTIONS} />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fog-400">
              Descripción
            </label>
            <textarea
              rows={4}
              required
              placeholder="¿Qué pasó?"
              className="w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">
            Enviar novedad
          </Button>
        </form>
      </Card>
    </div>
  );
}
