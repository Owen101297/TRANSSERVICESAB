"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { createContratistaAction } from "@/lib/services/contratistas.service";

const TIPO_OPERACION_OPTIONS = [
  { value: "fija", label: "Asignación fija (conductor no cambia de vehículo)" },
  { value: "rotativa", label: "Rotación por turnos (12h/24h)" },
];

export default function NuevoContratistaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createContratistaAction(formData);
      if (res.success && res.contratistaId) {
        router.push(`/contratistas/${res.contratistaId}`);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al registrar el contratista.");
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/contratistas"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Contratistas
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Nuevo contratista
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Los vehículos y conductores se vinculan después, desde sus propios
          módulos — aquí solo se registra la empresa.
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
          <FormSection title="Identificación">
            <TextField
              label="Razón social"
              name="nombre"
              required
              placeholder="Nombre del contratista"
              wrapperClassName="sm:col-span-2"
            />
            <TextField label="NIT" name="nit" required placeholder="900123456-7" />
            <SelectField
              label="Tipo de operación"
              name="tipoOperacion"
              required
              options={TIPO_OPERACION_OPTIONS}
            />
          </FormSection>

          <FormSection title="Contacto">
            <TextField
              label="Nombre de contacto"
              name="contactoNombre"
              required
              placeholder="Nombre del representante o contacto operativo"
              wrapperClassName="sm:col-span-2"
            />
            <TextField
              label="Teléfono"
              name="contactoTelefono"
              required
              placeholder="300 123 4567"
            />
            <TextField
              label="Correo electrónico"
              name="contactoEmail"
              type="email"
              placeholder="contacto@empresa.com"
            />
          </FormSection>

          <FormSection title="Vinculación">
            <TextField
              label="Fecha de vinculación"
              name="fechaVinculacion"
              type="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
            />
            <TextField
              label="Fin de contrato (si aplica)"
              name="fechaFinContrato"
              type="date"
            />
          </FormSection>

          <FormSection title="Notas" description="Observaciones adicionales, opcional.">
            <textarea
              name="notas"
              rows={3}
              placeholder="Ej. condiciones particulares del contrato, turnos, novedades..."
              className="sm:col-span-2 w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none focus:ring-1 focus:ring-radar-cyan"
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={16} /> {isPending ? "Guardando..." : "Guardar contratista"}
            </Button>
            <Link href="/contratistas">
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

