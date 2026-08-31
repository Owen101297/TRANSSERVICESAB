"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/FormField";
import { getPortalConductorInfo, createNovedadConductorAction } from "@/lib/services/portal-conductor.service";
import { PlateTag } from "@/components/ui/PlateTag";

const TIPO_OPTIONS = [
  { value: "mecanica", label: "Falla mecánica / Vehículo" },
  { value: "vial", label: "Condición de la vía / Cierre vial / Derrumbe" },
  { value: "seguridad", label: "Seguridad / Incidente en ruta" },
  { value: "otro", label: "Otro motivo operativo" },
];

function NovedadForm() {
  const searchParams = useSearchParams();
  const conductorId = searchParams.get("conductorId") || "p1";

  const [conductorInfo, setConductorInfo] = useState<any>(null);
  const [enviado, setEnviado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPortalConductorInfo(conductorId).then((data) => {
      setConductorInfo(data);
    });
  }, [conductorId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("conductorId", conductorId);
    formData.append("conductorNombre", conductorInfo?.persona ? `${conductorInfo.persona.nombres} ${conductorInfo.persona.apellidos}` : "Conductor");
    if (conductorInfo?.asignacionActiva?.vehiculoId) {
      formData.append("vehiculoId", conductorInfo.asignacionActiva.vehiculoId);
      formData.append("placa", conductorInfo.asignacionActiva.placa);
    }

    startTransition(async () => {
      const res = await createNovedadConductorAction(formData);
      if (res.success) {
        setEnviado(true);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al reportar la novedad.");
      }
    });
  };

  if (enviado) {
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <Card className="text-center py-6 space-y-3 border-ok-green/40">
          <CheckCircle2 size={36} className="mx-auto text-ok-green" />
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
            Novedad reportada
          </h2>
          <p className="text-sm text-fog-400">
            Se notificó de inmediato a la central de despacho y quedó vinculada a tu operación.
          </p>
          <div className="pt-4">
            <Link href={`/portal-conductor?conductorId=${conductorId}`}>
              <Button variant="secondary" className="w-full">
                Volver al inicio del portal
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <Link
        href={`/portal-conductor?conductorId=${conductorId}`}
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver al portal
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
            Reportar novedad
          </h1>
          <p className="text-xs text-fog-400">Canal directo con despacho y seguridad</p>
        </div>
        {conductorInfo?.asignacionActiva && (
          <PlateTag plate={conductorInfo.asignacionActiva.placa} />
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-alert-red/30 bg-alert-red-dim/40 p-3 text-xs text-alert-red">
          <AlertCircle size={15} />
          {errorMsg}
        </div>
      )}

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <SelectField label="Tipo de novedad" name="tipo" required options={TIPO_OPTIONS} />
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fog-400">
              Descripción del suceso
            </label>
            <textarea
              name="descripcion"
              rows={4}
              required
              placeholder="Detalla qué ocurrió, lugar aproximado o ayuda requerida..."
              className="w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full py-3" disabled={isPending}>
            <Save size={16} /> {isPending ? "Transmitiendo..." : "Enviar novedad a la central"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function NovedadPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-fog-400 text-sm">Cargando formulario...</div>}>
      <NovedadForm />
    </Suspense>
  );
}


