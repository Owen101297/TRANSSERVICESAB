"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";

const TIPO_OPTIONS = [
  { value: "sg-sst", label: "SG-SST" },
  { value: "pesv", label: "PESV" },
  { value: "hseq", label: "HSEQ" },
  { value: "operativa", label: "Operativa" },
];

export default function NuevaCapacitacionPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/capacitaciones"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Capacitaciones
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Programar capacitación
        </h1>
      </div>

      <Card>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <FormSection title="Información general">
            <TextField
              label="Nombre"
              name="nombre"
              required
              placeholder="Ej. Manejo defensivo"
              wrapperClassName="sm:col-span-2"
            />
            <SelectField label="Tipo" name="tipo" required options={TIPO_OPTIONS} />
            <TextField label="Duración (horas)" name="duracionHoras" type="number" required />
          </FormSection>

          <FormSection title="Programación">
            <TextField label="Fecha y hora" name="fecha" type="datetime-local" required />
            <TextField
              label="Asistentes esperados"
              name="asistentesEsperados"
              type="number"
              required
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary">
              Guardar
            </Button>
            <Link href="/capacitaciones">
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
          </div>

          {submitted && (
            <p className="text-sm text-radar-cyan">
              Formulario validado. Falta conectar el backend para persistir el registro.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
