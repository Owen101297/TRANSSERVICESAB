import { Persona } from "@/lib/types/persona";

// Datos de ejemplo (seed), NO datos reales de la empresa.
// Sirven para construir y probar la interfaz mientras se conecta la base de
// datos real. Los contratistas se nombran genéricamente (Contratista 1-5)
// porque aún no tengo sus nombres reales — reemplazar cuando los tengas.
//
// Contexto real confirmado que sí se refleja aquí:
// - 5 contratistas, ~30 vehículos en total
// - 1 contratista (6 vehículos) opera con rotación de turnos 12h/24h y
//   ciclo de 4 días de descanso — el resto tiene asignación fija.

export const SEED_PERSONAS: Persona[] = [
  {
    id: "p1",
    nombres: "Carlos Andrés",
    apellidos: "Ramírez Ortiz",
    tipoDocumento: "CC",
    numeroDocumento: "1084567123",
    telefono: "300 123 4567",
    email: "carlos.ramirez@ejemplo.com",
    perfiles: ["conductor"],
    estado: "activo",
    fechaIngreso: "2022-03-14",
    contratistaId: "c1",
    contratistaNombre: "Contratista 1",
    fotoIniciales: "CR",
    licenciaConduccion: {
      numero: "1084567123",
      categorias: ["C1", "C2"],
      fechaVencimiento: "2027-04-15",
      organismoTransito: "Secretaría de Movilidad de Medellín",
    },
    examenMedico: {
      tipo: "periodico",
      fechaRealizacion: "2025-08-10",
      fechaVigencia: "2026-08-10",
      enfasis: ["Visiometría", "Audiometría", "Psicosensométrico", "Osteomuscular"],
      concepto: "apto",
      centroMedico: "IPS Salud Ocupacional del Valle",
    },
    datosSalud: {
      grupoSanguineoRH: "O+",
      eps: "Sura EPS",
      arl: "Seguros Bolívar ARL",
      fondoPensiones: "Protección",
    },
    contactoEmergencia: {
      nombreCompleto: "Marta Lucía Ortiz (Madre)",
      parentesco: "Madre",
      telefono: "311 555 7890",
    },
  },
  {
    id: "p2",
    nombres: "Andrea Milena",
    apellidos: "Suárez Peña",
    tipoDocumento: "CC",
    numeroDocumento: "1091234876",
    telefono: "301 987 6543",
    email: "andrea.suarez@ejemplo.com",
    perfiles: ["conductor"],
    estado: "activo",
    fechaIngreso: "2023-01-09",
    contratistaId: "c2",
    contratistaNombre: "Contratista 2 (rotación 12h/24h)",
    fotoIniciales: "AS",
    licenciaConduccion: {
      numero: "1091234876",
      categorias: ["C1", "C2", "C3"],
      fechaVencimiento: "2026-09-15", // Próxima a vencer (< 30 días respecto al contexto)
      organismoTransito: "Secretaría de Tránsito de Cali",
    },
    examenMedico: {
      tipo: "periodico",
      fechaRealizacion: "2025-11-04",
      fechaVigencia: "2026-11-04",
      enfasis: ["Visiometría", "Audiometría", "Psicosensométrico"],
      concepto: "apto_con_restricciones",
      restricciones: "Uso obligatorio de lentes formulados durante la conducción nocturna.",
      centroMedico: "Centro Médico Vial La Sabana",
    },
    datosSalud: {
      grupoSanguineoRH: "A+",
      eps: "Sanitas EPS",
      arl: "SURA ARL",
      fondoPensiones: "Porvenir",
      alergias: "Penicilina",
    },
    contactoEmergencia: {
      nombreCompleto: "Héctor Suárez (Esposo)",
      parentesco: "Esposo",
      telefono: "314 888 2345",
    },
  },
  {
    id: "p3",
    nombres: "Jhon Fredy",
    apellidos: "Guzmán Castro",
    tipoDocumento: "CC",
    numeroDocumento: "1098765432",
    telefono: "302 456 7890",
    email: "jhon.guzman@ejemplo.com",
    perfiles: ["conductor"],
    estado: "descanso",
    fechaIngreso: "2023-06-01",
    contratistaId: "c2",
    contratistaNombre: "Contratista 2 (rotación 12h/24h)",
    fotoIniciales: "JG",
    licenciaConduccion: {
      numero: "1098765432",
      categorias: ["C2"],
      fechaVencimiento: "2028-02-18",
      organismoTransito: "Secretaría de Movilidad de Bogotá",
    },
    examenMedico: {
      tipo: "periodico",
      fechaRealizacion: "2025-05-20",
      fechaVigencia: "2026-05-20", // Vencido
      enfasis: ["Visiometría", "Audiometría", "Psicosensométrico", "Cardiovascular"],
      concepto: "apto",
      centroMedico: "IPS Transporte Seguro",
    },
    datosSalud: {
      grupoSanguineoRH: "B+",
      eps: "Compensar EPS",
      arl: "Positiva ARL",
      fondoPensiones: "Colfondos",
    },
    contactoEmergencia: {
      nombreCompleto: "Gloria Castro (Hermana)",
      parentesco: "Hermana",
      telefono: "318 444 1212",
    },
  },
  {
    id: "p4",
    nombres: "Luisa Fernanda",
    apellidos: "Martínez Rojas",
    tipoDocumento: "CC",
    numeroDocumento: "1075432198",
    telefono: "310 234 5678",
    email: "luisa.martinez@ejemplo.com",
    perfiles: ["hseq"],
    estado: "activo",
    fechaIngreso: "2021-11-20",
    fotoIniciales: "LM",
    datosSalud: {
      grupoSanguineoRH: "O+",
      eps: "Sura EPS",
      arl: "SURA ARL",
      fondoPensiones: "Protección",
    },
    contactoEmergencia: {
      nombreCompleto: "Pedro Martínez (Padre)",
      parentesco: "Padre",
      telefono: "315 777 9900",
    },
  },
  {
    id: "p5",
    nombres: "Diego Alexander",
    apellidos: "Pérez Londoño",
    tipoDocumento: "CC",
    numeroDocumento: "1082345671",
    telefono: "315 345 6789",
    email: "diego.perez@ejemplo.com",
    perfiles: ["supervisor"],
    estado: "activo",
    fechaIngreso: "2020-08-04",
    fotoIniciales: "DP",
    datosSalud: {
      grupoSanguineoRH: "AB+",
      eps: "Nueva EPS",
      arl: "Seguros Bolívar ARL",
      fondoPensiones: "Porvenir",
    },
    contactoEmergencia: {
      nombreCompleto: "Claudia Londoño (Madre)",
      parentesco: "Madre",
      telefono: "312 666 4321",
    },
  },
  {
    id: "p6",
    nombres: "Mónica Yulieth",
    apellidos: "Cabrera Díaz",
    tipoDocumento: "CE",
    numeroDocumento: "5678901",
    telefono: "320 456 7891",
    email: "monica.cabrera@ejemplo.com",
    perfiles: ["conductor"],
    estado: "vacaciones",
    fechaIngreso: "2022-09-17",
    contratistaId: "c3",
    contratistaNombre: "Contratista 3",
    fotoIniciales: "MC",
    licenciaConduccion: {
      numero: "5678901",
      categorias: ["C1"],
      fechaVencimiento: "2026-06-30", // Vencida
      organismoTransito: "Dirección de Tránsito de Bucaramanga",
    },
    examenMedico: {
      tipo: "periodico",
      fechaRealizacion: "2025-07-15",
      fechaVigencia: "2026-07-15", // Vencido
      enfasis: ["Visiometría", "Psicosensométrico"],
      concepto: "apto",
      centroMedico: "IPS Médicos del Oriente",
    },
    datosSalud: {
      grupoSanguineoRH: "O-",
      eps: "Sanitas EPS",
      arl: "SURA ARL",
      fondoPensiones: "Protección",
    },
    contactoEmergencia: {
      nombreCompleto: "Rubén Cabrera (Hermano)",
      parentesco: "Hermano",
      telefono: "310 999 8765",
    },
  },
  {
    id: "p7",
    nombres: "Owen",
    apellidos: "Alvarez Zúñiga",
    tipoDocumento: "CC",
    numeroDocumento: "1000000000",
    telefono: "300 000 0000",
    email: "owen.alvarez@ejemplo.com",
    perfiles: ["administrativo", "hseq"],
    estado: "activo",
    fechaIngreso: "2019-02-01",
    fotoIniciales: "OA",
    datosSalud: {
      grupoSanguineoRH: "O+",
      eps: "Sura EPS",
      arl: "SURA ARL",
      fondoPensiones: "Protección",
    },
    contactoEmergencia: {
      nombreCompleto: "Administración Central A&B",
      parentesco: "Empresa",
      telefono: "300 000 0000",
    },
  },
];

export function getPersonaById(id: string): Persona | undefined {
  return SEED_PERSONAS.find((p) => p.id === id);
}
