import { Encuesta } from "@/lib/types/encuesta";

export const SEED_ENCUESTAS: Encuesta[] = [
  {
    id: "enc1",
    titulo: "Percepción de riesgos viales en ruta",
    tipo: "seguridad_vial",
    fechaCreacion: "2026-08-01",
    respuestasCount: 5,
    destinatariosEsperados: 7,
    estado: "activa",
  },
  {
    id: "enc2",
    titulo: "Clima laboral segundo semestre",
    tipo: "clima",
    fechaCreacion: "2026-07-15",
    respuestasCount: 12,
    destinatariosEsperados: 12,
    estado: "cerrada",
  },
];
