"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireServerSession, requireStaffSession } from "@/lib/auth";
import { fallbackOrThrow, isProductionRuntime, requireDatabaseInProduction, rethrowMutationInProduction } from "@/lib/production-safety";
import { getPersonaByIdDb } from "@/lib/services/personas.service";
import { getVehiculoByIdDb } from "@/lib/services/vehiculos.service";
import { Viaje, EstadoViaje, ServicioViaje, Novedad } from "@/lib/types/viaje";

import { applyTripPolicy, TripPolicyError } from "@/lib/trip-policy";
import { recordAudit } from "@/lib/audit";

let localViajesState: Viaje[] = [];

/**
 * Obtiene todos los viajes operacionales desde DB (o fallback local)
 */
export async function getViajesDb(): Promise<Viaje[]> {
  const session = await requireServerSession();
  const local = localViajesState.filter((v) => session.rolPrincipal !== "conductor" || v.conductorId === session.id);
  try {
    requireDatabaseInProduction();
    if (!process.env.DATABASE_URL) {
      return local;
    }

    const dbViajes = await (prisma as any).viaje.findMany({
      where: session.rolPrincipal === "conductor" ? { conductorId: session.id } : {},
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
      servicio: (v.servicio as ServicioViaje) || "especial",
      fechaSalida: v.fechaSalida.toISOString(),
      duracionEstimadaHoras: v.duracionEstimadaHoras,
      fechaLlegadaReal: v.fechaLlegadaReal ? v.fechaLlegadaReal.toISOString() : undefined,
      estado: (v.estado as EstadoViaje) || "en_curso",
      observaciones: v.observaciones ?? undefined,
      riskScore: v.riskScore ?? undefined,
      riskLevel: v.riskLevel ?? undefined,
      distanciaKm: v.distanciaKm ?? undefined,
      novedades: (v.novedades || []).map((n: any) => ({
        id: n.id,
        fecha: n.fecha.toISOString(),
        descripcion: n.descripcion,
      })),
    }));
  } catch (error) {
    console.warn("Aviso de conexión DB Viajes (usando almacén local):", error);
    return fallbackOrThrow(error, local, "No fue posible consultar viajes");
  }
}

/**
 * Obtiene un viaje por ID
 */
export async function getViajeByIdDb(id: string): Promise<Viaje | undefined> {
  const session = await requireServerSession();
  const local = localViajesState.find((v) => v.id === id && (session.rolPrincipal !== "conductor" || v.conductorId === session.id));
  try {
    requireDatabaseInProduction();
    if (!process.env.DATABASE_URL) {
      return local;
    }

    const v = await (prisma as any).viaje.findFirst({
      where: { id, ...(session.rolPrincipal === "conductor" ? { conductorId: session.id } : {}) },
      include: {
        novedades: {
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!v) {
      return isProductionRuntime() ? undefined : local;
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
      servicio: (v.servicio as ServicioViaje) || "especial",
      fechaSalida: v.fechaSalida.toISOString(),
      duracionEstimadaHoras: v.duracionEstimadaHoras,
      fechaLlegadaReal: v.fechaLlegadaReal ? v.fechaLlegadaReal.toISOString() : undefined,
      horaSalida: v.horaSalida || undefined,
      horaLlegada: v.horaLlegada || undefined,
      estado: (v.estado as EstadoViaje) || "en_curso",
      observaciones: v.observaciones ?? undefined,
      riskScore: v.riskScore ?? undefined,
      riskLevel: v.riskLevel ?? undefined,
      riskInputs: v.riskInputs ?? undefined,
      signatures: v.signatures ?? undefined,
      distanciaKm: v.distanciaKm ?? undefined,
      novedades: (v.novedades || []).map((n: any) => ({
        id: n.id,
        fecha: n.fecha.toISOString(),
        descripcion: n.descripcion,
      })),
    };
  } catch (error) {
    return fallbackOrThrow(error, local, "No fue posible consultar el viaje");
  }
}

/**
 * Server Action para registrar un nuevo viaje
 */
export async function createViajeAction(
  formData: FormData
): Promise<{ success: boolean; viajeId?: string; error?: string }> {
  try {
    await requireStaffSession();
    requireDatabaseInProduction();
    const conductorId = formData.get("conductorId") as string;
    const vehiculoId = formData.get("vehiculoId") as string;
    const origen = formData.get("origen") as string;
    const destino = formData.get("destino") as string;
    const servicio = (formData.get("servicio") as ServicioViaje) || "especial";
    const fechaSalida = formData.get("fechaSalida") as string;
    const duracionEstimadaHoras = parseFloat((formData.get("duracionEstimadaHoras") as string) || "2");
    const observaciones = (formData.get("observaciones") as string) || undefined;

    const persona = await getPersonaByIdDb(conductorId);
    const conductorNombre = persona ? `${persona.nombres} ${persona.apellidos}` : (formData.get("conductorNombre") as string) || "Conductor Asignado";

    const vehiculo = await getVehiculoByIdDb(vehiculoId);
    const placa = vehiculo ? vehiculo.placa : (formData.get("placa") as string) || "PLACA";
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
      estado: "programado",
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
            estado: "programado",
            observaciones,
          },
        });
        newViajeObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Viaje en PostgreSQL:", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible guardar el viaje");
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
    const session = await requireStaffSession();
    requireDatabaseInProduction();
    const existing = process.env.DATABASE_URL
      ? await prisma.viaje.findUnique({ where: { id: viajeId } })
      : localViajesState.find((v) => v.id === viajeId);
    if (!existing) throw new TripPolicyError("Viaje no encontrado.", 404);
    const policy = applyTripPolicy(session, { estado: "con_novedad" }, existing);
    if (!descripcion.trim()) throw new TripPolicyError("Describe la novedad.", 400);
    if (process.env.DATABASE_URL) {
      await prisma.$transaction(async (tx) => {
        const result = await tx.viaje.updateMany({ where: { id: viajeId, updatedAt: (existing as { updatedAt: Date }).updatedAt }, data: policy });
        if (result.count !== 1) throw new TripPolicyError("El viaje cambió; recarga antes de continuar.", 409);
        await tx.novedadViaje.create({ data: { viajeId, descripcion } });
        await recordAudit({ action: "UPDATE", entityType: "Viaje", entityId: viajeId, before: existing,
          after: await tx.viaje.findUniqueOrThrow({ where: { id: viajeId } }), metadata: { novedad: descripcion }, actor: session }, tx);
      });
    } else {
      const index = localViajesState.findIndex((v) => v.id === viajeId);
      localViajesState[index].estado = "con_novedad";
      localViajesState[index].novedades.unshift({ id: `nov_${Date.now()}`, fecha: new Date().toISOString(), descripcion });
    }
    revalidatePath(`/operacion/${viajeId}`);
    revalidatePath("/operacion");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar novedad." };
  }
}

/** Finalización con la misma política de autorización y auditoría que la API. */
export async function finalizarViajeAction(
  viajeId: string,
  kmLlegada?: number,
  horaLlegada?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireStaffSession();
    requireDatabaseInProduction();
    const existing = process.env.DATABASE_URL
      ? await prisma.viaje.findUnique({ where: { id: viajeId } })
      : localViajesState.find((v) => v.id === viajeId);
    if (!existing) throw new TripPolicyError("Viaje no encontrado.", 404);
    if (kmLlegada !== undefined && (!Number.isFinite(kmLlegada) || kmLlegada < 0)) {
      throw new TripPolicyError("Kilometraje inválido.", 400);
    }
    const now = new Date();
    const policy = applyTripPolicy(session, { estado: "finalizado",
      riskInputs: kmLlegada === undefined ? {} : { kmLlegada } }, existing, now);
    const horaLocal = horaLlegada || now.toLocaleTimeString("es-CO", {
      timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    if (process.env.DATABASE_URL) {
      await prisma.$transaction(async (tx) => {
        const result = await tx.viaje.updateMany({ where: { id: viajeId, updatedAt: (existing as { updatedAt: Date }).updatedAt },
          data: { ...policy, fechaLlegadaReal: now, horaLlegada: horaLocal } });
        if (result.count !== 1) throw new TripPolicyError("El viaje cambió; recarga antes de continuar.", 409);
        await recordAudit({ action: "STATUS_CHANGE", entityType: "Viaje", entityId: viajeId, before: existing,
          after: await tx.viaje.findUniqueOrThrow({ where: { id: viajeId } }), actor: session }, tx);
      });
    } else {
      const index = localViajesState.findIndex((v) => v.id === viajeId);
      localViajesState[index] = { ...localViajesState[index], estado: "finalizado", fechaLlegadaReal: now.toISOString(), horaLlegada: horaLocal };
    }
    revalidatePath(`/operacion/${viajeId}`);
    revalidatePath("/operacion");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al finalizar viaje." };
  }
}
