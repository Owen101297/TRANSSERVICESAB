import * as XLSX from "xlsx";
import { Vehiculo, TIPO_LABELS, SERVICIO_LABELS, ESTADO_VEHICULO_LABELS } from "@/lib/types/vehiculo";
import { calcularAlertaFecha } from "@/lib/utils/alertas-flota";

/**
 * Genera y descarga el archivo Excel oficial de Flota con membrete institucional de Trans Services A&B
 * Código documental: FL-FOR-01 (Matriz de Control y Cumplimiento Legal del Parque Automotor)
 */
export function exportarFlotaAExcel(vehiculos: Vehiculo[], asignacionesMap?: Record<string, string>) {
  const hoyStr = new Date().toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const fechaGeneracion = new Date().toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });

  // 1. Cabecera Corporativa Membretada (FL-FOR-01)
  const headerData = [
    ["TRANS SERVICES COOPERATIVA A&B"],
    ["NIT: 901.234.567-8 | TRANSPORTE ESPECIAL, ESCOLAR Y TURISMO"],
    ["SISTEMA DE GESTIÓN INTEGRAL HSEQ & PESV"],
    ["MATRIZ DE CONTROL Y CUMPLIMIENTO LEGAL DEL PARQUE AUTOMOTOR (FLOTA)"],
    [`Código Documental: FL-FOR-01 | Versión: 3.0 | Fecha de Corte: ${hoyStr}`],
    [], // Fila en blanco
    [
      "ÍTEM",
      "PLACA",
      "TIPO DE VEHÍCULO",
      "MARCA",
      "LÍNEA / MODELO",
      "AÑO",
      "CAPACIDAD (PASAJEROS)",
      "MODALIDAD DE SERVICIO",
      "CONTRATISTA / ALIADO PROPIETARIO",
      "CONDUCTOR ASIGNADO",
      "ESTADO OPERATIVO",
      "VENCIMIENTO SOAT",
      "ESTADO SOAT",
      "VENCIMIENTO RTM",
      "ESTADO RTM",
      "VENCIMIENTO PÓLIZAS RCC/RCE",
      "ESTADO PÓLIZAS",
    ],
  ];

  // 2. Mapeo de Filas de Vehículos
  const rowsData = vehiculos.map((v, idx) => {
    const alertaSoat = calcularAlertaFecha(v.documentos?.soatVencimiento, "SOAT");
    const alertaRtm = calcularAlertaFecha(v.documentos?.rtmVencimiento, "RTM");
    const alertaPoliza = calcularAlertaFecha(v.documentos?.polizaVencimiento, "Pólizas");

    const conductorNombre = asignacionesMap ? asignacionesMap[v.placa] || "Sin asignar" : "Sin asignar";

    return [
      idx + 1,
      v.placa,
      TIPO_LABELS[v.tipo] || v.tipo,
      v.marca,
      v.modelo,
      v.anio,
      v.capacidad,
      SERVICIO_LABELS[v.servicio] || v.servicio,
      v.contratistaNombre || "Propio / Cooperativa",
      conductorNombre,
      ESTADO_VEHICULO_LABELS[v.estado] || v.estado,
      v.documentos?.soatVencimiento || "Sin fecha",
      alertaSoat.etiqueta,
      v.documentos?.rtmVencimiento || "Sin fecha",
      alertaRtm.etiqueta,
      v.documentos?.polizaVencimiento || "Sin fecha",
      alertaPoliza.etiqueta,
    ];
  });

  // 3. Fila de Resumen / Pie de Informe
  const totalVehiculos = vehiculos.length;
  const activos = vehiculos.filter((x) => x.estado === "activo").length;
  const enMantenimiento = vehiculos.filter((x) => x.estado === "mantenimiento").length;

  const footerData = [
    [],
    [
      "TOTAL VEHÍCULOS REGISTRADOS:",
      totalVehiculos,
      `Activos: ${activos}`,
      `En Mantenimiento: ${enMantenimiento}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `Generado: ${fechaGeneracion}`,
      "A&B OS Sistema de Gestión",
    ],
  ];

  const fullData = [...headerData, ...rowsData, ...footerData];

  // 4. Crear Libro de Trabajo
  const worksheet = XLSX.utils.aoa_to_sheet(fullData);

  // 5. Ajustar anchos de columna automáticos
  worksheet["!cols"] = [
    { wch: 6 },  // Ítem
    { wch: 12 }, // Placa
    { wch: 18 }, // Tipo
    { wch: 16 }, // Marca
    { wch: 18 }, // Modelo
    { wch: 8 },  // Año
    { wch: 12 }, // Capacidad
    { wch: 22 }, // Servicio
    { wch: 32 }, // Contratista
    { wch: 26 }, // Conductor
    { wch: 18 }, // Estado Operativo
    { wch: 16 }, // SOAT
    { wch: 20 }, // Estado SOAT
    { wch: 16 }, // RTM
    { wch: 20 }, // Estado RTM
    { wch: 18 }, // Pólizas
    { wch: 20 }, // Estado Pólizas
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Matriz de Flota FL-FOR-01");

  // 6. Descargar archivo
  const fechaIso = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Matriz_Flota_TransServicesAB_FL-FOR-01_${fechaIso}.xlsx`);
}
