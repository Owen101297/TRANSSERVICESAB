import { Asignacion } from "@/lib/types/asignacion";

// Datos de ejemplo (seed), NO datos reales de la empresa.
// Refleja la regla confirmada: Contratista 2 es el único con rotación de
// turnos (12h/24h) y ciclo de 4 días de descanso; el resto opera con
// asignación fija. El historial de Andrea y Jhon Fredy muestra cómo el
// sistema conserva registros anteriores en vez de sobreescribirlos.

export const SEED_ASIGNACIONES: Asignacion[] = [
  // --- Activas ---
  {
    id: "a1",
    conductorId: "p1",
    conductorNombre: "Carlos Andrés Ramírez Ortiz",
    vehiculoId: "v1",
    placa: "JOU466",
    contratistaId: "c1",
    contratistaNombre: "Contratista 1",
    tipoAsignacion: "fija",
    fechaInicio: "2022-03-14",
    estado: "activa",
  },
  {
    id: "a2",
    conductorId: "p2",
    conductorNombre: "Andrea Milena Suárez Peña",
    vehiculoId: "v2",
    placa: "LWL919",
    contratistaId: "c2",
    contratistaNombre: "Contratista 2 (rotación 12h/24h)",
    tipoAsignacion: "rotativa",
    turno: "12h-diurno",
    fechaInicio: "2026-08-01",
    fechaFin: "2026-08-31",
    estado: "activa",
  },
  {
    id: "a3",
    conductorId: "p6",
    conductorNombre: "Mónica Yulieth Cabrera Díaz",
    vehiculoId: "v3",
    placa: "MZP304",
    contratistaId: "c3",
    contratistaNombre: "Contratista 3",
    tipoAsignacion: "fija",
    fechaInicio: "2022-09-17",
    estado: "activa",
    observaciones: "Conductora actualmente en vacaciones; la asignación del vehículo se conserva.",
  },

  // --- Programada ---
  {
    id: "a4",
    conductorId: "p3",
    conductorNombre: "Jhon Fredy Guzmán Castro",
    vehiculoId: "v9",
    placa: "UNB973",
    contratistaId: "c2",
    contratistaNombre: "Contratista 2 (rotación 12h/24h)",
    tipoAsignacion: "rotativa",
    turno: "24h",
    fechaInicio: "2026-08-19",
    fechaFin: "2026-08-23",
    estado: "programada",
    observaciones: "Inicia al terminar su ciclo de 4 días de descanso.",
  },

  // --- Historial (finalizada) — demuestra que el historial queda intacto ---
  {
    id: "a5",
    conductorId: "p2",
    conductorNombre: "Andrea Milena Suárez Peña",
    vehiculoId: "v7",
    placa: "YGJ450",
    contratistaId: "c2",
    contratistaNombre: "Contratista 2 (rotación 12h/24h)",
    tipoAsignacion: "rotativa",
    turno: "12h-nocturno",
    fechaInicio: "2026-07-01",
    fechaFin: "2026-07-31",
    estado: "finalizada",
  },
  {
    id: "a6",
    conductorId: "p3",
    conductorNombre: "Jhon Fredy Guzmán Castro",
    vehiculoId: "v2",
    placa: "LWL919",
    contratistaId: "c2",
    contratistaNombre: "Contratista 2 (rotación 12h/24h)",
    tipoAsignacion: "rotativa",
    turno: "24h",
    fechaInicio: "2026-07-15",
    fechaFin: "2026-07-19",
    estado: "finalizada",
  },
  {
    id: "a7",
    conductorId: "p3",
    conductorNombre: "Jhon Fredy Guzmán Castro",
    vehiculoId: "v8",
    placa: "PKM230",
    contratistaId: "c2",
    contratistaNombre: "Contratista 2 (rotación 12h/24h)",
    tipoAsignacion: "rotativa",
    turno: "24h",
    fechaInicio: "2026-08-10",
    fechaFin: "2026-08-14",
    estado: "finalizada",
    observaciones: "Entró en ciclo de descanso de 4 días al finalizar.",
  },
];

/** Regla técnica del blueprint: para saber qué vehículo usa un conductor
 *  hoy, siempre se consulta la asignación activa — nunca un campo fijo. */
export function getAsignacionActiva(conductorId: string): Asignacion | undefined {
  return SEED_ASIGNACIONES.find(
    (a) => a.conductorId === conductorId && a.estado === "activa"
  );
}

export function getHistorialPorConductor(conductorId: string): Asignacion[] {
  return SEED_ASIGNACIONES.filter((a) => a.conductorId === conductorId).sort(
    (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
  );
}

export function getHistorialPorVehiculo(vehiculoId: string): Asignacion[] {
  return SEED_ASIGNACIONES.filter((a) => a.vehiculoId === vehiculoId).sort(
    (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
  );
}

export function getAsignacionById(id: string): Asignacion | undefined {
  return SEED_ASIGNACIONES.find((a) => a.id === id);
}


