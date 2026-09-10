import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawPlaca = searchParams.get("placa") || "";
    const rawDoc = searchParams.get("documento") || "";

    const cleanPlaca = rawPlaca.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cleanDoc = rawDoc.trim().replace(/[^0-9A-Za-z]/g, "");

    // Buscar vehículo y su odómetro actual
    let vehiculo = null;
    if (cleanPlaca) {
      vehiculo = await prisma.vehiculo.findFirst({
        where: {
          placa: {
            equals: cleanPlaca,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          placa: true,
          marca: true,
          modelo: true,
          odometroActual: true,
          odometroFecha: true,
          odometroFotoUrl: true,
        },
      });
    }

    // Buscar turno de hoy
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let turnoHoy = null;
    if (cleanPlaca || cleanDoc) {
      turnoHoy = await prisma.turnoDespacho.findFirst({
        where: {
          AND: [
            cleanPlaca ? { placa: { equals: cleanPlaca, mode: "insensitive" } } : {},
            cleanDoc ? { conductorDocumento: cleanDoc } : {},
            { fecha: { gte: startOfDay, lte: endOfDay } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Odómetro de referencia sugerido
    let odometroReferencia = vehiculo?.odometroActual || 0;

    // Si el odómetro del vehículo está en 0 o vacío, buscar último turno previo registrado
    if (!odometroReferencia && cleanPlaca) {
      const ultimoTurnoHistorico = await prisma.turnoDespacho.findFirst({
        where: { placa: { equals: cleanPlaca, mode: "insensitive" } },
        orderBy: { fecha: "desc" },
        select: { odometroInicial: true, odometroFinal: true },
      });
      if (ultimoTurnoHistorico) {
        odometroReferencia = ultimoTurnoHistorico.odometroFinal || ultimoTurnoHistorico.odometroInicial;
      }
    }

    return NextResponse.json({
      success: true,
      turnoHoy,
      vehiculo,
      odometroReferencia,
      tieneTurnoAbierto: !!turnoHoy,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar turno." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conductorId,
      conductorNombre,
      conductorDocumento,
      placa,
      odometroInicial,
      fotoOdometroUrl,
      fotoVehiculoUrl,
      latitud,
      longitud,
      ubicacion,
      observaciones,
    } = body;

    const cleanPlaca = (placa || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cleanDoc = (conductorDocumento || "").trim();
    const numOdometro = parseFloat(String(odometroInicial || 0));

    if (!cleanPlaca) {
      return NextResponse.json({ success: false, error: "La placa del vehículo es obligatoria." }, { status: 400 });
    }
    if (!cleanDoc) {
      return NextResponse.json({ success: false, error: "El documento del conductor es obligatorio." }, { status: 400 });
    }
    if (isNaN(numOdometro) || numOdometro <= 0) {
      return NextResponse.json({ success: false, error: "El odómetro inicial debe ser un número mayor a 0." }, { status: 400 });
    }
    if (!fotoOdometroUrl) {
      return NextResponse.json({ success: false, error: "La fotografía del odómetro/tablero es obligatoria." }, { status: 400 });
    }
    if (!fotoVehiculoUrl) {
      return NextResponse.json({ success: false, error: "La fotografía del estado del vehículo es obligatoria." }, { status: 400 });
    }

    // 1. Verificar vehículo en BD
    let vehiculo = await prisma.vehiculo.findFirst({
      where: {
        placa: {
          equals: cleanPlaca,
          mode: "insensitive",
        },
      },
    });

    // Validación Anti-Fraude: El nuevo odómetro no puede ser inferior al último registrado si existe
    if (vehiculo?.odometroActual && vehiculo.odometroActual > 0) {
      if (numOdometro < vehiculo.odometroActual) {
        return NextResponse.json(
          {
            success: false,
            error: `El odómetro ingresado (${numOdometro.toLocaleString()} km) no puede ser inferior al último registrado en sistema (${vehiculo.odometroActual.toLocaleString()} km). Verifique el tablero o reporte a HSEQ.`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Formatear hora de apertura local (Colombia HH:mm)
    const now = new Date();
    const hora = now.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // 3. Crear Turno de Despacho
    const nuevoTurno = await prisma.turnoDespacho.create({
      data: {
        conductorId: conductorId || null,
        conductorNombre: conductorNombre || "Conductor",
        conductorDocumento: cleanDoc,
        placa: cleanPlaca,
        vehiculoId: vehiculo?.id || null,
        fecha: now,
        hora,
        odometroInicial: numOdometro,
        fotoOdometroUrl,
        fotoVehiculoUrl,
        latitud: typeof latitud === "number" ? latitud : null,
        longitud: typeof longitud === "number" ? longitud : null,
        ubicacion: ubicacion || null,
        estado: "activo",
        observaciones: observaciones || null,
      },
    });

    // 4. Actualizar odómetro y última foto en Vehículo
    if (vehiculo) {
      await prisma.vehiculo.update({
        where: { id: vehiculo.id },
        data: {
          odometroActual: numOdometro,
          odometroFecha: now,
          odometroFotoUrl: fotoOdometroUrl,
        },
      });
    }

    return NextResponse.json({
      success: true,
      turno: nuevoTurno,
      message: "Turno aperturado exitosamente con verificación fotográfica.",
    });
  } catch (error: any) {
    console.error("Error en POST /api/portal-conductor/turno:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar el turno." },
      { status: 500 }
    );
  }
}
