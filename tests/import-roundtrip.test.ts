import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import * as XLSX from "xlsx";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

test("Excel y CSV usan las columnas exportadas y preservan identidad, estado y datos vacíos", async () => {
  const directory = await mkdtemp(join(process.cwd(), "tests/.import-test-"));
  try {
    const bundle = await build({ stdin: { contents: `export * from './lib/data/personas-upsert'; export * from './lib/data/personas-excel-export'; export * from './lib/data/flota-upsert'; export * from './lib/data/flota-excel-export';`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, platform: "node", format: "esm", packages: "external", write: false });
    const file = join(directory, "imports.mjs"); await writeFile(file, bundle.outputFiles[0].text);
    const imports = await import(pathToFileURL(file).href);
    const workbook = (headers: string[], rows: unknown[][]) => { const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ...rows]), "Datos"); return XLSX.write(book, { type: "array", bookType: "xlsx" }); };
    const row: Record<string, string> = { "TIPO DOCUMENTO": "PA", "NUMERO DOCUMENTO": "AB12345", NOMBRES: "Prueba", APELLIDOS: "Persona", PERFILES: "conductor", ESTADO: "retirado", "VENCIMIENTO LICENCIA": "2027-10-05" };
    const parsed = imports.parseExcelOrCSVBuffer(workbook(imports.PERSONAL_EXCEL_COLUMNS, [imports.PERSONAL_EXCEL_COLUMNS.map((header: string) => row[header] || "")]));
    const result = imports.analyzePersonaUpsertBatch(parsed, []);
    assert.equal(result.stats.toCreate, 1); assert.equal(result.previewItems[0].numeroDocumento, "AB12345");
    assert.equal(result.previewItems[0].estado, "retirado"); assert.equal(result.previewItems[0].telefono, ""); assert.equal(result.previewItems[0].email, "");
    assert.equal(imports.analyzePersonaUpsertBatch([...parsed, ...parsed], []).stats.errors, 1);
    assert.equal(imports.parseExcelOrCSVBuffer(await imports.generateExcelTemplateBlob().arrayBuffer()).length, 0);
    assert.equal(imports.generateCSVTemplate().trim().replace(/^\uFEFF/, ""), imports.PERSONAL_EXCEL_COLUMNS.join(","));
    const vehicle = ["QAA123", "Prueba", "Modelo", 2026, "Van", 8, "Especial", "", "2027-10-05", "", "", "Activo"];
    const fleet = imports.analizarArchivoExcelFlota(workbook(imports.FLOTA_EXCEL_COLUMNS, [vehicle, ["QBB123"]]));
    assert.equal(fleet.filasValidas.length, 1); assert.equal(fleet.filasOmitidas.length, 1);
    assert.equal(fleet.filasValidas[0].placa, "QAA123"); assert.equal(fleet.filasValidas[0].rtmVencimiento, undefined);
    assert.equal(imports.normalizarPlaca("QAA-123"), "QAA123");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
