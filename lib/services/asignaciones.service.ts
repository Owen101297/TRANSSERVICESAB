"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffSession, requireServerSession } from "@/lib/auth";
import { fallbackOrThrow, isProductionRuntime, requireDatabaseInProduction, rethrowMutationInProduction } from "@/lib/production-safety";
import { recordAudit } from "@/lib/audit";
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
    requireDatabaseInProduction();
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
          contratistaId: a.contratistaId || "c_propio",
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
    return fallbackOrThrow(error, localAsignacionesState, "No fue posible consultar asignaciones");
  }

  return localAsignacionesState;
}

/**
 * Obtiene una asignación por ID
 */
export async function getAsignacionByIdDb(id: string): Promise<Asignacion | undefined> {
  try {
    requireDatabaseInProduction();
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
          contratistaId: a.contratistaId || "c_propio",
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
    return fallbackOrThrow(error, localAsignacionesState.find((a) => a.id === id), "No fue posible consultar la asignación");
  }
  return isProductionRuntime() ? undefined : localAsignacionesState.find((a) => a.id === id);
}

/**
 * Server Action para registrar una nueva asignación operativa
 */
export async function createAsignacionAction(
  formData: FormData
): Promise<{ success: boolean; asignacionId?: string; error?: string }> {
  try {
    const actor = await requireStaffSession();
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

    requireDatabaseInProduction();
    if (!process.env.DATABASE_URL) return { success: false, error: "No hay conexión a la base de datos." };
    const start = new Date(`${fechaInicio}T00:00:00-05:00`);
    const end = fechaFin ? new Date(`${fechaFin}T23:59:59.999-05:00`) : null;
    if (!Number.isFinite(start.getTime()) || (end && (!Number.isFinite(end.getTime()) || end < start))) {
      return { success: false, error: "Revisa las fechas de la asignación." };
    }
    // Consultar datos reales de PostgreSQL
    const persona = await getPersonaByIdDb(conductorId);
    const conductorNombre = persona ? `${persona.nombres} ${persona.apellidos}`.trim() : "Conductor Asignado";

    const vehiculo = await getVehiculoByIdDb(vehiculoId);
    if (!persona || persona.estado !== "activo" || !persona.perfiles.includes("conductor")) return { success: false, error: "Selecciona un conductor activo." };
    if (!vehiculo || vehiculo.estado.toLowerCase() !== "activo") return { success: false, error: "Selecciona un vehículo activo." };
    const placa = vehiculo.placa;
    const contratistaId = (formData.get("contratistaId") as string) || vehiculo?.contratistaId || persona?.contratistaId || null;
    const contratistaNombre = vehiculo?.contratistaNombre || persona?.contratistaNombre || "Propio / Cooperativa";

    let newId = `asig_${Date.now()}`;

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.$transaction(async tx => {
          const conflict = await tx.asignacion.findFirst({ where: {
            estado: { in: ["activa", "programada"] },
            AND: [{ OR: [{ conductorId }, { vehiculoId }] },
              { OR: [{ fechaFin: null }, { fechaFin: { gte: start } }] },
              ...(end ? [{ fechaInicio: { lte: end } }] : [])],
          } });
          if (conflict) throw new Error("El conductor o vehículo ya tiene una asignación en esas fechas. Usa Cambiar asignación para reemplazarla.");
          const record = await tx.asignacion.create({
          data: {
            conductorId,
            conductorNombre,
            vehiculoId,
            placa,
            contratistaId,
            contratistaNombre,
            tipoAsignacion,
            turno: turno || null,
            fechaInicio: start,
            fechaFin: end,
            estado: "activa",
            observaciones,
            autorizacionOperativa,
          },
        });
          await recordAudit({ action: "CREATE", entityType: "Asignacion", entityId: record.id, after: record, actor }, tx);
          return record;
        }, { isolationLevel: "Serializable" });
        newId = created.id;
      } catch (dbErr) {
        console.error("Error guardando Asignación en PostgreSQL:", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible guardar la asignación");
      }
    }

    const newAsigObj: Asignacion = {
      id: newId,
      conductorId,
      conductorNombre,
      vehiculoId,
      placa,
      contratistaId: contratistaId || "",
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
    const actor = await requireStaffSession();
    const hoy = new Date().toISOString().split("T")[0];

    if (process.env.DATABASE_URL) {
      try {
        const before = await prisma.asignacion.findUnique({ where: { id } });
        const after = await prisma.asignacion.update({
          where: { id },
          data: {
            estado: "finalizada",
            fechaFin: new Date(),
          },
        });
        await recordAudit({ action: "STATUS_CHANGE", entityType: "Asignacion", entityId: id, before, after, actor });
      } catch (dbErr) {
        console.warn("Error al actualizar asignación en DB:", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible actualizar la asignación");
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
    const actor = await requireStaffSession(["administrativo"]);
    if (process.env.DATABASE_URL) {
      try {
        const before = await prisma.asignacion.findUnique({ where: { id } });
        await prisma.asignacion.delete({
          where: { id },
        });
        await recordAudit({ action: "DELETE", entityType: "Asignacion", entityId: id, before, actor });
      } catch (dbErr) {
        console.warn("Error eliminando asignación en DB:", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible eliminar la asignación");
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

/**
 * Server Action para Asignación Rápida 1-Click
 * Asigna un conductor a un vehículo de forma inmediata cerrando asignaciones activas previas
 */
export async function quickAsignarConductorVehiculoAction(payload: {
  conductorId: string;
  vehiculoIdOrPlaca: string;
  observaciones?: string;
}): Promise<{ success: boolean; asignacionId?: string; error?: string; conductorNombre?: string; placa?: string }> {
  try {
    const { conductorId, vehiculoIdOrPlaca, observaciones } = payload;
    const actor = await requireServerSession();
    if (actor.rolPrincipal === "conductor" && conductorId !== actor.id) return { success: false, error: "Solo puedes seleccionar tu propio vehículo." };
    if (!conductorId || !vehiculoIdOrPlaca) {
      return { success: false, error: "Debes especificar tanto el conductor como el vehículo." };
    }

    // 1. Obtener datos del conductor
    const persona = await getPersonaByIdDb(conductorId);
    if (!persona) {
      return { success: false, error: "El conductor seleccionado no existe en la base de datos." };
    }
    const conductorNombre = `${persona.nombres} ${persona.apellidos}`.trim();

    // 2. Obtener datos del vehículo (por ID o por Placa normalizada)
    const vehiculos = await prisma.vehiculo.findMany();
    const cleanSearch = vehiculoIdOrPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const vehiculo = vehiculos.find(
      (v) =>
        v.id === vehiculoIdOrPlaca ||
        v.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") === cleanSearch
    );

    if (!vehiculo) {
      return { success: false, error: `No se encontró el vehículo con placa/id ${vehiculoIdOrPlaca}.` };
    }

    const vehiculoId = vehiculo.id;
    const placa = vehiculo.placa;
    const contratistaNombre = vehiculo.contratistaNombre || persona.contratistaNombre || "Propio / Cooperativa";
    const now = new Date();

    requireDatabaseInProduction();
    if (!process.env.DATABASE_URL) return { success: false, error: "No hay conexión a la base de datos." };
    if (persona.estado !== "activo" || !persona.perfiles.includes("conductor")) {
      return { success: false, error: "Selecciona una persona activa con perfil conductor." };
    }
    if (vehiculo.estado.toLowerCase() !== "activo") {
      return { success: false, error: "El vehículo debe estar activo para asignarlo." };
    }
    // El cierre y la nueva asignación se confirman juntos; un fallo conserva la anterior.
    const created = await prisma.$transaction(async tx => {
      if (actor.rolPrincipal === "conductor") {
        const occupied = await tx.asignacion.findFirst({ where: { vehiculoId, estado: "activa", conductorId: { not: actor.id },
          fechaInicio: { lte: now }, OR: [{ fechaFin: null }, { fechaFin: { gte: now } }] } });
        if (occupied) throw new Error("Este vehículo está asignado a otro conductor. Solicita a coordinación liberar la asignación.");
        const activeTrip = await tx.viaje.findFirst({ where: { conductorId: actor.id, estado: { in: ["en_curso", "con_novedad"] }, vehiculoId: { not: vehiculoId } } });
        if (activeTrip) throw new Error("Finaliza tu viaje actual antes de cambiar de vehículo.");
        const same = await tx.asignacion.findFirst({ where: { conductorId, vehiculoId, estado: "activa", autorizacionOperativa: true } });
        if (same) return same;
      }
      const closed = await tx.asignacion.updateMany({
        where: { estado: "activa", OR: [{ vehiculoId }, { placa }, { conductorId }] },
        data: { estado: "finalizada", fechaFin: now },
      });
      const assignment = await tx.asignacion.create({ data: {
        conductorId, conductorNombre, vehiculoId, placa,
        contratistaId: vehiculo.contratistaId || persona.contratistaId || null,
        contratistaNombre, tipoAsignacion: "fija", fechaInicio: now, fechaFin: null,
        estado: "activa", observaciones: observaciones || "Asignación rápida directa del sistema",
        autorizacionOperativa: true,
      } });
      await recordAudit({ action: "CREATE", entityType: "Asignacion", entityId: assignment.id,
        after: assignment, metadata: { operation: "quick_assign", closedAssignments: closed.count }, actor }, tx);
      return assignment;
    }, { isolationLevel: "Serializable" });
    const newId = created.id;

    // 6. Revalidar todas las páginas
    revalidatePath("/asignaciones");
    revalidatePath("/personas");
    revalidatePath(`/personas/${conductorId}`);
    revalidatePath("/flota");
    revalidatePath(`/flota/${vehiculoId}`);
    revalidatePath("/gps");
    revalidatePath("/portal-conductor");
    revalidatePath("/dashboard");

    return {
      success: true,
      asignacionId: newId,
      conductorNombre,
      placa,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al realizar la asignación rápida." };
  }
}
