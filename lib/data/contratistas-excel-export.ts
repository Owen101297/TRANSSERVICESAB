import * as XLSX from "xlsx";
import { Contratista, TIPO_OPERACION_LABELS, ESTADO_CONTRATISTA_LABELS } from "@/lib/types/contratista";

export const CONTRATISTAS_EXCEL_COLUMNS = [
  "NIT",
  "RAZON SOCIAL",
  "TIPO OPERACION",
  "ESTADO",
  "CONTACTO PRINCIPAL",
  "TELEFONO",
  "EMAIL",
  "DIRECCION",
  "FECHA VINCULACION",
  "FECHA FIN CONTRATO",
  "NOTAS",
];

/**
 * Exporta la matriz oficial de Contratistas a Excel con los datos actuales
 */
export function exportContratistasToExcel(contratistas: Contratista[]): void {
  const currentDate = new Date().toISOString().split("T")[0];

  const rowsData = contratistas.map((c) => [
    c.nit,
    c.nombre,
    TIPO_OPERACION_LABELS[c.tipoOperacion] || c.tipoOperacion,
    ESTADO_CONTRATISTA_LABELS[c.estado] || c.estado,
    c.contactoNombre || "",
    c.contactoTelefono || "",
    c.contactoEmail || "",
    (c as any).direccion || "",
    c.fechaVinculacion || "",
    c.fechaFinContrato || "",
    c.notas || "",
  ]);

  const fullData = [CONTRATISTAS_EXCEL_COLUMNS, ...rowsData];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  ws["!cols"] = [
    { wch: 18 }, // NIT
    { wch: 36 }, // RAZON SOCIAL
    { wch: 18 }, // TIPO OPERACION
    { wch: 14 }, // ESTADO
    { wch: 24 }, // CONTACTO PRINCIPAL
    { wch: 16 }, // TELEFONO
    { wch: 28 }, // EMAIL
    { wch: 24 }, // DIRECCION
    { wch: 18 }, // FECHA VINCULACION
    { wch: 18 }, // FECHA FIN CONTRATO
    { wch: 35 }, // NOTAS
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contratistas");

  XLSX.writeFile(wb, `Matriz_Contratistas_TransServicesAB_${currentDate}.xlsx`);
}

/**
 * Genera y descarga la Plantilla Oficial de Contratistas para carga y actualización masiva
 */
export function descargarPlantillaContratistasExcel(): void {
  const ejemploRows = [
    [
      "900.123.456-7",
      "Transportes del Norte SAS",
      "Fija",
      "Activo",
      "Carlos Mendoza",
      "3109876543",
      "operaciones@transnorte.com",
      "Calle 45 # 12-34, Bogotá",
      "2023-01-15",
      "2026-12-31",
      "Contratista de rutas fijas zona norte.",
    ],
    [
      "800.987.654-3",
      "Cooperativa de Transporte Fluvial y Terrestre",
      "Rotativa",
      "Activo",
      "Elena Vargas",
      "",
      "",
      "",
      "2024-02-01",
      "", // Dejar en blanco si es indefinido
      "",
    ],
  ];

  const fullData = [CONTRATISTAS_EXCEL_COLUMNS, ...ejemploRows];
  const wsData = XLSX.utils.aoa_to_sheet(fullData);

  wsData["!cols"] = [
    { wch: 18 },
    { wch: 36 },
    { wch: 18 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
    { wch: 28 },
    { wch: 24 },
    { wch: 18 },
    { wch: 18 },
    { wch: 35 },
  ];

  const guiaData = [
    ["CAMPO", "OBLIGATORIO", "FORMATO / VALORES VÁLIDOS", "OBSERVACIÓN"],
    ["NIT", "SÍ", "Número de NIT con o sin dígito de verificación (ej. 900.123.456-7)", "Identificador único de la empresa."],
    ["RAZON SOCIAL", "SÍ", "Nombre legal o comercial de la empresa", "Razón social completa."],
    ["TIPO OPERACION", "NO", "Fija | Rotativa", "Modalidad operativa (por defecto Fija)."],
    ["ESTADO", "NO", "Activo | Inactivo", "Estado actual (por defecto Activo)."],
    ["CONTACTO PRINCIPAL", "NO", "Nombre completo del representante o contacto", "Dejar en blanco si no se conoce."],
    ["TELEFONO", "NO", "Número de teléfono o celular", "Dejar en blanco si no se conoce."],
    ["EMAIL", "NO", "Correo electrónico de contacto", "Dejar en blanco si no se conoce."],
    ["DIRECCION", "NO", "Dirección física u oficina", "Dejar en blanco si no se conoce."],
    ["FECHA VINCULACION", "NO", "YYYY-MM-DD o DD/MM/YYYY", "Fecha de inicio del convenio."],
    ["FECHA FIN CONTRATO", "NO", "YYYY-MM-DD o DD/MM/YYYY", "Dejar en blanco si es indefinido o vigente."],
    ["NOTAS", "NO", "Texto libre", "Observaciones del aliado comercial."],
  ];
  const wsGuia = XLSX.utils.aoa_to_sheet(guiaData);
  wsGuia["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 45 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsData, "Plantilla_Contratistas");
  XLSX.utils.book_append_sheet(wb, wsGuia, "Guia_Valores");

  XLSX.writeFile(wb, "Plantilla_Carga_Masiva_Contratistas_TransServicesAB.xlsx");
}
