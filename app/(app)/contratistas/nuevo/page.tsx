"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";

const TIPO_OPERACION_OPTIONS = [
  { value: "fija", label: "Asignación fija (conductor no cambia de vehículo)" },
  { value: "rotativa", label: "Rotación por turnos (12h/24h)" },
];

export default function NuevoContratistaPage() {
  const [submitted, setSubmitted] = useState(false);

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

      <Card>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
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
            <Button type="submit" variant="primary">
              Guardar contratista
            </Button>
            <Link href="/contratistas">
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
