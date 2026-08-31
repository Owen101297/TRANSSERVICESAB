"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PASOS_PESV } from "@/lib/data/pesv-pasos";
import { INDICADORES_PESV } from "@/lib/data/pesv-indicadores";
import { PasoPESV, IndicadorPESV, EstadoPasoPESV, FasePESV } from "@/lib/types/pesv";

let localPasosPesvState: PasoPESV[] = [...PASOS_PESV];
let localIndicadoresPesvState: IndicadorPESV[] = [...INDICADORES_PESV];

/**
 * Obtiene todos los 24 pasos del PESV desde DB (o fallback local)
 */
export async function getPasosPesvDb(): Promise<PasoPESV[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localPasosPesvState;
    }

    const dbPasos = await (prisma as any).pasoPesv.findMany({
      orderBy: { numero: "asc" },
    });

    if (!dbPasos || dbPasos.length === 0) {
      return localPasosPesvState;
    }

    return dbPasos.map((p: any) => {
      const defaultPaso = PASOS_PESV.find((item) => item.numero === p.numero);
      return {
        id: p.id,
        numero: p.numero,
        fase: p.fase as FasePESV,
        nombre: p.nombre,
        aplicaNiveles: defaultPaso?.aplicaNiveles || ["basico", "estandar", "avanzado"],
        estado: p.estado as EstadoPasoPESV,
        documentoNombre: p.documentoNombre ?? undefined,
        observaciones: p.observaciones ?? undefined,
      };
    });
  } catch (error) {
    console.warn("Aviso DB PESV (usando fallback local):", error);
    return localPasosPesvState;
  }
}

/**
 * Obtiene los pasos filtrados por fase
 */
export async function getPasosPorFaseDb(fase: string): Promise<PasoPESV[]> {
  const all = await getPasosPesvDb();
  return all.filter((p) => p.fase === fase);
}

/**
 * Obtiene los indicadores del PESV
 */
export async function getIndicadoresPesvDb(): Promise<IndicadorPESV[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localIndicadoresPesvState;
    }

    const dbIndicadores = await (prisma as any).indicadorPesv.findMany();
    if (!dbIndicadores || dbIndicadores.length === 0) {
      return localIndicadoresPesvState;
    }

    return dbIndicadores.map((i: any) => ({
      id: i.id,
      nombre: i.nombre,
      periodicidad: i.periodicidad,
      unidad: i.unidad,
      descripcion: i.descripcion,
      valorActual: i.valorActual ?? undefined,
    }));
  } catch (error) {
    return localIndicadoresPesvState;
  }
}

/**
 * Server Action para actualizar el estado de un paso del PESV
 */
export async function updatePasoPesvAction(
  pasoNumero: number,
  estado: EstadoPasoPESV,
  documentoNombre?: string,
  observaciones?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const index = localPasosPesvState.findIndex((p) => p.numero === pasoNumero);
    if (index >= 0) {
      localPasosPesvState[index].estado = estado;
      if (documentoNombre) localPasosPesvState[index].documentoNombre = documentoNombre;
      if (observaciones) localPasosPesvState[index].observaciones = observaciones;
    }

    if (process.env.DATABASE_URL) {
      try {
        await (prisma as any).pasoPesv.upsert({
          where: { numero: pasoNumero },
          update: {
            estado,
            documentoNombre: documentoNombre || undefined,
            observaciones: observaciones || undefined,
          },
          create: {
            numero: pasoNumero,
            fase: localPasosPesvState[index]?.fase || "planificacion",
            nombre: localPasosPesvState[index]?.nombre || `Paso ${pasoNumero}`,
            estado,
            documentoNombre: documentoNombre || undefined,
            observaciones: observaciones || undefined,
          },
        });
      } catch (err) {
        console.warn("No se pudo actualizar paso PESV en DB:", err);
      }
    }

    revalidatePath("/pesv");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar paso PESV." };
  }
}
