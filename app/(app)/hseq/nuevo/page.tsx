"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { SEED_VEHICULOS } from "@/lib/data/vehiculos";

const ORIGEN_OPTIONS = [
  { value: "preoperacional", label: "Preoperacional" },
  { value: "inspeccion", label: "Inspección" },
  { value: "incidente", label: "Incidente" },
  { value: "accidente", label: "Accidente" },
];

const SEVERIDAD_OPTIONS = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

export default function NuevoHallazgoPage() {
  const [submitted, setSubmitted] = useState(false);

  const vehiculoOptions = useMemo(
    () => SEED_VEHICULOS.map((v) => ({ value: v.id, label: `${v.placa} — ${v.marca} ${v.modelo}` })),
    []
  );

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/hseq"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a HSEQ
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Reportar hallazgo
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Al guardar, se notifica al responsable y se crea una tarea de seguimiento.
        </p>
      </div>

      <Card>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <FormSection title="Descripción">
            <TextField
              label="Título"
              name="titulo"
              required
              placeholder="Ej. Fuga de aceite en motor"
              wrapperClassName="sm:col-span-2"
            />
            <textarea
              name="descripcion"
              rows={3}
              required
              placeholder="Describe el hallazgo con el mayor detalle posible..."
              className="sm:col-span-2 w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none focus:ring-1 focus:ring-radar-cyan"
            />
          </FormSection>

          <FormSection title="Clasificación">
            <SelectField label="Origen" name="origen" required options={ORIGEN_OPTIONS} />
            <SelectField label="Severidad" name="severidad" required options={SEVERIDAD_OPTIONS} />
          </FormSection>

          <FormSection title="Vehículo relacionado" description="Opcional.">
            <SelectField
              label="Vehículo"
              name="vehiculoId"
              options={vehiculoOptions}
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <FormSection title="Responsable">
            <TextField
              label="Responsable de seguimiento"
              name="responsable"
              required
              placeholder="Nombre del responsable HSEQ"
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary">
              Guardar hallazgo
            </Button>
            <Link href="/hseq">
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
          </div>

          {submitted && (
            <p className="text-sm text-radar-cyan">
              Formulario validado. Falta conectar el backend para persistir el
              registro y disparar la notificación real — por ahora esto queda
              solo en el frontend.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
