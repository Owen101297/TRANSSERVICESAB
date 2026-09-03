// Modelo de dominio: INSPECCIÓN PREOPERACIONAL DIARIA (HSEQ-FOR-08 / PESV Paso 14)

export type EstadoConceptoPreoperacional = "apto" | "no_apto" | "apto_con_observacion";

export type ValorItemChecklist = "C" | "NC" | "NA"; // Cumple, No Cumple, No Aplica

export interface ItemPreoperacionalDef {
  id: string;
  seccion: string;
  nombre: string;
  esCritico?: boolean;
}

export const PREOPERACIONAL_SECCIONES = {
  parteA: {
    id: "parteA",
    codigo: "A",
    titulo: "Parte Externa",
    subtitulo: "Carrocería, vidrios, llantas y espejos",
    items: [
      { id: "a_vidrios", nombre: "Vidrios (parabrisas, laterales y trasero)", esCritico: true },
      { id: "a_puertas", nombre: "Puertas, chapas, manijas y compuertas", esCritico: false },
      { id: "a_llantas", nombre: "Llantas (delanteras, traseras y repuesto)", esCritico: true },
      { id: "a_rines", nombre: "Rines, pernos y tuercas ajustadas", esCritico: true },
      { id: "a_espejos", nombre: "Espejos retrovisores laterales", esCritico: true },
    ],
  },
  parteB: {
    id: "parteB",
    codigo: "B",
    titulo: "Parte Interna",
    subtitulo: "Cabina, mandos, controles y confort",
    items: [
      { id: "b_manijas", nombre: "Manijas, seguros y pasamanos", esCritico: false },
      { id: "b_freno_seg", nombre: "Freno de emergencia / estacionamiento", esCritico: true },
      { id: "b_tablero", nombre: "Tablero de instrumentos y testigos", esCritico: true },
      { id: "b_mandos", nombre: "Mando de luces, limpiabrisas y pedales", esCritico: true },
      { id: "b_espejo_int", nombre: "Espejo retrovisor interno", esCritico: false },
      { id: "b_pito", nombre: "Pito / Bocina sonora", esCritico: true },
      { id: "b_cinturones", nombre: "Cinturones de seguridad (3 puntos)", esCritico: true },
    ],
  },
  parteC: {
    id: "parteC",
    codigo: "C",
    titulo: "Compartimiento Motor",
    subtitulo: "Fluidos, correas y sistema eléctrico",
    items: [
      { id: "c_aceite_motor", nombre: "Nivel de aceite de motor", esCritico: true },
      { id: "c_refrigerante", nombre: "Nivel de líquido refrigerante", esCritico: true },
      { id: "c_hidraulico", nombre: "Nivel de aceite hidráulico dirección", esCritico: true },
      { id: "c_liquido_frenos", nombre: "Nivel de líquido de frenos", esCritico: true },
      { id: "c_lavaparabrisas", nombre: "Nivel de fluido lavaparabrisas", esCritico: false },
      { id: "c_correas", nombre: "Estado y tensión de correas", esCritico: true },
      { id: "c_bateria", nombre: "Batería, bornes limpios y soporte firme", esCritico: true },
    ],
  },
  parteD: {
    id: "parteD",
    codigo: "D",
    titulo: "Seguridad Activa",
    subtitulo: "Frenos principales y sistemas de asistencia",
    items: [
      { id: "d_frenos_abs", nombre: "Frenos de servicio y sistema ABS", esCritico: true },
      { id: "d_camara_reversa", nombre: "Cámara y sensores de reversa", esCritico: false },
      { id: "d_alarma_reversa", nombre: "Alarma sonora de reversa", esCritico: true },
    ],
  },
  parteE: {
    id: "parteE",
    codigo: "E",
    titulo: "Dispositivos Ópticos",
    subtitulo: "Luces de navegación, señales y exploradoras",
    items: [
      { id: "e_luces_altas_bajas", nombre: "Luces de navegación: altas y bajas", esCritico: true },
      { id: "e_cocuyos", nombre: "Luces de posición (cocuyos)", esCritico: false },
      { id: "e_direccionales", nombre: "Luces direccionales y parqueo", esCritico: true },
      { id: "e_stop", nombre: "Luces de frenado (Stop)", esCritico: true },
      { id: "e_reversa", nombre: "Luz de reversa blanca", esCritico: true },
      { id: "e_exploradoras", nombre: "Luces antineblina (exploradoras)", esCritico: false },
    ],
  },
  parteF: {
    id: "parteF",
    codigo: "F",
    titulo: "Emergencias & Kit",
    subtitulo: "Equipo de carretera, extintor y botiquín",
    items: [
      { id: "f_kit_carretera", nombre: "Kit de carretera reglamentario completo", esCritico: true },
      { id: "f_extintor", nombre: "Extintor de incendios (carga vigente)", esCritico: true },
      { id: "f_kit_ambiental", nombre: "Kit ambiental contra derrames", esCritico: false },
      { id: "f_botiquin", nombre: "Botiquín de primeros auxilios dotado", esCritico: true },
    ],
  },
  parteG: {
    id: "parteG",
    codigo: "G",
    titulo: "Estado Conductor",
    subtitulo: "Aptitud física y documentación legal",
    items: [
      { id: "g_test_fatiga", nombre: "Test de fatiga (descanso adecuado ≥ 7 horas)", esCritico: true },
      { id: "g_documentos", nombre: "Documentos al día (Licencia, SOAT, RTM, TO)", esCritico: true },
    ],
  },
};

export const TOTAL_ITEMS_PREOPERACIONAL = Object.values(PREOPERACIONAL_SECCIONES).reduce(
  (acc, sec) => acc + sec.items.length,
  0
);

export interface InspeccionPreoperacionalDto {
  id: string;
  conductorId: string;
  conductorNombre: string;
  conductorDocumento?: string;
  vehiculoId: string;
  placa: string;
  fecha: string;
  kilometraje?: number | null;
  checklist: Record<string, ValorItemChecklist>;
  hallazgoDetectado: boolean;
  descripcionHallazgo?: string | null;
  fotoEvidenciaUrl?: string | null;
  estadoConcepto: EstadoConceptoPreoperacional;
  signature?: string | null;
  observaciones?: string | null;
  createdAt?: string;
}

export type InspeccionPreoperacional = InspeccionPreoperacionalDto;

export type TipoNovedadConductor = "mecanica" | "vial" | "seguridad" | "otro";

export interface NovedadConductor {
  id: string;
  conductorId: string;
  conductorNombre: string;
  vehiculoId?: string;
  placa?: string;
  tipo: TipoNovedadConductor;
  descripcion: string;
  fotoUrl?: string;
  fecha: string;
  atendida: boolean;
}

