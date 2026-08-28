import { getEstadoDocumento } from "@/lib/types/vehiculo";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function DocExpiryBadge({
  label,
  vencimientoISO,
}: {
  label: string;
  vencimientoISO: string;
}) {
  const estado = getEstadoDocumento(vencimientoISO);
  const status = estado === "vigente" ? "activo" : estado === "proximo" ? "pendiente" : "critico";
  const fecha = new Date(vencimientoISO).toLocaleDateString("es-CO");

  return (
    <div className="flex items-center justify-between rounded-md border border-line-600 bg-asphalt-800/50 px-3 py-2">
      <div>
        <p className="text-sm text-paper-50">{label}</p>
        <p className="font-[family-name:var(--font-mono)] text-xs text-fog-400">
          Vence: {fecha}
        </p>
      </div>
      <StatusBadge status={status}>
        {estado === "vigente" ? "Vigente" : estado === "proximo" ? "Próximo a vencer" : "Vencido"}
      </StatusBadge>
    </div>
  );
}
