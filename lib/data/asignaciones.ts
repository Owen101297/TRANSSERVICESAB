import { Asignacion } from "@/lib/types/asignacion";

export const SEED_ASIGNACIONES: Asignacion[] = [];

export function getAsignacionActiva(conductorId: string): Asignacion | undefined {
  return SEED_ASIGNACIONES.find(
    (a) => a.conductorId === conductorId && a.estado === "activa"
  );
}

export function getAsignacionesByConductor(conductorId: string): Asignacion[] {
  return SEED_ASIGNACIONES.filter((a) => a.conductorId === conductorId).sort(
    (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
  );
}

export const getHistorialPorConductor = getAsignacionesByConductor;

export function getAsignacionesByVehiculo(vehiculoId: string): Asignacion[] {
  return SEED_ASIGNACIONES.filter((a) => a.vehiculoId === vehiculoId).sort(
    (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
  );
}

export function getAsignacionById(id: string): Asignacion | undefined {
  return SEED_ASIGNACIONES.find((a) => a.id === id);
}
