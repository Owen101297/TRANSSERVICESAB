"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_CONTRATISTAS, getContratistaById as getSeedContratistaById } from "@/lib/data/contratistas";
import { Contratista, TipoOperacion, EstadoContratista } from "@/lib/types/contratista";
import { ContratistaUpsertPreviewItem } from "@/lib/data/contratistas-upsert";

let localContratistasState: Contratista[] = [];

export interface ContratistaDocumentoAdjunto {
  id: string;
  tipoDocumento: string;
  nombre: string;
  archivoUrl: string;
  tamano?: string;
  mimeType?: string;
  fechaVencimiento?: string;
  createdAt: string;
}

let localDocumentosContratistasState: ContratistaDocumentoAdjunto[] = [];

/**
 * Obtiene todos los contratistas desde DB (o fallback local)
 */
export async function getContratistasDb(): Promise<Contratista[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localContratistasState;
    }

    const dbContratistas = await prisma.contratista.findMany({
      orderBy: { razonSocial: "asc" },
    });

    return dbContratistas.map((c) => ({
      id: c.id,
      nombre: c.razonSocial,
      nit: c.nit,
      tipoOperacion: (c.tipoOperacion as TipoOperacion) || "fija",
      contactoNombre: c.contactoNombre || "Pendiente",
      contactoTelefono: c.telefono,
      contactoEmail: c.email,
      fechaVinculacion: c.fechaVinculacion.toISOString().split("T")[0],
      fechaFinContrato: c.fechaFinContrato ? c.fechaFinContrato.toISOString().split("T")[0] : undefined,
      estado: (c.estado as EstadoContratista) || "activo",
      notas: c.notas ?? undefined,
    }));
  } catch (error) {
    console.warn("Aviso de conexión DB Contratistas (usando almacén local):", error);
    return localContratistasState;
  }
}

/**
 * Obtiene un contratista por ID
 */
export async function getContratistaByIdDb(id: string): Promise<Contratista | undefined> {
  try {
    if (!process.env.DATABASE_URL) {
      return localContratistasState.find((c) => c.id === id) || getSeedContratistaById(id);
    }

    const c = await prisma.contratista.findUnique({
      where: { id },
    });

    if (!c) {
      return localContratistasState.find((contratista) => contratista.id === id) || getSeedContratistaById(id);
    }

    return {
      id: c.id,
      nombre: c.razonSocial,
      nit: c.nit,
      tipoOperacion: (c.tipoOperacion as TipoOperacion) || "fija",
      contactoNombre: c.contactoNombre || "Pendiente",
      contactoTelefono: c.telefono,
      contactoEmail: c.email,
      fechaVinculacion: c.fechaVinculacion.toISOString().split("T")[0],
      fechaFinContrato: c.fechaFinContrato ? c.fechaFinContrato.toISOString().split("T")[0] : undefined,
      estado: (c.estado as EstadoContratista) || "activo",
      notas: c.notas ?? undefined,
    };
  } catch (error) {
    return localContratistasState.find((c) => c.id === id) || getSeedContratistaById(id);
  }
}

/**
 * Server Action para registrar un nuevo contratista
 */
export async function createContratistaAction(formData: FormData): Promise<{ success: boolean; contratistaId?: string; error?: string }> {
  try {
    const nombre = formData.get("nombre") as string;
    const nit = (formData.get("nit") as string)?.trim();
    const tipoOperacion = (formData.get("tipoOperacion") as TipoOperacion) || "fija";
    const contactoNombre = (formData.get("contactoNombre") as string) || "Pendiente";
    const contactoTelefono = (formData.get("contactoTelefono") as string) || "Pendiente";
    const contactoEmail = (formData.get("contactoEmail") as string) || "pendiente@ejemplo.com";
    const fechaVinculacion = (formData.get("fechaVinculacion") as string) || new Date().toISOString().split("T")[0];
    const fechaFinContrato = (formData.get("fechaFinContrato") as string) || undefined;
    const notas = (formData.get("notas") as string) || undefined;

    const newId = `c_${Date.now()}`;

    const newContratistaObj: Contratista = {
      id: newId,
      nombre,
      nit,
      tipoOperacion,
      contactoNombre,
      contactoTelefono,
      contactoEmail,
      fechaVinculacion,
      fechaFinContrato,
      estado: "activo",
      notas,
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.contratista.create({
          data: {
            razonSocial: nombre,
            nit,
            tipoOperacion,
            contactoNombre,
            telefono: contactoTelefono,
            email: contactoEmail,
            fechaVinculacion: new Date(fechaVinculacion),
            fechaFinContrato: fechaFinContrato ? new Date(fechaFinContrato) : null,
            estado: "activo",
            notas,
          },
        });
        newContratistaObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Contratista en PostgreSQL:", dbErr);
      }
    }

    localContratistasState.unshift(newContratistaObj);
    revalidatePath("/contratistas");
    revalidatePath("/flota/nuevo");
    revalidatePath("/asignaciones/nueva");

    return { success: true, contratistaId: newContratistaObj.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar contratista." };
  }
}

/**
 * Server Action para actualizar un contratista
 */
export async function updateContratistaAction(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const nombre = formData.get("nombre") as string;
    const tipoOperacion = formData.get("tipoOperacion") as TipoOperacion;
    const contactoNombre = formData.get("contactoNombre") as string;
    const contactoTelefono = formData.get("contactoTelefono") as string;
    const contactoEmail = formData.get("contactoEmail") as string;
    const fechaFinContrato = formData.get("fechaFinContrato") as string;
    const estado = formData.get("estado") as EstadoContratista;
    const notas = formData.get("notas") as string;

    const index = localContratistasState.findIndex((c) => c.id === id);
    if (index >= 0) {
      const prev = localContratistasState[index];
      localContratistasState[index] = {
        ...prev,
        nombre: nombre || prev.nombre,
        tipoOperacion: tipoOperacion || prev.tipoOperacion,
        contactoNombre: contactoNombre || prev.contactoNombre,
        contactoTelefono: contactoTelefono || prev.contactoTelefono,
        contactoEmail: contactoEmail || prev.contactoEmail,
        fechaFinContrato: fechaFinContrato !== undefined ? (fechaFinContrato || undefined) : prev.fechaFinContrato,
        estado: estado || prev.estado,
        notas: notas !== undefined ? notas : prev.notas,
      };
    }

    if (process.env.DATABASE_URL) {
      try {
        await prisma.contratista.update({
          where: { id },
          data: {
            razonSocial: nombre || undefined,
            tipoOperacion: tipoOperacion || undefined,
            contactoNombre: contactoNombre || undefined,
            telefono: contactoTelefono || undefined,
            email: contactoEmail || undefined,
            fechaFinContrato: fechaFinContrato ? new Date(fechaFinContrato) : null,
            estado: estado || undefined,
            notas: notas !== undefined ? notas : undefined,
          },
        });
      } catch (err) {
        console.warn("No se pudo actualizar en DB:", err);
      }
    }

    revalidatePath(`/contratistas/${id}`);
    revalidatePath("/contratistas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar contratista." };
  }
}

/**
 * Cambia el estado operativo de un contratista
 */
export async function cambiarEstadoContratistaDb(id: string, nuevoEstado: EstadoContratista) {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.contratista.update({
        where: { id },
        data: {
          estado: nuevoEstado,
        },
      });
    } else {
      const idx = localContratistasState.findIndex((c) => c.id === id);
      if (idx >= 0) {
        localContratistasState[idx] = {
          ...localContratistasState[idx],
          estado: nuevoEstado,
        };
      }
    }

    revalidatePath("/contratistas");
    revalidatePath(`/contratistas/${id}`);
    revalidatePath("/dashboard");

    const refreshedList = await getContratistasDb();
    return { success: true, refreshedList };
  } catch (error: any) {
    console.error("Error al cambiar estado de contratista:", error);
    return { success: false, error: error.message || "Error al actualizar estado." };
  }
}

/**
 * Elimina permanentemente un contratista de la base de datos
 */
export async function deleteContratistaDb(id: string) {
  try {
    if (process.env.DATABASE_URL) {
      // 1. Eliminar documentos adjuntos asociados
      await prisma.documentoAdjunto.deleteMany({
        where: { entidadTipo: "contratista", entidadId: id },
      });

      // 2. Eliminar contratista
      await prisma.contratista.delete({
        where: { id },
      });
    }

    localContratistasState = localContratistasState.filter((c) => c.id !== id);

    revalidatePath("/contratistas");
    revalidatePath("/dashboard");
    revalidatePath("/flota");
    revalidatePath("/personas");

    const refreshedList = await getContratistasDb();
    return { success: true, refreshedList };
  } catch (error: any) {
    console.error("Error al eliminar contratista:", error);
    return { success: false, error: error.message || "Error al eliminar registro." };
  }
}

/**
 * Carga masiva (Upsert) de contratistas en la base de datos
 */
export async function bulkUpsertContratistasAction(items: ContratistaUpsertPreviewItem[]) {
  try {
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      if (item.action === "error") continue;

      if (process.env.DATABASE_URL) {
        if (item.action === "update") {
          await prisma.contratista.update({
            where: { nit: item.nit },
            data: {
              razonSocial: item.nombre,
              tipoOperacion: item.tipoOperacion,
              contactoNombre: item.contactoNombre,
              telefono: item.contactoTelefono,
              email: item.contactoEmail,
              fechaFinContrato: item.fechaFinContrato ? new Date(item.fechaFinContrato) : null,
              estado: item.estado,
              notas: item.notas,
            },
          });
          updatedCount++;
        } else if (item.action === "create") {
          await prisma.contratista.upsert({
            where: { nit: item.nit },
            update: {
              razonSocial: item.nombre,
              tipoOperacion: item.tipoOperacion,
              contactoNombre: item.contactoNombre,
              telefono: item.contactoTelefono,
              email: item.contactoEmail,
              fechaFinContrato: item.fechaFinContrato ? new Date(item.fechaFinContrato) : null,
              estado: item.estado,
              notas: item.notas,
            },
            create: {
              razonSocial: item.nombre,
              nit: item.nit,
              tipoOperacion: item.tipoOperacion,
              contactoNombre: item.contactoNombre,
              telefono: item.contactoTelefono,
              email: item.contactoEmail,
              fechaVinculacion: new Date(item.fechaVinculacion),
              fechaFinContrato: item.fechaFinContrato ? new Date(item.fechaFinContrato) : null,
              estado: item.estado,
              notas: item.notas,
            },
          });
          createdCount++;
        }
      }
    }

    revalidatePath("/contratistas");
    revalidatePath("/dashboard");
    revalidatePath("/flota");
    revalidatePath("/personas");

    const refreshedList = await getContratistasDb();
    return { success: true, createdCount, updatedCount, refreshedList };
  } catch (error: any) {
    console.error("Error en bulkUpsertContratistasAction:", error);
    return { success: false, error: error.message || "Error al procesar la carga masiva." };
  }
}

// ----------------------------------------------------
// DOCUMENTOS LEGALES Y EXPEDIENTE DE CONTRATISTA
// ----------------------------------------------------

/**
 * Obtiene los documentos adjuntos de un contratista
 */
export async function getDocumentosContratistaDb(contratistaId: string): Promise<ContratistaDocumentoAdjunto[]> {
  try {
    if (process.env.DATABASE_URL) {
      const docs = await prisma.documentoAdjunto.findMany({
        where: { entidadTipo: "contratista", entidadId: contratistaId },
        orderBy: { createdAt: "desc" },
      });

      return docs.map((d) => ({
        id: d.id,
        tipoDocumento: d.tipoDocumento,
        nombre: d.nombre,
        archivoUrl: d.archivoUrl,
        tamano: d.tamano ?? undefined,
        mimeType: d.mimeType ?? undefined,
        fechaVencimiento: d.fechaVencimiento ? d.fechaVencimiento.toISOString().split("T")[0] : undefined,
        createdAt: d.createdAt.toISOString(),
      }));
    } else {
      return localDocumentosContratistasState.filter((d) => (d as any).contratistaId === contratistaId);
    }
  } catch (error) {
    console.warn("Aviso al consultar documentos de contratista:", error);
    return localDocumentosContratistasState.filter((d) => (d as any).contratistaId === contratistaId);
  }
}

/**
 * Guarda o actualiza un documento legal de contratista
 */
export async function guardarDocumentoContratistaDb(
  contratistaId: string,
  tipoDocumento: string,
  nombre: string,
  archivoUrl: string,
  tamano?: string,
  mimeType?: string,
  fechaVencimiento?: string
) {
  try {
    if (process.env.DATABASE_URL) {
      // Eliminar versión previa del mismo casillero si existía
      await prisma.documentoAdjunto.deleteMany({
        where: {
          entidadTipo: "contratista",
          entidadId: contratistaId,
          tipoDocumento,
        },
      });

      const nuevoDoc = await prisma.documentoAdjunto.create({
        data: {
          entidadTipo: "contratista",
          entidadId: contratistaId,
          tipoDocumento,
          nombre,
          archivoUrl,
          tamano,
          mimeType,
          fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        },
      });

      revalidatePath(`/contratistas/${contratistaId}`);
      return { success: true, docId: nuevoDoc.id };
    } else {
      const nuevoDocLocal: ContratistaDocumentoAdjunto = {
        id: `doc_c_${Date.now()}`,
        tipoDocumento,
        nombre,
        archivoUrl,
        tamano,
        mimeType,
        fechaVencimiento,
        createdAt: new Date().toISOString(),
      };
      (nuevoDocLocal as any).contratistaId = contratistaId;
      localDocumentosContratistasState = localDocumentosContratistasState.filter(
        (d) => !(d.tipoDocumento === tipoDocumento && (d as any).contratistaId === contratistaId)
      );
      localDocumentosContratistasState.push(nuevoDocLocal);

      revalidatePath(`/contratistas/${contratistaId}`);
      return { success: true, docId: nuevoDocLocal.id };
    }
  } catch (error: any) {
    console.error("Error al guardar documento de contratista:", error);
    return { success: false, error: error.message || "Error al guardar documento." };
  }
}

/**
 * Elimina un documento legal de contratista
 */
export async function eliminarDocumentoContratistaDb(docId: string, contratistaId: string) {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.documentoAdjunto.delete({
        where: { id: docId },
      });
    } else {
      localDocumentosContratistasState = localDocumentosContratistasState.filter((d) => d.id !== docId);
    }

    revalidatePath(`/contratistas/${contratistaId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar documento de contratista:", error);
    return { success: false, error: error.message || "Error al eliminar documento." };
  }
}
