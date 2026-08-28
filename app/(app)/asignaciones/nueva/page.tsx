"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { SEED_PERSONAS } from "@/lib/data/personas";
import { SEED_VEHICULOS } from "@/lib/data/vehiculos";
import { TipoAsignacion } from "@/lib/types/asignacion";
import { evaluarAptitudConductor } from "@/lib/types/persona";

const TIPO_OPTIONS = [
  { value: "fija", label: "Fija — no cambia de vehículo" },
  { value: "rotativa", label: "Rotativa — turnos 12h/24h" },
];

const TURNO_OPTIONS = [
  { value: "12h-diurno", label: "12h — diurno" },
  { value: "12h-nocturno", label: "12h — nocturno" },
  { value: "24h", label: "24h" },
];

export default function NuevaAsignacionPage() {
  const [submitted, setSubmitted] = useState(false);
  const [tipo, setTipo] = useState<TipoAsignacion | "">("");
  const [selectedConductorId, setSelectedConductorId] = useState<string>("");
  const [autorizacionOperativa, setAutorizacionOperativa] = useState<boolean>(false);

  const conductorOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar conductor..." },
      ...SEED_PERSONAS.filter((p) => p.perfiles.includes("conductor")).map((p) => ({
        value: p.id,
        label: `${p.nombres} ${p.apellidos} (${p.contratistaNombre || "Propio"})`,
      })),
    ],
    []
  );

  const vehiculoOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar vehículo..." },
      ...SEED_VEHICULOS.map((v) => ({
        value: v.id,
        label: `${v.placa} — ${v.marca} ${v.modelo} (${v.contratistaNombre})`,
      })),
    ],
    []
  );

  const selectedConductor = useMemo(
    () => SEED_PERSONAS.find((p) => p.id === selectedConductorId),
    [selectedConductorId]
  );

  const evaluacion = useMemo(() => {
    if (!selectedConductor) return null;
    return evaluarAptitudConductor(selectedConductor);
  }, [selectedConductor]);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/asignaciones"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Asignaciones
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Nueva asignación
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Al crear esta asignación, cualquier asignación activa anterior de
          este conductor se cierra automáticamente — el historial no se
          sobreescribe, se conserva.
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
              value={selectedConductorId}
              onChange={(e) => {
                setSelectedConductorId(e.target.value);
                setAutorizacionOperativa(false);
              }}
              options={conductorOptions}
            />
            <SelectField
              label="Vehículo"
              name="vehiculoId"
              required
              options={vehiculoOptions}
            />
          </FormSection>

          {/* Panel Informativo de Aptitud y Diagnóstico Legal */}
          {evaluacion && (
            <div
              className={`rounded-lg border p-4 text-sm transition-all ${
                evaluacion.nivel === "optimo"
                  ? "border-ok-green/40 bg-ok-green-dim/30 text-mist-200"
                  : evaluacion.nivel === "advertencia"
                    ? "border-signal-amber/40 bg-signal-amber-dim/30 text-mist-200"
                    : "border-alert-red/40 bg-alert-red-dim/30 text-mist-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {evaluacion.nivel === "optimo" ? (
                  <ShieldCheck size={18} className="text-ok-green shrink-0" />
                ) : evaluacion.nivel === "advertencia" ? (
                  <AlertTriangle size={18} className="text-signal-amber shrink-0" />
                ) : (
                  <AlertTriangle size={18} className="text-alert-red shrink-0" />
                )}
                <h3 className="font-semibold text-paper-50">
                  {evaluacion.nivel === "optimo"
                    ? "Conductor con expediente al día (Apto para despacho)"
                    : evaluacion.nivel === "advertencia"
                      ? "Advertencias de idoneidad / Novedades documentales"
                      : "Alerta crítica de aptitud (Atención requerida)"}
                </h3>
              </div>

              {evaluacion.alertas.length > 0 && (
                <ul className="mt-2.5 space-y-1.5 list-disc list-inside text-xs">
                  {evaluacion.alertas.map((alerta, i) => (
                    <li key={i} className="text-mist-200">
                      {alerta}
                    </li>
                  ))}
                </ul>
              )}

              {evaluacion.nivel !== "optimo" && (
                <div className="mt-3.5 pt-3 border-t border-line-600/60">
                  <label className="flex items-start gap-2 text-xs text-paper-50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autorizacionOperativa}
                      onChange={(e) => setAutorizacionOperativa(e.target.checked)}
                      className="mt-0.5 rounded border-line-600 bg-asphalt-900 text-signal-amber focus:ring-signal-amber"
                    />
                    <span>
                      <strong>Autorización Operativa:</strong> Como responsable de despacho/administración, he revisado las novedades del conductor y autorizo la asignación bajo criterio de continuidad de servicio.
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          <FormSection
            title="Tipo de asignación"
            description="El tipo depende del contratista: la mayoría opera con asignación fija, salvo el contratista con rotación de turnos."
          >
            <SelectField
              label="Tipo"
              name="tipoAsignacion"
              required
              options={TIPO_OPTIONS}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAsignacion)}
            />
            {tipo === "rotativa" && (
              <SelectField label="Turno" name="turno" required options={TURNO_OPTIONS} />
            )}
          </FormSection>

          <FormSection title="Vigencia">
            <TextField label="Fecha de inicio" name="fechaInicio" type="date" required />
            <TextField
              label="Fecha de fin"
              name="fechaFin"
              type="date"
              required={tipo === "rotativa"}
            />
          </FormSection>

          <FormSection title="Observaciones" description="Opcional.">
            <textarea
              name="observaciones"
              rows={3}
              placeholder="Notas o justificación de despacho sobre esta asignación..."
              className="sm:col-span-2 w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none focus:ring-1 focus:ring-radar-cyan"
            />
          </FormSection>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
            >
              Guardar asignación
            </Button>
            <Link href="/asignaciones">
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
          </div>

          {submitted && (
            <p className="text-sm text-radar-cyan">
              Asignación validada exitosamente{autorizacionOperativa ? " (con confirmación de autorización operativa registrada)" : ""}. Pendiente conectar backend para persistencia en base de datos.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}

