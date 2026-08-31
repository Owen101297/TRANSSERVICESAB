"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ITEMS_SGSST } from "@/lib/data/sgsst-items";
import { ESTANDARES_SGSST } from "@/lib/data/sgsst-estandares";
import { ItemSGSST, EstandarSGSST, EstadoItemSGSST } from "@/lib/types/sgsst";

let localItemsSgsstState: ItemSGSST[] = [...ITEMS_SGSST];

/**
 * Obtiene todos los estándares del SG-SST
 */
export async function getEstandaresSgsstDb(): Promise<EstandarSGSST[]> {
  return ESTANDARES_SGSST;
}

/**
 * Obtiene todos los ítems de SG-SST con su estado de cumplimiento
 */
export async function getItemsSgsstDb(): Promise<ItemSGSST[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localItemsSgsstState;
    }

    const dbItems = await (prisma as any).itemSgsst.findMany();
    if (!dbItems || dbItems.length === 0) {
      return localItemsSgsstState;
    }

    return dbItems.map((i: any) => ({
      id: i.id,
      numeral: i.numeral,
      estandarId: i.estandarId,
      nombre: i.nombre,
      estado: i.estado as EstadoItemSGSST,
      responsable: i.responsable ?? undefined,
      documentoNombre: i.documentoNombre ?? undefined,
      fechaActualizacion: i.fechaActualizacion ? i.fechaActualizacion.toISOString().split("T")[0] : undefined,
      observaciones: i.observaciones ?? undefined,
    }));
  } catch (error) {
    console.warn("Aviso DB SG-SST (usando fallback local):", error);
    return localItemsSgsstState;
  }
}

/**
 * Obtiene los ítems pertenecientes a un estándar específico
 */
export async function getItemsPorEstandarDb(estandarId: string): Promise<ItemSGSST[]> {
  const all = await getItemsSgsstDb();
  return all.filter((i) => i.estandarId === estandarId);
}

/**
 * Server Action para actualizar el estado o adjuntar evidencia a un ítem SG-SST
 */
export async function updateItemSgsstAction(
  itemId: string,
  estado: EstadoItemSGSST,
  documentoNombre?: string,
  observaciones?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const index = localItemsSgsstState.findIndex((i) => i.id === itemId);
    if (index >= 0) {
      localItemsSgsstState[index].estado = estado;
      if (documentoNombre) localItemsSgsstState[index].documentoNombre = documentoNombre;
      if (observaciones) localItemsSgsstState[index].observaciones = observaciones;
      localItemsSgsstState[index].fechaActualizacion = new Date().toISOString().split("T")[0];
    }

    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).itemSgsst.update({
          where: { id: itemId },
          data: {
            estado,
            documentoNombre: documentoNombre || undefined,
            observaciones: observaciones || undefined,
            fechaActualizacion: new Date(),
          },
        });
      } catch (err) {
        console.warn("No se pudo actualizar ítem SG-SST en DB:", err);
      }
    }

    revalidatePath("/sgsst");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar ítem SG-SST." };
  }
}
