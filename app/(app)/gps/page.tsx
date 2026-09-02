import { getEventosGPSDb, getCalificacionesMensualesDb } from "@/lib/services/gps.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { GpsMonitorClientView } from "@/components/gps/GpsMonitorClientView";

export const dynamic = "force-dynamic";

export default async function GpsMonitorPage() {
  const eventos = await getEventosGPSDb();
  const scores = await getCalificacionesMensualesDb();
  const personas = await getPersonasDb();
  const vehiculos = await getVehiculosDb();

  const conductores = personas
    .filter((p) => p.perfiles?.includes("conductor"))
    .map((p) => ({
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      numeroDocumento: p.numeroDocumento,
      contratistaNombre: p.contratistaNombre,
    }));

  const vehiculosList = vehiculos.map((v) => ({
    id: v.id,
    placa: v.placa,
    marca: v.marca,
    modelo: v.modelo,
    contratistaNombre: v.contratistaNombre,
  }));

  return (
    <GpsMonitorClientView
      initialEventos={eventos}
      initialScores={scores}
      conductores={conductores}
      vehiculos={vehiculosList}
    />
  );
}
