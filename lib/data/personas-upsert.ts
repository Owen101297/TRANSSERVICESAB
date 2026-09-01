import * as XLSX from "xlsx";
import {
  Persona,
  TipoDocumento,
  PerfilPersona,
  EstadoPersona,
  CategoriaLicencia,
  GrupoSanguineo,
} from "@/lib/types/persona";

export interface RawPersonaImportRow {
  tipoDocumento?: string;
  numeroDocumento?: string;
  nombres?: string;
  apellidos?: string;
  nombreCompleto?: string;
  telefono?: string;
  email?: string;
  perfiles?: string;
  estado?: string;
  contratista?: string;
  numeroLicencia?: string;
  categoriaLicencia?: string;
  vencimientoLicencia?: string;
  eps?: string;
  arl?: string;
  fondoPension?: string;
  grupoSanguineo?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  contactoEmergenciaParentesco?: string;
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
  // Campos complementarios del expediente
  numeroLicencia?: string;
  categoriasLicencia?: CategoriaLicencia[];
  vencimientoLicencia?: string;
  eps?: string;
  arl?: string;
  fondoPension?: string;
  grupoSanguineo?: GrupoSanguineo;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  contactoEmergenciaParentesco?: string;
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
 * Normaliza nombres de columna removiendo acentos, guiones y espacios
 */
function cleanKey(rawKey: string): string {
  return rawKey
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Mapea claves crudas de Excel o CSV a campos reconocidos
 */
function mapRawRow(rawObj: Record<string, any>): RawPersonaImportRow {
  const row: RawPersonaImportRow = {};
  
  for (const [key, value] of Object.entries(rawObj)) {
    if (value === undefined || value === null) continue;
    const strVal = String(value).trim();
    const k = cleanKey(key);

    if (["tipodocumento", "tipodoc", "tipoid"].includes(k)) {
      row.tipoDocumento = strVal;
    } else if (["numerodocumento", "cedula", "documento", "identificacion", "numdoc", "nrodocumento", "id"].includes(k)) {
      row.numeroDocumento = strVal;
    } else if (["nombres", "nombre", "primernombre"].includes(k)) {
      row.nombres = strVal;
    } else if (["apellidos", "apellido", "primerapellido"].includes(k)) {
      row.apellidos = strVal;
    } else if (["nombrecompleto", "nombresyapellidos"].includes(k)) {
      row.nombreCompleto = strVal;
    } else if (["telefono", "celular", "tel", "movil", "telefonocontacto"].includes(k)) {
      row.telefono = strVal;
    } else if (["email", "correo", "correoelectronico"].includes(k)) {
      row.email = strVal;
    } else if (["perfiles", "perfil", "cargo", "rol", "roles"].includes(k)) {
      row.perfiles = strVal;
    } else if (["estado", "estadolaboral"].includes(k)) {
      row.estado = strVal;
    } else if (["contratista", "contratistanombre", "empresa", "empresacontratista"].includes(k)) {
      row.contratista = strVal;
    } else if (["numerolicencia", "nrolicencia", "licencia", "licencianumero", "pase"].includes(k)) {
      row.numeroLicencia = strVal;
    } else if (["categorialicencia", "categoriaslicencia", "catlicencia", "categorias", "categoria"].includes(k)) {
      row.categoriaLicencia = strVal;
    } else if (["vencimientolicencia", "fechavencimientolicencia", "vigencialicencia", "vencimientopase"].includes(k)) {
      row.vencimientoLicencia = parseDateValue(value);
    } else if (["eps", "entidadeps", "salud"].includes(k)) {
      row.eps = strVal;
    } else if (["arl", "administradoraarl", "riesgos"].includes(k)) {
      row.arl = strVal;
    } else if (["fondopension", "fondopensiones", "pension", "afp"].includes(k)) {
      row.fondoPension = strVal;
    } else if (["gruposanguineo", "rh", "gruporh", "gruposanguineorh"].includes(k)) {
      row.grupoSanguineo = strVal;
    } else if (["contactoemergencianombre", "nombreemergencia", "contactoemergencia"].includes(k)) {
      row.contactoEmergenciaNombre = strVal;
    } else if (["contactoemergenciatelefono", "telefonoemergencia", "celemergencia"].includes(k)) {
      row.contactoEmergenciaTelefono = strVal;
    } else if (["contactoemergenciaparentesco", "parentescoemergencia", "parentesco"].includes(k)) {
      row.contactoEmergenciaParentesco = strVal;
    } else {
      row[k] = strVal;
    }
  }

  return row;
}

/**
 * Convierte valores de fecha de Excel (números seriales o strings) a formato ISO YYYY-MM-DD
 */
function parseDateValue(val: any): string {
  if (!val) return "";
  if (typeof val === "number") {
    // Número serial de fecha de Excel
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }
  const s = String(val).trim();
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Formato DD/MM/YYYY o DD-MM-YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
}

/**
 * Lee un archivo Excel (.xlsx / .xls) o CSV desde un ArrayBuffer en el navegador
 */
export function parseExcelOrCSVBuffer(buffer: ArrayBuffer): RawPersonaImportRow[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: "",
    raw: false,
  });

  return jsonRows.map(mapRawRow);
}

/**
 * Parser de texto CSV compatible con comas y punto y coma
 */
export function parseCSVText(csvText: string): RawPersonaImportRow[] {
  const cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return [];

  const workbook = XLSX.read(cleanText, { type: "string" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: "",
    raw: false,
  });

  return jsonRows.map(mapRawRow);
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
    else if (item.includes("mecanic") || item.includes("taller") || item.includes("emplead")) validProfiles.push("empleado");
  });

  return validProfiles.length > 0 ? Array.from(new Set(validProfiles)) : ["conductor"];
}

function normalizeCategoriasLicencia(val?: string): CategoriaLicencia[] {
  if (!val) return [];
  const tokens = val.toUpperCase().split(/[,|/\s]/).map((t) => t.trim()).filter(Boolean);
  const validCats: CategoriaLicencia[] = [];
  const accepted = ["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3"];
  tokens.forEach((tok) => {
    if (accepted.includes(tok)) validCats.push(tok as CategoriaLicencia);
  });
  return Array.from(new Set(validCats));
}

/**
 * Analiza un lote de filas importadas contra la colección actual de personas
 */
export function analyzePersonaUpsertBatch(
  rows: RawPersonaImportRow[],
  currentPersons: Persona[] = []
): UpsertBatchResult {
  const previewItems: UpsertPreviewItem[] = [];
  let toCreate = 0;
  let toUpdate = 0;
  let errors = 0;

  rows.forEach((row, index) => {
    const rawCedula = (row.numeroDocumento || "").replace(/\D/g, "");
    
    let nombres = (row.nombres || "").trim();
    let apellidos = (row.apellidos || "").trim();
    
    if (!nombres && row.nombreCompleto) {
      const parts = row.nombreCompleto.trim().split(/\s+/);
      if (parts.length === 1) {
        nombres = parts[0];
      } else {
        const mid = Math.ceil(parts.length / 2);
        nombres = parts.slice(0, mid).join(" ");
        apellidos = parts.slice(mid).join(" ");
      }
    }

    if (!rawCedula || (!nombres && !apellidos)) {
      errors++;
      previewItems.push({
        id: `err_${index}`,
        numeroDocumento: rawCedula || "S/N",
        tipoDocumento: "CC",
        nombres: nombres || "—",
        apellidos: apellidos || "—",
        telefono: row.telefono || "—",
        email: row.email || "—",
        perfiles: ["conductor"],
        estado: "activo",
        fotoIniciales: "??",
        action: "error",
        errorMessage: "Falta número de documento o nombres en esta fila.",
      });
      return;
    }

    const existingPerson = currentPersons.find(
      (p) => p.numeroDocumento.replace(/\D/g, "") === rawCedula
    );

    const tipoDoc = normalizeTipoDoc(row.tipoDocumento);
    const telefono = row.telefono || (existingPerson ? existingPerson.telefono : "");
    const email = row.email || (existingPerson ? existingPerson.email : "");
    const contratista = row.contratista || existingPerson?.contratistaNombre;
    const perfiles = row.perfiles ? normalizePerfiles(row.perfiles) : (existingPerson?.perfiles || ["conductor"]);
    const estado = row.estado ? normalizeEstado(row.estado) : (existingPerson?.estado || "activo");
    const finalNombres = nombres || existingPerson?.nombres || "";
    const finalApellidos = apellidos || existingPerson?.apellidos || "";

    // Licencia
    const numeroLicencia = row.numeroLicencia || existingPerson?.licenciaConduccion?.numero;
    const catsLicencia = row.categoriaLicencia 
      ? normalizeCategoriasLicencia(row.categoriaLicencia) 
      : (existingPerson?.licenciaConduccion?.categorias || []);
    const vencimientoLicencia = row.vencimientoLicencia || existingPerson?.licenciaConduccion?.fechaVencimiento;

    // Seguridad Social
    const eps = row.eps || existingPerson?.datosSalud?.eps;
    const arl = row.arl || existingPerson?.datosSalud?.arl;
    const fondoPension = row.fondoPension || existingPerson?.datosSalud?.fondoPensiones;
    const grupoSanguineo = (row.grupoSanguineo || existingPerson?.datosSalud?.grupoSanguineoRH) as GrupoSanguineo | undefined;

    // Contacto de Emergencia
    const contactoEmergenciaNombre = row.contactoEmergenciaNombre || existingPerson?.contactoEmergencia?.nombreCompleto;
    const contactoEmergenciaTelefono = row.contactoEmergenciaTelefono || existingPerson?.contactoEmergencia?.telefono;
    const contactoEmergenciaParentesco = row.contactoEmergenciaParentesco || existingPerson?.contactoEmergencia?.parentesco;

    if (existingPerson) {
      const changes: string[] = [];
      if (telefono && telefono !== existingPerson.telefono) changes.push(`Teléfono: ${telefono}`);
      if (email && email !== existingPerson.email) changes.push(`Email: ${email}`);
      if (contratista && contratista !== existingPerson.contratistaNombre) changes.push(`Contratista: ${contratista}`);
      if (estado !== existingPerson.estado) changes.push(`Estado: ${estado}`);
      if (numeroLicencia && numeroLicencia !== existingPerson.licenciaConduccion?.numero) changes.push(`Licencia: ${numeroLicencia}`);
      if (eps && eps !== existingPerson.datosSalud?.eps) changes.push(`EPS: ${eps}`);
      if (arl && arl !== existingPerson.datosSalud?.arl) changes.push(`ARL: ${arl}`);

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
        numeroLicencia,
        categoriasLicencia: catsLicencia,
        vencimientoLicencia,
        eps,
        arl,
        fondoPension,
        grupoSanguineo,
        contactoEmergenciaNombre,
        contactoEmergenciaTelefono,
        contactoEmergenciaParentesco,
        action: "update",
        changesSummary: changes.length > 0 ? changes : ["Sin modificaciones (se preservarán datos existentes)"],
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
        telefono: telefono || "3000000000",
        email: email || `${finalNombres.toLowerCase().replace(/\s+/g, ".") || "usuario"}@transservices.com`,
        perfiles,
        estado,
        contratistaNombre: contratista,
        fotoIniciales: computeInitials(finalNombres, finalApellidos),
        numeroLicencia,
        categoriasLicencia: catsLicencia,
        vencimientoLicencia,
        eps,
        arl,
        fondoPension,
        grupoSanguineo,
        contactoEmergenciaNombre,
        contactoEmergenciaTelefono,
        contactoEmergenciaParentesco,
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
 * Genera el archivo Excel (.xlsx) estructurado listo para descargar
 */
export function generateExcelTemplateBlob(): Blob {
  const headers = [
    "Tipo_Documento",
    "Numero_Documento",
    "Nombres",
    "Apellidos",
    "Telefono",
    "Email",
    "Perfiles",
    "Estado",
    "Contratista",
    "Numero_Licencia",
    "Categoria_Licencia",
    "Vencimiento_Licencia",
    "EPS",
    "ARL",
    "Fondo_Pension",
    "Grupo_Sanguineo",
    "Contacto_Emergencia_Nombre",
    "Contacto_Emergencia_Telefono",
    "Contacto_Emergencia_Parentesco",
  ];

  const guideRows = [
    { Campo: "Tipo_Documento", Obligatorio: "Sí", ValoresPermitidos: "CC, CE, PA, TI", Descripcion: "Tipo de documento de identidad" },
    { Campo: "Numero_Documento", Obligatorio: "Sí", ValoresPermitidos: "Números sin puntos ni comas", Descripcion: "Cédula o documento identificador (ej: 1084567123)" },
    { Campo: "Nombres", Obligatorio: "Sí", ValoresPermitidos: "Texto", Descripcion: "Nombres de la persona" },
    { Campo: "Apellidos", Obligatorio: "Sí", ValoresPermitidos: "Texto", Descripcion: "Apellidos de la persona" },
    { Campo: "Telefono", Obligatorio: "Recomendado", ValoresPermitidos: "10 dígitos", Descripcion: "Celular de contacto principal" },
    { Campo: "Email", Obligatorio: "Recomendado", ValoresPermitidos: "correo@ejemplo.com", Descripcion: "Correo electrónico corporativo o personal" },
    { Campo: "Perfiles", Obligatorio: "Sí", ValoresPermitidos: "conductor, administrativo, mecanico, hseq, supervisor, empleado", Descripcion: "Puede incluir varios separados por coma" },
    { Campo: "Estado", Obligatorio: "Sí", ValoresPermitidos: "activo, descanso, vacaciones, inactivo", Descripcion: "Estado laboral operativo actual" },
    { Campo: "Contratista", Obligatorio: "Opcional", ValoresPermitidos: "Nombre del contratista", Descripcion: "Razón social del tercero o Transservices A&B" },
    { Campo: "Numero_Licencia", Obligatorio: "Solo conductores", ValoresPermitidos: "Texto/Números", Descripcion: "Nro de pase de conducción" },
    { Campo: "Categoria_Licencia", Obligatorio: "Solo conductores", ValoresPermitidos: "A1, A2, B1, B2, B3, C1, C2, C3", Descripcion: "Categorías separadas por coma (ej: C2, C3)" },
    { Campo: "Vencimiento_Licencia", Obligatorio: "Solo conductores", ValoresPermitidos: "AAAA-MM-DD", Descripcion: "Fecha de vencimiento oficial (ej: 2027-08-15)" },
    { Campo: "EPS", Obligatorio: "Opcional", ValoresPermitidos: "Sura, Sanitas, Nueva EPS, etc.", Descripcion: "Entidad Promotora de Salud" },
    { Campo: "ARL", Obligatorio: "Opcional", ValoresPermitidos: "Positiva, Sura, Colmena, Bolívar", Descripcion: "Aseguradora de Riesgos Laborales" },
    { Campo: "Fondo_Pension", Obligatorio: "Opcional", ValoresPermitidos: "Porvenir, Protección, Colfondos, Colpensiones", Descripcion: "Fondo de pensiones" },
    { Campo: "Grupo_Sanguineo", Obligatorio: "Opcional", ValoresPermitidos: "O+, O-, A+, A-, B+, B-, AB+, AB-", Descripcion: "Grupo sanguíneo y factor RH" },
    { Campo: "Contacto_Emergencia_Nombre", Obligatorio: "Opcional", ValoresPermitidos: "Nombre completo", Descripcion: "Nombre del familiar o contacto" },
    { Campo: "Contacto_Emergencia_Telefono", Obligatorio: "Opcional", ValoresPermitidos: "10 dígitos", Descripcion: "Teléfono de emergencia" },
    { Campo: "Contacto_Emergencia_Parentesco", Obligatorio: "Opcional", ValoresPermitidos: "Esposa, Madre, Padre, Hermano...", Descripcion: "Parentesco del contacto" },
  ];

  const wb = XLSX.utils.book_new();

  // Hoja 1: Plantilla vacía lista para llenar (solo encabezados)
  const wsData = XLSX.utils.json_to_sheet([], { header: headers });
  wsData["!cols"] = [
    { wch: 16 }, // Tipo_Documento
    { wch: 18 }, // Numero_Documento
    { wch: 22 }, // Nombres
    { wch: 22 }, // Apellidos
    { wch: 15 }, // Telefono
    { wch: 30 }, // Email
    { wch: 24 }, // Perfiles
    { wch: 12 }, // Estado
    { wch: 24 }, // Contratista
    { wch: 18 }, // Numero_Licencia
    { wch: 18 }, // Categoria_Licencia
    { wch: 20 }, // Vencimiento_Licencia
    { wch: 15 }, // EPS
    { wch: 15 }, // ARL
    { wch: 16 }, // Fondo_Pension
    { wch: 16 }, // Grupo_Sanguineo
    { wch: 26 }, // Contacto_Emergencia_Nombre
    { wch: 26 }, // Contacto_Emergencia_Telefono
    { wch: 28 }, // Contacto_Emergencia_Parentesco
  ];
  XLSX.utils.book_append_sheet(wb, wsData, "Plantilla_Personal");

  // Hoja 2: Guía de llenado y ejemplos
  const wsGuide = XLSX.utils.json_to_sheet(guideRows);
  wsGuide["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 45 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, "Guia_y_Valores");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/**
 * Genera el archivo CSV listo para descargar (solo encabezados limpios)
 */
export function generateCSVTemplate(): string {
  const headers = "Tipo_Documento,Numero_Documento,Nombres,Apellidos,Telefono,Email,Perfiles,Estado,Contratista,Numero_Licencia,Categoria_Licencia,Vencimiento_Licencia,EPS,ARL,Fondo_Pension,Grupo_Sanguineo,Contacto_Emergencia_Nombre,Contacto_Emergencia_Telefono,Contacto_Emergencia_Parentesco";
  return `\uFEFF${headers}\n`;
}
