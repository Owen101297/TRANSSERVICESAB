"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Hallazgo, OrigenHallazgo, SeveridadHallazgo, EstadoHallazgo } from "@/lib/types/hseq";

let localHallazgosState: Hallazgo[] = [];

/**
 * Obtiene todos los hallazgos de HSEQ desde DB (o fallback local)
 */
export async function getHallazgosDb(): Promise<Hallazgo[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbHallazgos = await prisma.hallazgoHseq.findMany({
        orderBy: { fechaReporte: "desc" },
      });

      if (Array.isArray(dbHallazgos)) {
        return dbHallazgos.map((h) => ({
          id: h.id,
          origen: (h.origen as OrigenHallazgo) || "inspeccion",
          titulo: h.titulo,
          descripcion: h.descripcion,
          severidad: (h.severidad as SeveridadHallazgo) || "media",
          estado: (h.estado as EstadoHallazgo) || "abierto",
          vehiculoId: h.vehiculoId ?? undefined,
          placa: h.placa ?? undefined,
          conductorId: h.conductorId ?? undefined,
          conductorNombre: h.conductorNombre ?? undefined,
          responsable: h.responsable,
          fechaReporte: h.fechaReporte ? h.fechaReporte.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          fechaCierre: h.fechaCierre ? h.fechaCierre.toISOString().split("T")[0] : undefined,
          accionCorrectiva: h.accionCorrectiva ?? undefined,
          fotosEvidencia: h.fotosEvidencia || [],
        }));
      }
    }
  } catch (error) {
    console.warn("Aviso de consulta HSEQ (usando fallback local):", error);
  }

  return localHallazgosState;
}

/**
 * Obtiene un hallazgo por ID
 */
export async function getHallazgoByIdDb(id: string): Promise<Hallazgo | undefined> {
  try {
    if (process.env.DATABASE_URL) {
      const h = await prisma.hallazgoHseq.findUnique({
        where: { id },
      });

      if (h) {
        return {
          id: h.id,
          origen: (h.origen as OrigenHallazgo) || "inspeccion",
          titulo: h.titulo,
          descripcion: h.descripcion,
          severidad: (h.severidad as SeveridadHallazgo) || "media",
          estado: (h.estado as EstadoHallazgo) || "abierto",
          vehiculoId: h.vehiculoId ?? undefined,
          placa: h.placa ?? undefined,
          conductorId: h.conductorId ?? undefined,
          conductorNombre: h.conductorNombre ?? undefined,
          responsable: h.responsable,
          fechaReporte: h.fechaReporte ? h.fechaReporte.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          fechaCierre: h.fechaCierre ? h.fechaCierre.toISOString().split("T")[0] : undefined,
          accionCorrectiva: h.accionCorrectiva ?? undefined,
          fotosEvidencia: h.fotosEvidencia || [],
        };
      }
    }
  } catch (error) {
    console.warn("Aviso búsqueda Hallazgo por ID:", error);
  }

  return localHallazgosState.find((h) => h.id === id);
}

/**
 * Server Action para registrar un nuevo hallazgo
 */
export async function createHallazgoAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const origen = (formData.get("origen") as OrigenHallazgo) || "inspeccion";
    const titulo = (formData.get("titulo") as string)?.trim() || "Hallazgo Reportado";
    const descripcion = (formData.get("descripcion") as string)?.trim() || "";
    const severidad = (formData.get("severidad") as SeveridadHallazgo) || "media";
    const responsable = (formData.get("responsable") as string)?.trim() || "Coordinador HSEQ";
    const placa = ((formData.get("placa") as string) || "").trim().toUpperCase() || undefined;
    const accionCorrectiva = ((formData.get("accionCorrectiva") as string) || "").trim() || undefined;

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
      fotosEvidencia: [],
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.hallazgoHseq.create({
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
    revalidatePath("/dashboard");

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
  accionCorrectiva?: string,
  responsableCierre?: string
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
        await prisma.hallazgoHseq.update({
          where: { id },
          data: {
            estado,
            accionCorrectiva: accionCorrectiva || undefined,
            responsableCierre: responsableCierre || undefined,
            fechaCierre: estado === "cerrado" ? new Date() : undefined,
          },
        });
      } catch (err) {
        console.warn("No se pudo actualizar hallazgo en DB:", err);
      }
    }

    revalidatePath(`/hseq/${id}`);
    revalidatePath("/hseq");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar hallazgo." };
  }
}
