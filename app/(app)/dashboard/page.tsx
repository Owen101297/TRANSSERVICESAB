import { StatCard } from "@/components/ui/Card";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { SEED_VEHICULOS } from "@/lib/data/vehiculos";
import { SEED_PERSONAS } from "@/lib/data/personas";
import { getEstadoDocumento } from "@/lib/types/vehiculo";

export default function DashboardPage() {
  const totalVehiculos = SEED_VEHICULOS.length;
  const totalContratistas = new Set(SEED_VEHICULOS.map((v) => v.contratistaId)).size;
  const totalPersonas = SEED_PERSONAS.length;
  const documentosCriticos = SEED_VEHICULOS.filter((v) => {
    const estados = Object.values(v.documentos).map(getEstadoDocumento);
    return estados.includes("vencido") || estados.includes("proximo");
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Buenos días, Owen
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Resumen empresarial — TRANSSERVICES A&amp;B
        </p>
      </div>

      {/* Vehículos, contratistas y personas ya vienen del seed real de cada módulo.
          Viajes activos sigue pendiente hasta construir Operación. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Vehículos" value={totalVehiculos} accent="cyan" trend={`${totalContratistas} contratistas`} />
        <StatCard label="Contratistas" value={totalContratistas} accent="cyan" />
        <StatCard label="Personas" value={totalPersonas} accent="cyan" trend="Datos de ejemplo" />
        <StatCard label="Viajes activos" value="—" accent="amber" trend="Pendiente conectar módulo" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Centro de acciones */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
              Centro de acciones
            </h2>
          </div>
          <ul className="space-y-3">
            {documentosCriticos.length === 0 && (
              <p className="text-sm text-fog-400">Sin vencimientos críticos.</p>
            )}
            {documentosCriticos.slice(0, 4).map((v) => {
              const vencidos = Object.entries(v.documentos).filter(
                ([, fecha]) => getEstadoDocumento(fecha) === "vencido"
              );
              const esVencido = vencidos.length > 0;
              return (
                <ActionRow
                  key={v.id}
                  status={esVencido ? "critico" : "pendiente"}
                  title={`${v.placa} — ${esVencido ? "documento vencido" : "documento próximo a vencer"}`}
                  meta={`Módulo Flota · ${v.contratistaNombre}`}
                />
              );
            })}
          </ul>
          <p className="mt-4 text-xs text-fog-400">
            Basado en datos de ejemplo del módulo Flota. SG-SST, PESV y HSEQ se
            sumarán aquí cuando se construyan.
          </p>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
            Actividad reciente
          </h2>
          <ul className="space-y-4">
            <ActivityRow
              actor="Carlos"
              action="Preoperacional"
              plate="JOU466"
            />
            <ActivityRow actor="HSEQ" action="Hallazgo cerrado" />
            <ActivityRow actor="Andrea" action="Encuesta completada" />
          </ul>
          <p className="mt-4 text-xs text-fog-400">
            Datos de ejemplo — se conectará al módulo Auditoría.
          </p>
        </Card>
      </div>
    </div>
  );
}

function ActionRow({
  status,
  title,
  meta,
}: {
  status: "critico" | "pendiente" | "activo";
  title: string;
  meta: string;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-line-600 bg-asphalt-800/50 px-4 py-3">
      <div>
        <p className="text-sm text-paper-50">{title}</p>
        <p className="mt-0.5 text-xs text-fog-400">{meta}</p>
      </div>
      <StatusBadge status={status}>
        {status === "critico" ? "Crítico" : status === "pendiente" ? "Pendiente" : "Activo"}
      </StatusBadge>
    </li>
  );
}

function ActivityRow({
  actor,
  action,
  plate,
}: {
  actor: string;
  action: string;
  plate?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-radar-cyan" />
      <p className="text-sm text-mist-200">
        <span className="text-paper-50">{actor}</span> → {action}
        {plate && (
          <span className="ml-2 inline-block align-middle">
            <PlateTag plate={plate} />
          </span>
        )}
      </p>
    </li>
  );
}
