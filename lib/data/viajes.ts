import { Viaje } from "@/lib/types/viaje";

// Datos de ejemplo (seed), NO datos reales de la empresa.
// Solo se registran aquí viajes fuera del municipio o de más de 2 horas —
// no reemplaza preoperacionales ni recorridos urbanos cortos.

export const SEED_VIAJES: Viaje[] = [
  {
    id: "t1",
    conductorId: "p1",
    conductorNombre: "Carlos Andrés Ramírez Ortiz",
    vehiculoId: "v1",
    placa: "JOU466",
    contratistaNombre: "Contratista 1",
    origen: "Mocoa",
    destino: "Pasto",
    servicio: "especial",
    fechaSalida: "2026-08-18T06:30:00",
    duracionEstimadaHoras: 3.5,
    estado: "en_curso",
    novedades: [],
  },
  {
    id: "t2",
    conductorId: "p2",
    conductorNombre: "Andrea Milena Suárez Peña",
    vehiculoId: "v2",
    placa: "LWL919",
    contratistaNombre: "Contratista 2 (rotación 12h/24h)",
    origen: "Mocoa",
    destino: "Puerto Asís",
    servicio: "especial",
    fechaSalida: "2026-08-19T07:00:00",
    duracionEstimadaHoras: 2.5,
    estado: "programado",
    novedades: [],
  },
  {
    id: "t3",
    conductorId: "p1",
    conductorNombre: "Carlos Andrés Ramírez Ortiz",
    vehiculoId: "v1",
    placa: "JOU466",
    contratistaNombre: "Contratista 1",
    origen: "Mocoa",
    destino: "Villagarzón",
    servicio: "especial",
    fechaSalida: "2026-08-17T14:00:00",
    duracionEstimadaHoras: 2,
    estado: "con_novedad",
    novedades: [
      {
        id: "n1",
        fecha: "2026-08-17T15:10:00",
        descripcion: "Retraso de 40 minutos por cierre vial temporal en la vía.",
      },
    ],
  },
  {
    id: "t4",
    conductorId: "p6",
    conductorNombre: "Mónica Yulieth Cabrera Díaz",
    vehiculoId: "v3",
    placa: "MZP304",
    contratistaNombre: "Contratista 3",
    origen: "Sibundoy",
    destino: "Mocoa",
    servicio: "turismo",
    fechaSalida: "2026-08-15T08:00:00",
    duracionEstimadaHoras: 2,
    fechaLlegadaReal: "2026-08-15T10:05:00",
    estado: "finalizado",
    novedades: [],
  },
  {
    id: "t5",
    conductorId: "p3",
    conductorNombre: "Jhon Fredy Guzmán Castro",
    vehiculoId: "v8",
    placa: "PKM230",
    contratistaNombre: "Contratista 2 (rotación 12h/24h)",
    origen: "Mocoa",
    destino: "Orito",
    servicio: "especial",
    fechaSalida: "2026-08-11T05:30:00",
    duracionEstimadaHoras: 3,
    fechaLlegadaReal: "2026-08-11T08:45:00",
    estado: "finalizado",
    novedades: [],
  },
];

export function getViajeById(id: string): Viaje | undefined {
  return SEED_VIAJES.find((v) => v.id === id);
}
