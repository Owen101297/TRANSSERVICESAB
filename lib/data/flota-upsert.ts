import * as XLSX from "xlsx";
import { Vehiculo, TipoVehiculo, ServicioVehiculo, EstadoVehiculo } from "@/lib/types/vehiculo";

export interface DiagnosticoFilaVehiculo {
  filaOriginal: number; // # fila real en Excel
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  tipo: TipoVehiculo;
  servicio: ServicioVehiculo;
  capacidad: number;
  contratistaNombre: string;
  soatVencimiento?: string;
  rtmVencimiento?: string;
  polizaVencimiento?: string;
  estado: EstadoVehiculo;
  valido: boolean;
  motivo?: string;
}

export interface ResultadoAnalisisLoteFlota {
  filasValidas: DiagnosticoFilaVehiculo[];
  filasOmitidas: DiagnosticoFilaVehiculo[];
  placasDuplicadasArchivo: string[];
  totalFilasLeidas: number;
}

/**
 * Normaliza una placa vehicular colombiana (ej. "wlm789" -> "WLM-789")
 */
export function normalizarPlaca(raw: any): string {
  if (!raw) return "";
  let clean = String(raw).toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
  if (clean.length === 6) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

/**
 * Normaliza el tipo de vehículo
 */
export function normalizarTipoVehiculo(raw: any): TipoVehiculo {
  const str = String(raw || "").toLowerCase().trim();
  if (str.includes("buseta")) return "buseta";
  if (str.includes("micro") || str.includes("vanette")) return "microbus";
  if (str.includes("camioneta") || str.includes("suv") || str.includes("duster") || str.includes("hilux")) return "camioneta";
  if (str.includes("auto") || str.includes("sedan")) return "automovil";
  if (str.includes("van") || str.includes("h1") || str.includes("urvan")) return "van";
  return "bus";
}

/**
 * Normaliza el tipo de servicio
 */
export function normalizarServicioVehiculo(raw: any): ServicioVehiculo {
  const str = String(raw || "").toLowerCase().trim();
  if (str.includes("escolar") || str.includes("colegio")) return "escolar";
  if (str.includes("turis") || str.includes("viaje")) return "turismo";
  return "especial";
}

/**
 * Normaliza el estado del vehículo
 */
export function normalizarEstadoVehiculo(raw: any): EstadoVehiculo {
  const str = String(raw || "").toLowerCase().trim();
  if (str.includes("manten") || str.includes("taller")) return "mantenimiento";
  if (str.includes("inact") || str.includes("retir")) return "inactivo";
  return "activo";
}

/**
 * Normaliza una fecha a formato ISO YYYY-MM-DD sin inventar fechas por defecto
 */
export function normalizarFechaISO(raw: any): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "number") {
    // Fecha numérica de Excel
    const d = XLSX.SSF.parse_date_code(raw);
    if (d && d.y > 1990 && d.y < 2100) {
      const mes = String(d.m).padStart(2, "0");
      const dia = String(d.d).padStart(2, "0");
      return `${d.y}-${mes}-${dia}`;
    }
  }

  const str = String(raw).trim();
  if (!str || str.toLowerCase() === "sin fecha" || str === "—" || str === "-") return undefined;

  if (str.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY o DD-MM-YYYY
  if (str.includes("/") || str.includes("-")) {
    const delimiter = str.includes("/") ? "/" : "-";
    const parts = str.split(delimiter);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        const anio = parts[0];
        const mes = parts[1].padStart(2, "0");
        const dia = parts[2].padStart(2, "0");
        return `${anio}-${mes}-${dia}`;
      } else {
        // DD/MM/YYYY
        const dia = parts[0].padStart(2, "0");
        const mes = parts[1].padStart(2, "0");
        const anio = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${anio}-${mes}-${dia}`;
      }
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

/**
 * Analiza un archivo Excel o CSV de flota con escaneo inteligente de cabeceras
 */
export function analizarArchivoExcelFlota(buffer: ArrayBuffer): ResultadoAnalisisLoteFlota {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // 1. Convertir a matriz bidimensional de filas
  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (matrix.length === 0) {
    return {
      filasValidas: [],
      filasOmitidas: [],
      placasDuplicadasArchivo: [],
      totalFilasLeidas: 0,
    };
  }

  // 2. Escanear las primeras 15 filas para localizar la fila de cabeceras
  let headerRowIndex = 0;
  let headers: string[] = [];

  for (let r = 0; r < Math.min(matrix.length, 15); r++) {
    const row = matrix[r].map((cell: any) => String(cell || "").trim().toUpperCase());
    if (row.some((cell: string) => cell === "PLACA" || cell === "MATRICULA" || cell === "MATRÍCULA" || cell === "VEHICULO")) {
      headerRowIndex = r;
      headers = row;
      break;
    }
  }

  // Si no se encontró fila explícita, usar la primera fila
  if (headers.length === 0) {
    headers = matrix[0].map((cell: any) => String(cell || "").trim().toUpperCase());
  }

  const filasValidas: DiagnosticoFilaVehiculo[] = [];
  const filasOmitidas: DiagnosticoFilaVehiculo[] = [];
  const placasVistasEnArchivo = new Map<string, number>();
  const placasDuplicadasArchivo: string[] = [];

  // 3. Procesar filas de datos a partir de la fila siguiente a la cabecera
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const rowValues = matrix[i];
    const filaOriginal = i + 1;

    // Verificar si la fila está vacía o es fila de totales/pie de página
    const firstCell = String(rowValues[0] || "").trim().toUpperCase();
    if (firstCell.startsWith("TOTAL") || firstCell.startsWith("RESUMEN") || firstCell.startsWith("CÓDIGO")) {
      continue;
    }

    const rowObj: Record<string, any> = {};
    headers.forEach((h, colIdx) => {
      if (h) {
        rowObj[h] = rowValues[colIdx];
      }
    });

    // Mapear campos con tolerancia a variaciones
    const rawPlaca = rowObj["PLACA"] || rowObj["MATRICULA"] || rowObj["MATRÍCULA"] || rowObj["VEHICULO"] || rowObj["VEHÍCULO"];
    const rawMarca = rowObj["MARCA"] || "Genérico";
    const rawModelo = rowObj["MODELO"] || rowObj["LÍNEA"] || rowObj["LINEA"] || "Línea Estándar";
    const rawAnio = parseInt(rowObj["AÑO"] || rowObj["ANIO"] || rowObj["AÑO MODELO"] || "2023", 10);
    const rawCapacidad = parseInt(rowObj["CAPACIDAD"] || rowObj["PASAJEROS"] || rowObj["PUESTOS"] || "16", 10);
    const rawTipo = rowObj["TIPO"] || rowObj["TIPO DE VEHÍCULO"] || rowObj["CLASE"] || rowObj["CARROCERÍA"];
    const rawServicio = rowObj["SERVICIO"] || rowObj["MODALIDAD"] || rowObj["MODALIDAD DE SERVICIO"];
    const rawContratista = rowObj["CONTRATISTA"] || rowObj["CONTRATISTA / ALIADO PROPIETARIO"] || rowObj["EMPRESA"] || rowObj["PROPIETARIO"];
    const rawEstado = rowObj["ESTADO"] || rowObj["ESTADO OPERATIVO"];

    const rawSoat = rowObj["VENCIMIENTO SOAT"] || rowObj["SOAT"] || rowObj["FECHA SOAT"];
    const rawRtm = rowObj["VENCIMIENTO RTM"] || rowObj["RTM"] || rowObj["TECNOMECANICA"] || rowObj["TÉCNICOMECÁNICA"];
    const rawPoliza = rowObj["VENCIMIENTO POLIZAS"] || rowObj["VENCIMIENTO PÓLIZAS"] || rowObj["VENCIMIENTO PÓLIZAS RCC/RCE"] || rowObj["POLIZAS"] || rowObj["PÓLIZAS"];

    const placa = normalizarPlaca(rawPlaca);
    if (!placa) {
      // Ignorar filas completamente en blanco
      continue;
    }

    const marca = String(rawMarca).trim();
    const modelo = String(rawModelo).trim();
    const anio = isNaN(rawAnio) ? new Date().getFullYear() : rawAnio;
    const capacidad = isNaN(rawCapacidad) ? 16 : rawCapacidad;
    const tipo = normalizarTipoVehiculo(rawTipo);
    const servicio = normalizarServicioVehiculo(rawServicio);
    const estado = normalizarEstadoVehiculo(rawEstado);
    const contratistaNombre = String(rawContratista || "Flota Propia / Trans Services A&B").trim();

    // Fechas normalizadas estrictas (undefined si está vacía)
    const soatVencimiento = normalizarFechaISO(rawSoat);
    const rtmVencimiento = normalizarFechaISO(rawRtm);
    const polizaVencimiento = normalizarFechaISO(rawPoliza);

    // Validación básica: Placa obligatoria de al menos 5 caracteres
    if (placa.length < 5) {
      filasOmitidas.push({
        filaOriginal,
        placa: placa || "INVÁLIDA",
        marca,
        modelo,
        anio,
        tipo,
        servicio,
        capacidad,
        contratistaNombre,
        estado: "inactivo",
        valido: false,
        motivo: "Placa incompleta o con formato inválido.",
      });
      continue;
    }

    // Detección de duplicados dentro del mismo archivo
    if (placasVistasEnArchivo.has(placa)) {
      const filaPrevia = placasVistasEnArchivo.get(placa);
      if (!placasDuplicadasArchivo.includes(placa)) {
        placasDuplicadasArchivo.push(placa);
      }
      filasOmitidas.push({
        filaOriginal,
        placa,
        marca,
        modelo,
        anio,
        tipo,
        servicio,
        capacidad,
        contratistaNombre,
        estado,
        valido: false,
        motivo: `Placa repetida en el mismo archivo (primera aparición en fila #${filaPrevia}).`,
      });
      continue;
    }

    placasVistasEnArchivo.set(placa, filaOriginal);

    filasValidas.push({
      filaOriginal,
      placa,
      marca,
      modelo,
      anio,
      tipo,
      servicio,
      capacidad,
      contratistaNombre,
      soatVencimiento,
      rtmVencimiento,
      polizaVencimiento,
      estado,
      valido: true,
    });
  }

  return {
    filasValidas,
    filasOmitidas,
    placasDuplicadasArchivo,
    totalFilasLeidas: filasValidas.length + filasOmitidas.length,
  };
}
