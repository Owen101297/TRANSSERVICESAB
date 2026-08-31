import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, Calendar, Truck, Users2 } from "lucide-react";
import { getContratistaByIdDb } from "@/lib/services/contratistas.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import {
  ESTADO_CONTRATISTA_LABELS,
  EstadoContratista,
  TIPO_OPERACION_LABELS,
} from "@/lib/types/contratista";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { Avatar } from "@/components/ui/Avatar";
import { EditContratistaTrigger } from "@/components/contratistas/EditContratistaTrigger";

const ESTADO_TO_STATUS: Record<EstadoContratista, "activo" | "cerrado"> = {
  activo: "activo",
  inactivo: "cerrado",
};

export default async function ContratistaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contratista = await getContratistaByIdDb(id);
  if (!contratista) notFound();

  const allVehiculos = await getVehiculosDb();
  const allPersonas = await getPersonasDb();

  const vehiculos = allVehiculos.filter((v) => v.contratistaId === id);
  const conductores = allPersonas.filter((p) => p.contratistaId === id);

  return (
    <div className="space-y-6">
      <Link
        href="/contratistas"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Contratistas
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Columna izquierda: identidad */}
        <Card className="lg:w-80 shrink-0">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
              {contratista.nombre}
            </h1>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-fog-400">
              NIT {contratista.nit}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded border border-line-600 bg-asphalt-800 px-2 py-0.5 text-xs text-mist-200">
                {TIPO_OPERACION_LABELS[contratista.tipoOperacion]}
              </span>
              <StatusBadge status={ESTADO_TO_STATUS[contratista.estado]}>
                {ESTADO_CONTRATISTA_LABELS[contratista.estado]}
              </StatusBadge>
            </div>
          </div>

          <div className="mt-6 space-y-3 border-t border-line-600 pt-4 text-sm">
            <InfoRow icon={<Phone size={15} />} label={contratista.contactoTelefono} />
            <InfoRow icon={<Mail size={15} />} label={contratista.contactoEmail} />
            <InfoRow
              icon={<Calendar size={15} />}
              label={`Vinculado: ${new Date(contratista.fechaVinculacion).toLocaleDateString("es-CO")}`}
            />
          </div>

          {contratista.notas && (
            <p className="mt-4 rounded-md border border-line-600 bg-asphalt-800/50 p-3 text-xs text-fog-400">
              {contratista.notas}
            </p>
          )}

          <EditContratistaTrigger contratista={contratista} />
        </Card>

        {/* Columna derecha: vehículos y conductores vinculados */}
        <div className="flex-1 space-y-6">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Truck size={17} className="text-fog-400" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                Vehículos ({vehiculos.length})
              </h2>
            </div>
            {vehiculos.length === 0 ? (
              <p className="text-sm text-fog-400">Sin vehículos vinculados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vehiculos.map((v) => (
                  <Link key={v.id} href={`/flota/${v.id}`}>
                    <PlateTag plate={v.placa} />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Users2 size={17} className="text-fog-400" />
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                Conductores ({conductores.length})
              </h2>
            </div>
            {conductores.length === 0 ? (
              <p className="text-sm text-fog-400">Sin conductores vinculados.</p>
            ) : (
              <ul className="space-y-2">
                {conductores.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/personas/${p.id}`}
                      className="flex items-center gap-3 rounded-md border border-line-600 bg-asphalt-800/50 px-3 py-2 hover:bg-asphalt-800"
                    >
                      <Avatar initials={p.fotoIniciales} size="sm" />
                      <span className="text-sm text-mist-200">
                        {p.nombres} {p.apellidos}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
              Contratos y cumplimiento
            </h2>
            <p className="mt-3 text-sm text-fog-400">
              Pendiente conectar al módulo Documentos — contratos, pólizas del
              contratista, historial de cumplimiento.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-mist-200">
      <span className="text-fog-400">{icon}</span>
      {label}
    </div>
  );
}
