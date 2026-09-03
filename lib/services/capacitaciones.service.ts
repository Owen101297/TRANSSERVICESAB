"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_CAPACITACIONES } from "@/lib/data/capacitaciones";
import { SEED_ASISTENCIA } from "@/lib/data/asistencia";
import { SEED_ENCUESTAS } from "@/lib/data/encuestas";
import { Capacitacion, TipoCapacitacion, EstadoCapacitacion } from "@/lib/types/capacitacion";
import { RegistroAsistencia, EstadoAsistencia } from "@/lib/types/asistencia";
import { Encuesta } from "@/lib/types/encuesta";

let localCapacitacionesState: Capacitacion[] = [];
let localAsistenciasState: RegistroAsistencia[] = [...SEED_ASISTENCIA];
let localEncuestasState: Encuesta[] = [...SEED_ENCUESTAS];

/**
 * Obtiene todas las capacitaciones
 */
export async function getCapacitacionesDb(): Promise<Capacitacion[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localCapacitacionesState;
    }

    const dbCaps = await (prisma as any).capacitacion.findMany({
      orderBy: { fecha: "desc" },
    });

    return dbCaps.map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo as TipoCapacitacion,
      fecha: c.fecha.toISOString(),
      duracionHoras: c.duracionHoras,
      asistentesEsperados: c.asistentesEsperados,
      asistentesReales: c.asistentesReales ?? undefined,
      estado: c.estado as EstadoCapacitacion,
    }));
  } catch (error) {
    console.warn("Aviso DB Capacitaciones (usando fallback local):", error);
    return localCapacitacionesState;
  }
}

/**
 * Server Action para crear una capacitación
 */
export async function createCapacitacionAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const nombre = formData.get("nombre") as string;
    const tipo = (formData.get("tipo") as TipoCapacitacion) || "sg-sst";
    const fecha = formData.get("fecha") as string;
    const duracionHoras = parseFloat((formData.get("duracionHoras") as string) || "1");
    const asistentesEsperados = parseInt((formData.get("asistentesEsperados") as string) || "0", 10);

    const newId = `cap_${Date.now()}`;
    const newCap: Capacitacion = {
      id: newId,
      nombre,
      tipo,
      fecha: fecha || new Date().toISOString(),
      duracionHoras,
      asistentesEsperados,
      estado: "programada",
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await (prisma as any).capacitacion.create({
          data: {
            nombre,
            tipo,
            fecha: new Date(fecha || new Date()),
            duracionHoras,
            asistentesEsperados,
            estado: "programada",
          },
        });
        newCap.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Capacitación en PostgreSQL:", dbErr);
      }
    }

    localCapacitacionesState.unshift(newCap);
    revalidatePath("/capacitaciones");

    return { success: true, id: newCap.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al programar capacitación." };
  }
}

/**
 * Obtiene todos los registros de asistencia desde DB
 */
export async function getAsistenciasDb(): Promise<RegistroAsistencia[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localAsistenciasState;
    }

    const dbAsistencias = await (prisma as any).asistenciaRegistro.findMany({
      orderBy: { fecha: "desc" },
    });

    if (!dbAsistencias || dbAsistencias.length === 0) {
      return localAsistenciasState;
    }

    return dbAsistencias.map((a: any) => ({
      id: a.id,
      personaId: a.personaId || `p_${a.id}`,
      personaNombre: a.personaNombre,
      personaDocumento: a.personaDocumento ?? undefined,
      cargo: a.cargo ?? undefined,
      proyecto: a.proyecto ?? undefined,
      evento: a.evento || "Jornada Operativa / Capacitación",
      tipoEvento: (a.tipoEvento as any) || "capacitacion",
      fecha: a.fecha ? a.fecha.toISOString() : new Date().toISOString(),
      estado: (a.estado as EstadoAsistencia) || (a.asistio ? "presente" : "ausente"),
      horaLlegada: a.horaLlegada ?? undefined,
      observaciones: a.observaciones ?? undefined,
      firmaUrl: a.firmaUrl ?? undefined,
      fotoUrl: a.fotoUrl ?? undefined,
    }));
  } catch (error) {
    console.warn("Aviso DB Asistencia (usando memoria):", error);
    return localAsistenciasState;
  }
}

/**
 * Server Action para registrar asistencia
 */
export async function createAsistenciaAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const personaNombre = formData.get("personaNombre") as string;
    const personaId = (formData.get("personaId") as string) || undefined;
    const evento = (formData.get("evento") as string) || "Jornada Operativa";
    const tipoEvento = (formData.get("tipoEvento") as string) || "capacitacion";
    const estado = (formData.get("estado") as EstadoAsistencia) || "presente";
    const horaLlegada = (formData.get("horaLlegada") as string) || undefined;
    const observaciones = (formData.get("observaciones") as string) || undefined;

    const newId = `as_${Date.now()}`;
    const newReg: RegistroAsistencia = {
      id: newId,
      personaId: personaId || `p_${Date.now()}`,
      personaNombre,
      evento,
      tipoEvento: tipoEvento as any,
      fecha: new Date().toISOString(),
      estado,
    };

    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).asistenciaRegistro.create({
          data: {
            id: newId,
            personaId,
            personaNombre,
            evento,
            tipoEvento,
            estado,
            horaLlegada,
            observaciones,
            asistio: estado !== "ausente",
            fecha: new Date(),
          },
        });
      } catch (dbErr) {
        console.warn("Aviso al guardar asistencia en PostgreSQL:", dbErr);
      }
    }

    localAsistenciasState.unshift(newReg);
    revalidatePath("/asistencia");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar asistencia." };
  }
}

/**
 * Server Action para tomar asistencia de una capacitación específica y marcarla realizada
 */
export async function tomarAsistenciaCapacitacionAction(
  capacitacionId: string,
  asistentes: { personaId: string; personaNombre: string; estado: EstadoAsistencia }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const cap = localCapacitacionesState.find((c) => c.id === capacitacionId);
    const totalPresentes = asistentes.filter((a) => a.estado === "presente" || a.estado === "tardanza").length;

    if (cap) {
      cap.asistentesReales = totalPresentes;
      cap.estado = "realizada";
    }

    const fechaIso = new Date().toISOString();
    for (const a of asistentes) {
      localAsistenciasState.unshift({
        id: `as_${Date.now()}_${a.personaId}`,
        personaId: a.personaId,
        personaNombre: a.personaNombre,
        evento: cap?.nombre || "Capacitación",
        tipoEvento: "capacitacion",
        fecha: fechaIso,
        estado: a.estado,
      });
    }

    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).capacitacion.update({
          where: { id: capacitacionId },
          data: {
            asistentesReales: totalPresentes,
            estado: "realizada",
          },
        });
      } catch (dbErr) {
        console.warn("Aviso actualizando capacitación en DB:", dbErr);
      }
    }

    revalidatePath("/capacitaciones");
    revalidatePath("/asistencia");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al tomar lista de asistencia." };
  }
}

/**
 * Obtiene las encuestas
 */
export async function getEncuestasDb(): Promise<Encuesta[]> {
  return localEncuestasState;
}

/**
 * Server Action para crear una encuesta
 */
export async function createEncuestaAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const titulo = formData.get("titulo") as string;
    const tipo = (formData.get("tipo") as any) || "seguridad_vial";
    const destinatariosEsperados = parseInt((formData.get("destinatariosEsperados") as string) || "10", 10);

    const newEnc: Encuesta = {
      id: `enc_${Date.now()}`,
      titulo,
      tipo,
      fechaCreacion: new Date().toISOString().split("T")[0],
      respuestasCount: 0,
      destinatariosEsperados,
      estado: "activa",
    };

    localEncuestasState.unshift(newEnc);
    revalidatePath("/encuestas");
    return { success: true, id: newEnc.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear encuesta." };
  }
}
