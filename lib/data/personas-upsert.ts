import { Persona, TipoDocumento, PerfilPersona, EstadoPersona } from "@/lib/types/persona";
import { SEED_PERSONAS } from "@/lib/data/personas";

export interface RawPersonaCSVRow {
  numeroDocumento?: string;
  cedula?: string;
  tipoDocumento?: string;
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  correo?: string;
  perfil?: string;
  perfiles?: string;
  estado?: string;
  contratista?: string;
  contratistaNombre?: string;
  [key: string]: string | undefined;
}

export interface UpsertPreviewItem {
  id: string;
  numeroDocumento: string;
  tipoDocumento: TipoDocumento;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  perfiles: PerfilPersona[];
  estado: EstadoPersona;
  contratistaNombre?: string;
  fotoIniciales: string;
  action: "create" | "update" | "error";
  changesSummary?: string[];
  errorMessage?: string;
  originalPerson?: Persona;
}

export interface UpsertBatchResult {
  previewItems: UpsertPreviewItem[];
  stats: {
    total: number;
    toCreate: number;
    toUpdate: number;
    errors: number;
  };
}

/**
 * Parser de texto CSV compatible con delimitadores coma (,) y punto y coma (;)
 */
export function parseCSVText(csvText: string): RawPersonaCSVRow[] {
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return [];

  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes(";") ? ";" : ",";

  const headers = headerLine
    .split(delimiter)
    .map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  const rows: RawPersonaCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""));
    const rowObj: RawPersonaCSVRow = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] ?? "";
    });
    rows.push(rowObj);
  }

  return rows;
}

function computeInitials(nombres: string, apellidos: string): string {
  const first = nombres.trim().charAt(0) || "U";
  const second = apellidos.trim().charAt(0) || "";
  return `${first}${second}`.toUpperCase();
}

function normalizeTipoDoc(val?: string): TipoDocumento {
  const upper = (val || "").toUpperCase().trim();
  if (["CE", "PA", "TI"].includes(upper)) return upper as TipoDocumento;
  return "CC";
}

function normalizeEstado(val?: string): EstadoPersona {
  const lower = (val || "").toLowerCase().trim();
  if (lower.includes("descanso")) return "descanso";
  if (lower.includes("vaca")) return "vacaciones";
  if (lower.includes("inact")) return "inactivo";
  return "activo";
}

function normalizePerfiles(val?: string): PerfilPersona[] {
  if (!val) return ["conductor"];
  const rawList = val.toLowerCase().split(/[,|/]/).map((p) => p.trim());
  const validProfiles: PerfilPersona[] = [];

  rawList.forEach((item) => {
    if (item.includes("conduct")) validProfiles.push("conductor");
    else if (item.includes("hseq")) validProfiles.push("hseq");
    else if (item.includes("superv")) validProfiles.push("supervisor");
    else if (item.includes("admin")) validProfiles.push("administrativo");
    else if (item.includes("emplead")) validProfiles.push("empleado");
  });

  return validProfiles.length > 0 ? Array.from(new Set(validProfiles)) : ["conductor"];
}

/**
 * Analiza un lote de filas CSV contra la base de datos actual (SEED_PERSONAS)
 * y devuelve el diagnóstico previo con los cambios detectados.
 */
export function analyzePersonaUpsertBatch(
  rows: RawPersonaCSVRow[],
  currentPersons: Persona[] = SEED_PERSONAS
): UpsertBatchResult {
  const previewItems: UpsertPreviewItem[] = [];
  let toCreate = 0;
  let toUpdate = 0;
  let errors = 0;

  rows.forEach((row, index) => {
    const rawCedula = (row.numerodocumento || row.cedula || row.documento || "").replace(/\D/g, "");
    
    let nombres = (row.nombres || "").trim();
    let apellidos = (row.apellidos || "").trim();
    
    if (!nombres && row.nombrecompleto) {
      const parts = row.nombrecompleto.trim().split(" ");
      nombres = parts.slice(0, Math.ceil(parts.length / 2)).join(" ");
      apellidos = parts.slice(Math.ceil(parts.length / 2)).join(" ");
    }

    if (!rawCedula || (!nombres && !apellidos)) {
      errors++;
      previewItems.push({
        id: `err_${index}`,
        numeroDocumento: rawCedula || "S/N",
        tipoDocumento: "CC",
        nombres: nombres || "—",
        apellidos: apellidos || "—",
        telefono: row.telefono || row.celular || "—",
        email: row.email || row.correo || "—",
        perfiles: ["conductor"],
        estado: "activo",
        fotoIniciales: "??",
        action: "error",
        errorMessage: "Falta número de cédula o nombre en la fila.",
      });
      return;
    }

    const existingPerson = currentPersons.find(
      (p) => p.numeroDocumento.replace(/\D/g, "") === rawCedula
    );

    const tipoDoc = normalizeTipoDoc(row.tipodocumento);
    const telefono = row.telefono || row.celular || (existingPerson ? existingPerson.telefono : "");
    const email = row.email || row.correo || (existingPerson ? existingPerson.email : "");
    const contratista = row.contratistanombre || row.contratista || existingPerson?.contratistaNombre;
    const perfiles = row.perfil || row.perfiles ? normalizePerfiles(row.perfil || row.perfiles) : (existingPerson?.perfiles || ["conductor"]);
    const estado = row.estado ? normalizeEstado(row.estado) : (existingPerson?.estado || "activo");
    const finalNombres = nombres || existingPerson?.nombres || "";
    const finalApellidos = apellidos || existingPerson?.apellidos || "";

    if (existingPerson) {
      const changes: string[] = [];
      if (telefono && telefono !== existingPerson.telefono) changes.push(`Teléfono: ${telefono}`);
      if (email && email !== existingPerson.email) changes.push(`Email: ${email}`);
      if (contratista && contratista !== existingPerson.contratistaNombre) changes.push(`Contratista: ${contratista}`);
      if (estado !== existingPerson.estado) changes.push(`Estado: ${estado}`);

      toUpdate++;
      previewItems.push({
        id: existingPerson.id,
        numeroDocumento: rawCedula,
        tipoDocumento: tipoDoc,
        nombres: finalNombres,
        apellidos: finalApellidos,
        telefono,
        email,
        perfiles,
        estado,
        contratistaNombre: contratista,
        fotoIniciales: computeInitials(finalNombres, finalApellidos),
        action: "update",
        changesSummary: changes.length > 0 ? changes : ["Sin cambios detectados (se mantendrán datos actuales)"],
        originalPerson: existingPerson,
      });
    } else {
      toCreate++;
      previewItems.push({
        id: `p_new_${Date.now()}_${index}`,
        numeroDocumento: rawCedula,
        tipoDocumento: tipoDoc,
        nombres: finalNombres,
        apellidos: finalApellidos,
        telefono: telefono || "300 000 0000",
        email: email || `${finalNombres.toLowerCase().replace(/\s+/g, ".") || "usuario"}@ejemplo.com`,
        perfiles,
        estado,
        contratistaNombre: contratista || "Transservices",
        fotoIniciales: computeInitials(finalNombres, finalApellidos),
        action: "create",
      });
    }
  });

  return {
    previewItems,
    stats: {
      total: rows.length,
      toCreate,
      toUpdate,
      errors,
    },
  };
}

/**
 * Aplica el resultado del lote sobre la colección actual de personas
 */
export function applyPersonaUpsert(
  previewItems: UpsertPreviewItem[],
  currentList: Persona[]
): Persona[] {
  const result = [...currentList];

  previewItems.forEach((item) => {
    if (item.action === "error") return;

    const existingIndex = result.findIndex(
      (p) => p.numeroDocumento.replace(/\D/g, "") === item.numeroDocumento
    );

    if (existingIndex >= 0) {
      const prev = result[existingIndex];
      result[existingIndex] = {
        ...prev,
        nombres: item.nombres || prev.nombres,
        apellidos: item.apellidos || prev.apellidos,
        tipoDocumento: item.tipoDocumento || prev.tipoDocumento,
        telefono: item.telefono || prev.telefono,
        email: item.email || prev.email,
        perfiles: item.perfiles.length > 0 ? item.perfiles : prev.perfiles,
        estado: item.estado || prev.estado,
        contratistaNombre: item.contratistaNombre || prev.contratistaNombre,
        fotoIniciales: computeInitials(item.nombres || prev.nombres, item.apellidos || prev.apellidos),
      };
    } else if (item.action === "create") {
      const newPerson: Persona = {
        id: item.id,
        nombres: item.nombres,
        apellidos: item.apellidos,
        tipoDocumento: item.tipoDocumento,
        numeroDocumento: item.numeroDocumento,
        telefono: item.telefono,
        email: item.email,
        perfiles: item.perfiles,
        estado: item.estado,
        fechaIngreso: new Date().toISOString().split("T")[0],
        contratistaNombre: item.contratistaNombre,
        fotoIniciales: item.fotoIniciales,
      };
      result.unshift(newPerson);
    }
  });

  return result;
}

/**
 * Genera el contenido de una plantilla CSV lista para descargar
 */
export function generateCSVTemplate(): string {
  const headers = "numeroDocumento,tipoDocumento,nombres,apellidos,telefono,email,perfil,estado,contratista";
  const rowExample1 = "1084567123,CC,Carlos Andrés,Ramírez Ortiz,3001234567,carlos.ramirez@ejemplo.com,conductor,activo,Contratista 1";
  const rowExample2 = "1099887766,CC,Mauricio,Gómez Valencia,3124567890,mauricio.gomez@ejemplo.com,conductor,activo,Contratista 2";
  return `${headers}\n${rowExample1}\n${rowExample2}`;
}
