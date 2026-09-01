import * as XLSX from "xlsx";
import { Contratista, TIPO_OPERACION_LABELS, ESTADO_CONTRATISTA_LABELS } from "@/lib/types/contratista";
import { Vehiculo } from "@/lib/types/vehiculo";
import { Persona } from "@/lib/types/persona";

/**
 * Exporta la matriz oficial de Contratistas a Excel con encabezado institucional,
 * membrete de Transservices A&B y codificación documental HSEQ / Jurídico (CON-FOR-01).
 */
export function exportContratistasToExcel(
  contratistas: Contratista[],
  vehiculos: Vehiculo[] = [],
  personas: Persona[] = []
): void {
  const currentDate = new Date().toISOString().split("T")[0];

  // Encabezado institucional normativo
  const sheetData: any[][] = [
    ["TRANS SERVICES A & B", "", "", "SISTEMA INTEGRADO DE GESTIÓN HSEQ", "", "", "CÓDIGO:", "CON-FOR-01"],
    ["COOPERATIVA DE TRANSPORTES Y SERVICIOS A & B", "", "", "MATRIZ DE CONTRATISTAS Y ALIADOS VINCULADOS", "", "", "VERSIÓN:", "01"],
    ["TRANSPORTE ESPECIAL TERRESTRE", "", "", `TOTAL EMPRESAS: ${contratistas.length}`, "", "", "FECHA:", currentDate],
    [], // Fila separadora
    [
      "#",
      "Razón Social / Contratista",
      "NIT",
      "Tipo Operación",
      "Estado",
      "Contacto Principal",
      "Teléfono",
      "Email",
      "Fecha Vinculación",
      "Fecha Fin Contrato",
      "Vehículos Asignados",
      "Conductores Asignados",
      "Observaciones / Notas",
    ],
  ];

  contratistas.forEach((c, idx) => {
    const cantVehiculos = vehiculos.filter((v) => v.contratistaId === c.id).length;
    const cantConductores = personas.filter((p) => p.contratistaId === c.id).length;

    sheetData.push([
      idx + 1,
      c.nombre,
      c.nit,
      TIPO_OPERACION_LABELS[c.tipoOperacion] || c.tipoOperacion,
      ESTADO_CONTRATISTA_LABELS[c.estado] || c.estado,
      c.contactoNombre || "—",
      c.contactoTelefono || "—",
      c.contactoEmail || "—",
      c.fechaVinculacion || "—",
      c.fechaFinContrato || "Indefinido / Vigente",
      cantVehiculos,
      cantConductores,
      c.notas || "Sin observaciones",
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Anchos optimizados de columna
  ws["!cols"] = [
    { wch: 5 },  // #
    { wch: 34 }, // Razón Social
    { wch: 18 }, // NIT
    { wch: 22 }, // Tipo Operación
    { wch: 12 }, // Estado
    { wch: 25 }, // Contacto
    { wch: 18 }, // Teléfono
    { wch: 30 }, // Email
    { wch: 18 }, // Fecha Vinculación
    { wch: 20 }, // Fecha Fin Contrato
    { wch: 18 }, // Vehículos
    { wch: 20 }, // Conductores
    { wch: 35 }, // Observaciones
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Contratistas A&B");
  XLSX.writeFile(wb, `CON-FOR-01_Contratistas_TransServicesAB_${currentDate}.xlsx`);
}
