"use client";

import { useState, useTransition } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { Persona, EstadoPersona, ConceptoMedico } from "@/lib/types/persona";
import { updatePersonaAction } from "@/lib/services/personas.service";

const ESTADO_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "descanso", label: "En descanso" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "inactivo", label: "Inactivo" },
];

const RH_OPTIONS = [
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
];

const CONCEPTO_OPTIONS = [
  { value: "apto", label: "Apto para el cargo" },
  { value: "apto_con_restricciones", label: "Apto con restricciones" },
  { value: "no_apto", label: "No apto temporalmente" },
  { value: "pendiente", label: "Evaluación pendiente" },
];

interface EditPersonaModalProps {
  persona: Persona;
  isOpen: boolean;
  onClose: () => void;
}

export function EditPersonaModal({
  persona,
  isOpen,
  onClose,
}: EditPersonaModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const esConductor = persona.perfiles.includes("conductor");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await updatePersonaAction(persona.id, formData);
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
              Editar información
            </h2>
            <p className="mt-0.5 text-xs text-fog-400">
              {persona.nombres} {persona.apellidos} — {persona.tipoDocumento} {persona.numeroDocumento}
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
          <FormSection title="Datos Básicos y Contacto">
            <TextField label="Nombres" name="nombres" defaultValue={persona.nombres} required />
            <TextField label="Apellidos" name="apellidos" defaultValue={persona.apellidos} required />
            <TextField label="Teléfono" name="telefono" defaultValue={persona.telefono} required />
            <TextField label="Email" name="email" type="email" defaultValue={persona.email} required />
            <SelectField
              label="Estado operativo"
              name="estado"
              defaultValue={persona.estado}
              options={ESTADO_OPTIONS}
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <FormSection title="Salud & Afiliaciones">
            <SelectField
              label="Grupo Sanguíneo y RH"
              name="grupoSanguineoRH"
              defaultValue={persona.datosSalud?.grupoSanguineoRH || "O+"}
              options={RH_OPTIONS}
            />
            <TextField label="EPS" name="eps" defaultValue={persona.datosSalud?.eps || ""} />
            <TextField label="ARL" name="arl" defaultValue={persona.datosSalud?.arl || ""} />
          </FormSection>

          <FormSection title="Contacto de Emergencia">
            <TextField
              label="Nombre del contacto"
              name="contactoEmergenciaNombre"
              defaultValue={persona.contactoEmergencia?.nombreCompleto || ""}
            />
            <TextField
              label="Teléfono de emergencia"
              name="contactoEmergenciaTelefono"
              defaultValue={persona.contactoEmergencia?.telefono || ""}
            />
          </FormSection>

          {esConductor && (
            <FormSection title="Expediente de Conducción y EMO">
              <TextField
                label="Vencimiento de Licencia"
                name="licenciaVencimiento"
                type="date"
                defaultValue={persona.licenciaConduccion?.fechaVencimiento || ""}
              />
              <TextField
                label="Vigencia Examen Médico (EMO)"
                name="emoVigencia"
                type="date"
                defaultValue={persona.examenMedico?.fechaVigencia || ""}
              />
              <SelectField
                label="Concepto Médico"
                name="conceptoMedico"
                defaultValue={persona.examenMedico?.concepto || "apto"}
                options={CONCEPTO_OPTIONS}
                wrapperClassName="sm:col-span-2"
              />
            </FormSection>
          )}

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
