"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { createVehiculoAction } from "@/lib/services/vehiculos.service";

const TIPO_OPTIONS = [
  { value: "bus", label: "Bus" },
  { value: "buseta", label: "Buseta" },
  { value: "microbus", label: "Microbús" },
  { value: "camioneta", label: "Camioneta" },
  { value: "automovil", label: "Automóvil" },
  { value: "van", label: "Van" },
];

const SERVICIO_OPTIONS = [
  { value: "especial", label: "Transporte especial" },
  { value: "escolar", label: "Escolar" },
  { value: "turismo", label: "Turismo" },
];

const CONTRATISTA_OPTIONS = [
  { value: "c1", label: "Contratista 1" },
  { value: "c2", label: "Contratista 2 (rotación 12h/24h)" },
  { value: "c3", label: "Contratista 3" },
  { value: "c4", label: "Contratista 4" },
  { value: "c5", label: "Contratista 5" },
];

export default function NuevoVehiculoPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createVehiculoAction(formData);
      if (res.success && res.vehiculoId) {
        router.push(`/flota/${res.vehiculoId}`);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al registrar el vehículo.");
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/flota"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Flota
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Nuevo vehículo
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          La asignación de conductor se hace después, desde el módulo Asignaciones.
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
            <TextField label="Placa" name="placa" required placeholder="ABC123" />
            <SelectField label="Tipo de vehículo" name="tipo" required options={TIPO_OPTIONS} />
            <TextField label="Marca" name="marca" required placeholder="Chevrolet" />
            <TextField label="Modelo" name="modelo" required placeholder="NPR" />
            <TextField label="Año" name="anio" type="number" required placeholder="2022" defaultValue="2022" />
            <TextField
              label="Capacidad (pasajeros)"
              name="capacidad"
              type="number"
              required
              placeholder="19"
              defaultValue="19"
            />
          </FormSection>

          <FormSection title="Operación">
            <SelectField
              label="Contratista"
              name="contratistaId"
              required
              options={CONTRATISTA_OPTIONS}
            />
            <SelectField
              label="Tipo de servicio"
              name="servicio"
              required
              options={SERVICIO_OPTIONS}
            />
          </FormSection>

          <FormSection
            title="Documentos"
            description="Fechas de vencimiento — el sistema generará alertas automáticas 30 días antes."
          >
            <TextField label="Vencimiento SOAT" name="soatVencimiento" type="date" required />
            <TextField label="Vencimiento RTM" name="rtmVencimiento" type="date" required />
            <TextField
              label="Vencimiento póliza contractual/extra"
              name="polizaVencimiento"
              type="date"
              required
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={16} /> {isPending ? "Guardando..." : "Guardar vehículo"}
            </Button>
            <Link href="/flota">
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

