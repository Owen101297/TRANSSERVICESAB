"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { SEED_PERSONAS } from "@/lib/data/personas";
import { SEED_VEHICULOS } from "@/lib/data/vehiculos";

const SERVICIO_OPTIONS = [
  { value: "especial", label: "Transporte especial" },
  { value: "escolar", label: "Escolar" },
  { value: "turismo", label: "Turismo" },
];

export default function NuevoViajePage() {
  const [submitted, setSubmitted] = useState(false);

  const conductorOptions = useMemo(
    () =>
      SEED_PERSONAS.filter((p) => p.perfiles.includes("conductor")).map((p) => ({
        value: p.id,
        label: `${p.nombres} ${p.apellidos}`,
      })),
    []
  );

  const vehiculoOptions = useMemo(
    () => SEED_VEHICULOS.map((v) => ({ value: v.id, label: `${v.placa} — ${v.marca} ${v.modelo}` })),
    []
  );

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

      <Card>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
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
            <TextField label="Origen" name="origen" required placeholder="Mocoa" />
            <TextField label="Destino" name="destino" required placeholder="Pasto" />
            <SelectField
              label="Tipo de servicio"
              name="servicio"
              required
              options={SERVICIO_OPTIONS}
            />
          </FormSection>

          <FormSection title="Horario">
            <TextField label="Fecha y hora de salida" name="fechaSalida" type="datetime-local" required />
            <TextField
              label="Duración estimada (horas)"
              name="duracionEstimadaHoras"
              type="number"
              step="0.5"
              min="2"
              required
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary">
              Registrar viaje
            </Button>
            <Link href="/operacion">
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
          </div>

          {submitted && (
            <p className="text-sm text-radar-cyan">
              Formulario validado. Falta conectar el backend para persistir el
              registro — por ahora esto queda solo en el frontend.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
