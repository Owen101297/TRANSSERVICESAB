"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { createVehiculoAction } from "@/lib/services/vehiculos.service";
import { getContratistasDb } from "@/lib/services/contratistas.service";
import { Contratista } from "@/lib/types/contratista";

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

export default function NuevoVehiculoPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [contratistas, setContratistas] = useState<Contratista[]>([]);

  useEffect(() => {
    getContratistasDb().then((data) => setContratistas(data || []));
  }, []);

  const contratistaOptions = [
    { value: "", label: "Flota propia / Sin contratista" },
    ...contratistas.map((c) => ({
      value: c.id,
      label: `${c.nombre} (NIT: ${c.nit})`,
    })),
  ];

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
    <div className="max-w-3xl space-y-4">
      <Link
        href="/flota"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Flota
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
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
        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormSection title="Identificación">
            <TextField label="Placa" name="placa" required placeholder="ABC123" />
            <SelectField label="Tipo de vehículo" name="tipo" required options={TIPO_OPTIONS} />
            <TextField label="Marca" name="marca" required placeholder="Chevrolet" />
            <TextField label="Modelo" name="modelo" required placeholder="NPR" />
            <TextField label="Año" name="anio" type="number" required placeholder="2022"  />
            <TextField
              label="Capacidad (pasajeros)"
              name="capacidad"
              type="number"
              required
              placeholder="19"

            />
          </FormSection>

          <FormSection title="Operación">
            <SelectField
              label="Contratista / Empresa"
              name="contratistaId"
              options={contratistaOptions}
            />
            <SelectField
              label="Tipo de servicio"
              name="servicio"
              defaultValue="especial"
              required
              options={SERVICIO_OPTIONS}
            />
          </FormSection>

          <details className="rounded-xl border border-line-600 p-3"><summary className="cursor-pointer text-sm font-semibold text-paper-50">Vencimientos documentales · opcional al registrar</summary><div className="mt-4">
          <FormSection
            title="Documentos"
            description="Fechas de vencimiento — el sistema generará alertas automáticas 30 días antes."
          >
            <TextField label="Vencimiento SOAT" name="soatVencimiento" type="date" />
            <TextField label="Vencimiento RTM" name="rtmVencimiento" type="date" />
            <TextField
              label="Vencimiento póliza contractual/extra"
              name="polizaVencimiento"
              type="date"
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          </div></details>
          <p className="text-xs text-fog-400">Adjunta los documentos después de guardar, en el expediente del vehículo.</p>
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

