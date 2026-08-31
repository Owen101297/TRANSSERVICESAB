"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_HALLAZGOS, getHallazgoById as getSeedHallazgoById } from "@/lib/data/hallazgos";
import { Hallazgo, OrigenHallazgo, SeveridadHallazgo, EstadoHallazgo } from "@/lib/types/hseq";

let localHallazgosState: Hallazgo[] = [...SEED_HALLAZGOS];

/**
 * Obtiene todos los hallazgos de HSEQ desde DB (o fallback local)
 */
export async function getHallazgosDb(): Promise<Hallazgo[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localHallazgosState;
    }

    const dbHallazgos = await (prisma as any).hallazgoHseq.findMany({
      orderBy: { fechaReporte: "desc" },
    });

    return dbHallazgos.map((h: any) => ({
      id: h.id,
      origen: h.origen as OrigenHallazgo,
      titulo: h.titulo,
      descripcion: h.descripcion,
      severidad: h.severidad as SeveridadHallazgo,
      estado: h.estado as EstadoHallazgo,
      vehiculoId: h.vehiculoId ?? undefined,
      placa: h.placa ?? undefined,
      conductorId: h.conductorId ?? undefined,
      conductorNombre: h.conductorNombre ?? undefined,
      responsable: h.responsable,
      fechaReporte: h.fechaReporte.toISOString().split("T")[0],
      fechaCierre: h.fechaCierre ? h.fechaCierre.toISOString().split("T")[0] : undefined,
      accionCorrectiva: h.accionCorrectiva ?? undefined,
    }));
  } catch (error) {
    console.warn("Aviso DB HSEQ (usando fallback local):", error);
    return localHallazgosState;
  }
}

/**
 * Obtiene un hallazgo por ID
 */
export async function getHallazgoByIdDb(id: string): Promise<Hallazgo | undefined> {
  try {
    if (!process.env.DATABASE_URL) {
      return localHallazgosState.find((h) => h.id === id) || getSeedHallazgoById(id);
    }

    const h = await (prisma as any).hallazgoHseq.findUnique({
      where: { id },
    });

    if (!h) {
      return localHallazgosState.find((hallazgo) => hallazgo.id === id) || getSeedHallazgoById(id);
    }

    return {
      id: h.id,
      origen: h.origen as OrigenHallazgo,
      titulo: h.titulo,
      descripcion: h.descripcion,
      severidad: h.severidad as SeveridadHallazgo,
      estado: h.estado as EstadoHallazgo,
      vehiculoId: h.vehiculoId ?? undefined,
      placa: h.placa ?? undefined,
      conductorId: h.conductorId ?? undefined,
      conductorNombre: h.conductorNombre ?? undefined,
      responsable: h.responsable,
      fechaReporte: h.fechaReporte.toISOString().split("T")[0],
      fechaCierre: h.fechaCierre ? h.fechaCierre.toISOString().split("T")[0] : undefined,
      accionCorrectiva: h.accionCorrectiva ?? undefined,
    };
  } catch (error) {
    return localHallazgosState.find((h) => h.id === id) || getSeedHallazgoById(id);
  }
}

/**
 * Server Action para registrar un nuevo hallazgo
 */
export async function createHallazgoAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const origen = (formData.get("origen") as OrigenHallazgo) || "inspeccion";
    const titulo = formData.get("titulo") as string;
    const descripcion = formData.get("descripcion") as string;
    const severidad = (formData.get("severidad") as SeveridadHallazgo) || "media";
    const responsable = formData.get("responsable") as string;
    const placa = (formData.get("placa") as string) || undefined;
    const accionCorrectiva = (formData.get("accionCorrectiva") as string) || undefined;

    const newId = `h_${Date.now()}`;
    const newHallazgo: Hallazgo = {
      id: newId,
      origen,
      titulo,
      descripcion,
      severidad,
      estado: "abierto",
      placa,
      responsable,
      fechaReporte: new Date().toISOString().split("T")[0],
      accionCorrectiva,
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await (prisma as any).hallazgoHseq.create({
          data: {
            origen,
            titulo,
            descripcion,
            severidad,
            estado: "abierto",
            placa,
            responsable,
            accionCorrectiva,
          },
        });
        newHallazgo.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Hallazgo en PostgreSQL:", dbErr);
      }
    }

    localHallazgosState.unshift(newHallazgo);
    revalidatePath("/hseq");

    return { success: true, id: newHallazgo.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear hallazgo." };
  }
}

/**
 * Server Action para actualizar el estado o acción correctiva de un hallazgo
 */
export async function updateHallazgoAction(
  id: string,
  estado: EstadoHallazgo,
  accionCorrectiva?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const index = localHallazgosState.findIndex((h) => h.id === id);
    if (index >= 0) {
      localHallazgosState[index].estado = estado;
      if (accionCorrectiva) {
        localHallazgosState[index].accionCorrectiva = accionCorrectiva;
      }
      if (estado === "cerrado") {
        localHallazgosState[index].fechaCierre = new Date().toISOString().split("T")[0];
      }
    }

    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).hallazgoHseq.update({
          where: { id },
          data: {
            estado,
            accionCorrectiva: accionCorrectiva || undefined,
            fechaCierre: estado === "cerrado" ? new Date() : undefined,
          },
        });
      } catch (err) {
        console.warn("No se pudo actualizar hallazgo en DB:", err);
      }
    }

    revalidatePath(`/hseq/${id}`);
    revalidatePath("/hseq");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar hallazgo." };
  }
}
