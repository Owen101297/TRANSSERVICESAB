"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Documento, CategoriaDocumento, TipoDocumento } from "@/lib/types/documento";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getContratistasDb } from "@/lib/services/contratistas.service";

let localDocumentosDigitales: Documento[] = [];

/**
 * Función segura para calcular el estado de vigencia sin romper fechas
 */
export async function getDocumentosDb(): Promise<Documento[]> {
  try {
    const [vehiculos, personas, contratistas, dbDocs] = await Promise.all([
      getVehiculosDb().catch(() => []),
      getPersonasDb().catch(() => []),
      getContratistasDb().catch(() => []),
      process.env.DATABASE_URL
        ? prisma.documentoDigital.findMany({ orderBy: { createdAt: "desc" } }).catch(() => [])
        : Promise.resolve([]),
    ]);

    // 1. Documentos automáticos de Flota
    const docsVehiculos: Documento[] = (vehiculos || []).flatMap((v) => {
      const list: Documento[] = [];
      if (v.documentos?.soatVencimiento) {
        list.push({
          id: `doc-${v.id}-soat`,
          nombre: `SOAT — ${v.placa}`,
          categoria: "vehiculo",
          tipo: "soat",
          entidadId: v.id,
          entidadNombre: v.placa,
          entidadHref: `/flota/${v.id}`,
          fechaVencimiento: v.documentos.soatVencimiento,
        });
      }
      if (v.documentos?.rtmVencimiento) {
        list.push({
          id: `doc-${v.id}-rtm`,
          nombre: `RTM — ${v.placa}`,
          categoria: "vehiculo",
          tipo: "rtm",
          entidadId: v.id,
          entidadNombre: v.placa,
          entidadHref: `/flota/${v.id}`,
          fechaVencimiento: v.documentos.rtmVencimiento,
        });
      }
      if (v.documentos?.polizaVencimiento) {
        list.push({
          id: `doc-${v.id}-poliza`,
          nombre: `Póliza Contractual / Extracontractual — ${v.placa}`,
          categoria: "vehiculo",
          tipo: "poliza",
          entidadId: v.id,
          entidadNombre: v.placa,
          entidadHref: `/flota/${v.id}`,
          fechaVencimiento: v.documentos.polizaVencimiento,
        });
      }
      return list;
    });

    // 2. Documentos automáticos de Personas (Conductores)
    const docsPersonas: Documento[] = (personas || []).flatMap((p) => {
      const list: Documento[] = [];
      if (p.licenciaConduccion?.fechaVencimiento) {
        list.push({
          id: `doc-${p.id}-licencia`,
          nombre: `Licencia de Conducción (${(p.licenciaConduccion.categorias || []).join("/")}) — ${p.nombres} ${p.apellidos}`,
          categoria: "persona",
          tipo: "licencia_conduccion",
          entidadId: p.id,
          entidadNombre: `${p.nombres} ${p.apellidos}`,
          entidadHref: `/personas/${p.id}`,
          fechaVencimiento: p.licenciaConduccion.fechaVencimiento,
        });
      }
      if (p.examenMedico?.fechaVigencia) {
        list.push({
          id: `doc-${p.id}-medico`,
          nombre: `Examen Médico Ocupacional (EMO) — ${p.nombres} ${p.apellidos}`,
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

    // 3. Documentos automáticos de Contratistas
    const docsContratistas: Documento[] = (contratistas || []).map((c) => ({
      id: `doc-${c.id}-contrato`,
      nombre: `Contrato de Vinculación — ${c.nombre}`,
      categoria: "contratista",
      tipo: "contrato",
      entidadId: c.id,
      entidadNombre: c.nombre,
      entidadHref: `/contratistas/${c.id}`,
      fechaVencimiento: c.fechaFinContrato,
    }));

    // 4. Documentos cargados directamente a la Bóveda Digital (Prisma / local)
    const docsSubidos: Documento[] = (dbDocs || []).map((d: any) => ({
      id: d.id,
      nombre: d.nombre,
      categoria: (d.categoria as CategoriaDocumento) || "empresa",
      tipo: (d.tipoDocumento as TipoDocumento) || "otro",
      entidadId: d.entidadId || undefined,
      entidadNombre: d.entidadNombre || "General / Corporativo",
      entidadHref: d.entidadTipo === "vehiculo" && d.entidadId ? `/flota/${d.entidadId}` : undefined,
      fechaExpedicion: d.fechaExpedicion ? d.fechaExpedicion.toISOString().split("T")[0] : undefined,
      fechaVencimiento: d.fechaVencimiento ? d.fechaVencimiento.toISOString().split("T")[0] : undefined,
      archivoUrl: d.archivoUrl,
      tamanoBytes: d.tamanoBytes || undefined,
      mimeType: d.mimeType || undefined,
      notas: d.notas || undefined,
    }));

    return [...docsSubidos, ...localDocumentosDigitales, ...docsVehiculos, ...docsPersonas, ...docsContratistas];
  } catch (error) {
    console.warn("Aviso al obtener documentos consolidados:", error);
    return [];
  }
}

/**
 * Server action para guardar un nuevo documento digital
 */
export async function createDocumentoDigitalAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const nombre = (formData.get("nombre") as string)?.trim() || "Documento Digital";
    const categoria = (formData.get("categoria") as CategoriaDocumento) || "empresa";
    const tipoDocumento = (formData.get("tipoDocumento") as TipoDocumento) || "otro";
    const entidadNombre = (formData.get("entidadNombre") as string)?.trim() || "Corporativo";
    const fechaVencimientoRaw = formData.get("fechaVencimiento") as string;
    const archivoUrl = (formData.get("archivoUrl") as string)?.trim() || "";
    const notas = (formData.get("notas") as string)?.trim() || "";

    const fechaVencimiento = fechaVencimientoRaw ? new Date(fechaVencimientoRaw) : null;

    if (process.env.DATABASE_URL) {
      await prisma.documentoDigital.create({
        data: {
          nombre,
          categoria,
          tipoDocumento,
          entidadTipo: categoria,
          entidadNombre,
          archivoUrl: archivoUrl || "/documentos",
          fechaVencimiento,
          notas: notas || undefined,
        },
      });
    } else {
      localDocumentosDigitales.unshift({
        id: `doc_local_${Date.now()}`,
        nombre,
        categoria,
        tipo: tipoDocumento,
        entidadNombre,
        fechaVencimiento: fechaVencimientoRaw || undefined,
        archivoUrl,
        notas,
      });
    }

    revalidatePath("/documentos");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error al registrar documento digital:", error);
    return { success: false, error: error.message || "Error al crear documento" };
  }
}
