"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { createCapacitacionAction } from "@/lib/services/capacitaciones.service";

const TIPO_OPTIONS = [
  { value: "sg-sst", label: "SG-SST (Seguridad y Salud)" },
  { value: "pesv", label: "PESV (Seguridad Vial)" },
  { value: "hseq", label: "HSEQ (Calidad y Ambiente)" },
  { value: "operativa", label: "Operativa y Mecánica" },
];

export default function NuevaCapacitacionPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createCapacitacionAction(formData);
      if (res.success) {
        router.push("/capacitaciones");
      } else {
        setErrorMsg(res.error || "Ocurrió un error al programar la capacitación.");
      }
    });
  };

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
        <p className="mt-1 text-sm text-fog-400">
          Registra una nueva jornada de inducción, reinducción o formación especializada.
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
              label="Tema / Nombre de la capacitación"
              name="nombre"
              required
              placeholder="Ej. Manejo defensivo y prevención de siniestros viales"
              wrapperClassName="sm:col-span-2"
            />
            <SelectField label="Módulo / Tipo" name="tipo" required options={TIPO_OPTIONS} />
            <TextField label="Duración (horas)" name="duracionHoras" type="number" step="0.5" defaultValue="2" required />
          </FormSection>

          <FormSection title="Programación y Convocatoria">
            <TextField label="Fecha y hora" name="fecha" type="datetime-local" required />
            <TextField
              label="Asistentes esperados"
              name="asistentesEsperados"
              type="number"
              defaultValue="10"
              required
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={16} /> {isPending ? "Programando..." : "Programar capacitación"}
            </Button>
            <Link href="/capacitaciones">
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

