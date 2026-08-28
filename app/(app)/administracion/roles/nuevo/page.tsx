"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField } from "@/components/ui/FormField";

const MODULOS_PERMISOS = [
  "Personas", "Contratistas", "Flota", "Asignaciones", "Operación",
  "SG-SST", "PESV", "HSEQ", "Documentos", "Reportes",
];

export default function NuevoRolPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/administracion?tab=roles"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Roles
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Nuevo rol
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Los roles no están codificados de forma fija — se crean y ajustan aquí.
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
              label="Nombre del rol"
              name="nombre"
              required
              placeholder="Ej. AUXILIAR_HSEQ"
              wrapperClassName="sm:col-span-2"
            />
            <TextField
              label="Descripción"
              name="descripcion"
              required
              placeholder="Qué puede hacer este rol"
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <FormSection
            title="Permisos por módulo"
            description="Selecciona a qué módulos tiene acceso este rol."
          >
            <div className="sm:col-span-2 grid grid-cols-2 gap-2">
              {MODULOS_PERMISOS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-mist-200">
                  <input type="checkbox" name="permisos" value={m} className="accent-radar-cyan" />
                  {m}
                </label>
              ))}
            </div>
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary">
              Guardar rol
            </Button>
            <Link href="/administracion?tab=roles">
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
          </div>

          {submitted && (
            <p className="text-sm text-radar-cyan">
              Formulario validado. Falta conectar el backend para persistir el
              rol y aplicar los permisos (RBAC).
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
