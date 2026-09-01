import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import { FlotaClientView } from "@/components/flota/FlotaClientView";

export const dynamic = "force-dynamic";

export default async function FlotaPage() {
  const vehiculos = await getVehiculosDb();
  const asignaciones = await getAsignacionesDb();

  // Mapeo placa -> conductorNombre
  const asignacionesMap: Record<string, string> = {};
  asignaciones.forEach((a) => {
    if (a.estado === "activa") {
      asignacionesMap[a.placa] = a.conductorNombre;
    }
  });

  return (
    <FlotaClientView
      initialVehiculos={vehiculos}
      asignacionesMap={asignacionesMap}
    />
  );
}
