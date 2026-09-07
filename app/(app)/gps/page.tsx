import { prisma } from "@/lib/prisma";
import { getEventosGPSConPaginacionDb, getCalificacionesMensualesDb } from "@/lib/services/gps.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { GpsMonitorClientView } from "@/components/gps/GpsMonitorClientView";

export const dynamic = "force-dynamic";

export default async function GpsMonitorPage() {
  const [eventosRes, scores, personas, vehiculos, placasEventos] = await Promise.all([
    getEventosGPSConPaginacionDb({ limite: 20 }),
    getCalificacionesMensualesDb(),
    getPersonasDb(),
    getVehiculosDb(),
    (prisma as any).eventoGPS
      .findMany({
        distinct: ["placa"],
        select: { placa: true, conductorNombre: true },
      })
      .catch(() => []),
  ]);

  const { eventos, totalCount } = eventosRes;

  const conductores = personas
    .filter((p) => p.perfiles?.includes("conductor"))
    .map((p) => ({
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      numeroDocumento: p.numeroDocumento,
      contratistaNombre: p.contratistaNombre,
    }));

  // Mapa consolidado de todos los vehículos (Catálogo Flota + Dispositivos GPS reportando)
  const vehiculosMap = new Map<string, { id: string; placa: string; marca?: string; modelo?: string; contratistaNombre?: string }>();

  // 1. Agregar vehículos registrados en catálogo
  vehiculos.forEach((v) => {
    const clean = v.placa.trim().toUpperCase();
    vehiculosMap.set(clean, {
      id: v.id,
      placa: v.placa,
      marca: v.marca,
      modelo: v.modelo,
      contratistaNombre: v.contratistaNombre,
    });
  });

  // 2. Agregar cualquier placa adicional que exista en eventos GPS (incluso si no tiene conductor asignado)
  if (Array.isArray(placasEventos)) {
    placasEventos.forEach((pe: any) => {
      if (!pe?.placa) return;
      const clean = pe.placa.trim().toUpperCase();
      if (!vehiculosMap.has(clean)) {
        vehiculosMap.set(clean, {
          id: `gps_${clean}`,
          placa: pe.placa,
          marca: "GPS Telemetría",
          modelo: pe.conductorNombre || "Sin conductor asignado",
          contratistaNombre: "Flota en Operación",
        });
      }
    });
  }

  const vehiculosList = Array.from(vehiculosMap.values()).sort((a, b) => a.placa.localeCompare(b.placa));

  return (
    <GpsMonitorClientView
      initialEventos={eventos}
      initialTotalCount={totalCount}
      initialScores={scores}
      conductores={conductores}
      vehiculos={vehiculosList}
    />
  );
}
