import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getHallazgoByIdDb } from "@/lib/services/hseq.service";
import {
  ESTADO_HALLAZGO_LABELS,
  EstadoHallazgo,
  ORIGEN_LABELS,
  SEVERIDAD_LABELS,
  SeveridadHallazgo,
} from "@/lib/types/hseq";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { DocUploadSlot } from "@/components/ui/DocUploadSlot";
import { AccionCorrectivaButton } from "@/components/hseq/AccionCorrectivaButton";
import { formatFechaHora } from "@/lib/utils/formatters";

const ESTADO_TO_STATUS: Record<EstadoHallazgo, "activo" | "pendiente" | "cerrado"> = {
  abierto: "pendiente",
  en_proceso: "pendiente",
  cerrado: "cerrado",
};

const SEVERIDAD_TO_STATUS: Record<SeveridadHallazgo, "activo" | "pendiente" | "critico"> = {
  baja: "activo",
  media: "pendiente",
  alta: "pendiente",
  critica: "critico",
};

export default async function HallazgoDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  let id = "";
  try {
    const resolved = await props.params;
    id = resolved?.id || "";
  } catch (e) {
    console.warn("Aviso resolviendo params en HallazgoDetailPage:", e);
  }

  if (!id) notFound();

  const hallazgo = await getHallazgoByIdDb(id);
  if (!hallazgo) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/hseq"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={15} /> Volver a HSEQ
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="lg:w-96 shrink-0 shadow-apple-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-slate-400" />
            <span className="font-mono text-xs text-slate-500">
              {ORIGEN_LABELS[hallazgo.origen] || hallazgo.origen}
            </span>
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-slate-900">
            {hallazgo.titulo}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{hallazgo.descripcion}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={SEVERIDAD_TO_STATUS[hallazgo.severidad] || "pendiente"}>
              {SEVERIDAD_LABELS[hallazgo.severidad] || hallazgo.severidad}
            </StatusBadge>
            <StatusBadge status={ESTADO_TO_STATUS[hallazgo.estado] || "pendiente"}>
              {ESTADO_HALLAZGO_LABELS[hallazgo.estado] || hallazgo.estado}
            </StatusBadge>
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
            {hallazgo.placa && (
              <Row label="Vehículo">
                <Link href={`/flota/${hallazgo.vehiculoId || hallazgo.placa}`}>
                  <PlateTag plate={hallazgo.placa} />
                </Link>
              </Row>
            )}
            {hallazgo.conductorNombre && (
              <Row label="Conductor">
                <Link
                  href={`/personas/${hallazgo.conductorId}`}
                  className="text-sky-600 hover:underline font-semibold"
                >
                  {hallazgo.conductorNombre}
                </Link>
              </Row>
            )}
            <Row label="Responsable">
              <span className="text-slate-700 font-medium">{hallazgo.responsable}</span>
            </Row>
            <Row label="Reportado">
              <span className="text-slate-600 font-mono text-xs">{formatFechaHora(hallazgo.fechaReporte)}</span>
            </Row>
            {hallazgo.fechaCierre && (
              <Row label="Cerrado">
                <span className="text-slate-600 font-mono text-xs">{formatFechaHora(hallazgo.fechaCierre)}</span>
              </Row>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Evidencia / Archivo
            </p>
            <DocUploadSlot />
          </div>

          {hallazgo.estado !== "cerrado" && (
            <AccionCorrectivaButton hallazgoId={hallazgo.id} />
          )}
        </Card>

        <div className="flex-1 space-y-6">
          <Card className="shadow-apple-sm">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-slate-900">
              Acción correctiva
            </h2>
            {hallazgo.accionCorrectiva ? (
              <p className="mt-3 text-sm text-slate-700">{hallazgo.accionCorrectiva}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Sin acción correctiva registrada todavía.</p>
            )}
          </Card>

          <Card className="shadow-apple-sm">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-slate-900">
              Trazabilidad
            </h2>
            <ol className="mt-3 space-y-3 text-sm">
              <TraceStep label="Hallazgo reportado" done />
              <TraceStep label="Evidencia adjunta" done={false} />
              <TraceStep label="Notificación a responsable" done />
              <TraceStep label="Tarea de seguimiento creada" done={hallazgo.estado !== "abierto"} />
              <TraceStep label="Cierre y auditoría" done={hallazgo.estado === "cerrado"} />
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-xs">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function TraceStep({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`h-2 w-2 rounded-full ${done ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      <span className={done ? "text-slate-800 font-medium" : "text-slate-400"}>{label}</span>
    </li>
  );
}
