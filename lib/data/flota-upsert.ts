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
 * Normaliza una fecha a formato ISO YYYY-MM-DD
 */
export function normalizarFechaISO(raw: any): string | undefined {
  if (!raw) return undefined;
  if (typeof raw === "number") {
    // Fecha numérica de Excel
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) {
      const mes = String(d.m).padStart(2, "0");
      const dia = String(d.d).padStart(2, "0");
      return `${d.y}-${mes}-${dia}`;
    }
  }

  const str = String(raw).trim();
  if (str.length === 10 && str.includes("-")) return str;

  // DD/MM/YYYY
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      const dia = parts[0].padStart(2, "0");
      const mes = parts[1].padStart(2, "0");
      const anio = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${anio}-${mes}-${dia}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

/**
 * Analiza un archivo Excel o CSV de flota y genera el informe de diagnóstico fila por fila
 */
export function analizarArchivoExcelFlota(buffer: ArrayBuffer): ResultadoAnalisisLoteFlota {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convertir a matriz de objetos crudos con fila de encabezado
  const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const filasValidas: DiagnosticoFilaVehiculo[] = [];
  const filasOmitidas: DiagnosticoFilaVehiculo[] = [];
  const placasVistasEnArchivo = new Map<string, number>();
  const placasDuplicadasArchivo: string[] = [];

  rawJson.forEach((row, index) => {
    const filaOriginal = index + 2; // Fila 1 = encabezados

    // Buscar campos con tolerancia a encabezados variados
    const rawPlaca = row["PLACA"] || row["Placa"] || row["placa"] || row["Matrícula"] || row["MATRICULA"] || row["Vehiculo"] || row["VEHICULO"];
    const rawMarca = row["MARCA"] || row["Marca"] || row["marca"] || "Genérico";
    const rawModelo = row["MODELO"] || row["Modelo"] || row["LÍNEA"] || row["Linea"] || row["linea"] || "Línea Estándar";
    const rawAnio = parseInt(row["AÑO"] || row["Año"] || row["Modelo (Año)"] || row["anio"] || row["ANIO"] || "2022", 10);
    const rawCapacidad = parseInt(row["CAPACIDAD"] || row["Capacidad"] || row["Pasajeros"] || row["PASAJEROS"] || row["Puestos"] || "16", 10);
    const rawTipo = row["TIPO"] || row["Tipo"] || row["Clase"] || row["CLASE"] || row["Carrocería"];
    const rawServicio = row["SERVICIO"] || row["Servicio"] || row["Modalidad"] || row["MODALIDAD"];
    const rawContratista = row["CONTRATISTA"] || row["Contratista"] || row["Propietario"] || row["PROPIETARIO"] || row["Empresa"] || "Propio / Cooperativa";

    const rawSoat = row["SOAT"] || row["Vencimiento SOAT"] || row["VENCIMIENTO SOAT"] || row["Fecha SOAT"];
    const rawRtm = row["RTM"] || row["Vencimiento RTM"] || row["VENCIMIENTO RTM"] || row["Tecnomecanica"] || row["TÉCNICOMECÁNICA"];
    const rawPoliza = row["POLIZAS"] || row["PÓLIZAS"] || row["Poliza RCC"] || row["Póliza"] || row["Vencimiento Pólizas"];

    const placa = normalizarPlaca(rawPlaca);
    const marca = String(rawMarca).trim();
    const modelo = String(rawModelo).trim();
    const anio = isNaN(rawAnio) ? new Date().getFullYear() : rawAnio;
    const capacidad = isNaN(rawCapacidad) ? 16 : rawCapacidad;
    const tipo = normalizarTipoVehiculo(rawTipo);
    const servicio = normalizarServicioVehiculo(rawServicio);
    const contratistaNombre = String(rawContratista).trim();

    const soatVencimiento = normalizarFechaISO(rawSoat);
    const rtmVencimiento = normalizarFechaISO(rawRtm);
    const polizaVencimiento = normalizarFechaISO(rawPoliza);

    // Validación básica: Placa obligatoria de al menos 5 caracteres
    if (!placa || placa.length < 5) {
      filasOmitidas.push({
        filaOriginal,
        placa: placa || "VACÍA",
        marca,
        modelo,
        anio,
        tipo,
        servicio,
        capacidad,
        contratistaNombre,
        estado: "inactivo",
        valido: false,
        motivo: "Falta la placa del vehículo o es inválida.",
      });
      return;
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
        estado: "activo",
        valido: false,
        motivo: `Placa repetida en el mismo archivo (previamente leída en la fila #${filaPrevia}).`,
      });
      return;
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
      estado: "activo",
      valido: true,
    });
  });

  return {
    filasValidas,
    filasOmitidas,
    placasDuplicadasArchivo,
    totalFilasLeidas: rawJson.length,
  };
}
