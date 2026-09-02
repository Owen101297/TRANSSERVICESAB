import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quickAsignarConductorVehiculoAction } from "@/lib/services/asignaciones.service";

export async function GET() {
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      select: {
        id: true,
        placa: true,
        marca: true,
        modelo: true,
        contratistaNombre: true,
      },
      orderBy: { placa: "asc" },
    });
    return NextResponse.json({ vehiculos });
  } catch (error: any) {
    return NextResponse.json({ vehiculos: [], error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conductorId, placa, documento } = body;

    if (!placa) {
      return NextResponse.json({ error: "Debes ingresar una placa válida." }, { status: 400 });
    }

    let targetConductorId = conductorId;

    // Si no vino conductorId pero vino documento, buscar la persona
    if (!targetConductorId && documento) {
      const p = await prisma.persona.findFirst({
        where: {
          OR: [
            { numeroDocumento: String(documento).trim() },
            { id: String(documento).trim() },
          ],
        },
      });
      if (p) targetConductorId = p.id;
    }

    if (!targetConductorId) {
      return NextResponse.json({ error: "No se identificó el conductor." }, { status: 400 });
    }

    const res = await quickAsignarConductorVehiculoAction({
      conductorId: targetConductorId,
      vehiculoIdOrPlaca: placa,
      observaciones: "Cambio de vehículo autogestionado desde el Portal del Conductor",
    });

    if (!res.success) {
      return NextResponse.json({ error: res.error || "No se pudo actualizar el vehículo." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      placa: res.placa,
      conductorNombre: res.conductorNombre,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al procesar el cambio de vehículo." }, { status: 500 });
  }
}
