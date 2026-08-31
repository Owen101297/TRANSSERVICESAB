"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, AlertCircle, Save, CheckCircle2 } from "lucide-react";
import { getPortalConductorInfo, createPreoperacionalAction } from "@/lib/services/portal-conductor.service";
import { ITEMS_CHECKLIST_PREOPERACIONAL } from "@/lib/types/preoperacional";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlateTag } from "@/components/ui/PlateTag";

function PreoperacionalForm() {
  const searchParams = useSearchParams();
  const conductorId = searchParams.get("conductorId") || "p1";

  const [conductorInfo, setConductorInfo] = useState<any>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [kilometraje, setKilometraje] = useState<string>("120000");
  const [hallazgoDetectado, setHallazgoDetectado] = useState(false);
  const [descripcionHallazgo, setDescripcionHallazgo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getPortalConductorInfo(conductorId).then((data) => {
      setConductorInfo(data);
    });
  }, [conductorId]);

  const toggle = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const marcarTodos = () => {
    const allChecked: Record<string, boolean> = {};
    ITEMS_CHECKLIST_PREOPERACIONAL.forEach((item) => {
      allChecked[item] = true;
    });
    setChecked(allChecked);
  };

  const todosMarcados = ITEMS_CHECKLIST_PREOPERACIONAL.every((i) => checked[i]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todosMarcados) return;
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("conductorId", conductorId);
    formData.append("conductorNombre", conductorInfo?.persona ? `${conductorInfo.persona.nombres} ${conductorInfo.persona.apellidos}` : "Conductor");
    formData.append("vehiculoId", conductorInfo?.asignacionActiva?.vehiculoId || "");
    formData.append("placa", conductorInfo?.asignacionActiva?.placa || "");
    formData.append("kilometraje", kilometraje);
    formData.append("checklist", JSON.stringify(checked));
    formData.append("hallazgoDetectado", hallazgoDetectado ? "true" : "false");
    if (descripcionHallazgo) {
      formData.append("descripcionHallazgo", descripcionHallazgo);
    }

    startTransition(async () => {
      const res = await createPreoperacionalAction(formData);
      if (res.success) {
        setEnviado(true);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al guardar la inspección.");
      }
    });
  };

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
            Inspección Preoperacional
          </h1>
          <p className="text-xs text-fog-400">PESV Paso 14 · Chequeo diario obligatorio</p>
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

      {!enviado ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-medium uppercase tracking-wide text-fog-400">
                Kilometraje actual
              </label>
              <button
                type="button"
                onClick={marcarTodos}
                className="text-xs text-radar-cyan hover:underline font-medium"
              >
                Marcar todo en buen estado
              </button>
            </div>
            <input
              type="number"
              required
              value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
              placeholder="Ej: 145200"
              className="w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 font-[family-name:var(--font-mono)] placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none"
            />
          </Card>

          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-line-600">
              {ITEMS_CHECKLIST_PREOPERACIONAL.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-asphalt-800/50 transition-colors"
                  >
                    <span className="text-sm text-mist-200">{item}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                        checked[item]
                          ? "border-ok-green bg-ok-green text-asphalt-950"
                          : "border-line-600 bg-asphalt-800"
                      }`}
                    >
                      {checked[item] && <Check size={13} strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <label className="flex items-center gap-2 text-sm text-mist-200 cursor-pointer">
              <input
                type="checkbox"
                checked={hallazgoDetectado}
                onChange={(e) => setHallazgoDetectado(e.target.checked)}
                className="accent-signal-amber h-4 w-4 rounded"
              />
              <span>Se detectó alguna anomalía o hallazgo</span>
            </label>

            {hallazgoDetectado && (
              <div className="mt-3 space-y-3 pt-2 border-t border-line-600">
                <textarea
                  rows={3}
                  required
                  placeholder="Describe la anomalía para generar la alerta en HSEQ..."
                  value={descripcionHallazgo}
                  onChange={(e) => setDescripcionHallazgo(e.target.value)}
                  className="w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none"
                />
              </div>
            )}
          </Card>

          <Button
            type="submit"
            variant="primary"
            className="w-full py-3"
            disabled={!todosMarcados || isPending}
          >
            <Save size={16} /> {isPending ? "Registrando..." : todosMarcados ? "Guardar y enviar preoperacional" : "Marca todos los ítems para continuar"}
          </Button>
        </form>
      ) : (
        <Card className="text-center py-6 space-y-3 border-ok-green/40">
          <CheckCircle2 size={36} className="mx-auto text-ok-green" />
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
            Preoperacional registrado con éxito
          </h2>
          <p className="text-sm text-fog-400">
            {hallazgoDetectado
              ? "Se notificó a despacho y HSEQ sobre el hallazgo reportado."
              : "Vehículo verificado y apto para operación."}
          </p>
          <div className="pt-4">
            <Link href={`/portal-conductor?conductorId=${conductorId}`}>
              <Button variant="secondary" className="w-full">
                Volver al inicio del portal
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function PreoperacionalPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-fog-400 text-sm">Cargando preoperacional...</div>}>
      <PreoperacionalForm />
    </Suspense>
  );
}


