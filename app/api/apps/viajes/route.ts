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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conductorDocumento = searchParams.get("conductorDocumento") || searchParams.get("doc");
    const conductorId = searchParams.get("conductorId");
    const placa = searchParams.get("placa");

    const where: any = {};
    if (conductorId) where.conductorId = conductorId;
    if (placa) where.placa = placa.toUpperCase();

    // Si viene documento, buscar el ID de la persona
    if (conductorDocumento && !conductorId) {
      const persona = await prisma.persona.findUnique({
        where: { numeroDocumento: conductorDocumento },
      });
      if (persona) {
        where.conductorId = persona.id;
      }
    }

    const viajes = await prisma.viaje.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Mapear al formato que espera la web app
    const data = viajes.map((v) => ({
      id: v.id,
      conductor_id: v.conductorId,
      conductor_nombre: v.conductorNombre,
      vehiculo_placa: v.placa,
      origen: v.origen,
      destino: v.destino,
      fecha_salida: v.fechaSalida ? v.fechaSalida.toISOString() : new Date().toISOString(),
      hora_salida: v.horaSalida || "06:00",
      distancia_km: v.distanciaKm,
      duracion_estimada_horas: v.duracionEstimadaHoras,
      risk_score: v.riskScore,
      risk_level: v.riskLevel,
      risk_inputs: v.riskInputs,
      signatures: v.signatures,
      estado: v.estado,
      created_at: v.createdAt ? v.createdAt.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error al consultar viajes:", error);
    return NextResponse.json({ error: error.message || "Error al consultar viajes" }, { status: 500 });
  }
}

