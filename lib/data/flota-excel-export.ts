import * as XLSX from "xlsx";
import { Vehiculo, TIPO_LABELS, SERVICIO_LABELS, ESTADO_VEHICULO_LABELS } from "@/lib/types/vehiculo";

export const FLOTA_EXCEL_COLUMNS = [
  "PLACA",
  "MARCA",
  "MODELO",
  "AÑO",
  "TIPO",
  "CAPACIDAD",
  "SERVICIO",
  "CONTRATISTA",
  "VENCIMIENTO SOAT",
  "VENCIMIENTO RTM",
  "VENCIMIENTO POLIZAS",
  "ESTADO",
];

/**
 * Genera el archivo Excel oficial de Flota con los datos actuales de la base de datos
 */
export function exportarFlotaAExcel(vehiculos: Vehiculo[], asignacionesMap?: Record<string, string>) {
  const rowsData = vehiculos.map((v) => [
    v.placa,
    v.marca,
    v.modelo,
    v.anio || "",
    TIPO_LABELS[v.tipo] || v.tipo,
    v.capacidad || "",
    SERVICIO_LABELS[v.servicio] || v.servicio,
    v.contratistaNombre || "Flota Propia / Trans Services A&B",
    v.documentos?.soatVencimiento || "",
    v.documentos?.rtmVencimiento || "",
    v.documentos?.polizaVencimiento || "",
    ESTADO_VEHICULO_LABELS[v.estado] || v.estado,
  ]);

  const fullData = [FLOTA_EXCEL_COLUMNS, ...rowsData];
  const worksheet = XLSX.utils.aoa_to_sheet(fullData);

  worksheet["!cols"] = [
    { wch: 12 }, // PLACA
    { wch: 16 }, // MARCA
    { wch: 18 }, // MODELO
    { wch: 8 },  // AÑO
    { wch: 14 }, // TIPO
    { wch: 12 }, // CAPACIDAD
    { wch: 22 }, // SERVICIO
    { wch: 34 }, // CONTRATISTA
    { wch: 18 }, // VENCIMIENTO SOAT
    { wch: 18 }, // VENCIMIENTO RTM
    { wch: 22 }, // VENCIMIENTO POLIZAS
    { wch: 14 }, // ESTADO
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Flota");

  const fechaIso = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Matriz_Flota_TransServicesAB_${fechaIso}.xlsx`);
}

/**
 * Genera y descarga la Plantilla Oficial de Flota para carga y actualización masiva
 */
export function descargarPlantillaFlotaExcel() {
  const ejemploRows = [
    [
      "WLM789",
      "Chevrolet",
      "NPR Buseta",
      2023,
      "Buseta",
      24,
      "Transporte especial",
      "Trans Services Cooperativa A&B (Flota Propia)",
      "2027-03-15",
      "2027-04-20",
      "2027-06-10",
      "Activo",
    ],
    [
      "TLK456",
      "Renault",
      "Master Van",
      2024,
      "Van",
      16,
      "Escolar",
      "Transportes del Norte SAS",
      "", // Dejar en blanco si está pendiente
      "",
      "",
      "Activo",
    ],
  ];

  const fullData = [FLOTA_EXCEL_COLUMNS, ...ejemploRows];
  const wsData = XLSX.utils.aoa_to_sheet(fullData);

  wsData["!cols"] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 34 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
  ];

  // Hoja 2: Guía de Valores Permitidos
  const guiaData = [
    ["CAMPO", "OBLIGATORIO", "FORMATO / VALORES VÁLIDOS", "OBSERVACIÓN"],
    ["PLACA", "SÍ", "Texto de 6 caracteres (ej. WLM789 o WLM-789)", "Clave única del vehículo."],
    ["MARCA", "NO", "Texto libre (ej. Chevrolet, Renault, Nissan)", "Marca comercial."],
    ["MODELO", "NO", "Texto libre (ej. NPR, Master, Duster)", "Línea o referencia."],
    ["AÑO", "NO", "Número de 4 dígitos (ej. 2023)", "Año de fabricación."],
    ["TIPO", "NO", "Bus | Buseta | Microbús | Camioneta | Automóvil | Van", "Clase vehicular."],
    ["CAPACIDAD", "NO", "Número de pasajeros (ej. 16, 24)", "Capacidad máxima autorizada."],
    ["SERVICIO", "NO", "Especial | Escolar | Turismo", "Modalidad de transporte."],
    ["CONTRATISTA", "NO", "Razón Social o NIT de la empresa", "Si se deja vacío, se asume Flota Propia."],
    ["VENCIMIENTO SOAT", "NO", "YYYY-MM-DD o DD/MM/YYYY", "Dejar en blanco si aún no tiene fecha."],
    ["VENCIMIENTO RTM", "NO", "YYYY-MM-DD o DD/MM/YYYY", "Dejar en blanco si aún no tiene fecha."],
    ["VENCIMIENTO POLIZAS", "NO", "YYYY-MM-DD o DD/MM/YYYY", "Dejar en blanco si aún no tiene fecha."],
    ["ESTADO", "NO", "Activo | En mantenimiento | Inactivo", "Por defecto Activo."],
  ];
  const wsGuia = XLSX.utils.aoa_to_sheet(guiaData);
  wsGuia["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 45 }, { wch: 40 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsData, "Plantilla_Flota");
  XLSX.utils.book_append_sheet(workbook, wsGuia, "Guia_Valores");

  XLSX.writeFile(workbook, "Plantilla_Carga_Masiva_Flota_TransServicesAB.xlsx");
}
