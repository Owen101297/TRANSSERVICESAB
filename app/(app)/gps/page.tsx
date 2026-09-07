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

  // Mapa consolidado de todos los vehículos deduplicado estrictamente por código alfanumérico
  const vehiculosMap = new Map<string, { id: string; placa: string; marca?: string; modelo?: string; contratistaNombre?: string }>();

  // 1. Agregar vehículos registrados en catálogo de flota
  vehiculos.forEach((v) => {
    const rawClean = (v.placa || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!rawClean) return;
    const formattedPlaca = rawClean.length === 6 ? `${rawClean.slice(0, 3)}-${rawClean.slice(3)}` : rawClean;
    vehiculosMap.set(rawClean, {
      id: v.id,
      placa: formattedPlaca,
      marca: v.marca,
      modelo: v.modelo,
      contratistaNombre: v.contratistaNombre,
    });
  });

  // 2. Agregar cualquier placa adicional de eventos GPS que aún no esté en el catálogo
  if (Array.isArray(placasEventos)) {
    placasEventos.forEach((pe: any) => {
      if (!pe?.placa) return;
      const rawClean = String(pe.placa).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!rawClean) return;
      const formattedPlaca = rawClean.length === 6 ? `${rawClean.slice(0, 3)}-${rawClean.slice(3)}` : rawClean;
      if (!vehiculosMap.has(rawClean)) {
        vehiculosMap.set(rawClean, {
          id: `gps_${rawClean}`,
          placa: formattedPlaca,
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
