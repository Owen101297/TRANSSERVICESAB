"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField } from "@/components/ui/FormField";
import { createRolAction } from "@/lib/services/admin.service";

const MODULOS_PERMISOS = [
  "Personas", "Contratistas", "Flota", "Asignaciones", "Operación",
  "SG-SST", "PESV", "HSEQ", "Documentos", "Reportes", "Capacitaciones", "Asistencia", "Encuestas"
];

export default function NuevoRolPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createRolAction(formData);
      if (res.success) {
        router.push("/administracion?tab=roles");
      } else {
        setErrorMsg(res.error || "Ocurrió un error al crear el rol.");
      }
    });
  };

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
          Nuevo rol de usuario
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Crea perfiles dinámicos con permisos específicos por módulo (RBAC).
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
          <FormSection title="Identificación del Rol">
            <TextField
              label="Nombre del rol (Código)"
              name="nombre"
              required
              placeholder="Ej. AUXILIAR_HSEQ o DESPACHADOR"
              wrapperClassName="sm:col-span-2"
            />
            <TextField
              label="Descripción de responsabilidades"
              name="descripcion"
              required
              placeholder="Qué puede hacer este rol en la plataforma"
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <FormSection
            title="Permisos y Módulos Accesibles"
            description="Selecciona a qué módulos tiene acceso este rol."
          >
            <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {MODULOS_PERMISOS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-mist-200 cursor-pointer">
                  <input type="checkbox" name="permisos" value={m} defaultChecked className="accent-radar-cyan" />
                  {m}
                </label>
              ))}
            </div>
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={16} /> {isPending ? "Guardando..." : "Guardar rol"}
            </Button>
            <Link href="/administracion?tab=roles">
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

