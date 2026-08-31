"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { createEncuestaAction } from "@/lib/services/capacitaciones.service";

const TIPO_OPTIONS = [
  { value: "satisfaccion", label: "Satisfacción del cliente" },
  { value: "clima", label: "Clima laboral y bienestar" },
  { value: "seguridad_vial", label: "Percepción de seguridad vial" },
  { value: "sg-sst", label: "Riesgos y condiciones de trabajo (SG-SST)" },
];

export default function NuevaEncuestaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createEncuestaAction(formData);
      if (res.success) {
        router.push("/encuestas");
      } else {
        setErrorMsg(res.error || "Ocurrió un error al crear la encuesta.");
      }
    });
  };

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
        <p className="mt-1 text-sm text-fog-400">
          Diseña y lanza una batería o encuesta de percepción para el personal o clientes.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-alert-red/30 bg-alert-red-dim/40 p-3 text-sm text-alert-red">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <Card>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FormSection title="Información general">
            <TextField
              label="Título de la encuesta"
              name="titulo"
              required
              placeholder="Ej. Percepción de fatiga y riesgos viales en ruta"
              wrapperClassName="sm:col-span-2"
            />
            <SelectField label="Tipo" name="tipo" required options={TIPO_OPTIONS} />
            <TextField
              label="Destinatarios esperados"
              name="destinatariosEsperados"
              type="number"
              defaultValue="10"
              required
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={16} /> {isPending ? "Creando..." : "Crear encuesta"}
            </Button>
            <Link href="/encuestas">
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

