"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { createHallazgoAction } from "@/lib/services/hseq.service";
import { Vehiculo } from "@/lib/types/vehiculo";

const ORIGEN_OPTIONS = [
  { value: "preoperacional", label: "Preoperacional" },
  { value: "inspeccion", label: "Inspección de seguridad" },
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  useEffect(() => {
    getVehiculosDb().then((data) => setVehiculos(data || []));
  }, []);

  const vehiculoOptions = useMemo(
    () => [
      { value: "", label: "Sin vehículo asociado / General" },
      ...vehiculos.map((v) => ({
        value: v.placa,
        label: `${v.placa} — ${v.marca} ${v.modelo} (${v.contratistaNombre})`,
      })),
    ],
    [vehiculos]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createHallazgoAction(formData);
      if (res.success && res.id) {
        router.push(`/hseq/${res.id}`);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al registrar el hallazgo.");
      }
    });
  };

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
          Al guardar, se notifica al responsable y se crea la acción preventiva/correctiva.
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
          <FormSection title="Descripción">
            <TextField
              label="Título"
              name="titulo"
              required
              placeholder="Ej. Fuga de aceite en motor o extintor descargado"
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
              label="Placa / Vehículo"
              name="placa"
              options={vehiculoOptions}
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <FormSection title="Responsable">
            <TextField
              label="Responsable de seguimiento"
              name="responsable"
              required
              placeholder="Nombre del responsable HSEQ / Mantenimiento"
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={16} /> {isPending ? "Guardando hallazgo..." : "Guardar hallazgo"}
            </Button>
            <Link href="/hseq">
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

