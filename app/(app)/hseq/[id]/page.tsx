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

function formatFecha(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });
}

export default async function HallazgoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hallazgo = await getHallazgoByIdDb(id);
  if (!hallazgo) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/hseq"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a HSEQ
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="lg:w-96 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={17} className="text-fog-400" />
            <span className="font-mono text-xs text-fog-400">
              {ORIGEN_LABELS[hallazgo.origen]}
            </span>
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-paper-50">
            {hallazgo.titulo}
          </h1>
          <p className="mt-2 text-sm text-mist-200">{hallazgo.descripcion}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={SEVERIDAD_TO_STATUS[hallazgo.severidad]}>
              {SEVERIDAD_LABELS[hallazgo.severidad]}
            </StatusBadge>
            <StatusBadge status={ESTADO_TO_STATUS[hallazgo.estado]}>
              {ESTADO_HALLAZGO_LABELS[hallazgo.estado]}
            </StatusBadge>
          </div>

          <div className="mt-5 space-y-3 border-t border-line-600 pt-4 text-sm">
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
                  className="text-radar-cyan hover:underline"
                >
                  {hallazgo.conductorNombre}
                </Link>
              </Row>
            )}
            <Row label="Responsable">
              <span className="text-mist-200">{hallazgo.responsable}</span>
            </Row>
            <Row label="Reportado">
              <span className="text-mist-200">{formatFecha(hallazgo.fechaReporte)}</span>
            </Row>
            {hallazgo.fechaCierre && (
              <Row label="Cerrado">
                <span className="text-mist-200">{formatFecha(hallazgo.fechaCierre)}</span>
              </Row>
            )}
          </div>

          <div className="mt-5 border-t border-line-600 pt-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fog-400">
              Evidencia / Archivo
            </p>
            <DocUploadSlot />
          </div>

          {hallazgo.estado !== "cerrado" && (
            <AccionCorrectivaButton hallazgoId={hallazgo.id} />
          )}
        </Card>

        <div className="flex-1 space-y-6">
          <Card>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
              Acción correctiva
            </h2>
            {hallazgo.accionCorrectiva ? (
              <p className="mt-3 text-sm text-mist-200">{hallazgo.accionCorrectiva}</p>
            ) : (
              <p className="mt-3 text-sm text-fog-400">Sin acción correctiva registrada todavía.</p>
            )}
          </Card>

          <Card>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
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
      <span className="text-fog-400">{label}</span>
      {children}
    </div>
  );
}

function TraceStep({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`h-2 w-2 rounded-full ${done ? "bg-ok-green" : "bg-line-600"}`}
      />
      <span className={done ? "text-mist-200" : "text-fog-400"}>{label}</span>
    </li>
  );
}
