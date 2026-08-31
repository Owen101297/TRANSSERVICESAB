"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_ASIGNACIONES, getAsignacionById as getSeedAsignacionById } from "@/lib/data/asignaciones";
import { getPersonaById } from "@/lib/data/personas";
import { getVehiculoById } from "@/lib/data/vehiculos";
import { getContratistaById } from "@/lib/data/contratistas";
import {
  Asignacion,
  TipoAsignacion,
  TurnoRotativo,
  EstadoAsignacion,
} from "@/lib/types/asignacion";

let localAsignacionesState: Asignacion[] = [...SEED_ASIGNACIONES];

/**
 * Obtiene todas las asignaciones operativas desde DB (o fallback local)
 */
export async function getAsignacionesDb(): Promise<Asignacion[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localAsignacionesState;
    }

    const dbAsigs = await prisma.asignacion.findMany({
      orderBy: { fechaInicio: "desc" },
    });

    return dbAsigs.map((a) => ({
      id: a.id,
      conductorId: a.conductorId,
      conductorNombre: a.conductorNombre,
      vehiculoId: a.vehiculoId,
      placa: a.placa,
      contratistaId: a.contratistaId,
      contratistaNombre: a.contratistaNombre,
      tipoAsignacion: a.tipoAsignacion as TipoAsignacion,
      turno: (a.turno as TurnoRotativo) ?? undefined,
      fechaInicio: a.fechaInicio.toISOString().split("T")[0],
      fechaFin: a.fechaFin ? a.fechaFin.toISOString().split("T")[0] : undefined,
      estado: a.estado as EstadoAsignacion,
      observaciones: a.observaciones ?? undefined,
    }));
  } catch (error) {
    console.warn("Aviso de conexión DB Asignaciones (usando almacén local):", error);
    return localAsignacionesState;
  }
}

/**
 * Obtiene una asignación por ID
 */
export async function getAsignacionByIdDb(id: string): Promise<Asignacion | undefined> {
  try {
    if (!process.env.DATABASE_URL) {
      return localAsignacionesState.find((a) => a.id === id) || getSeedAsignacionById(id);
    }

    const a = await prisma.asignacion.findUnique({
      where: { id },
    });

    if (!a) {
      return localAsignacionesState.find((asig) => asig.id === id) || getSeedAsignacionById(id);
    }

    return {
      id: a.id,
      conductorId: a.conductorId,
      conductorNombre: a.conductorNombre,
      vehiculoId: a.vehiculoId,
      placa: a.placa,
      contratistaId: a.contratistaId,
      contratistaNombre: a.contratistaNombre,
      tipoAsignacion: a.tipoAsignacion as TipoAsignacion,
      turno: (a.turno as TurnoRotativo) ?? undefined,
      fechaInicio: a.fechaInicio.toISOString().split("T")[0],
      fechaFin: a.fechaFin ? a.fechaFin.toISOString().split("T")[0] : undefined,
      estado: a.estado as EstadoAsignacion,
      observaciones: a.observaciones ?? undefined,
    };
  } catch (error) {
    return localAsignacionesState.find((a) => a.id === id) || getSeedAsignacionById(id);
  }
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
    const contratistaId = (formData.get("contratistaId") as string) || "c1";
    const tipoAsignacion = (formData.get("tipoAsignacion") as TipoAsignacion) || "fija";
    const turno = (formData.get("turno") as TurnoRotativo) || undefined;
    const fechaInicio = (formData.get("fechaInicio") as string) || new Date().toISOString().split("T")[0];
    const fechaFin = (formData.get("fechaFin") as string) || undefined;
    const observaciones = (formData.get("observaciones") as string) || undefined;
    const autorizacionOperativa = formData.get("autorizacionOperativa") === "true";

    const persona = getPersonaById(conductorId);
    const conductorNombre = persona ? `${persona.nombres} ${persona.apellidos}` : "Conductor Asignado";

    const vehiculo = getVehiculoById(vehiculoId);
    const placa = vehiculo ? vehiculo.placa : "PLACA";

    const contratista = getContratistaById(contratistaId);
    const contratistaNombre = contratista ? contratista.nombre : "Contratista General";

    const newId = `asig_${Date.now()}`;

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
        newAsigObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Asignación en PostgreSQL:", dbErr);
      }
    }

    localAsignacionesState.unshift(newAsigObj);
    revalidatePath("/asignaciones");
    revalidatePath("/personas");
    revalidatePath(`/personas/${conductorId}`);
    revalidatePath("/flota");
    revalidatePath(`/flota/${vehiculoId}`);

    return { success: true, asignacionId: newAsigObj.id };
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
    const index = localAsignacionesState.findIndex((a) => a.id === id);
    if (index >= 0) {
      localAsignacionesState[index] = {
        ...localAsignacionesState[index],
        estado: "finalizada",
        fechaFin: hoy,
      };
    }

    if (process.env.DATABASE_URL) {
      try {
        await prisma.asignacion.update({
          where: { id },
          data: {
            estado: "finalizada",
            fechaFin: new Date(),
          },
        });
      } catch (err) {
        console.warn("No se pudo finalizar en DB:", err);
      }
    }

    revalidatePath("/asignaciones");
    revalidatePath("/personas");
    revalidatePath("/flota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al finalizar la asignación." };
  }
}
