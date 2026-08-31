"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_VIAJES, getViajeById as getSeedViajeById } from "@/lib/data/viajes";
import { getPersonaById } from "@/lib/data/personas";
import { getVehiculoById } from "@/lib/data/vehiculos";
import { Viaje, EstadoViaje, ServicioViaje, Novedad } from "@/lib/types/viaje";

let localViajesState: Viaje[] = [];

/**
 * Obtiene todos los viajes operacionales desde DB (o fallback local)
 */
export async function getViajesDb(): Promise<Viaje[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localViajesState;
    }

    const dbViajes = await (prisma as any).viaje.findMany({
      include: {
        novedades: {
          orderBy: { fecha: "desc" },
        },
      },
      orderBy: { fechaSalida: "desc" },
    });

    return dbViajes.map((v: any) => ({
      id: v.id,
      conductorId: v.conductorId,
      conductorNombre: v.conductorNombre,
      vehiculoId: v.vehiculoId,
      placa: v.placa,
      contratistaNombre: v.contratistaNombre,
      origen: v.origen,
      destino: v.destino,
      servicio: v.servicio as ServicioViaje,
      fechaSalida: v.fechaSalida.toISOString(),
      duracionEstimadaHoras: v.duracionEstimadaHoras,
      fechaLlegadaReal: v.fechaLlegadaReal ? v.fechaLlegadaReal.toISOString() : undefined,
      estado: v.estado as EstadoViaje,
      observaciones: v.observaciones ?? undefined,
      novedades: v.novedades.map((n: any) => ({
        id: n.id,
        fecha: n.fecha.toISOString(),
        descripcion: n.descripcion,
      })),
    }));
  } catch (error) {
    console.warn("Aviso de conexión DB Viajes (usando almacén local):", error);
    return localViajesState;
  }
}

/**
 * Obtiene un viaje por ID
 */
export async function getViajeByIdDb(id: string): Promise<Viaje | undefined> {
  try {
    if (!process.env.DATABASE_URL) {
      return localViajesState.find((v) => v.id === id) || getSeedViajeById(id);
    }

    const v = await (prisma as any).viaje.findUnique({
      where: { id },
      include: {
        novedades: {
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!v) {
      return localViajesState.find((viaje) => viaje.id === id) || getSeedViajeById(id);
    }

    return {
      id: v.id,
      conductorId: v.conductorId,
      conductorNombre: v.conductorNombre,
      vehiculoId: v.vehiculoId,
      placa: v.placa,
      contratistaNombre: v.contratistaNombre,
      origen: v.origen,
      destino: v.destino,
      servicio: v.servicio as ServicioViaje,
      fechaSalida: v.fechaSalida.toISOString(),
      duracionEstimadaHoras: v.duracionEstimadaHoras,
      fechaLlegadaReal: v.fechaLlegadaReal ? v.fechaLlegadaReal.toISOString() : undefined,
      estado: v.estado as EstadoViaje,
      observaciones: v.observaciones ?? undefined,
      novedades: v.novedades.map((n: any) => ({
        id: n.id,
        fecha: n.fecha.toISOString(),
        descripcion: n.descripcion,
      })),
    };
  } catch (error) {
    return localViajesState.find((v) => v.id === id) || getSeedViajeById(id);
  }
}

/**
 * Server Action para registrar un nuevo viaje
 */
export async function createViajeAction(
  formData: FormData
): Promise<{ success: boolean; viajeId?: string; error?: string }> {
  try {
    const conductorId = formData.get("conductorId") as string;
    const vehiculoId = formData.get("vehiculoId") as string;
    const origen = formData.get("origen") as string;
    const destino = formData.get("destino") as string;
    const servicio = (formData.get("servicio") as ServicioViaje) || "especial";
    const fechaSalida = formData.get("fechaSalida") as string;
    const duracionEstimadaHoras = parseFloat((formData.get("duracionEstimadaHoras") as string) || "2");
    const observaciones = (formData.get("observaciones") as string) || undefined;

    const persona = getPersonaById(conductorId);
    const conductorNombre = persona ? `${persona.nombres} ${persona.apellidos}` : "Conductor Asignado";

    const vehiculo = getVehiculoById(vehiculoId);
    const placa = vehiculo ? vehiculo.placa : "PLACA";
    const contratistaNombre = vehiculo ? vehiculo.contratistaNombre : "Contratista General";

    const newId = `t_${Date.now()}`;

    const newViajeObj: Viaje = {
      id: newId,
      conductorId,
      conductorNombre,
      vehiculoId,
      placa,
      contratistaNombre,
      origen,
      destino,
      servicio,
      fechaSalida: fechaSalida || new Date().toISOString(),
      duracionEstimadaHoras,
      estado: "en_curso",
      observaciones,
      novedades: [],
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await (prisma as any).viaje.create({
          data: {
            conductorId,
            conductorNombre,
            vehiculoId,
            placa,
            contratistaNombre,
            origen,
            destino,
            servicio,
            fechaSalida: new Date(fechaSalida || new Date()),
            duracionEstimadaHoras,
            estado: "en_curso",
            observaciones,
          },
        });
        newViajeObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Viaje en PostgreSQL:", dbErr);
      }
    }

    localViajesState.unshift(newViajeObj);
    revalidatePath("/operacion");

    return { success: true, viajeId: newViajeObj.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar viaje." };
  }
}

/**
 * Server Action para registrar una novedad en viaje
 */
export async function registrarNovedadViajeAction(
  viajeId: string,
  descripcion: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const novedadObj: Novedad = {
      id: `nov_${Date.now()}`,
      fecha: new Date().toISOString(),
      descripcion,
    };

    const index = localViajesState.findIndex((v) => v.id === viajeId);
    if (index >= 0) {
      localViajesState[index].novedades.unshift(novedadObj);
      localViajesState[index].estado = "con_novedad";
    }

    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).novedadViaje.create({
          data: {
            viajeId,
            descripcion,
          },
        });
        await (prisma as any).viaje.update({
          where: { id: viajeId },
          data: { estado: "con_novedad" },
        });
      } catch (err) {
        console.warn("No se pudo registrar novedad en DB:", err);
      }
    }

    revalidatePath(`/operacion/${viajeId}`);
    revalidatePath("/operacion");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar novedad." };
  }
}

/**
 * Server Action para finalizar un viaje en curso
 */
export async function finalizarViajeAction(
  viajeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const hoy = new Date().toISOString();
    const index = localViajesState.findIndex((v) => v.id === viajeId);
    if (index >= 0) {
      localViajesState[index].estado = "finalizado";
      localViajesState[index].fechaLlegadaReal = hoy;
    }

    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).viaje.update({
          where: { id: viajeId },
          data: {
            estado: "finalizado",
            fechaLlegadaReal: new Date(),
          },
        });
      } catch (err) {
        console.warn("No se pudo finalizar viaje en DB:", err);
      }
    }

    revalidatePath(`/operacion/${viajeId}`);
    revalidatePath("/operacion");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al finalizar viaje." };
  }
}

