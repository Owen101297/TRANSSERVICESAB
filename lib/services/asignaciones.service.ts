"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getPersonaByIdDb } from "@/lib/services/personas.service";
import { getVehiculoByIdDb } from "@/lib/services/vehiculos.service";
import { getContratistaByIdDb } from "@/lib/services/contratistas.service";
import {
  Asignacion,
  TipoAsignacion,
  TurnoRotativo,
  EstadoAsignacion,
} from "@/lib/types/asignacion";

let localAsignacionesState: Asignacion[] = [];

/**
 * Obtiene todas las asignaciones operativas desde DB (o fallback local)
 */
export async function getAsignacionesDb(): Promise<Asignacion[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbAsigs = await prisma.asignacion.findMany({
        orderBy: { fechaInicio: "desc" },
      });

      if (Array.isArray(dbAsigs)) {
        return dbAsigs.map((a) => ({
          id: a.id,
          conductorId: a.conductorId,
          conductorNombre: a.conductorNombre,
          vehiculoId: a.vehiculoId,
          placa: a.placa,
          contratistaId: a.contratistaId,
          contratistaNombre: a.contratistaNombre,
          tipoAsignacion: (a.tipoAsignacion as TipoAsignacion) || "fija",
          turno: (a.turno as TurnoRotativo) ?? undefined,
          fechaInicio: a.fechaInicio ? a.fechaInicio.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          fechaFin: a.fechaFin ? a.fechaFin.toISOString().split("T")[0] : undefined,
          estado: (a.estado as EstadoAsignacion) || "activa",
          observaciones: a.observaciones ?? undefined,
        }));
      }
    }
  } catch (error) {
    console.warn("Aviso de conexión DB Asignaciones (usando almacén local):", error);
  }

  return localAsignacionesState;
}

/**
 * Obtiene una asignación por ID
 */
export async function getAsignacionByIdDb(id: string): Promise<Asignacion | undefined> {
  try {
    if (process.env.DATABASE_URL) {
      const a = await prisma.asignacion.findUnique({
        where: { id },
      });

      if (a) {
        return {
          id: a.id,
          conductorId: a.conductorId,
          conductorNombre: a.conductorNombre,
          vehiculoId: a.vehiculoId,
          placa: a.placa,
          contratistaId: a.contratistaId,
          contratistaNombre: a.contratistaNombre,
          tipoAsignacion: (a.tipoAsignacion as TipoAsignacion) || "fija",
          turno: (a.turno as TurnoRotativo) ?? undefined,
          fechaInicio: a.fechaInicio ? a.fechaInicio.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          fechaFin: a.fechaFin ? a.fechaFin.toISOString().split("T")[0] : undefined,
          estado: (a.estado as EstadoAsignacion) || "activa",
          observaciones: a.observaciones ?? undefined,
        };
      }
    }
  } catch (error) {
    console.warn("Error consultando asignación por id:", error);
  }

  return localAsignacionesState.find((a) => a.id === id);
}

/**
 * Server Action para registrar una nueva asignación operativa
 */
export async function createAsignacionAction(
  formData: FormData
): Promise<{ success: boolean; asignacionId?: string; error?: string }> {
  try {
    const conductorId = formData.get("conductorId") as string;
    const vehiculoId = formData.get("vehiculoId") as string;
    const tipoAsignacion = (formData.get("tipoAsignacion") as TipoAsignacion) || "fija";
    const turno = (formData.get("turno") as TurnoRotativo) || undefined;
    const fechaInicio = (formData.get("fechaInicio") as string) || new Date().toISOString().split("T")[0];
    const fechaFin = (formData.get("fechaFin") as string) || undefined;
    const observaciones = (formData.get("observaciones") as string) || undefined;
    const autorizacionOperativa = formData.get("autorizacionOperativa") === "true";

    if (!conductorId || !vehiculoId) {
      return { success: false, error: "Debes seleccionar un conductor y un vehículo para la asignación." };
    }

    // Consultar datos reales de PostgreSQL
    const persona = await getPersonaByIdDb(conductorId);
    const conductorNombre = persona ? `${persona.nombres} ${persona.apellidos}`.trim() : "Conductor Asignado";

    const vehiculo = await getVehiculoByIdDb(vehiculoId);
    const placa = vehiculo ? vehiculo.placa : "PLACA";
    const contratistaId = (formData.get("contratistaId") as string) || vehiculo?.contratistaId || persona?.contratistaId || "c_propio";
    const contratistaNombre = vehiculo?.contratistaNombre || persona?.contratistaNombre || "Propio / Cooperativa";

    let newId = `asig_${Date.now()}`;

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.asignacion.create({
          data: {
            conductorId,
            conductorNombre,
            vehiculoId,
            placa,
            contratistaId,
            contratistaNombre,
            tipoAsignacion,
            turno: turno || null,
            fechaInicio: new Date(fechaInicio),
            fechaFin: fechaFin ? new Date(fechaFin) : null,
            estado: "activa",
            observaciones,
            autorizacionOperativa,
          },
        });
        newId = created.id;
      } catch (dbErr) {
        console.error("Error guardando Asignación en PostgreSQL:", dbErr);
      }
    }

    const newAsigObj: Asignacion = {
      id: newId,
      conductorId,
      conductorNombre,
      vehiculoId,
      placa,
      contratistaId,
      contratistaNombre,
      tipoAsignacion,
      turno,
      fechaInicio,
      fechaFin,
      estado: "activa",
      observaciones,
    };

    localAsignacionesState.unshift(newAsigObj);
    revalidatePath("/asignaciones");
    revalidatePath("/personas");
    revalidatePath(`/personas/${conductorId}`);
    revalidatePath("/flota");
    revalidatePath(`/flota/${vehiculoId}`);
    revalidatePath("/dashboard");

    return { success: true, asignacionId: newId };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar la asignación operativa." };
  }
}

/**
 * Server Action para finalizar una asignación activa
 */
export async function finalizarAsignacionAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const hoy = new Date().toISOString().split("T")[0];

    if (process.env.DATABASE_URL) {
      try {
        await prisma.asignacion.update({
          where: { id },
          data: {
            estado: "finalizada",
            fechaFin: new Date(),
          },
        });
      } catch (dbErr) {
        console.warn("Error al actualizar asignación en DB:", dbErr);
      }
    }

    const index = localAsignacionesState.findIndex((a) => a.id === id);
    if (index >= 0) {
      localAsignacionesState[index] = {
        ...localAsignacionesState[index],
        estado: "finalizada",
        fechaFin: hoy,
      };
    }

    revalidatePath("/asignaciones");
    revalidatePath("/personas");
    revalidatePath("/flota");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al finalizar la asignación." };
  }
}

/**
 * Server Action para eliminar una asignación
 */
export async function deleteAsignacionDb(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (process.env.DATABASE_URL) {
      try {
        await prisma.asignacion.delete({
          where: { id },
        });
      } catch (dbErr) {
        console.warn("Error eliminando asignación en DB:", dbErr);
      }
    }

    localAsignacionesState = localAsignacionesState.filter((a) => a.id !== id);

    revalidatePath("/asignaciones");
    revalidatePath("/personas");
    revalidatePath("/flota");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar asignación." };
  }
}
