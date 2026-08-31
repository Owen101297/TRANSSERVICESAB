"use client";

import { useState, useTransition, useMemo } from "react";
import { X, FileText, Save, AlertCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { ContratoTransporte } from "@/lib/types/fuec";
import { Vehiculo } from "@/lib/types/vehiculo";
import { Persona } from "@/lib/types/persona";
import { createFuecAction } from "@/lib/services/fuec.service";

interface NuevoFuecModalProps {
  contratos: ContratoTransporte[];
  vehiculos: Vehiculo[];
  conductores: Persona[];
  isOpen: boolean;
  onClose: () => void;
}

export function NuevoFuecModal({
  contratos,
  vehiculos,
  conductores,
  isOpen,
  onClose,
}: NuevoFuecModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generado, setGenerado] = useState<{ codigoFUEC: string } | null>(null);

  if (!isOpen) return null;

  const contratoOptions = contratos.map((c) => ({
    value: c.id,
    label: `${c.numeroContrato} — ${c.contratanteNombre} (${c.objetoContrato})`,
  }));

  const vehiculoOptions = vehiculos.map((v) => ({
    value: v.id,
    label: `${v.placa} — ${v.marca} ${v.modelo} (${v.capacidad} pas.)`,
  }));

  const conductorOptions = [
    { value: "", label: "Seleccionar conductor..." },
    ...conductores
      .filter((p) => p.perfiles.includes("conductor"))
      .map((p) => ({
        value: p.id,
        label: `${p.nombres} ${p.apellidos}`,
      })),
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createFuecAction(formData);
      if (res.success && res.codigoFUEC) {
        setGenerado({ codigoFUEC: res.codigoFUEC });
      } else {
        setErrorMsg(res.error || "Ocurrió un error al emitir el FUEC.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-950/80 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line-600 pb-4">
          <div className="flex items-center gap-2.5">
            <FileText size={20} className="text-radar-cyan" />
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
                Emitir FUEC Digital
              </h2>
              <p className="text-xs text-fog-400">
                Formato Único de Extracto de Contrato (Ministerio de Transporte)
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setGenerado(null);
              onClose();
            }}
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

        {generado ? (
          <div className="mt-6 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-green-dim text-ok-green">
              <QrCode size={30} />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
              ¡FUEC emitido exitosamente!
            </h3>
            <p className="font-[family-name:var(--font-mono)] text-sm text-radar-cyan">
              Código Único Nacional: {generado.codigoFUEC}
            </p>
            <p className="text-xs text-fog-400 max-w-md mx-auto">
              El documento oficial ha sido registrado en el sistema. El conductor puede consultarlo de inmediato desde el Portal Móvil con su código QR de verificación para autoridades de tránsito.
            </p>
            <div className="pt-4 border-t border-line-600 flex justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  setGenerado(null);
                  onClose();
                  window.location.reload();
                }}
              >
                Entendido y volver
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            <FormSection title="Contrato Base de Transporte">
              <SelectField
                label="Contrato con Cliente"
                name="contratoId"
                required
                options={contratoOptions}
                wrapperClassName="sm:col-span-2"
              />
            </FormSection>

            <FormSection title="Ruta y Destino Autorizado">
              <TextField label="Origen" name="origen" required placeholder="Mocoa (Putumayo)" />
              <TextField label="Destino" name="destino" required placeholder="Villagarzón / Pozo Costayaco" />
              <TextField
                label="Ruta / Corredor vial específico"
                name="rutaDetalle"
                placeholder="Vía Nacional Mocoa - Villagarzón"
                wrapperClassName="sm:col-span-2"
              />
            </FormSection>

            <FormSection title="Vehículo y Tripulación">
              <SelectField
                label="Vehículo asignado"
                name="vehiculoId"
                required
                options={vehiculoOptions}
                wrapperClassName="sm:col-span-2"
              />
              <SelectField
                label="Conductor Principal"
                name="conductorPrincipalId"
                required
                options={conductorOptions}
              />
              <SelectField
                label="Conductor Secundario / Relevo (Opcional)"
                name="conductorSecundarioId"
                options={conductorOptions}
              />
            </FormSection>

            <FormSection title="Vigencia del Extracto">
              <TextField
                label="Fecha de Inicio"
                name="fechaInicio"
                type="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
              />
              <TextField
                label="Fecha de Vencimiento"
                name="fechaFin"
                type="date"
                required
              />
            </FormSection>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-line-600">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                <Save size={15} /> {isPending ? "Generando FUEC..." : "Generar FUEC oficial"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
