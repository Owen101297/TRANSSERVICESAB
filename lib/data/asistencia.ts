import { RegistroAsistencia } from "@/lib/types/asistencia";

export const SEED_ASISTENCIA: RegistroAsistencia[] = [
  {
    id: "as1",
    personaId: "p1",
    personaNombre: "Carlos Andrés Ramírez Ortiz",
    evento: "Uso correcto de elementos de protección personal",
    tipoEvento: "capacitacion",
    fecha: "2026-08-10T08:00:00",
    estado: "presente",
  },
  {
    id: "as2",
    personaId: "p2",
    personaNombre: "Andrea Milena Suárez Peña",
    evento: "Uso correcto de elementos de protección personal",
    tipoEvento: "capacitacion",
    fecha: "2026-08-10T08:00:00",
    estado: "presente",
  },
  {
    id: "as3",
    personaId: "p3",
    personaNombre: "Jhon Fredy Guzmán Castro",
    evento: "Uso correcto de elementos de protección personal",
    tipoEvento: "capacitacion",
    fecha: "2026-08-10T08:00:00",
    estado: "tardanza",
  },
  {
    id: "as4",
    personaId: "p6",
    personaNombre: "Mónica Yulieth Cabrera Díaz",
    evento: "Uso correcto de elementos de protección personal",
    tipoEvento: "capacitacion",
    fecha: "2026-08-10T08:00:00",
    estado: "ausente",
  },
];
