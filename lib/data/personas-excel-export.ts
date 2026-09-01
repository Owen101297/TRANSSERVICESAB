import * as XLSX from "xlsx";
import { Persona } from "@/lib/types/persona";

/**
 * Exporta la matriz oficial de personal a Excel con encabezado normativo,
 * membrete de Transservices A&B y codificación documental HSEQ (TH-FOR-01).
 */
export function exportPersonasToExcel(personas: Persona[]): void {
  const currentDate = new Date().toISOString().split("T")[0];

  // Matriz de datos con membrete corporativo y codificación oficial
  const sheetData: any[][] = [
    ["TRANS SERVICES A & B", "", "", "SISTEMA INTEGRADO DE GESTIÓN HSEQ", "", "", "", "CÓDIGO:", "TH-FOR-01"],
    ["COOPERATIVA DE TRANSPORTES Y SERVICIOS A & B", "", "", "MATRIZ DE EXPEDIENTE Y CONTROL DE PERSONAL", "", "", "", "VERSIÓN:", "01"],
    ["TRANSPORTE ESPECIAL TERRESTRE", "", "", `TOTAL REGISTROS: ${personas.length}`, "", "", "", "FECHA:", currentDate],
    [], // Separador
    [
      "#",
      "Tipo Documento",
      "Número Documento",
      "Nombres",
      "Apellidos",
      "Perfiles / Roles",
      "Estado",
      "Contratista / Empresa",
      "Teléfono",
      "Email",
      "Nro Licencia",
      "Categorías",
      "Vencimiento Licencia",
      "EPS",
      "ARL",
      "Fondo Pensiones",
      "Grupo RH",
      "Contacto Emergencia",
      "Teléfono Emergencia",
      "Parentesco",
    ],
  ];

  personas.forEach((p, idx) => {
    sheetData.push([
      idx + 1,
      p.tipoDocumento,
      p.numeroDocumento,
      p.nombres,
      p.apellidos,
      p.perfiles.join(", "),
      p.estado.toUpperCase(),
      p.contratistaNombre || "Transservices A&B",
      p.telefono || "—",
      p.email || "—",
      p.licenciaConduccion?.numero || "—",
      p.licenciaConduccion?.categorias?.join(", ") || "—",
      p.licenciaConduccion?.fechaVencimiento || "—",
      p.datosSalud?.eps || "—",
      p.datosSalud?.arl || "—",
      p.datosSalud?.fondoPensiones || "—",
      p.datosSalud?.grupoSanguineoRH || "—",
      p.contactoEmergencia?.nombreCompleto || "—",
      p.contactoEmergencia?.telefono || "—",
      p.contactoEmergencia?.parentesco || "—",
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Definir anchos de columna proporcionales
  ws["!cols"] = [
    { wch: 6 },  // #
    { wch: 16 }, // Tipo Documento
    { wch: 18 }, // Número Documento
    { wch: 22 }, // Nombres
    { wch: 22 }, // Apellidos
    { wch: 24 }, // Perfiles
    { wch: 12 }, // Estado
    { wch: 24 }, // Contratista
    { wch: 15 }, // Teléfono
    { wch: 28 }, // Email
    { wch: 18 }, // Licencia
    { wch: 14 }, // Categorías
    { wch: 20 }, // Vencimiento Licencia
    { wch: 16 }, // EPS
    { wch: 16 }, // ARL
    { wch: 18 }, // Fondo Pensiones
    { wch: 12 }, // Grupo RH
    { wch: 26 }, // Contacto Emergencia
    { wch: 20 }, // Teléfono Emergencia
    { wch: 16 }, // Parentesco
  ];

  // Fusiones de celdas del membrete oficial
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 1, c: 3 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    { s: { r: 2, c: 3 }, e: { r: 2, c: 6 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "TH-FOR-01_Personal");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `TH-FOR-01_Control_Personal_Transservices_${currentDate}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
