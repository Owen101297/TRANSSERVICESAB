"use client";

import { useState, useTransition } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { Vehiculo, EstadoVehiculo, ServicioVehiculo } from "@/lib/types/vehiculo";
import { updateVehiculoAction } from "@/lib/services/vehiculos.service";

const ESTADO_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "mantenimiento", label: "En mantenimiento" },
  { value: "inactivo", label: "Inactivo" },
];

const SERVICIO_OPTIONS = [
  { value: "especial", label: "Transporte especial" },
  { value: "escolar", label: "Escolar" },
  { value: "turismo", label: "Turismo" },
];

interface EditVehiculoModalProps {
  vehiculo: Vehiculo;
  isOpen: boolean;
  onClose: () => void;
}

export function EditVehiculoModal({
  vehiculo,
  isOpen,
  onClose,
}: EditVehiculoModalProps) {
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
      const res = await updateVehiculoAction(vehiculo.id, formData);
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
              Editar vehículo
            </h2>
            <p className="mt-0.5 text-xs text-fog-400 font-[family-name:var(--font-mono)]">
              Placa: {vehiculo.placa} — {vehiculo.marca} {vehiculo.modelo}
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
            ¡Vehículo actualizado con éxito!
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          <FormSection title="Datos Técnicos y Estado">
            <TextField label="Marca" name="marca" defaultValue={vehiculo.marca} required />
            <TextField label="Línea / Modelo" name="modelo" defaultValue={vehiculo.modelo} required />
            <TextField label="Capacidad (pasajeros)" name="capacidad" type="number" defaultValue={String(vehiculo.capacidad)} required />
            <SelectField
              label="Estado operativo"
              name="estado"
              defaultValue={vehiculo.estado}
              options={ESTADO_OPTIONS}
            />
            <SelectField
              label="Modalidad de servicio"
              name="servicio"
              defaultValue={vehiculo.servicio}
              options={SERVICIO_OPTIONS}
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <FormSection title="Vencimientos Documentales (Semaforización)">
            <TextField
              label="Vencimiento SOAT"
              name="soatVencimiento"
              type="date"
              defaultValue={vehiculo.documentos.soatVencimiento}
              required
            />
            <TextField
              label="Vencimiento RTM"
              name="rtmVencimiento"
              type="date"
              defaultValue={vehiculo.documentos.rtmVencimiento}
              required
            />
            <TextField
              label="Vencimiento Póliza Contractual/Extra"
              name="polizaVencimiento"
              type="date"
              defaultValue={vehiculo.documentos.polizaVencimiento}
              required
              wrapperClassName="sm:col-span-2"
            />
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
