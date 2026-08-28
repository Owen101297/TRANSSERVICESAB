"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";

const TIPO_OPTIONS = [
  { value: "satisfaccion", label: "Satisfacción" },
  { value: "clima", label: "Clima laboral" },
  { value: "seguridad_vial", label: "Seguridad vial" },
  { value: "sg-sst", label: "SG-SST" },
];

export default function NuevaEncuestaPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/encuestas"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Encuestas
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Nueva encuesta
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
              label="Título"
              name="titulo"
              required
              placeholder="Ej. Percepción de riesgos viales"
              wrapperClassName="sm:col-span-2"
            />
            <SelectField label="Tipo" name="tipo" required options={TIPO_OPTIONS} />
            <TextField
              label="Destinatarios esperados"
              name="destinatariosEsperados"
              type="number"
              required
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary">
              Crear encuesta
            </Button>
            <Link href="/encuestas">
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
