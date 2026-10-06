import { NextRequest, NextResponse } from "next/server";
import { TripPolicyError } from "@/lib/trip-policy";
import { operationalDay, plateVariants } from "@/lib/operational-day";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { canAccessPortalVehicle, conductorIdentityFromSession, normalizeVehiclePlate } from "@/lib/portal-access";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const rawPlaca = searchParams.get("placa") || "";
    const rawDoc =
      auth.session.rolPrincipal === "conductor"
        ? auth.session.documento
        : searchParams.get("documento") || "";

    const cleanPlaca = normalizeVehiclePlate(rawPlaca);
    const cleanDoc = rawDoc.trim();
    if (cleanPlaca && !(await canAccessPortalVehicle(auth.session, cleanPlaca))) {
      return NextResponse.json({ success: false, error: "No autorizado para consultar este vehículo." }, { status: 403 });
    }

    // Buscar vehículo y su odómetro actual
    let vehiculo = null;
    if (cleanPlaca) {
      vehiculo = await prisma.vehiculo.findFirst({
        where: {
          placa: {
            in: plateVariants(cleanPlaca),
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
    const { inicio: startOfDay, fin: endOfDay } = operationalDay();

    let turnoHoy = null;
    if (cleanPlaca || cleanDoc) {
      turnoHoy = await prisma.turnoDespacho.findFirst({
        where: {
          AND: [
            cleanPlaca ? { placa: { in: plateVariants(cleanPlaca), mode: "insensitive" } } : {},
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
        where: { placa: { in: plateVariants(cleanPlaca), mode: "insensitive" } },
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
      tieneTurnoAbierto: turnoHoy?.estado === "activo",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar turno." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
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

    const identity = conductorIdentityFromSession(auth.session, {
      id: conductorId,
      name: conductorNombre,
      document: conductorDocumento,
    });
    const cleanPlaca = normalizeVehiclePlate(placa);
    const cleanDoc = String(identity.document || "").trim();
    const numOdometro = parseFloat(String(odometroInicial || 0));

    if (!cleanPlaca) {
      return NextResponse.json({ success: false, error: "La placa del vehículo es obligatoria." }, { status: 400 });
    }
    if (!cleanDoc) {
      return NextResponse.json({ success: false, error: "El documento del conductor es obligatorio." }, { status: 400 });
    }
    if (!(await canAccessPortalVehicle(auth.session, cleanPlaca))) {
      return NextResponse.json({ success: false, error: "No autorizado para operar este vehículo." }, { status: 403 });
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
    const vehiculo = await prisma.vehiculo.findFirst({
      where: {
        placa: {
          in: plateVariants(cleanPlaca),
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
      timeZone: "America/Bogota",
    });

    if (!vehiculo || vehiculo.estado.toLowerCase() !== "activo") {
      return NextResponse.json({ success: false, error: "El vehículo debe estar registrado y activo." }, { status: 409 });
    }
    const turno = await prisma.$transaction(async tx => {
      const { inicio, fin } = operationalDay(now);
      const existing = await tx.turnoDespacho.findFirst({ where: {
        conductorDocumento: cleanDoc, placa: { in: plateVariants(cleanPlaca), mode: "insensitive" }, fecha: { gte: inicio, lte: fin }, estado: "activo",
      } });
      if (existing) throw new TripPolicyError("Ya tienes una jornada abierta para este vehículo.", 409);
      const current = await tx.vehiculo.findUniqueOrThrow({ where: { id: vehiculo.id } });
      if (numOdometro < (current.odometroActual || 0)) throw new TripPolicyError("El odómetro no puede ser inferior al último registrado.", 400);
    // 3. Crear Turno de Despacho
    const nuevoTurno = await tx.turnoDespacho.create({
      data: {
        conductorId: identity.id,
        conductorNombre: identity.name || "Conductor",
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
      await tx.vehiculo.update({
        where: { id: vehiculo.id },
        data: {
          odometroActual: numOdometro,
          odometroFecha: now,
          odometroFotoUrl: fotoOdometroUrl,
        },
      });
    }
    await recordAudit({ action: "CREATE", entityType: "TurnoDespacho", entityId: nuevoTurno.id, after: nuevoTurno, actor: auth.session }, tx);

      return nuevoTurno;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({
      success: true,
      turno,
      message: "Turno aperturado exitosamente con verificación fotográfica.",
    });
  } catch (error: any) {
    if (error instanceof TripPolicyError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    if (error.code === "P2034") return NextResponse.json({ success: false, error: "La jornada cambió mientras guardabas. Consulta el estado e intenta nuevamente." }, { status: 409 });
    console.error("Error en POST /api/portal-conductor/turno:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar el turno." },
      { status: 500 }
    );
  }
}

// El cierre conserva apertura, fotografías y trazabilidad del turno original.
export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const final = Number(body.odometroFinal);
    if (!body.id || !Number.isFinite(final) || final <= 0 || !body.fotoOdometroFinalUrl) {
      throw new TripPolicyError("Indica la jornada, el odómetro final y su fotografía.", 400);
    }
    const turno = await prisma.$transaction(async tx => {
      const previous = await tx.turnoDespacho.findUnique({ where: { id: String(body.id) } });
      if (!previous) throw new TripPolicyError("Jornada no encontrada.", 404);
      if (previous.conductorDocumento !== auth.session.documento) throw new TripPolicyError("Solo puedes cerrar tu propia jornada.", 403);
      if (previous.estado !== "activo") throw new TripPolicyError("Esta jornada ya está cerrada.", 409);
      const activeTrip = await tx.viaje.findFirst({ where: { conductorId: auth.session.id, estado: { in: ["en_curso", "con_novedad"] } }, select: { id: true } });
      if (activeTrip) throw new TripPolicyError("Finaliza el viaje en curso antes de cerrar la jornada.", 409);
      const vehicle = previous.vehiculoId ? await tx.vehiculo.findUnique({ where: { id: previous.vehiculoId } }) : null;
      if (final < Math.max(previous.odometroInicial, vehicle?.odometroActual || 0)) throw new TripPolicyError("El odómetro final no puede ser inferior al último registrado.", 400);
      const now = new Date();
      const updated = await tx.turnoDespacho.update({ where: { id: previous.id }, data: {
        estado: "cerrado", odometroFinal: final, fotoOdometroFinalUrl: String(body.fotoOdometroFinalUrl),
        horaCierre: now.toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour12: false, hour: "2-digit", minute: "2-digit" }),
      } });
      if (vehicle) await tx.vehiculo.update({ where: { id: vehicle.id }, data: { odometroActual: final, odometroFecha: now, odometroFotoUrl: String(body.fotoOdometroFinalUrl) } });
      await recordAudit({ action: "UPDATE", entityType: "TurnoDespacho", entityId: previous.id, before: previous, after: updated, actor: auth.session }, tx);
      return updated;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ success: true, turno, message: "Jornada cerrada y guardada en el ERP." });
  } catch (error: unknown) {
    if (error instanceof TripPolicyError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") return NextResponse.json({ success: false, error: "La jornada cambió. Actualiza e intenta nuevamente." }, { status: 409 });
    return NextResponse.json({ success: false, error: "No se pudo cerrar la jornada." }, { status: 500 });
  }
}
