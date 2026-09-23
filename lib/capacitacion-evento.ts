import "server-only";

export function tipoEventoDesdeCapacitacion(categoria: string): string {
  if (categoria === "induccion") return "induccion";
  if (categoria === "entrenamiento") return "entrenamiento_practico";
  if (categoria === "charla_semanal") return "charla_formativa";
  return "capacitacion";
}

export function procesoEventoDesdeCapacitacion(tipo: string): string {
  return tipo === "sg-sst" ? "sg-sst" : tipo;
}

export function categoriaCapacitacionDesdeEvento(tipo: string): string {
  if (tipo === "charla_formativa") return "charla_semanal";
  if (tipo === "induccion" || tipo === "reinduccion") return "induccion";
  if (tipo === "entrenamiento_practico") return "entrenamiento";
  return "capacitacion_mensual";
}

export function fechaFinCapacitacion(fecha: Date, duracionHoras: number): Date {
  return new Date(fecha.getTime() + Math.max(duracionHoras, 0.25) * 60 * 60 * 1000);
}
