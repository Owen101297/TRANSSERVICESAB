import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { FlotaClientView } from "@/components/flota/FlotaClientView";

export const dynamic = "force-dynamic";

export default async function FlotaPage() {
  const vehiculos = await getVehiculosDb();
  const asignaciones = await getAsignacionesDb();
  const personas = await getPersonasDb();

  // Mapeo placa -> conductorNombre
  const asignacionesMap: Record<string, string> = {};
  asignaciones.forEach((a) => {
    if (a.estado === "activa") {
      asignacionesMap[a.placa] = a.conductorNombre;
      // También mapear sin guiones para coincidencia instantánea
      const clean = a.placa.replace(/[^A-Z0-9]/g, "");
      asignacionesMap[clean] = a.conductorNombre;
    }
  });

  const conductores = personas
    .filter((p) => p.perfiles?.includes("conductor"))
    .map((p) => ({
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      numeroDocumento: p.numeroDocumento,
      contratistaNombre: p.contratistaNombre,
    }));

  return (
    <FlotaClientView
      initialVehiculos={vehiculos}
      asignacionesMap={asignacionesMap}
      conductores={conductores}
    />
  );
}
