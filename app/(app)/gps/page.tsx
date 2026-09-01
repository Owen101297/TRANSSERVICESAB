import { getEventosGPSDb, getCalificacionesMensualesDb } from "@/lib/services/gps.service";
import { GpsMonitorClientView } from "@/components/gps/GpsMonitorClientView";

export const dynamic = "force-dynamic";

export default async function GpsMonitorPage() {
  const eventos = await getEventosGPSDb();
  const scores = await getCalificacionesMensualesDb();

  return (
    <GpsMonitorClientView
      initialEventos={eventos}
      initialScores={scores}
    />
  );
}
