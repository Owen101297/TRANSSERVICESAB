import { Documento } from "@/lib/types/documento";
import { SEED_VEHICULOS } from "@/lib/data/vehiculos";
import { SEED_PERSONAS } from "@/lib/data/personas";

// Los documentos de vehículos se generan a partir del seed real de Flota
// (mismo dato, sin duplicar) — así esta vista transversal siempre queda
// sincronizada con lo que ya existe en cada vehículo.
const documentosVehiculos: Documento[] = SEED_VEHICULOS.flatMap((v) => [
  {
    id: `doc-${v.id}-soat`,
    nombre: `SOAT — ${v.placa}`,
    categoria: "vehiculo" as const,
    tipo: "soat" as const,
    entidadId: v.id,
    entidadNombre: v.placa,
    entidadHref: `/flota/${v.id}`,
    fechaVencimiento: v.documentos.soatVencimiento,
  },
  {
    id: `doc-${v.id}-rtm`,
    nombre: `RTM — ${v.placa}`,
    categoria: "vehiculo" as const,
    tipo: "rtm" as const,
    entidadId: v.id,
    entidadNombre: v.placa,
    entidadHref: `/flota/${v.id}`,
    fechaVencimiento: v.documentos.rtmVencimiento,
  },
  {
    id: `doc-${v.id}-poliza`,
    nombre: `Póliza — ${v.placa}`,
    categoria: "vehiculo" as const,
    tipo: "poliza" as const,
    entidadId: v.id,
    entidadNombre: v.placa,
    entidadHref: `/flota/${v.id}`,
    fechaVencimiento: v.documentos.polizaVencimiento,
  },
]);

// Documentos generados a partir de los expedientes de personas
const documentosPersonas: Documento[] = SEED_PERSONAS.flatMap((p) => {
  const docs: Documento[] = [];
  if (p.licenciaConduccion) {
    docs.push({
      id: `doc-${p.id}-licencia`,
      nombre: `Licencia de conducción (${p.licenciaConduccion.categorias.join("/")}) — ${p.nombres} ${p.apellidos}`,
      categoria: "persona" as const,
      tipo: "licencia_conduccion" as const,
      entidadId: p.id,
      entidadNombre: `${p.nombres} ${p.apellidos}`,
      entidadHref: `/personas/${p.id}`,
      fechaVencimiento: p.licenciaConduccion.fechaVencimiento,
    });
  }
  if (p.examenMedico) {
    docs.push({
      id: `doc-${p.id}-medico`,
      nombre: `Examen médico ocupacional (EMO) — ${p.nombres} ${p.apellidos}`,
      categoria: "persona" as const,
      tipo: "certificado_medico" as const,
      entidadId: p.id,
      entidadNombre: `${p.nombres} ${p.apellidos}`,
      entidadHref: `/personas/${p.id}`,
      fechaVencimiento: p.examenMedico.fechaVigencia,
    });
  }
  return docs;
});

// Documentos de ejemplo para contratistas
const documentosContratistas: Documento[] = [
  {
    id: "doc-c2-contrato",
    nombre: "Contrato de vinculación — Contratista 2",
    categoria: "contratista",
    tipo: "contrato",
    entidadId: "c2",
    entidadNombre: "Contratista 2 (rotación 12h/24h)",
    entidadHref: "/contratistas/c2",
  },
];

export const SEED_DOCUMENTOS: Documento[] = [
  ...documentosVehiculos,
  ...documentosPersonas,
  ...documentosContratistas,
];

