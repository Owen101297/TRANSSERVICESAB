"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireStaffSession } from "@/lib/auth";
import { fallbackOrThrow, isProductionRuntime, requireDatabaseInProduction, rethrowMutationInProduction } from "@/lib/production-safety";
import { recordAudit } from "@/lib/audit";
import { SEED_VEHICULOS, getVehiculoById as getSeedVehiculoById } from "@/lib/data/vehiculos";
import {
  Vehiculo,
  TipoVehiculo,
  ServicioVehiculo,
  EstadoVehiculo,
} from "@/lib/types/vehiculo";
import { DiagnosticoFilaVehiculo } from "@/lib/data/flota-upsert";
import { ensureContratistaExistsDb } from "@/lib/services/contratistas.service";
import {
  deleteStoredDocument,
  formatDocumentSize,
  resolveDocumentUrl,
  storeDocumentFile,
} from "@/lib/storage/document-storage";
import { buildDocumentAttachmentScope } from "@/lib/storage/document-validation";

let localVehiculosState: Vehiculo[] = [];

/**
 * Obtiene todos los vehículos desde PostgreSQL (o fallback local)
 */
export async function getVehiculosDb(): Promise<Vehiculo[]> {
  try {
    requireDatabaseInProduction();
    if (process.env.DATABASE_URL) {
      const dbVehicles = await prisma.vehiculo.findMany({
        orderBy: { placa: "asc" },
      });

      if (Array.isArray(dbVehicles)) {
        return dbVehicles.map((v) => ({
          id: v.id,
          placa: v.placa,
          tipo: (v.tipo as TipoVehiculo) || "van",
          marca: v.marca,
          modelo: v.modelo,
          anio: v.anio,
          capacidad: v.capacidad,
          contratistaId: v.contratistaId || "c_propio",
          contratistaNombre: v.contratistaNombre || "Propio / Cooperativa",
          servicio: (v.servicio as ServicioVehiculo) || "especial",
          estado: (v.estado as EstadoVehiculo) || "activo",
          documentos: {
            soatVencimiento: v.soatVencimiento ? v.soatVencimiento.toISOString().split("T")[0] : undefined,
            rtmVencimiento: v.rtmVencimiento ? v.rtmVencimiento.toISOString().split("T")[0] : undefined,
            polizaVencimiento: v.polizaVencimiento ? v.polizaVencimiento.toISOString().split("T")[0] : undefined,
          },
          odometroActual: v.odometroActual ?? undefined,
          odometroFecha: v.odometroFecha ? v.odometroFecha.toISOString() : undefined,
          odometroFotoUrl: v.odometroFotoUrl ?? undefined,
        }));
      }
    }
  } catch (error) {
    return fallbackOrThrow(error, localVehiculosState, "No fue posible consultar vehículos");
  }

  return localVehiculosState;
}

/**
 * Obtiene un vehículo por ID
 */
export async function getVehiculoByIdDb(id: string): Promise<Vehiculo | undefined> {
  try {
    requireDatabaseInProduction();
    if (process.env.DATABASE_URL) {
      const v = await prisma.vehiculo.findUnique({
        where: { id },
      });

      if (v) {
        return {
          id: v.id,
          placa: v.placa,
          tipo: (v.tipo as TipoVehiculo) || "van",
          marca: v.marca,
          modelo: v.modelo,
          anio: v.anio,
          capacidad: v.capacidad,
          contratistaId: v.contratistaId || "c_propio",
          contratistaNombre: v.contratistaNombre || "Propio / Cooperativa",
          servicio: (v.servicio as ServicioVehiculo) || "especial",
          estado: (v.estado as EstadoVehiculo) || "activo",
          documentos: {
            soatVencimiento: v.soatVencimiento ? v.soatVencimiento.toISOString().split("T")[0] : undefined,
            rtmVencimiento: v.rtmVencimiento ? v.rtmVencimiento.toISOString().split("T")[0] : undefined,
            polizaVencimiento: v.polizaVencimiento ? v.polizaVencimiento.toISOString().split("T")[0] : undefined,
          },
          odometroActual: v.odometroActual ?? undefined,
          odometroFecha: v.odometroFecha ? v.odometroFecha.toISOString() : undefined,
          odometroFotoUrl: v.odometroFotoUrl ?? undefined,
        };
      }
    }
  } catch (error) {
    return fallbackOrThrow(
      error,
      localVehiculosState.find((v) => v.id === id) || getSeedVehiculoById(id),
      "No fue posible consultar el vehículo"
    );
  }
  return isProductionRuntime()
    ? undefined
    : localVehiculosState.find((v) => v.id === id) || getSeedVehiculoById(id);
}

/**
 * Registra un nuevo vehículo en la flota
 */
export async function createVehiculoAction(
  formData: FormData
): Promise<{ success: boolean; vehiculoId?: string; error?: string }> {
  try {
    const actor = await requireStaffSession();
    const placa = ((formData.get("placa") as string) || "").toUpperCase().trim();
    const tipo = (formData.get("tipo") as TipoVehiculo) || "van";
    const marca = (formData.get("marca") as string) || "";
    const modelo = (formData.get("modelo") as string) || "";
    const anio = parseInt((formData.get("anio") as string) || "2023", 10);
    const capacidad = parseInt((formData.get("capacidad") as string) || "16", 10);
    const rawContratista = (formData.get("contratistaNombre") as string) || (formData.get("contratistaId") as string) || "Propio / Cooperativa";

    let contratistaId: string | null = null;
    let contratistaNombre = rawContratista;

    try {
      const cObj = await ensureContratistaExistsDb(rawContratista);
      contratistaId = cObj.id;
      contratistaNombre = cObj.razonSocial;
    } catch (cErr) {
      console.warn("Aviso resolviendo contratista:", cErr);
    }

    const servicio = (formData.get("servicio") as ServicioVehiculo) || "especial";
    const soatVencimiento = (formData.get("soatVencimiento") as string)?.trim() || undefined;
    const rtmVencimiento = (formData.get("rtmVencimiento") as string)?.trim() || undefined;
    const polizaVencimiento = (formData.get("polizaVencimiento") as string)?.trim() || undefined;

    let newId = `v_${Date.now()}`;

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.vehiculo.create({
          data: {
            placa,
            tipo,
            marca,
            modelo,
            anio,
            capacidad,
            contratistaId: contratistaId || undefined,
            contratistaNombre,
            servicio,
            estado: "activo",
            soatVencimiento: soatVencimiento ? new Date(soatVencimiento) : null,
            rtmVencimiento: rtmVencimiento ? new Date(rtmVencimiento) : null,
            polizaVencimiento: polizaVencimiento ? new Date(polizaVencimiento) : null,
          },
        });
        newId = created.id;
      } catch (dbErr) {
        console.error("Error guardando vehículo en PostgreSQL:", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible guardar el vehículo");
      }
    }

    const newVehiculoObj: Vehiculo = {
      id: newId,
      placa,
      tipo,
      marca,
      modelo,
      anio,
      capacidad,
      contratistaId: contratistaId || "c_propio",
      contratistaNombre,
      servicio,
      estado: "activo",
      documentos: {
        soatVencimiento,
        rtmVencimiento,
        polizaVencimiento,
      },
    };

    localVehiculosState.unshift(newVehiculoObj);
    await recordAudit({ action: "CREATE", entityType: "Vehiculo", entityId: newId, after: newVehiculoObj, actor });
    revalidatePath("/flota");
    revalidatePath("/dashboard");
    revalidatePath("/asignaciones");

    return { success: true, vehiculoId: newId };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear vehículo." };
  }
}

/**
 * Cambia el estado operativo de un vehículo en 1 clic
 */
export async function cambiarEstadoVehiculoDb(
  id: string,
  nuevoEstado: EstadoVehiculo
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await requireStaffSession();
    if (process.env.DATABASE_URL) {
      try {
        const before = await prisma.vehiculo.findUnique({ where: { id } });
        const after = await prisma.vehiculo.update({
          where: { id },
          data: { estado: nuevoEstado },
        });
        await recordAudit({ action: "STATUS_CHANGE", entityType: "Vehiculo", entityId: id, before, after, actor });
      } catch (err) {
        console.warn("Aviso actualizando estado en DB:", err);
        rethrowMutationInProduction(err, "No fue posible actualizar el estado del vehículo");
      }
    }

    const idx = localVehiculosState.findIndex((v) => v.id === id);
    if (idx >= 0) {
      localVehiculosState[idx].estado = nuevoEstado;
    }

    revalidatePath("/flota");
    revalidatePath(`/flota/${id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al cambiar estado del vehículo." };
  }
}

/**
 * Elimina un vehículo por ID
 */
export async function deleteVehiculoDb(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await requireStaffSession(["administrativo"]);
    if (process.env.DATABASE_URL) {
      try {
        const v = await prisma.vehiculo.findUnique({ where: { id } });
        if (v) {
          // Finalizar cualquier asignación activa para que el historial quede cerrado formalmente
          await prisma.asignacion.updateMany({
            where: {
              OR: [{ vehiculoId: id }, { placa: v.placa }],
              estado: "activa",
            },
            data: {
              estado: "finalizada",
              fechaFin: new Date(),
            },
          });
        }
        await prisma.vehiculo.delete({
          where: { id },
        });
        await recordAudit({ action: "DELETE", entityType: "Vehiculo", entityId: id, before: v, actor });
      } catch (err) {
        console.warn("Aviso eliminando vehículo en DB:", err);
        rethrowMutationInProduction(err, "No fue posible eliminar el vehículo");
      }
    }

    localVehiculosState = localVehiculosState.filter((v) => v.id !== id);

    revalidatePath("/flota");
    revalidatePath("/dashboard");
    revalidatePath("/asignaciones");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar vehículo." };
  }
}

/**
 * Elimina múltiples vehículos seleccionados en bloque
 */
export async function bulkDeleteVehiculosDb(ids: string[]): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const actor = await requireStaffSession(["administrativo"]);
    let deletedCount = 0;
    if (process.env.DATABASE_URL) {
      try {
        const before = await prisma.vehiculo.findMany({ where: { id: { in: ids } } });
        // Finalizar asignaciones vinculadas
        await prisma.asignacion.updateMany({
          where: { vehiculoId: { in: ids }, estado: "activa" },
          data: { estado: "finalizada", fechaFin: new Date() },
        });

        const res = await prisma.vehiculo.deleteMany({
          where: { id: { in: ids } },
        });
        deletedCount = res.count;
        await recordAudit({
          action: "DELETE",
          entityType: "Vehiculo",
          before,
          metadata: { operation: "bulk_delete", ids, count: res.count },
          actor,
        });
      } catch (dbErr) {
        console.warn("Aviso en bulkDeleteVehiculosDb (DB):", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible eliminar los vehículos");
      }
    }

    localVehiculosState = localVehiculosState.filter((v) => !ids.includes(v.id));

    revalidatePath("/flota");
    revalidatePath("/dashboard");
    revalidatePath("/asignaciones");
    return { success: true, count: deletedCount || ids.length };
  } catch (error: any) {
    return { success: false, count: 0, error: error.message || "Error al eliminar vehículos." };
  }
}

export const deleteMultipleVehiculosDb = bulkDeleteVehiculosDb;

/**
 * Registra o actualiza en bloque (Upsert) los vehículos leídos de un archivo Excel/CSV
 */
export async function bulkUpsertVehiculosDb(
  filas: DiagnosticoFilaVehiculo[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const actor = await requireStaffSession();
    let count = 0;

    const processRows = async (db: Prisma.TransactionClient | null) => {
      for (const f of filas) {
      const soatDate = f.soatVencimiento ? new Date(f.soatVencimiento) : null;
      const rtmDate = f.rtmVencimiento ? new Date(f.rtmVencimiento) : null;
      const polizaDate = f.polizaVencimiento ? new Date(f.polizaVencimiento) : null;

      // Auto-asegurar que el contratista exista en el módulo Contratistas
      let contratistaId: string | null = null;
      let contratistaNombre = f.contratistaNombre || "Flota Propia / Trans Services A&B";

      if (db) {
        const isOwnFleet = contratistaNombre.toLowerCase().includes("propia") || contratistaNombre.toLowerCase().includes("cooperativa");
        const contractor = await db.contratista.findFirst({
          where: isOwnFleet
            ? { razonSocial: { contains: "Cooperativa", mode: "insensitive" } }
            : { razonSocial: { equals: contratistaNombre, mode: "insensitive" } },
        });
        if (!contractor) {
          throw new Error(`Vehículo ${f.placa}: el contratista "${contratistaNombre}" no existe. Créalo antes de importar la flota.`);
        }
        contratistaId = contractor.id;
        contratistaNombre = contractor.razonSocial;
      }

      if (db) {
        try {
          await db.vehiculo.upsert({
            where: { placa: f.placa },
            update: {
              marca: f.marca,
              modelo: f.modelo,
              anio: f.anio,
              tipo: f.tipo,
              servicio: f.servicio,
              capacidad: f.capacidad,
              contratistaId: contratistaId || undefined,
              contratistaNombre,
              soatVencimiento: soatDate,
              rtmVencimiento: rtmDate,
              polizaVencimiento: polizaDate,
              estado: f.estado || "activo",
            },
            create: {
              placa: f.placa,
              marca: f.marca,
              modelo: f.modelo,
              anio: f.anio,
              tipo: f.tipo,
              servicio: f.servicio,
              capacidad: f.capacidad,
              contratistaId: contratistaId || undefined,
              contratistaNombre,
              soatVencimiento: soatDate,
              rtmVencimiento: rtmDate,
              polizaVencimiento: polizaDate,
              estado: f.estado || "activo",
            },
          });
          count++;
        } catch (dbErr) {
          console.error(`Error al hacer upsert de ${f.placa} en PostgreSQL:`, dbErr);
          const detail = dbErr instanceof Error ? dbErr.message : String(dbErr);
          throw new Error(`No fue posible importar el vehículo ${f.placa}: ${detail}`);
        }
      }

      // Almacenar localmente también
      const idx = localVehiculosState.findIndex((x) => x.placa === f.placa);
      const vObj: Vehiculo = {
        id: idx >= 0 ? localVehiculosState[idx].id : `v_${Date.now()}_${count}`,
        placa: f.placa,
        tipo: f.tipo,
        marca: f.marca,
        modelo: f.modelo,
        anio: f.anio,
        capacidad: f.capacidad,
        contratistaId: contratistaId || "c_propio",
        contratistaNombre,
        servicio: f.servicio,
        estado: f.estado || "activo",
        documentos: {
          soatVencimiento: f.soatVencimiento,
          rtmVencimiento: f.rtmVencimiento,
          polizaVencimiento: f.polizaVencimiento,
        },
      };

      if (idx >= 0) {
        localVehiculosState[idx] = vObj;
      } else {
        localVehiculosState.push(vObj);
      }
      }
    };

    if (process.env.DATABASE_URL) {
      await prisma.$transaction((tx) => processRows(tx), { maxWait: 10_000, timeout: 120_000 });
    } else {
      await processRows(null);
    }

    revalidatePath("/flota");
    revalidatePath("/dashboard");
    revalidatePath("/asignaciones");
    if (process.env.DATABASE_URL) {
      await recordAudit({
        action: "UPDATE",
        entityType: "Vehiculo",
        metadata: { operation: "bulk_upsert", requestedCount: filas.length, processedCount: count },
        actor,
      });
    }
    return { success: true, count: count || filas.length };
  } catch (error: any) {
    console.error("Error en bulkUpsertVehiculosDb:", error);
    return { success: false, count: 0, error: error.message || "Error al procesar la carga masiva." };
  }
}

/**
 * Actualiza un vehículo existente
 */
export async function updateVehiculoAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const actor = await requireStaffSession();
    const marca = formData.get("marca") as string;
    const modelo = formData.get("modelo") as string;
    const anio = parseInt((formData.get("anio") as string) || "2023", 10);
    const capacidad = parseInt((formData.get("capacidad") as string) || "16", 10);
    const tipo = formData.get("tipo") as TipoVehiculo;
    const servicio = formData.get("servicio") as ServicioVehiculo;
    const estado = formData.get("estado") as EstadoVehiculo;
    const rawContratista = (formData.get("contratistaNombre") as string) || (formData.get("contratistaId") as string) || "";

    let contratistaId: string | null = null;
    let contratistaNombre = rawContratista;

    if (rawContratista) {
      try {
        const cObj = await ensureContratistaExistsDb(rawContratista);
        contratistaId = cObj.id;
        contratistaNombre = cObj.razonSocial;
      } catch (cErr) {
        console.warn("Aviso resolviendo contratista:", cErr);
      }
    }

    const soatVencimiento = (formData.get("soatVencimiento") as string)?.trim() || undefined;
    const rtmVencimiento = (formData.get("rtmVencimiento") as string)?.trim() || undefined;
    const polizaVencimiento = (formData.get("polizaVencimiento") as string)?.trim() || undefined;

    if (process.env.DATABASE_URL) {
      try {
        const before = await prisma.vehiculo.findUnique({ where: { id } });
        const after = await prisma.vehiculo.update({
          where: { id },
          data: {
            marca: marca || undefined,
            modelo: modelo || undefined,
            anio: isNaN(anio) ? undefined : anio,
            capacidad: isNaN(capacidad) ? undefined : capacidad,
            tipo: tipo || undefined,
            servicio: servicio || undefined,
            estado: estado || undefined,
            contratistaId: contratistaId || undefined,
            contratistaNombre: contratistaNombre || undefined,
            soatVencimiento: soatVencimiento ? new Date(soatVencimiento) : null,
            rtmVencimiento: rtmVencimiento ? new Date(rtmVencimiento) : null,
            polizaVencimiento: polizaVencimiento ? new Date(polizaVencimiento) : null,
          },
        });
        await recordAudit({ action: "UPDATE", entityType: "Vehiculo", entityId: id, before, after, actor });
      } catch (dbErr) {
        console.warn("Aviso actualizando vehículo en DB:", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible actualizar el vehículo");
      }
    }

    const idx = localVehiculosState.findIndex((v) => v.id === id);
    if (idx >= 0) {
      const prev = localVehiculosState[idx];
      localVehiculosState[idx] = {
        ...prev,
        marca: marca || prev.marca,
        modelo: modelo || prev.modelo,
        anio: isNaN(anio) ? prev.anio : anio,
        capacidad: isNaN(capacidad) ? prev.capacidad : capacidad,
        tipo: tipo || prev.tipo,
        servicio: servicio || prev.servicio,
        estado: estado || prev.estado,
        contratistaId: contratistaId || prev.contratistaId,
        contratistaNombre: contratistaNombre || prev.contratistaNombre,
        documentos: {
          soatVencimiento: soatVencimiento || prev.documentos?.soatVencimiento || "",
          rtmVencimiento: rtmVencimiento || prev.documentos?.rtmVencimiento || "",
          polizaVencimiento: polizaVencimiento || prev.documentos?.polizaVencimiento || "",
        },
      };
    }

    revalidatePath("/flota");
    revalidatePath(`/flota/${id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar vehículo." };
  }
}

/**
 * Obtiene los documentos adjuntos de un vehículo
 */
export async function getAdjuntosVehiculoDb(vehiculoId: string) {
  await requireStaffSession();
  try {
    if (process.env.DATABASE_URL) {
      const dbAdjuntos = await prisma.documentoAdjunto.findMany({
        where: buildDocumentAttachmentScope("vehiculo", vehiculoId),
        orderBy: { createdAt: "desc" },
      });
      return Promise.all(dbAdjuntos.map(async (d) => ({
        id: d.id,
        nombre: d.nombre,
        tipoDocumento: d.tipoDocumento,
        archivoUrl: await resolveDocumentUrl(d.archivoUrl),
        tamano: d.tamano || undefined,
        mimeType: d.mimeType || undefined,
        fechaVencimiento: d.fechaVencimiento ? d.fechaVencimiento.toISOString().split("T")[0] : undefined,
        createdAt: d.createdAt.toISOString(),
      })));
    }
  } catch (err) {
    console.warn("Aviso consultando adjuntos de vehiculo:", err);
  }
  return [];
}

/**
 * Crea un documento adjunto en el expediente del vehículo
 */
export async function crearAdjuntoVehiculoDb(
  vehiculoId: string,
  tipoDocumento: string,
  file: File,
  fechaVencimiento?: string
) {
  try {
    const actor = await requireStaffSession();
    if (process.env.DATABASE_URL) {
      const vehiculo = await prisma.vehiculo.findUnique({ where: { id: vehiculoId }, select: { id: true } });
      if (!vehiculo) throw new Error("El vehículo indicado no existe.");
    }
    const stored = await storeDocumentFile(file, {
      entityType: "vehiculo",
      entityId: vehiculoId,
      documentType: tipoDocumento,
    });
    let createdId = `adj_${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (process.env.DATABASE_URL) {
      const anteriores = await prisma.documentoAdjunto.findMany({
        where: { entidadTipo: "vehiculo", entidadId: vehiculoId, tipoDocumento },
        select: { archivoUrl: true },
      });
      let created;
      try {
        created = await prisma.$transaction(async (tx) => {
          await tx.documentoAdjunto.deleteMany({
            where: { entidadTipo: "vehiculo", entidadId: vehiculoId, tipoDocumento },
          });
          return tx.documentoAdjunto.create({
            data: {
              entidadTipo: "vehiculo",
              entidadId: vehiculoId,
              tipoDocumento,
              nombre: stored.name,
              archivoUrl: stored.uri,
              tamano: formatDocumentSize(stored.size),
              mimeType: stored.mimeType,
              fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
            },
          });
        });
      } catch (error) {
        await deleteStoredDocument(stored.uri).catch(() => undefined);
        throw error;
      }
      await Promise.allSettled(anteriores.map((doc) => deleteStoredDocument(doc.archivoUrl)));
      createdId = created.id;
      await recordAudit({
        action: "CREATE",
        entityType: "DocumentoAdjunto",
        entityId: created.id,
        after: created,
        metadata: { entidadTipo: "vehiculo", entidadId: vehiculoId },
        actor,
      });
    }

    const adjuntoObj = {
      id: createdId,
      nombre: stored.name,
      tipoDocumento,
      archivoUrl: await resolveDocumentUrl(stored.uri),
      tamano: formatDocumentSize(stored.size),
      mimeType: stored.mimeType,
      fechaVencimiento,
      createdAt: nowIso,
    };

    revalidatePath(`/flota/${vehiculoId}`);
    return { success: true, adjunto: adjuntoObj };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Elimina un documento adjunto del expediente del vehículo
 */
export async function deleteAdjuntoVehiculoDb(id: string, vehiculoId: string) {
  try {
    const actor = await requireStaffSession();
    if (process.env.DATABASE_URL) {
      const scope = buildDocumentAttachmentScope("vehiculo", vehiculoId, id);
      const deleted = await prisma.$transaction(async (tx) => {
        const document = await tx.documentoAdjunto.findFirst({ where: scope });
        if (!document) throw new Error("El documento no pertenece al vehículo indicado.");
        return tx.documentoAdjunto.delete({ where: { id: document.id } });
      });
      await deleteStoredDocument(deleted.archivoUrl).catch((error) =>
        console.error("No fue posible eliminar el objeto documental:", error),
      );
      await recordAudit({
        action: "DELETE",
        entityType: "DocumentoAdjunto",
        entityId: deleted.id,
        before: deleted,
        metadata: { entidadTipo: "vehiculo", entidadId: vehiculoId },
        actor,
      });
      revalidatePath(`/flota/${vehiculoId}`);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
