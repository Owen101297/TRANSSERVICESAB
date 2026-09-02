import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      conductorId,
      conductorNombre,
      conductorDocumento,
      placa,
      origen,
      destino,
      fechaSalida,
      horaSalida,
      distanciaKm,
      duracionEstimadaHoras,
      riskScore,
      riskLevel,
      riskInputs,
      signatures,
      observaciones,
    } = body;

    // Buscar o vincular conductor y vehículo en PostgreSQL
    let cId = conductorId;
    let vId = undefined;

    if (conductorDocumento && !cId) {
      const persona = await prisma.persona.findUnique({
        where: { numeroDocumento: conductorDocumento },
      });
      if (persona) cId = persona.id;
    }

    if (placa) {
      const cleanPlaca = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const vehiculo = await prisma.vehiculo.findUnique({
        where: { placa: cleanPlaca },
      });
      if (vehiculo) vId = vehiculo.id;
    }

    const viaje = await prisma.viaje.create({
      data: {
        conductorId: cId || "conductor-general",
        conductorNombre: conductorNombre || "Conductor Asignado",
        vehiculoId: vId || "vehiculo-general",
        placa: (placa || "WGM212").toUpperCase(),
        contratistaNombre: body.contratistaNombre || "TRANS SERVICES COOPERATIVA A&B",
        origen: origen || "Base Operativa",
        destino: destino || "Destino Operativo",
        fechaSalida: fechaSalida ? new Date(fechaSalida) : new Date(),
        horaSalida: horaSalida || "06:00",
        distanciaKm: distanciaKm ? Number(distanciaKm) : null,
        duracionEstimadaHoras: duracionEstimadaHoras ? Number(duracionEstimadaHoras) : 4,
        estado: "en_curso",
        riskScore: riskScore !== undefined ? Number(riskScore) : null,
        riskLevel: riskLevel || null,
        riskInputs: riskInputs || {},
        signatures: signatures || {},
      },
    });

    return NextResponse.json({
      success: true,
      message: "Viaje registrado exitosamente en el ERP",
      viaje,
    });
  } catch (error: any) {
    console.error("Error al registrar viaje desde App:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar el viaje" },
      { status: 500 }
    );
  }
}
