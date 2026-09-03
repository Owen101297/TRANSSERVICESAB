// Tipos y constantes para Gerenciamiento de Viaje (STE-F-010 / OP-FOR-02 / PESV)

export type NivelRiesgoViaje = "bajo" | "medio" | "alto";

export interface FactorRiesgoDef {
  id: string;
  letra: string;
  titulo: string;
  opciones: {
    valor: number;
    etiqueta: string;
    subetiqueta?: string;
  }[];
}

export const FACTORES_RIESGO_VIAJE: FactorRiesgoDef[] = [
  {
    id: "rDistancia",
    letra: "A",
    titulo: "Distancia a Recorrer",
    opciones: [
      { valor: 1, etiqueta: "< 50 KM", subetiqueta: "Trayecto corto" },
      { valor: 2, etiqueta: "< 100 KM", subetiqueta: "Trayecto medio" },
      { valor: 5, etiqueta: "< 200 KM", subetiqueta: "Trayecto intermedio" },
      { valor: 8, etiqueta: "> 200 KM", subetiqueta: "Larga distancia" },
    ],
  },
  {
    id: "rClima",
    letra: "B",
    titulo: "Condiciones del Clima",
    opciones: [
      { valor: 2, etiqueta: "Seco / Despejado", subetiqueta: "Visibilidad óptima" },
      { valor: 4, etiqueta: "Lluvia Suave / Neblina", subetiqueta: "Calzada húmeda" },
      { valor: 8, etiqueta: "Lluvia Fuerte / Tormenta", subetiqueta: "Baja adherencia y visibilidad" },
    ],
  },
  {
    id: "rVehiculos",
    letra: "C",
    titulo: "Vehículos y Pasajeros",
    opciones: [
      { valor: 1, etiqueta: "1 Vehículo / 1 Conductor", subetiqueta: "Operación individual" },
      { valor: 2, etiqueta: "1 Vehículo / 2+ Pasajeros", subetiqueta: "Transporte de personal" },
      { valor: 3, etiqueta: "2+ Vehículos / 1+ Pasajeros", subetiqueta: "Caravana pequeña" },
      { valor: 6, etiqueta: "2+ Vehículos / Múltiples Pasajeros", subetiqueta: "Caravana grande" },
    ],
  },
  {
    id: "rVia",
    letra: "D",
    titulo: "Condiciones de la Vía",
    opciones: [
      { valor: 1, etiqueta: "100% Pavimentada", subetiqueta: "Vía nacional en buen estado" },
      { valor: 2, etiqueta: "Vía Mixta", subetiqueta: "Tramos destapados o en obra" },
      { valor: 4, etiqueta: "No Pavimentada / Trocha", subetiqueta: "Terreno difícil / petrolero" },
    ],
  },
  {
    id: "rCom",
    letra: "E",
    titulo: "Comunicaciones en Ruta",
    opciones: [
      { valor: 0, etiqueta: "Señal Celular Completa", subetiqueta: "Cobertura permanente" },
      { valor: 2, etiqueta: "Sin Señal (En Caravana)", subetiqueta: "Comunicación entre vehículos" },
      { valor: 4, etiqueta: "Sin Cobertura (Vehículo Solo)", subetiqueta: "Zona remota sin señal" },
    ],
  },
  {
    id: "rFatiga",
    letra: "F",
    titulo: "Jornada Laboral + Tiempo de Viaje",
    opciones: [
      { valor: 1, etiqueta: "< 12 Horas", subetiqueta: "Descanso reglamentario" },
      { valor: 3, etiqueta: "< 14 Horas", subetiqueta: "Jornada extendida con pausas" },
      { valor: 6, etiqueta: "≥ 14 Horas", subetiqueta: "Riesgo alto de fatiga" },
    ],
  },
  {
    id: "rHora",
    letra: "G",
    titulo: "Horario del Traslado",
    opciones: [
      { valor: 1, etiqueta: "Diurno (06:00 a 18:00)", subetiqueta: "Luz solar plena" },
      { valor: 4, etiqueta: "Nocturno (18:00 a 06:00)", subetiqueta: "Conducción nocturna" },
    ],
  },
];

export function calcularScoreRiesgo(inputs: Record<string, number>): {
  score: number;
  nivel: NivelRiesgoViaje;
  etiqueta: string;
  requiereAutorizacion: boolean;
  tipoAutorizacion: string;
} {
  let score = 0;
  for (const factor of FACTORES_RIESGO_VIAJE) {
    score += Number(inputs[factor.id] || 0);
  }

  if (score <= 15) {
    return {
      score,
      nivel: "bajo",
      etiqueta: "BAJO",
      requiereAutorizacion: false,
      tipoAutorizacion: "Aprobación Automática (Viaje Normal)",
    };
  } else if (score <= 23) {
    return {
      score,
      nivel: "medio",
      etiqueta: "MEDIO",
      requiereAutorizacion: true,
      tipoAutorizacion: "Visto Bueno HSEQ Obligatorio",
    };
  } else {
    return {
      score,
      nivel: "alto",
      etiqueta: "ALTO (CRÍTICO)",
      requiereAutorizacion: true,
      tipoAutorizacion: "Autorización de Gerencia Requerida",
    };
  }
}
