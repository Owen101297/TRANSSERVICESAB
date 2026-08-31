"use server";

import { Documento } from "@/lib/types/documento";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getContratistasDb } from "@/lib/services/contratistas.service";

/**
 * Consolida transversalmente todos los documentos de la plataforma
 */
export async function getDocumentosDb(): Promise<Documento[]> {
  const [vehiculos, personas, contratistas] = await Promise.all([
    getVehiculosDb(),
    getPersonasDb(),
    getContratistasDb(),
  ]);

  const docsVehiculos: Documento[] = vehiculos.flatMap((v) => [
    {
      id: `doc-${v.id}-soat`,
      nombre: `SOAT — ${v.placa}`,
      categoria: "vehiculo",
      tipo: "soat",
      entidadId: v.id,
      entidadNombre: v.placa,
      entidadHref: `/flota/${v.id}`,
      fechaVencimiento: v.documentos.soatVencimiento,
    },
    {
      id: `doc-${v.id}-rtm`,
      nombre: `RTM — ${v.placa}`,
      categoria: "vehiculo",
      tipo: "rtm",
      entidadId: v.id,
      entidadNombre: v.placa,
      entidadHref: `/flota/${v.id}`,
      fechaVencimiento: v.documentos.rtmVencimiento,
    },
    {
      id: `doc-${v.id}-poliza`,
      nombre: `Póliza Contractual/Extracontractual — ${v.placa}`,
      categoria: "vehiculo",
      tipo: "poliza",
      entidadId: v.id,
      entidadNombre: v.placa,
      entidadHref: `/flota/${v.id}`,
      fechaVencimiento: v.documentos.polizaVencimiento,
    },
  ]);

  const docsPersonas: Documento[] = personas.flatMap((p) => {
    const list: Documento[] = [];
    if (p.licenciaConduccion) {
      list.push({
        id: `doc-${p.id}-licencia`,
        nombre: `Licencia de conducción (${p.licenciaConduccion.categorias.join("/")}) — ${p.nombres} ${p.apellidos}`,
        categoria: "persona",
        tipo: "licencia_conduccion",
        entidadId: p.id,
        entidadNombre: `${p.nombres} ${p.apellidos}`,
        entidadHref: `/personas/${p.id}`,
        fechaVencimiento: p.licenciaConduccion.fechaVencimiento,
      });
    }
    if (p.examenMedico) {
      list.push({
        id: `doc-${p.id}-medico`,
        nombre: `Examen médico ocupacional (EMO) — ${p.nombres} ${p.apellidos}`,
        categoria: "persona",
        tipo: "certificado_medico",
        entidadId: p.id,
        entidadNombre: `${p.nombres} ${p.apellidos}`,
        entidadHref: `/personas/${p.id}`,
        fechaVencimiento: p.examenMedico.fechaVigencia,
      });
    }
    return list;
  });

  const docsContratistas: Documento[] = contratistas.map((c) => ({
    id: `doc-${c.id}-contrato`,
    nombre: `Contrato de vinculación — ${c.nombre}`,
    categoria: "contratista",
    tipo: "contrato",
    entidadId: c.id,
    entidadNombre: c.nombre,
    entidadHref: `/contratistas/${c.id}`,
  }));

  return [...docsVehiculos, ...docsPersonas, ...docsContratistas];
}
