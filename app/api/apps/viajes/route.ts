import { NextResponse } from "next/server";
import { plateVariants } from "@/lib/operational-day";
import { prisma } from "@/lib/prisma";
import { procesarAlertaViaje } from "@/lib/services/alertas-viaje.service";
import { requireApiSession, requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { canAccessPortalVehicle, conductorIdentityFromSession, normalizeVehiclePlate } from "@/lib/portal-access";
import { applyTripPolicy, jsonObject, TripPolicyError } from "@/lib/trip-policy";
import { requireDriverOperationalReadiness } from "@/lib/operational-readiness";
import type { SessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const body = jsonObject(await req.json());

    const {
      conductorId,
      conductorNombre,
      conductorDocumento,
      conductorLicencia,
      conductorCategoria,
      conductorVencimiento,
      conductorTelefono,
      placa,
      vehiculoTipo,
      vehiculoModelo,
      vehiculoColor,
      vehiculoEmpresa,
      origen,
      origenDivipola,
      destino,
      destinoDivipola,
      fechaSalida,
      horaSalida,
      distanciaKm,
      duracionEstimadaHoras,
      kmSalida,
      kmLlegada,
      gpsSalida,
      gpsLlegada,
      medio,
      rutograma,
      puntosControl,
      previaje,
      fatiga,
      control,
      riskInputs,
      observaciones,
    } = body;

    // Buscar o vincular conductor y vehículo en PostgreSQL
    const identity = conductorIdentityFromSession(auth.session, {
      id: conductorId,
      name: conductorNombre,
      document: conductorDocumento,
    });
    let cId = identity.id;
    let vId = undefined;
    const cleanPlaca = normalizeVehiclePlate(placa);

    if (!cleanPlaca) {
      return NextResponse.json({ error: "La placa del vehículo es obligatoria." }, { status: 400 });
    }

    if (conductorDocumento && !cId) {
      const persona = await prisma.persona.findUnique({
        where: { numeroDocumento: String(conductorDocumento).trim() },
      });
      if (persona) cId = persona.id;
    }

    if (cleanPlaca) {
      if (!(await canAccessPortalVehicle(auth.session, cleanPlaca))) {
        return NextResponse.json({ error: "No autorizado para operar este vehículo." }, { status: 403 });
      }
      const vehiculo = await prisma.vehiculo.findFirst({
        where: { placa: { in: plateVariants(cleanPlaca), mode: "insensitive" } },
      });
      if (vehiculo) vId = vehiculo.id;
    }
    if (!vId) return NextResponse.json({ error: "Vehículo no registrado." }, { status: 400 });
    const conductor = cId ? await prisma.persona.findUnique({ where: { id: cId } }) : null;
    if (!conductor || ["inactivo", "retirado"].includes(conductor.estado)) {
      return NextResponse.json({ error: "Conductor activo requerido." }, { status: 400 });
    }

    await requireDriverOperationalReadiness(auth.session, cleanPlaca);
    const now = new Date();
    const horaLocalCo = now.toLocaleTimeString("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const horaFinal = horaSalida && horaSalida !== "06:00" ? horaSalida : horaLocalCo;

    // Empaquetar datos adicionales en riskInputs y signatures estructurados
    const finalRiskInputs: Record<string, any> = {
      ...(riskInputs === undefined ? {} : jsonObject(riskInputs)),
      origenDivipola: origenDivipola || null,
      destinoDivipola: destinoDivipola || null,
      puntosControl: puntosControl || [],
      previaje: previaje || {},
      fatiga: fatiga || {},
      control: control || {},
      kmSalida: kmSalida !== undefined ? Number(kmSalida) : null,
      kmLlegada: kmLlegada !== undefined ? Number(kmLlegada) : null,
      gpsSalida: gpsSalida || null,
      gpsLlegada: gpsLlegada || null,
      medio: medio || "Celular",
      rutograma: rutograma || null,
      conductorLicencia: conductorLicencia || null,
      conductorCategoria: conductorCategoria || null,
      conductorVencimiento: conductorVencimiento || null,
      conductorTelefono: conductorTelefono || null,
      vehiculoTipo: vehiculoTipo || null,
      vehiculoModelo: vehiculoModelo || null,
      vehiculoColor: vehiculoColor || null,
      vehiculoEmpresa: vehiculoEmpresa || null,
    };

    const policy = applyTripPolicy(auth.session, { ...body, riskInputs: finalRiskInputs });
    const viaje = await prisma.$transaction(async (tx) => {
      const created = await tx.viaje.create({
      data: {
        conductorId: conductor.id,
        conductorNombre: `${conductor.nombres} ${conductor.apellidos}`,
        vehiculoId: vId,
        placa: cleanPlaca,
        contratistaNombre: body.contratistaNombre || "TRANS SERVICES COOPERATIVA A&B",
        origen: origen || "Base Operativa",
        destino: destino || "Destino Operativo",
        fechaSalida: fechaSalida ? new Date(fechaSalida) : now,
        horaSalida: horaFinal,
        distanciaKm: distanciaKm ? Number(distanciaKm) : null,
        duracionEstimadaHoras: duracionEstimadaHoras ? Number(duracionEstimadaHoras) : 2.0,
        ...policy,
        observaciones: observaciones || null,
      },
      });
      await recordAudit({ action: "CREATE", entityType: "Viaje", entityId: created.id, after: created, actor: auth.session }, tx);
      return created;
    });

    const alerta = procesarAlertaViaje({
      viajeId: viaje.id,
      placa: viaje.placa,
      conductorNombre: viaje.conductorNombre,
      origen: viaje.origen,
      destino: viaje.destino,
      divipolaOrigen: origenDivipola,
      divipolaDestino: destinoDivipola,
      horaSalida: viaje.horaSalida || "08:00",
      riskScore: viaje.riskScore || 0,
      riskLevel: viaje.riskLevel || "Bajo",
      esNocturno: policy.riskInputs.rHora === 4,
    });

    return NextResponse.json({
      success: true,
      id: viaje.id,
      message: "Viaje registrado exitosamente en el ERP",
      alerta,
      viaje,
    });
  } catch (error: any) {
    if (error instanceof TripPolicyError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    console.error("Error al registrar viaje desde App:", error);
    return NextResponse.json(
      { success: false, error: "No fue posible registrar el viaje." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const conductorDocumento = searchParams.get("conductorDocumento") || searchParams.get("doc");
    const conductorId = searchParams.get("conductorId");
    const placa = searchParams.get("placa");
    const estado = searchParams.get("estado");

    if (id) {
      const viaje = await prisma.viaje.findUnique({
        where: { id },
      });
      if (!viaje) {
        return NextResponse.json({ error: "Viaje no encontrado" }, { status: 404 });
      }
      if (
        auth.session.rolPrincipal === "conductor" &&
        viaje.conductorId !== auth.session.id
      ) {
        return NextResponse.json({ error: "No autorizado." }, { status: 403 });
      }
      return NextResponse.json(mapViajeResponse(viaje));
    }

    const where: any = {};
    if (auth.session.rolPrincipal === "conductor") {
      where.conductorId = auth.session.id;
    }
    if (conductorId && auth.session.rolPrincipal !== "conductor") where.conductorId = conductorId;
    if (placa) where.placa = placa.toUpperCase().trim();
    if (estado) where.estado = estado;

    // Si viene documento, buscar el ID de la persona
    if (
      conductorDocumento &&
      !conductorId &&
      auth.session.rolPrincipal !== "conductor"
    ) {
      const persona = await prisma.persona.findUnique({
        where: { numeroDocumento: String(conductorDocumento).trim() },
      });
      if (persona) {
        where.conductorId = persona.id;
      }
    }

    const viajes = await prisma.viaje.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const data = viajes.map(mapViajeResponse);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error al consultar viajes:", error);
    return NextResponse.json({ error: error.message || "Error al consultar viajes" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  return updateTrip(req, auth.session, false);
}

export async function PATCH(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  return updateTrip(req, auth.session, true);
}

async function updateTrip(req: Request, session: SessionUser, closeByDefault: boolean) {
  try {
    const body = jsonObject(await req.json());
    const id = new URL(req.url).searchParams.get("id") || body.id;
    if (typeof id !== "string" || !id.trim()) {
      throw new TripPolicyError("ID de viaje requerido.", 400);
    }
    const existing = await prisma.viaje.findUnique({ where: { id } });
    if (!existing) throw new TripPolicyError("Viaje no encontrado.", 404);
    if (closeByDefault && body.estado === undefined) body.estado = "finalizado";
    const policy = applyTripPolicy(session, body, existing);
    const mergedInputs: Record<string, any> = { ...policy.riskInputs,
      ...(body.origenDivipola ? { origenDivipola: body.origenDivipola } : {}),
      ...(body.destinoDivipola ? { destinoDivipola: body.destinoDivipola } : {}),
      ...(body.gpsLlegada ? { gpsLlegada: body.gpsLlegada } : {}),
      ...(body.puntosControl || body.puntos_control ? { puntosControl: body.puntosControl || body.puntos_control } : {}),
    };
    const km = body.kmLlegada ?? body.km_llegada;
    if (km !== undefined && km !== null && km !== "") {
      if (!Number.isFinite(Number(km)) || Number(km) < 0) throw new TripPolicyError("Kilometraje inválido.", 400);
      mergedInputs.kmLlegada = Number(km);
    }
    const now = new Date();
    const data = { ...policy, riskInputs: mergedInputs,
      ...(body.observaciones !== undefined ? { observaciones: body.observaciones } : {}),
      ...(policy.estado === "finalizado" ? {
        fechaLlegadaReal: now,
        horaLlegada: body.horaLlegada || body.hora_llegada || now.toLocaleTimeString("es-CO", {
          timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", hour12: true,
        }),
      } : {}),
    };
    const viaje = await prisma.$transaction(async (tx) => {
      // Evitar que dos solicitudes sobrescriban una autorización o un cierre concurrente.
      const result = await tx.viaje.updateMany({ where: { id, updatedAt: existing.updatedAt }, data });
      if (result.count !== 1) throw new TripPolicyError("El viaje cambió; recarga antes de continuar.", 409);
      const updated = await tx.viaje.findUniqueOrThrow({ where: { id } });
      await recordAudit({ action: existing.estado === updated.estado ? "UPDATE" : "STATUS_CHANGE",
        entityType: "Viaje", entityId: id, before: existing, after: updated, actor: session }, tx);
      return updated;
    });
    return NextResponse.json({ success: true, id, message: "Viaje actualizado exitosamente", viaje: mapViajeResponse(viaje) });
  } catch (error: any) {
    if (error instanceof TripPolicyError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    console.error("Error al actualizar viaje:", error);
    return NextResponse.json({ error: "No fue posible actualizar el viaje." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de viaje requerido" }, { status: 400 });
    }

    const existing = await prisma.viaje.findUnique({ where: { id } });
    await prisma.viaje.delete({
      where: { id },
    });
    await recordAudit({ action: "DELETE", entityType: "Viaje", entityId: id, before: existing, actor: auth.session });

    return NextResponse.json({
      success: true,
      message: "Viaje eliminado exitosamente",
    });
  } catch (error: any) {
    console.error("Error al eliminar viaje:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar viaje" }, { status: 500 });
  }
}

function mapViajeResponse(v: any) {
  const rInputs = (v.riskInputs as Record<string, any>) || {};
  return {
    id: v.id,
    conductor_id: v.conductorId,
    conductor_nombre: v.conductorNombre,
    vehiculo_placa: v.placa,
    origen: v.origen,
    origen_divipola: rInputs.origenDivipola || null,
    destino: v.destino,
    destino_divipola: rInputs.destinoDivipola || null,
    fecha_salida: v.fechaSalida ? v.fechaSalida.toISOString() : new Date().toISOString(),
    hora_salida: v.horaSalida || "06:00",
    fecha_llegada_real: v.fechaLlegadaReal ? v.fechaLlegadaReal.toISOString() : null,
    hora_llegada: v.horaLlegada || null,
    distancia_km: v.distanciaKm,
    duracion_estimada_horas: v.duracionEstimadaHoras,
    km_salida: rInputs.kmSalida ?? null,
    km_llegada: rInputs.kmLlegada ?? null,
    gps_salida: rInputs.gpsSalida || null,
    gps_llegada: rInputs.gpsLlegada || null,
    puntos_control: rInputs.puntosControl || [],
    previaje: rInputs.previaje || {},
    fatiga: rInputs.fatiga || {},
    control: rInputs.control || {},
    medio: rInputs.medio || "Celular",
    rutograma: rInputs.rutograma || null,
    conductor_licencia: rInputs.conductorLicencia || null,
    conductor_categoria: rInputs.conductorCategoria || null,
    conductor_vencimiento: rInputs.conductorVencimiento || null,
    conductor_telefono: rInputs.conductorTelefono || null,
    vehiculo_tipo: rInputs.vehiculoTipo || null,
    vehiculo_modelo: rInputs.vehiculoModelo || null,
    vehiculo_color: rInputs.vehiculoColor || null,
    vehiculo_empresa: rInputs.vehiculoEmpresa || null,
    risk_score: v.riskScore,
    risk_level: v.riskLevel,
    risk_inputs: rInputs,
    signatures: v.signatures || {},
    estado: v.estado,
    observaciones: v.observaciones,
    created_at: v.createdAt ? v.createdAt.toISOString() : new Date().toISOString(),
  };
}
