"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  EstadoConceptoPreoperacional,
  InspeccionPreoperacionalDto,
  PREOPERACIONAL_SECCIONES,
  ValorItemChecklist,
} from "@/lib/types/preoperacional";

export interface CreatePreoperacionalInput {
  conductorId?: string;
  conductorNombre?: string;
  conductorDocumento?: string;
  placa: string;
  kilometraje?: number | string | null;
  checklist: Record<string, ValorItemChecklist>;
  observaciones?: string | null;
  signature?: string | null;
  fotoEvidenciaUrl?: string | null;
}

export interface GetPreoperacionalesFilters {
  rangoFecha?: "hoy" | "7d" | "mes" | "personalizado" | "todos";
  fechaDesde?: string;
  fechaHasta?: string;
  placa?: string;
  conductorId?: string;
  estadoConcepto?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

export async function createPreoperacionalDb(input: CreatePreoperacionalInput) {
  try {
    const cleanPlaca = (input.placa || "WGM-212").toUpperCase().replace(/[^A-Z0-9]/g, "");
    let cId = input.conductorId;
    let cNombre = input.conductorNombre;
    let vId = "vehiculo-general";

    // 1. Resolver conductor si se envió documento
    if (input.conductorDocumento && !cId) {
      const persona = await prisma.persona.findUnique({
        where: { numeroDocumento: input.conductorDocumento },
      });
      if (persona) {
        cId = persona.id;
        cNombre = `${persona.nombres} ${persona.apellidos}`;
      }
    }

    // 2. Resolver vehículo
    if (cleanPlaca) {
      const vehiculo = await prisma.vehiculo.findUnique({
        where: { placa: cleanPlaca },
      });
      if (vehiculo) {
        vId = vehiculo.id;
      }
    }

    // 3. Analizar ítems críticos en checklist
    const checklist = input.checklist || {};
    let hallazgoDetectado = false;
    const hallazgosCriticos: string[] = [];

    for (const [, seccion] of Object.entries(PREOPERACIONAL_SECCIONES)) {
      for (const item of seccion.items) {
        const val = checklist[item.id];
        if (val === "NC") {
          hallazgoDetectado = true;
          if (item.esCritico) {
            hallazgosCriticos.push(`${seccion.titulo}: ${item.nombre}`);
          }
        }
      }
    }

    // Determinar concepto HSEQ
    let estadoConcepto: EstadoConceptoPreoperacional = "apto";
    if (hallazgosCriticos.length > 0) {
      estadoConcepto = "no_apto";
    } else if (hallazgoDetectado) {
      estadoConcepto = "apto_con_observacion";
    }

    const km = input.kilometraje ? Number(input.kilometraje) : null;
    const descripcionHallazgo = hallazgosCriticos.length > 0
      ? `Fallas críticas reportadas: ${hallazgosCriticos.join(" | ")}`
      : hallazgoDetectado
      ? "Observaciones no críticas detectadas en la inspección."
      : null;

    // 4. Crear registro en base de datos PostgreSQL
    const created = await prisma.inspeccionPreoperacional.create({
      data: {
        conductorId: cId || "conductor-general",
        conductorNombre: cNombre || "Conductor",
        vehiculoId: vId,
        placa: cleanPlaca.length === 6 ? `${cleanPlaca.slice(0, 3)}-${cleanPlaca.slice(3)}` : cleanPlaca,
        fecha: new Date(),
        kilometraje: km,
        checklist: checklist as any,
        hallazgoDetectado,
        descripcionHallazgo,
        fotoEvidenciaUrl: input.fotoEvidenciaUrl || null,
        estadoConcepto,
      },
    });

    // 5. Si hay falla crítica, generar automáticamente Hallazgo HSEQ para mantenimiento
    if (hallazgoDetectado) {
      try {
        await prisma.hallazgoHseq.create({
          data: {
            origen: "preoperacional",
            titulo: `Preoperacional [${created.placa}] - ${estadoConcepto === "no_apto" ? "VEHÍCULO NO APTO" : "Novedad Reportada"}`,
            descripcion: descripcionHallazgo || input.observaciones || "Novedad en preoperacional",
            severidad: estadoConcepto === "no_apto" ? "critica" : "media",
            estado: "abierto",
            vehiculoId: vId !== "vehiculo-general" ? vId : undefined,
            placa: created.placa,
            conductorId: cId !== "conductor-general" ? cId : undefined,
            conductorNombre: created.conductorNombre,
            responsable: "Coordinador HSEQ / Taller",
          },
        });
      } catch (hseqErr) {
        console.warn("Aviso al crear hallazgo HSEQ automático:", hseqErr);
      }
    }

    revalidatePath("/hseq/preoperacionales");
    revalidatePath("/portal-conductor");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        id: created.id,
        placa: created.placa,
        conductorNombre: created.conductorNombre,
        estadoConcepto: created.estadoConcepto as EstadoConceptoPreoperacional,
        hallazgoDetectado: created.hallazgoDetectado,
        fecha: created.fecha.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("Error en createPreoperacionalDb:", error);
    throw new Error(error.message || "Error al registrar inspección preoperacional");
  }
}

export async function getPreoperacionalesDb(filters: GetPreoperacionalesFilters = {}) {
  try {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filtro temporal
    const now = new Date();
    if (filters.rangoFecha === "hoy") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      where.fecha = { gte: startOfDay };
    } else if (filters.rangoFecha === "7d") {
      const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.fecha = { gte: start7d };
    } else if (filters.rangoFecha === "mes") {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      where.fecha = { gte: startMonth };
    } else if (filters.rangoFecha === "personalizado" && filters.fechaDesde) {
      const fDesde = new Date(`${filters.fechaDesde}T00:00:00`);
      const fHasta = filters.fechaHasta ? new Date(`${filters.fechaHasta}T23:59:59`) : new Date();
      where.fecha = { gte: fDesde, lte: fHasta };
    }

    if (filters.placa && filters.placa !== "todas") {
      const clean = filters.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
      where.placa = { contains: clean, mode: "insensitive" };
    }

    if (filters.conductorId && filters.conductorId !== "todos") {
      where.conductorId = filters.conductorId;
    }

    if (filters.estadoConcepto && filters.estadoConcepto !== "todos") {
      where.estadoConcepto = filters.estadoConcepto;
    }

    if (filters.busqueda?.trim()) {
      const q = filters.busqueda.trim();
      where.OR = [
        { placa: { contains: q, mode: "insensitive" } },
        { conductorNombre: { contains: q, mode: "insensitive" } },
        { descripcionHallazgo: { contains: q, mode: "insensitive" } },
      ];
    }

    const [totalCount, items] = await Promise.all([
      prisma.inspeccionPreoperacional.count({ where }),
      prisma.inspeccionPreoperacional.findMany({
        where,
        take: limit,
        skip,
        orderBy: { fecha: "desc" },
      }),
    ]);

    const mapped: InspeccionPreoperacionalDto[] = items.map((i) => ({
      id: i.id,
      conductorId: i.conductorId,
      conductorNombre: i.conductorNombre,
      vehiculoId: i.vehiculoId,
      placa: i.placa,
      fecha: i.fecha.toISOString(),
      kilometraje: i.kilometraje,
      checklist: (i.checklist as any) || {},
      hallazgoDetectado: i.hallazgoDetectado,
      descripcionHallazgo: i.descripcionHallazgo,
      fotoEvidenciaUrl: i.fotoEvidenciaUrl,
      estadoConcepto: i.estadoConcepto as EstadoConceptoPreoperacional,
      createdAt: i.createdAt.toISOString(),
    }));

    return {
      items: mapped,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
      limit,
    };
  } catch (error) {
    console.error("Error en getPreoperacionalesDb:", error);
    return {
      items: [],
      totalCount: 0,
      page: 1,
      totalPages: 1,
      limit: 25,
    };
  }
}

export async function getPreoperacionalHoyConductor(conductorId?: string, placa?: string) {
  try {
    if (!conductorId && !placa) return null;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const where: any = {
      fecha: { gte: startOfDay },
    };

    if (conductorId) where.conductorId = conductorId;
    if (placa) {
      const clean = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
      where.placa = { contains: clean, mode: "insensitive" };
    }

    const item = await prisma.inspeccionPreoperacional.findFirst({
      where,
      orderBy: { fecha: "desc" },
    });

    if (!item) return null;

    return {
      id: item.id,
      placa: item.placa,
      conductorNombre: item.conductorNombre,
      estadoConcepto: item.estadoConcepto as EstadoConceptoPreoperacional,
      fecha: item.fecha.toISOString(),
      hallazgoDetectado: item.hallazgoDetectado,
    };
  } catch (error) {
    console.warn("Aviso al consultar preoperacional de hoy:", error);
    return null;
  }
}
