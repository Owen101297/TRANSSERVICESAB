import * as XLSX from "xlsx";
import { Persona } from "@/lib/types/persona";

export const PERSONAL_EXCEL_COLUMNS = [
  "TIPO DOCUMENTO",
  "NUMERO DOCUMENTO",
  "NOMBRES",
  "APELLIDOS",
  "PERFILES",
  "CONTRATISTA",
  "ESTADO",
  "TELEFONO",
  "EMAIL",
  "NRO LICENCIA",
  "CATEGORIAS",
  "VENCIMIENTO LICENCIA",
  "EPS",
  "ARL",
  "FONDO PENSIONES",
  "GRUPO RH",
  "CONTACTO EMERGENCIA",
  "TELEFONO EMERGENCIA",
  "PARENTESCO",
];

/**
 * Exporta la matriz oficial de personal a Excel con los datos actuales
 */
export function exportPersonasToExcel(personas: Persona[]): void {
  const currentDate = new Date().toISOString().split("T")[0];

  const rowsData = personas.map((p) => [
    p.tipoDocumento || "CC",
    p.numeroDocumento,
    p.nombres,
    p.apellidos,
    (p.perfiles || []).join(", "),
    p.contratistaNombre || "Trans Services A&B (Flota Propia)",
    p.estado || "activo",
    p.telefono || "",
    p.email || "",
    p.licenciaConduccion?.numero || "",
    (p.licenciaConduccion?.categorias || []).join(", "),
    p.licenciaConduccion?.fechaVencimiento || "",
    p.datosSalud?.eps || "",
    p.datosSalud?.arl || "",
    p.datosSalud?.fondoPensiones || "",
    p.datosSalud?.grupoSanguineoRH || "",
    p.contactoEmergencia?.nombreCompleto || "",
    p.contactoEmergencia?.telefono || "",
    p.contactoEmergencia?.parentesco || "",
  ]);

  const fullData = [PERSONAL_EXCEL_COLUMNS, ...rowsData];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  ws["!cols"] = [
    { wch: 16 }, // TIPO DOCUMENTO
    { wch: 18 }, // NUMERO DOCUMENTO
    { wch: 22 }, // NOMBRES
    { wch: 22 }, // APELLIDOS
    { wch: 24 }, // PERFILES
    { wch: 32 }, // CONTRATISTA
    { wch: 12 }, // ESTADO
    { wch: 16 }, // TELEFONO
    { wch: 28 }, // EMAIL
    { wch: 18 }, // NRO LICENCIA
    { wch: 16 }, // CATEGORIAS
    { wch: 20 }, // VENCIMIENTO LICENCIA
    { wch: 16 }, // EPS
    { wch: 16 }, // ARL
    { wch: 18 }, // FONDO PENSIONES
    { wch: 14 }, // GRUPO RH
    { wch: 26 }, // CONTACTO EMERGENCIA
    { wch: 20 }, // TELEFONO EMERGENCIA
    { wch: 16 }, // PARENTESCO
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Personal");

  XLSX.writeFile(wb, `Matriz_Personal_TransServicesAB_${currentDate}.xlsx`);
}

/**
 * Genera y descarga la Plantilla Oficial de Personal para carga y actualización masiva
 */
export function descargarPlantillaPersonasExcel(): void {
  const ejemploRows = [
    [
      "CC",
      "1098765432",
      "Carlos Alberto",
      "Rodríguez Gómez",
      "Conductor",
      "Trans Services Cooperativa A&B (Flota Propia)",
      "Activo",
      "3101234567",
      "carlos.rodriguez@gmail.com",
      "1098765432",
      "C2, C3",
      "2028-05-20",
      "Sura EPS",
      "Positiva",
      "Porvenir",
      "O+",
      "María Gómez",
      "3119876543",
      "Esposa",
    ],
    [
      "CC",
      "1045678901",
      "Javier",
      "Mendoza Pérez",
      "Conductor",
      "Transportes del Norte SAS",
      "Activo",
      "", // Dejar en blanco si no tiene teléfono
      "",
      "",
      "",
      "", // Dejar en blanco si no tiene licencia registrada
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  ];

  const fullData = [PERSONAL_EXCEL_COLUMNS, ...ejemploRows];
  const wsData = XLSX.utils.aoa_to_sheet(fullData);

  wsData["!cols"] = [
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 32 },
    { wch: 12 },
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 26 },
    { wch: 20 },
    { wch: 16 },
  ];

  const guiaData = [
    ["CAMPO", "OBLIGATORIO", "FORMATO / VALORES VÁLIDOS", "OBSERVACIÓN"],
    ["TIPO DOCUMENTO", "NO", "CC | CE | PA | TI", "Por defecto CC."],
    ["NUMERO DOCUMENTO", "SÍ", "Número de cédula o documento sin puntos", "Identificador único."],
    ["NOMBRES", "SÍ", "Texto (ej. Juan Carlos)", "Nombres de la persona."],
    ["APELLIDOS", "SÍ", "Texto (ej. Pérez Gómez)", "Apellidos de la persona."],
    ["PERFILES", "NO", "Conductor | Administrativo | HSEQ | Supervisor | Empleado", "Separar por comas si tiene varios."],
    ["CONTRATISTA", "NO", "Nombre de la empresa aliada", "Si se deja vacío, se asume Flota Propia."],
    ["ESTADO", "NO", "Activo | Vacaciones | Descanso | Inactivo", "Por defecto Activo."],
    ["TELEFONO", "NO", "Número de 10 dígitos (ej. 3101234567)", "Dejar en blanco si no se conoce."],
    ["EMAIL", "NO", "Correo electrónico válido", "Dejar en blanco si no tiene."],
    ["NRO LICENCIA", "NO", "Número de pase/licencia", "Opcional si es conductor."],
    ["CATEGORIAS", "NO", "C1 | C2 | C3 | B1 | B2 | B3 | A2", "Separar por comas si tiene varias."],
    ["VENCIMIENTO LICENCIA", "NO", "YYYY-MM-DD o DD/MM/YYYY", "Dejar en blanco si está pendiente."],
    ["EPS", "NO", "Nombre de la EPS (ej. Sura, Sanitas, Nueva EPS)", "Dejar en blanco si no se conoce."],
    ["ARL", "NO", "Nombre de la ARL (ej. Positiva, Sura, Bolívar)", "Dejar en blanco si no se conoce."],
    ["FONDO PENSIONES", "NO", "Porvenir | Protección | Colfondos | Colpensiones", "Dejar en blanco si no se conoce."],
    ["GRUPO RH", "NO", "O+ | O- | A+ | A- | B+ | B- | AB+ | AB-", "Grupo sanguíneo."],
    ["CONTACTO EMERGENCIA", "NO", "Nombre completo de familiar", "Para emergencias."],
    ["TELEFONO EMERGENCIA", "NO", "Teléfono del contacto", "Dejar en blanco si no se conoce."],
    ["PARENTESCO", "NO", "Esposa | Esposo | Madre | Padre | Hijo | Hermano | Familiar", "Parentesco."],
  ];
  const wsGuia = XLSX.utils.aoa_to_sheet(guiaData);
  wsGuia["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 45 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsData, "Plantilla_Personal");
  XLSX.utils.book_append_sheet(wb, wsGuia, "Guia_Valores");

  XLSX.writeFile(wb, "Plantilla_Carga_Masiva_Personal_TransServicesAB.xlsx");
}
