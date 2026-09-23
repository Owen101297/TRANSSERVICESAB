"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSelfOrStaff } from "@/lib/auth";
import { getPersonaByIdDb } from "@/lib/services/personas.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import { getViajesDb } from "@/lib/services/operacion.service";
import { InspeccionPreoperacional, NovedadConductor, TipoNovedadConductor, EstadoConceptoPreoperacional } from "@/lib/types/preoperacional";
import { fallbackOrThrow, isProductionRuntime, requireDatabaseInProduction, rethrowMutationInProduction } from "@/lib/production-safety";
import { canAccessPortalVehicle, normalizeVehiclePlate } from "@/lib/portal-access";

let localPreoperacionalesState: InspeccionPreoperacional[] = [];
let localNovedadesConductorState: NovedadConductor[] = [];

/**
 * Obtiene la información consolidada del portal del conductor
 */
export async function getPortalConductorInfo(conductorId: string) {
  const persona = await getPersonaByIdDb(conductorId);
  const asignaciones = await getAsignacionesDb();
  const asignacionActiva = asignaciones.find(
    (a) => a.conductorId === conductorId && a.estado === "activa"
  );

  const viajes = await getViajesDb();
  const viajeActivo = viajes.find(
    (v) => v.conductorId === conductorId && (v.estado === "en_curso" || v.estado === "con_novedad")
  );

  const preoperacionales = await getPreoperacionalesDb();
  const hoyStr = new Date().toISOString().split("T")[0];
  const preoperacionalHoy = preoperacionales.find(
    (p) => p.conductorId === conductorId && p.fecha.startsWith(hoyStr)
  );

  return {
    persona,
    asignacionActiva,
    viajeActivo,
    preoperacionalHoy,
  };
}

/**
 * Obtiene todas las inspecciones preoperacionales registradas
 */
export async function getPreoperacionalesDb(): Promise<InspeccionPreoperacional[]> {
  requireDatabaseInProduction();
  try {
    if (!process.env.DATABASE_URL) {
      return isProductionRuntime() ? [] : localPreoperacionalesState;
    }

    const dbPreops = await (prisma as any).inspeccionPreoperacional.findMany({
      orderBy: { fecha: "desc" },
    });

    if (!dbPreops || dbPreops.length === 0) {
      return localPreoperacionalesState;
    }

    return dbPreops.map((p: any) => ({
      id: p.id,
      conductorId: p.conductorId,
      conductorNombre: p.conductorNombre,
      vehiculoId: p.vehiculoId,
      placa: p.placa,
      fecha: p.fecha.toISOString(),
      kilometraje: p.kilometraje ?? undefined,
      checklist: typeof p.checklist === "string" ? JSON.parse(p.checklist) : p.checklist,
      hallazgoDetectado: p.hallazgoDetectado,
      descripcionHallazgo: p.descripcionHallazgo ?? undefined,
      fotoEvidenciaUrl: p.fotoEvidenciaUrl ?? undefined,
      estadoConcepto: p.estadoConcepto as EstadoConceptoPreoperacional,
    }));
  } catch (error) {
    console.warn("Aviso DB Preoperacionales (usando fallback local):", error);
    return fallbackOrThrow(error, localPreoperacionalesState, "No fue posible consultar preoperacionales");
  }
}

/**
 * Server Action para registrar inspección preoperacional diaria
 */
export async function createPreoperacionalAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const conductorId = formData.get("conductorId") as string;
    const session = await requireSelfOrStaff(conductorId);
    const conductorNombre =
      session.rolPrincipal === "conductor"
        ? session.nombre
        : (formData.get("conductorNombre") as string);
    let vehiculoId = formData.get("vehiculoId") as string;
    const placa = normalizeVehiclePlate(formData.get("placa") as string);
    const kilometraje = parseFloat((formData.get("kilometraje") as string) || "0");
    const checklistRaw = formData.get("checklist") as string;
    const checklist = checklistRaw ? JSON.parse(checklistRaw) : {};
    const hallazgoDetectado = formData.get("hallazgoDetectado") === "true";
    const descripcionHallazgo = (formData.get("descripcionHallazgo") as string) || undefined;
    const fotoEvidenciaUrl = (formData.get("fotoEvidenciaUrl") as string) || undefined;

    if (!placa) throw new Error("La placa del vehículo es obligatoria.");
    if (session.rolPrincipal === "conductor") {
      if (!(await canAccessPortalVehicle(session, placa))) {
        throw new Error("No estás autorizado para inspeccionar este vehículo.");
      }
      const vehiculoAsignado = await prisma.vehiculo.findFirst({
        where: { placa: { equals: placa, mode: "insensitive" } },
        select: { id: true },
      });
      if (!vehiculoAsignado) throw new Error("El vehículo asignado no existe en la flota.");
      vehiculoId = vehiculoAsignado.id;

      const now = new Date();
      const dia = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(now);
      const turno = await prisma.turnoDespacho.findFirst({
        where: {
          conductorDocumento: session.documento,
          placa: { equals: placa, mode: "insensitive" },
          fecha: {
            gte: new Date(`${dia}T00:00:00-05:00`),
            lte: new Date(`${dia}T23:59:59.999-05:00`),
          },
        },
        select: { id: true },
      });
      if (!turno) throw new Error("Primero debes abrir la jornada para este vehículo.");
    }

    const estadoConcepto: EstadoConceptoPreoperacional = hallazgoDetectado
      ? "apto_con_observacion"
      : "apto";

    const newId = `preop_${Date.now()}`;
    const newPreopObj: InspeccionPreoperacional = {
      id: newId,
      conductorId,
      conductorNombre,
      vehiculoId,
      placa,
      fecha: new Date().toISOString(),
      kilometraje,
      checklist,
      hallazgoDetectado,
      descripcionHallazgo,
      fotoEvidenciaUrl,
      estadoConcepto,
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await (prisma as any).inspeccionPreoperacional.create({
          data: {
            conductorId,
            conductorNombre,
            vehiculoId,
            placa,
            kilometraje,
            checklist,
            hallazgoDetectado,
            descripcionHallazgo,
            fotoEvidenciaUrl,
            estadoConcepto,
          },
        });
        newPreopObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Preoperacional en PostgreSQL:", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible guardar el preoperacional");
      }
    }

    localPreoperacionalesState.unshift(newPreopObj);

    // ----------------------------------------------------
    // PUENTE AUTOMÁTICO: Preoperacional ➔ HSEQ
    // ----------------------------------------------------
    if (hallazgoDetectado || estadoConcepto !== "apto") {
      try {
        const hallazgoFormData = new FormData();
        hallazgoFormData.append("origen", "preoperacional");
        hallazgoFormData.append("titulo", `Falla en Preoperacional Diario · ${placa}`);
        hallazgoFormData.append("descripcion", descripcionHallazgo || "Ítem no conforme detectado en la inspección diaria de 10 puntos.");
        hallazgoFormData.append("severidad", "alta");
        hallazgoFormData.append("responsable", "Líder HSEQ / Mantenimiento");
        hallazgoFormData.append("placa", placa);

        const { createHallazgoAction } = await import("@/lib/services/hseq.service");
        await createHallazgoAction(hallazgoFormData);
      } catch (hseqErr) {
        console.warn("No se pudo auto-generar hallazgo HSEQ desde preoperacional:", hseqErr);
      }
    }

    revalidatePath("/portal-conductor");
    revalidatePath("/portal-conductor/preoperacional");
    revalidatePath("/pesv");
    revalidatePath("/hseq");

    return { success: true, id: newPreopObj.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar inspección preoperacional." };
  }
}

/**
 * Server Action para reportar una novedad desde el portal móvil del conductor
 */
export async function createNovedadConductorAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const conductorId = formData.get("conductorId") as string;
    const session = await requireSelfOrStaff(conductorId);
    const conductorNombre =
      session.rolPrincipal === "conductor"
        ? session.nombre
        : (formData.get("conductorNombre") as string);
    const vehiculoId = (formData.get("vehiculoId") as string) || undefined;
    const placa = (formData.get("placa") as string) || undefined;
    const tipo = (formData.get("tipo") as TipoNovedadConductor) || "otro";
    const descripcion = formData.get("descripcion") as string;
    const fotoUrl = (formData.get("fotoUrl") as string) || undefined;

    const newId = `nov_cond_${Date.now()}`;
    const newNovedadObj: NovedadConductor = {
      id: newId,
      conductorId,
      conductorNombre,
      vehiculoId,
      placa,
      tipo,
      descripcion,
      fotoUrl,
      fecha: new Date().toISOString(),
      atendida: false,
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await (prisma as any).novedadConductor.create({
          data: {
            conductorId,
            conductorNombre,
            vehiculoId: vehiculoId || null,
            placa: placa || null,
            tipo,
            descripcion,
            fotoUrl: fotoUrl || null,
          },
        });
        newNovedadObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Novedad Conductor en PostgreSQL:", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible guardar la novedad del conductor");
      }
    }

    localNovedadesConductorState.unshift(newNovedadObj);

    // ----------------------------------------------------
    // PUENTE AUTOMÁTICO: Novedad Móvil ➔ HSEQ
    // ----------------------------------------------------
    try {
      const severidad = tipo === "mecanica" ? "alta" : tipo === "seguridad" ? "critica" : "media";
      const hallazgoFormData = new FormData();
      hallazgoFormData.append("origen", tipo === "seguridad" ? "incidente" : "inspeccion");
      hallazgoFormData.append("titulo", `Novedad reportada por conductor (${tipo}) · ${placa || "General"}`);
      hallazgoFormData.append("descripcion", descripcion);
      hallazgoFormData.append("severidad", severidad);
      hallazgoFormData.append("responsable", "Líder Operaciones / HSEQ");
      if (placa) hallazgoFormData.append("placa", placa);

      const { createHallazgoAction } = await import("@/lib/services/hseq.service");
      await createHallazgoAction(hallazgoFormData);
    } catch (hseqErr) {
      console.warn("No se pudo auto-generar hallazgo HSEQ desde novedad móvil:", hseqErr);
    }

    revalidatePath("/portal-conductor");
    revalidatePath("/portal-conductor/novedad");
    revalidatePath("/operacion");
    revalidatePath("/hseq");

    return { success: true, id: newNovedadObj.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al reportar la novedad." };
  }
}
