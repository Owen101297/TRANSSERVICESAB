"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireServerSession, requireStaffSession } from "@/lib/auth";
import { fallbackOrThrow, isProductionRuntime, requireDatabaseInProduction, rethrowMutationInProduction } from "@/lib/production-safety";
import { Hallazgo, OrigenHallazgo, SeveridadHallazgo, EstadoHallazgo } from "@/lib/types/hseq";
import { recordAudit } from "@/lib/audit";

let localHallazgosState: Hallazgo[] = [];

/**
 * Obtiene todos los hallazgos de HSEQ desde DB (o fallback local)
 */
export async function getHallazgosDb(): Promise<Hallazgo[]> {
  try {
    requireDatabaseInProduction();
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
    return fallbackOrThrow(error, localHallazgosState, "No fue posible consultar hallazgos HSEQ");
  }

  return localHallazgosState;
}

/**
 * Obtiene un hallazgo por ID
 */
export async function getHallazgoByIdDb(id: string): Promise<Hallazgo | undefined> {
  try {
    requireDatabaseInProduction();
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
    return fallbackOrThrow(error, localHallazgosState.find((h) => h.id === id), "No fue posible consultar el hallazgo");
  }
  return isProductionRuntime() ? undefined : localHallazgosState.find((h) => h.id === id);
}

/**
 * Server Action para registrar un nuevo hallazgo
 */
export async function createHallazgoAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await requireServerSession();
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
        rethrowMutationInProduction(dbErr, "No fue posible guardar el hallazgo HSEQ");
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
    const actor = await requireStaffSession(["hseq", "administrativo"]);
    let before: unknown;
    let after: unknown;
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
        before = await prisma.hallazgoHseq.findUnique({ where: { id } });
        after = await prisma.hallazgoHseq.update({
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
        rethrowMutationInProduction(err, "No fue posible actualizar el hallazgo HSEQ");
      }
    }

    if (process.env.DATABASE_URL) {
      await recordAudit({ action: "UPDATE", entityType: "HallazgoHSEQ", entityId: id, before, after, actor });
    }

    revalidatePath(`/hseq/${id}`);
    revalidatePath("/hseq");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar hallazgo." };
  }
}
