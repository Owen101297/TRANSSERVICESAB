"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { createViajeAction } from "@/lib/services/operacion.service";
import { Persona } from "@/lib/types/persona";
import { Vehiculo } from "@/lib/types/vehiculo";

const SERVICIO_OPTIONS = [
  { value: "especial", label: "Transporte especial" },
  { value: "escolar", label: "Escolar" },
  { value: "turismo", label: "Turismo" },
];

export default function NuevoViajePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  useEffect(() => {
    getPersonasDb().then((data) => setPersonas(data || []));
    getVehiculosDb().then((data) => setVehiculos(data || []));
  }, []);

  const conductorOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar conductor..." },
      ...personas
        .filter((p) => p.perfiles.includes("conductor"))
        .map((p) => ({
          value: p.id,
          label: `${p.nombres} ${p.apellidos}`,
        })),
    ],
    [personas]
  );

  const vehiculoOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar vehículo..." },
      ...vehiculos.map((v) => ({
        value: v.id,
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
      const res = await createViajeAction(formData);
      if (res.success && res.viajeId) {
        router.push(`/operacion/${res.viajeId}`);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al registrar el viaje.");
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/operacion"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Operación
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Registrar viaje
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Solo para viajes fuera del municipio o de más de 2 horas de duración.
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
          <FormSection title="Conductor y vehículo">
            <SelectField
              label="Conductor"
              name="conductorId"
              required
              options={conductorOptions}
            />
            <SelectField
              label="Vehículo"
              name="vehiculoId"
              required
              options={vehiculoOptions}
            />
          </FormSection>

          <FormSection title="Ruta">
            <TextField label="Origen" name="origen" required placeholder="Mocoa (Putumayo)" />
            <TextField label="Destino" name="destino" required placeholder="Pasto (Nariño)" />
            <SelectField
              label="Tipo de servicio"
              name="servicio"
              required
              options={SERVICIO_OPTIONS}
            />
          </FormSection>

          <FormSection title="Horario y Estimación">
            <TextField
              label="Fecha y hora de salida"
              name="fechaSalida"
              type="datetime-local"
              required
              defaultValue={new Date().toISOString().slice(0, 16)}
            />
            <TextField
              label="Duración estimada (horas)"
              name="duracionEstimadaHoras"
              type="number"
              step="0.5"
              min="1"
              required
              defaultValue="3"
            />
          </FormSection>

          <FormSection title="Observaciones" description="Opcional.">
            <textarea
              name="observaciones"
              rows={3}
              placeholder="Notas sobre la ruta, pasajeros o condiciones especiales..."
              className="sm:col-span-2 w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none focus:ring-1 focus:ring-radar-cyan"
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={16} /> {isPending ? "Guardando viaje..." : "Registrar viaje"}
            </Button>
            <Link href="/operacion">
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

