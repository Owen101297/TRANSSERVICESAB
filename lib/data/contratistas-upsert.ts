import * as XLSX from "xlsx";
import { Contratista, TipoOperacion, EstadoContratista } from "@/lib/types/contratista";

export interface RawContratistaImportRow {
  nombre?: string;
  razonSocial?: string;
  nit?: string;
  tipoOperacion?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  fechaVinculacion?: string;
  fechaFinContrato?: string;
  estado?: string;
  notas?: string;
  [key: string]: string | undefined;
}

export interface ContratistaUpsertPreviewItem {
  id: string;
  rowNumber: number;
  nombre: string;
  nit: string;
  tipoOperacion: TipoOperacion;
  contactoNombre: string;
  contactoTelefono: string;
  contactoEmail: string;
  fechaVinculacion: string;
  fechaFinContrato?: string;
  estado: EstadoContratista;
  notas?: string;
  action: "create" | "update" | "error";
  changesSummary?: string[];
  errorMessage?: string;
  originalContratista?: Contratista;
}

export interface ContratistaBatchAnalysisResult {
  items: ContratistaUpsertPreviewItem[];
  stats: {
    total: number;
    toCreate: number;
    toUpdate: number;
    errors: number;
  };
  diagnostico: string[];
}

/**
 * Normaliza nombres de columnas
 */
function normalizeKey(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Mapea las filas crudas de Excel a la estructura de Contratista
 */
export function mapRawRowToContratista(raw: Record<string, any>): RawContratistaImportRow {
  const normalized: RawContratistaImportRow = {};

  for (const [key, val] of Object.entries(raw)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val).trim();
    if (!strVal) continue;

    const normKey = normalizeKey(key);

    if (normKey.includes("razon") || normKey.includes("nombre") || normKey.includes("empresa") || normKey.includes("contratista")) {
      if (!normKey.includes("contacto") && !normKey.includes("rep")) {
        normalized.nombre = strVal;
      }
    }

    if (normKey.includes("nit") || normKey.includes("rut") || normKey.includes("identificacion")) {
      normalized.nit = strVal;
    }

    if (normKey.includes("operacion") || normKey.includes("tipo") || normKey.includes("modalidad")) {
      normalized.tipoOperacion = strVal;
    }

    if (normKey.includes("contacto") || normKey.includes("representante") || normKey.includes("encargado")) {
      if (!normKey.includes("tel") && !normKey.includes("cel") && !normKey.includes("mail") && !normKey.includes("correo")) {
        normalized.contactoNombre = strVal;
      }
    }

    if (normKey.includes("telefono") || normKey.includes("celular") || normKey.includes("movil") || normKey.includes("tel")) {
      normalized.contactoTelefono = strVal;
    }

    if (normKey.includes("email") || normKey.includes("correo") || normKey.includes("mail")) {
      normalized.contactoEmail = strVal;
    }

    if (normKey.includes("vinculacion") || normKey.includes("ingreso") || normKey.includes("inicio")) {
      normalized.fechaVinculacion = strVal;
    }

    if (normKey.includes("fin") || normKey.includes("vencimiento") || normKey.includes("terminacion")) {
      normalized.fechaFinContrato = strVal;
    }

    if (normKey.includes("estado")) {
      normalized.estado = strVal;
    }

    if (normKey.includes("nota") || normKey.includes("observacion") || normKey.includes("detalle")) {
      normalized.notas = strVal;
    }
  }

  return normalized;
}

/**
 * Analiza un lote de filas comparándolo con la base de datos existente
 */
export function analyzeContratistaUpsertBatch(
  rawRows: Record<string, any>[],
  existingContratistas: Contratista[]
): ContratistaBatchAnalysisResult {
  const existingMapByNit = new Map<string, Contratista>();
  for (const c of existingContratistas) {
    const cleanNit = c.nit.replace(/[^0-9kK]/g, "").toLowerCase();
    if (cleanNit) existingMapByNit.set(cleanNit, c);
  }

  const seenNitsInBatch = new Map<string, number>(); // cleanNit -> rowNumber
  const items: ContratistaUpsertPreviewItem[] = [];
  const diagnostico: string[] = [];

  let toCreate = 0;
  let toUpdate = 0;
  let errors = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const rowNumber = idx + 2; // Fila 1 es encabezado
    const raw = rawRows[idx];
    const mapped = mapRawRowToContratista(raw);

    const nombre = mapped.nombre || (mapped as any).razonSocial || "";
    const rawNit = mapped.nit || "";
    const cleanNit = rawNit.replace(/[^0-9kK]/g, "").toLowerCase();

    // Validar NIT obligatorio
    if (!cleanNit) {
      errors++;
      const msg = `Fila #${rowNumber}: Omitida porque no contiene NIT o Número de Identificación Tributaria.`;
      diagnostico.push(msg);
      items.push({
        id: `err_${idx}`,
        rowNumber,
        nombre: nombre || "Nombre no especificado",
        nit: "Sin NIT",
        tipoOperacion: "fija",
        contactoNombre: mapped.contactoNombre || "Pendiente",
        contactoTelefono: mapped.contactoTelefono || "Pendiente",
        contactoEmail: mapped.contactoEmail || "pendiente@ejemplo.com",
        fechaVinculacion: new Date().toISOString().split("T")[0],
        estado: "activo",
        action: "error",
        errorMessage: "NIT ausente o inválido",
      });
      continue;
    }

    // Validar Nombre obligatorio
    if (!nombre) {
      errors++;
      const msg = `Fila #${rowNumber}: Omitida porque no contiene Razón Social ni Nombre de la Empresa.`;
      diagnostico.push(msg);
      items.push({
        id: `err_${idx}`,
        rowNumber,
        nombre: "Sin Razón Social",
        nit: rawNit,
        tipoOperacion: "fija",
        contactoNombre: mapped.contactoNombre || "Pendiente",
        contactoTelefono: mapped.contactoTelefono || "Pendiente",
        contactoEmail: mapped.contactoEmail || "pendiente@ejemplo.com",
        fechaVinculacion: new Date().toISOString().split("T")[0],
        estado: "activo",
        action: "error",
        errorMessage: "Razón social ausente",
      });
      continue;
    }

    // Comprobar si el mismo NIT ya apareció en una fila previa del mismo Excel
    if (seenNitsInBatch.has(cleanNit)) {
      const prevRow = seenNitsInBatch.get(cleanNit)!;
      diagnostico.push(
        `Fila #${rowNumber} (${nombre}): El NIT ${rawNit} ya figuraba en la Fila #${prevRow} de este archivo. Se unificarán los datos.`
      );
    } else {
      seenNitsInBatch.set(cleanNit, rowNumber);
    }

    // Normalizar Tipo de Operación
    let tipoOperacion: TipoOperacion = "fija";
    if (mapped.tipoOperacion) {
      const lower = mapped.tipoOperacion.toLowerCase();
      if (lower.includes("rotat") || lower.includes("turno")) {
        tipoOperacion = "rotativa";
      }
    }

    // Normalizar Estado
    let estado: EstadoContratista = "activo";
    if (mapped.estado) {
      const lower = mapped.estado.toLowerCase();
      if (lower.includes("inactiv") || lower.includes("retir") || lower.includes("cancel")) {
        estado = "inactivo";
      }
    }

    // Normalizar Fecha Vinculación
    let fechaVinculacion = new Date().toISOString().split("T")[0];
    if (mapped.fechaVinculacion) {
      const parsed = new Date(mapped.fechaVinculacion);
      if (!isNaN(parsed.getTime())) {
        fechaVinculacion = parsed.toISOString().split("T")[0];
      }
    }

    // Normalizar Fecha Fin Contrato
    let fechaFinContrato: string | undefined = undefined;
    if (mapped.fechaFinContrato) {
      const parsed = new Date(mapped.fechaFinContrato);
      if (!isNaN(parsed.getTime())) {
        fechaFinContrato = parsed.toISOString().split("T")[0];
      }
    }

    const existing = existingMapByNit.get(cleanNit);

    if (existing) {
      toUpdate++;
      const changes: string[] = [];
      if (existing.nombre !== nombre) changes.push(`Razón Social: "${existing.nombre}" ➔ "${nombre}"`);
      if (existing.tipoOperacion !== tipoOperacion) changes.push(`Operación: ${existing.tipoOperacion} ➔ ${tipoOperacion}`);
      if (mapped.contactoTelefono && existing.contactoTelefono !== mapped.contactoTelefono) changes.push("Teléfono de contacto");
      if (mapped.contactoEmail && existing.contactoEmail !== mapped.contactoEmail) changes.push("Email de contacto");
      if (fechaFinContrato && existing.fechaFinContrato !== fechaFinContrato) changes.push("Fecha fin de contrato");

      items.push({
        id: existing.id,
        rowNumber,
        nombre,
        nit: rawNit,
        tipoOperacion,
        contactoNombre: mapped.contactoNombre || existing.contactoNombre,
        contactoTelefono: mapped.contactoTelefono || existing.contactoTelefono,
        contactoEmail: mapped.contactoEmail || existing.contactoEmail,
        fechaVinculacion: existing.fechaVinculacion || fechaVinculacion,
        fechaFinContrato: fechaFinContrato || existing.fechaFinContrato,
        estado,
        notas: mapped.notas || existing.notas,
        action: "update",
        changesSummary: changes.length > 0 ? changes : ["Sin modificaciones detectadas (datos idénticos)"],
        originalContratista: existing,
      });
    } else {
      toCreate++;
      items.push({
        id: `new_${idx}_${Date.now()}`,
        rowNumber,
        nombre,
        nit: rawNit,
        tipoOperacion,
        contactoNombre: mapped.contactoNombre || "Pendiente",
        contactoTelefono: mapped.contactoTelefono || "Pendiente",
        contactoEmail: mapped.contactoEmail || "pendiente@ejemplo.com",
        fechaVinculacion,
        fechaFinContrato,
        estado,
        notas: mapped.notas,
        action: "create",
      });
    }
  }

  return {
    items,
    stats: {
      total: rawRows.length,
      toCreate,
      toUpdate,
      errors,
    },
    diagnostico,
  };
}

/**
 * Lee un archivo File (Excel o CSV) desde el navegador
 */
export async function parseContratistasFile(file: File): Promise<Record<string, any>[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
}
