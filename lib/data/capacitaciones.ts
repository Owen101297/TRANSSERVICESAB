import { Capacitacion } from "@/lib/types/capacitacion";

export const SEED_CAPACITACIONES: Capacitacion[] = [
  {
    id: "cap1",
    nombre: "Manejo defensivo y prevención de siniestros viales",
    tipo: "pesv",
    fecha: "2026-08-25T08:00:00",
    duracionHoras: 4,
    asistentesEsperados: 8,
    estado: "programada",
  },
  {
    id: "cap2",
    nombre: "Uso correcto de elementos de protección personal",
    tipo: "sg-sst",
    fecha: "2026-08-10T08:00:00",
    duracionHoras: 2,
    asistentesEsperados: 10,
    asistentesReales: 9,
    estado: "realizada",
  },
  {
    id: "cap3",
    nombre: "Inducción HSEQ para personal nuevo",
    tipo: "hseq",
    fecha: "2026-07-28T08:00:00",
    duracionHoras: 3,
    asistentesEsperados: 3,
    asistentesReales: 3,
    estado: "realizada",
  },
];
