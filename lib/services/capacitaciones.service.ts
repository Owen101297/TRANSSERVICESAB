"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_CAPACITACIONES } from "@/lib/data/capacitaciones";
import { SEED_ASISTENCIA } from "@/lib/data/asistencia";
import { SEED_ENCUESTAS } from "@/lib/data/encuestas";
import { Capacitacion, TipoCapacitacion, EstadoCapacitacion } from "@/lib/types/capacitacion";
import { RegistroAsistencia, EstadoAsistencia } from "@/lib/types/asistencia";
import { Encuesta } from "@/lib/types/encuesta";

let localCapacitacionesState: Capacitacion[] = [...SEED_CAPACITACIONES];
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
 * Obtiene todos los registros de asistencia
 */
export async function getAsistenciasDb(): Promise<RegistroAsistencia[]> {
  return localAsistenciasState;
}

/**
 * Server Action para registrar asistencia
 */
export async function createAsistenciaAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const personaNombre = formData.get("personaNombre") as string;
    const evento = formData.get("evento") as string;
    const estado = (formData.get("estado") as EstadoAsistencia) || "presente";

    const newReg: RegistroAsistencia = {
      id: `as_${Date.now()}`,
      personaId: `p_${Date.now()}`,
      personaNombre,
      evento,
      tipoEvento: "capacitacion",
      fecha: new Date().toISOString(),
      estado,
    };

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
