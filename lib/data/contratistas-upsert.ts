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
  direccion?: string;
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
    if (!strVal || strVal === "—" || strVal === "-") continue;

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

    if (normKey.includes("direccion") || normKey.includes("sede") || normKey.includes("oficina")) {
      normalized.direccion = strVal;
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

  const seenNitsInBatch = new Map<string, number>();
  const items: ContratistaUpsertPreviewItem[] = [];
  const diagnostico: string[] = [];

  let toCreate = 0;
  let toUpdate = 0;
  let errors = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const rowNumber = idx + 2;
    const raw = rawRows[idx];
    const mapped = mapRawRowToContratista(raw);

    const nombre = mapped.nombre || (mapped as any).razonSocial || "";
    const rawNit = mapped.nit || "";
    const cleanNit = rawNit.replace(/[^0-9kK]/g, "").toLowerCase();

    // 1. Validaciones requeridas
    if (!cleanNit || cleanNit.length < 5) {
      errors++;
      items.push({
        id: `err_${idx}_${Date.now()}`,
        rowNumber,
        nombre: nombre || "Empresa Desconocida",
        nit: rawNit || "NIT Vacío",
        tipoOperacion: "fija",
        contactoNombre: "",
        contactoTelefono: "",
        contactoEmail: "",
        fechaVinculacion: new Date().toISOString().split("T")[0],
        estado: "activo",
        action: "error",
        errorMessage: "NIT ausente o con formato inválido.",
      });
      continue;
    }

    if (!nombre) {
      errors++;
      items.push({
        id: `err_${idx}_${Date.now()}`,
        rowNumber,
        nombre: "Falta Razón Social",
        nit: rawNit,
        tipoOperacion: "fija",
        contactoNombre: "",
        contactoTelefono: "",
        contactoEmail: "",
        fechaVinculacion: new Date().toISOString().split("T")[0],
        estado: "activo",
        action: "error",
        errorMessage: "Falta la Razón Social / Nombre de la empresa.",
      });
      continue;
    }

    // 2. Detección de duplicados dentro del mismo archivo
    if (seenNitsInBatch.has(cleanNit)) {
      errors++;
      const prevRow = seenNitsInBatch.get(cleanNit);
      items.push({
        id: `err_dup_${idx}_${Date.now()}`,
        rowNumber,
        nombre,
        nit: rawNit,
        tipoOperacion: "fija",
        contactoNombre: "",
        contactoTelefono: "",
        contactoEmail: "",
        fechaVinculacion: new Date().toISOString().split("T")[0],
        estado: "activo",
        action: "error",
        errorMessage: `NIT duplicado en el mismo archivo (primera aparición en fila #${prevRow}).`,
      });
      continue;
    }
    seenNitsInBatch.set(cleanNit, rowNumber);

    // 3. Normalizaciones
    const tipoOperacion: TipoOperacion = (mapped.tipoOperacion || "").toLowerCase().includes("rotat") ? "rotativa" : "fija";
    const estado: EstadoContratista = (mapped.estado || "").toLowerCase().includes("inact") ? "inactivo" : "activo";
    const fechaVinculacion = mapped.fechaVinculacion || new Date().toISOString().split("T")[0];
    const fechaFinContrato = mapped.fechaFinContrato || undefined;

    // 4. Determinar si es Creación o Actualización
    const existing = existingMapByNit.get(cleanNit);

    if (existing) {
      const changes: string[] = [];
      if (existing.nombre !== nombre) changes.push(`Nombre: "${existing.nombre}" → "${nombre}"`);
      if (existing.tipoOperacion !== tipoOperacion) changes.push(`Operación: ${existing.tipoOperacion} → ${tipoOperacion}`);
      if (mapped.contactoNombre && existing.contactoNombre !== mapped.contactoNombre) changes.push(`Contacto: "${existing.contactoNombre}" → "${mapped.contactoNombre}"`);
      if (mapped.contactoTelefono && existing.contactoTelefono !== mapped.contactoTelefono) changes.push(`Teléfono: "${existing.contactoTelefono}" → "${mapped.contactoTelefono}"`);
      if (mapped.contactoEmail && existing.contactoEmail !== mapped.contactoEmail) changes.push(`Email: "${existing.contactoEmail}" → "${mapped.contactoEmail}"`);
      if (existing.estado !== estado) changes.push(`Estado: ${existing.estado} → ${estado}`);

      toUpdate++;
      items.push({
        id: existing.id,
        rowNumber,
        nombre,
        nit: existing.nit,
        tipoOperacion,
        contactoNombre: mapped.contactoNombre || existing.contactoNombre || "",
        contactoTelefono: mapped.contactoTelefono || existing.contactoTelefono || "",
        contactoEmail: mapped.contactoEmail || existing.contactoEmail || "",
        fechaVinculacion: existing.fechaVinculacion,
        fechaFinContrato: fechaFinContrato || existing.fechaFinContrato,
        estado,
        notas: mapped.notas || existing.notas,
        action: "update",
        changesSummary: changes.length > 0 ? changes : ["Sin cambios detectados (se revalidará registro)"],
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
        contactoNombre: mapped.contactoNombre || "",
        contactoTelefono: mapped.contactoTelefono || "",
        contactoEmail: mapped.contactoEmail || "",
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
 * Lee un archivo File (Excel o CSV) desde el navegador con escaneo inteligente de cabeceras
 */
export async function parseContratistasFile(file: File): Promise<Record<string, any>[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  if (matrix.length === 0) return [];

  // Localizar la fila de cabeceras
  let headerRowIndex = 0;
  let headers: string[] = [];

  for (let r = 0; r < Math.min(matrix.length, 15); r++) {
    const row = matrix[r].map((cell: any) => String(cell || "").trim());
    if (row.some((cell: string) => {
      const c = normalizeKey(cell);
      return ["nit", "razonsocial", "contratista", "empresa", "nombre"].includes(c);
    })) {
      headerRowIndex = r;
      headers = row;
      break;
    }
  }

  if (headers.length === 0) {
    headers = matrix[0].map((cell: any) => String(cell || "").trim());
  }

  const resultRows: Record<string, any>[] = [];

  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const rowValues = matrix[i];
    const firstCell = String(rowValues[0] || "").trim().toUpperCase();
    if (firstCell.startsWith("TOTAL") || firstCell.startsWith("RESUMEN") || firstCell.startsWith("CÓDIGO")) {
      continue;
    }

    const rowObj: Record<string, any> = {};
    let hasData = false;
    headers.forEach((h, colIdx) => {
      if (h) {
        const val = rowValues[colIdx];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          hasData = true;
          rowObj[h] = val;
        }
      }
    });

    if (hasData) {
      resultRows.push(rowObj);
    }
  }

  return resultRows;
}
