import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, Calendar, Building2, Clock, AlertTriangle } from "lucide-react";
import {
  getContratistaByIdDb,
  getDocumentosContratistaDb,
} from "@/lib/services/contratistas.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import {
  ESTADO_CONTRATISTA_LABELS,
  EstadoContratista,
  TIPO_OPERACION_LABELS,
} from "@/lib/types/contratista";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EditContratistaTrigger } from "@/components/contratistas/EditContratistaTrigger";
import { ContratistaDetailTabs } from "@/components/contratistas/ContratistaDetailTabs";
import { evaluarAlertaContrato } from "@/lib/utils/alertas-contratos";

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
  const documentos = await getDocumentosContratistaDb(id);

  const vehiculos = allVehiculos.filter((v) => v.contratistaId === id);
  const conductores = allPersonas.filter((p) => p.contratistaId === id);
  const diagContrato = evaluarAlertaContrato(contratista);

  return (
    <div className="space-y-6">
      {/* Botón Volver y Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/contratistas"
          className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50 transition-colors"
        >
          <ArrowLeft size={16} /> Volver al listado de Contratistas
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Columna Izquierda: Identidad y Ficha Institucional */}
        <Card className="lg:w-80 shrink-0 h-fit space-y-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-signal-amber font-semibold uppercase tracking-wider mb-1">
              <Building2 size={15} /> Empresa Vinculada
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50 leading-tight">
              {contratista.nombre}
            </h1>
            <p className="mt-1 font-mono text-xs text-fog-400">
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

          {/* Semáforo de Vigencia de Contrato */}
          <div className="rounded-lg border border-line-600 bg-asphalt-950/70 p-3 space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-fog-400">
              Vigencia del Contrato
            </p>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono border ${diagContrato.badgeClass}`}>
                <Clock size={12} /> {diagContrato.label}
              </span>
            </div>
            <p className="text-[11px] font-mono text-fog-400">
              {contratista.fechaFinContrato
                ? `Vence: ${contratista.fechaFinContrato}`
                : "Contrato abierto / indefinido"}
            </p>
          </div>

          {/* Datos de Contacto y Representación */}
          <div className="space-y-3 border-t border-line-600 pt-4 text-sm">
            <div className="text-xs text-fog-400 font-mono">CONTACTO PRINCIPAL</div>
            <div className="text-sm font-semibold text-paper-50">
              {contratista.contactoNombre || "Pendiente asignar"}
            </div>
            <InfoRow icon={<Phone size={15} />} label={contratista.contactoTelefono || "Sin teléfono"} />
            <InfoRow icon={<Mail size={15} />} label={contratista.contactoEmail || "Sin correo"} />
            <InfoRow
              icon={<Calendar size={15} />}
              label={`Vinculado: ${new Date(contratista.fechaVinculacion).toLocaleDateString("es-CO")}`}
            />
          </div>

          {contratista.notas && (
            <div className="rounded-lg border border-line-600 bg-asphalt-950/50 p-3 text-xs text-fog-400 space-y-1">
              <span className="font-semibold text-mist-200 block">Notas &amp; Acuerdos:</span>
              <p className="leading-relaxed">{contratista.notas}</p>
            </div>
          )}

          <EditContratistaTrigger contratista={contratista} />
        </Card>

        {/* Columna Derecha: Matriz 360° con Pestañas Interactivas */}
        <div className="flex-1 min-w-0">
          <ContratistaDetailTabs
            contratista={contratista}
            vehiculos={vehiculos}
            conductores={conductores}
            documentos={documentos}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-mist-200 text-xs truncate">
      <span className="text-fog-400 shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
