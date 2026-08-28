import { IndicadorPESV } from "@/lib/types/pesv";

// Indicadores para el Formulario 2 de VIGIA2 (reporte periódico). Todos sin
// valor todavía — se calculan a medida que el sistema tenga datos reales de
// Operación/Viajes y Flota, o se cargan manualmente si el dato viene de
// afuera del sistema.

export const INDICADORES_PESV: IndicadorPESV[] = [
  {
    id: "ind1",
    nombre: "Tasa de accidentalidad vial",
    periodicidad: "mensual",
    unidad: "siniestros / 100 vehículos",
    descripcion: "Número de siniestros viales registrados sobre el total de la flota activa.",
  },
  {
    id: "ind2",
    nombre: "Tasa de mortalidad vial",
    periodicidad: "anual",
    unidad: "muertes / total de conductores",
    descripcion: "Muertes por siniestro vial relacionadas con la operación de la empresa.",
  },
  {
    id: "ind3",
    nombre: "Cumplimiento del plan de acción PESV",
    periodicidad: "trimestral",
    unidad: "%",
    descripcion: "Porcentaje de actividades del plan anual de trabajo ejecutadas en el periodo.",
  },
  {
    id: "ind4",
    nombre: "Cobertura de capacitación en seguridad vial",
    periodicidad: "trimestral",
    unidad: "%",
    descripcion: "Porcentaje de conductores capacitados sobre el total de conductores activos.",
  },
  {
    id: "ind5",
    nombre: "Cumplimiento de mantenimiento preventivo",
    periodicidad: "mensual",
    unidad: "%",
    descripcion: "Porcentaje de la flota con mantenimiento preventivo al día.",
  },
  {
    id: "ind6",
    nombre: "Cumplimiento de inspecciones preoperacionales",
    periodicidad: "mensual",
    unidad: "%",
    descripcion: "Porcentaje de preoperacionales diligenciados sobre los esperados en el periodo.",
  },
  {
    id: "ind7",
    nombre: "Documentación vehicular al día",
    periodicidad: "mensual",
    unidad: "%",
    descripcion: "Porcentaje de la flota con SOAT, RTM y póliza vigentes.",
  },
];
