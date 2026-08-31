"use client";

import { useState, useTransition } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { Contratista, TipoOperacion, EstadoContratista } from "@/lib/types/contratista";
import { updateContratistaAction } from "@/lib/services/contratistas.service";

const TIPO_OP_OPTIONS = [
  { value: "fija", label: "Asignación fija" },
  { value: "rotativa", label: "Rotación por turnos" },
];

const ESTADO_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

interface EditContratistaModalProps {
  contratista: Contratista;
  isOpen: boolean;
  onClose: () => void;
}

export function EditContratistaModal({
  contratista,
  isOpen,
  onClose,
}: EditContratistaModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await updateContratistaAction(contratista.id, formData);
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
          window.location.reload();
        }, 600);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al guardar los cambios.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/80 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line-600 pb-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
              Editar contratista
            </h2>
            <p className="mt-0.5 text-xs text-fog-400">
              {contratista.nombre} — NIT: {contratista.nit}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fog-400 hover:bg-asphalt-800 hover:text-paper-50"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-alert-red/30 bg-alert-red-dim/40 p-3 text-xs text-alert-red">
            <AlertCircle size={15} />
            {errorMsg}
          </div>
        )}

        {savedSuccess && (
          <div className="mt-4 rounded-lg border border-ok-green/40 bg-ok-green-dim/40 p-3 text-xs text-ok-green">
            ¡Información actualizada con éxito!
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          <FormSection title="Razón Social & Operación">
            <TextField label="Razón Social / Nombre" name="nombre" defaultValue={contratista.nombre} required />
            <SelectField
              label="Modalidad Operativa"
              name="tipoOperacion"
              defaultValue={contratista.tipoOperacion}
              options={TIPO_OP_OPTIONS}
            />
            <SelectField
              label="Estado"
              name="estado"
              defaultValue={contratista.estado}
              options={ESTADO_OPTIONS}
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <FormSection title="Contacto & Representante">
            <TextField label="Persona de contacto" name="contactoNombre" defaultValue={contratista.contactoNombre} />
            <TextField label="Teléfono" name="contactoTelefono" defaultValue={contratista.contactoTelefono} />
            <TextField label="Email" name="contactoEmail" type="email" defaultValue={contratista.contactoEmail} wrapperClassName="sm:col-span-2" />
          </FormSection>

          <FormSection title="Notas u Observaciones">
            <TextField label="Notas" name="notas" defaultValue={contratista.notas || ""} wrapperClassName="sm:col-span-2" />
          </FormSection>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line-600">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={15} /> {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
