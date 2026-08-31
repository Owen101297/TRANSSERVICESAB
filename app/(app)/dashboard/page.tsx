import { StatCard } from "@/components/ui/Card";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getContratistasDb } from "@/lib/services/contratistas.service";
import { getViajesDb } from "@/lib/services/operacion.service";
import { getEstadoDocumento } from "@/lib/types/vehiculo";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [vehiculos, personas, contratistas, viajes] = await Promise.all([
    getVehiculosDb(),
    getPersonasDb(),
    getContratistasDb(),
    getViajesDb(),
  ]);

  const totalVehiculos = vehiculos.length;
  const totalContratistas = contratistas.length;
  const totalPersonas = personas.length;
  const viajesActivos = viajes.filter((v) => v.estado === "en_curso" || v.estado === "con_novedad").length;

  const documentosCriticos = vehiculos.filter((v) => {
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Vehículos" value={totalVehiculos} accent="cyan" trend={`${totalContratistas} contratistas`} />
        <StatCard label="Contratistas" value={totalContratistas} accent="cyan" />
        <StatCard label="Personas" value={totalPersonas} accent="cyan" trend="Expedientes activos" />
        <StatCard label="Viajes activos" value={viajesActivos} accent="amber" trend={`${viajes.length} registrados`} />
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
        </Card>

        {/* Actividad reciente */}
        <Card>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
            Actividad reciente
          </h2>
          <p className="text-sm text-fog-400">
            Sin actividades operacionales recientes registradas.
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
