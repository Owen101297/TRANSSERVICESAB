import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { procesarAlertaViaje } from "@/lib/services/alertas-viaje.service";
import { requireApiSession, requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const body = await req.json();

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
      riskScore,
      riskLevel,
      riskInputs,
      signatures,
      estado,
      observaciones,
    } = body;

    // Buscar o vincular conductor y vehículo en PostgreSQL
    let cId =
      auth.session.rolPrincipal === "conductor" ? auth.session.id : conductorId;
    let vId = undefined;

    if (conductorDocumento && !cId) {
      const persona = await prisma.persona.findUnique({
        where: { numeroDocumento: String(conductorDocumento).trim() },
      });
      if (persona) cId = persona.id;
    }

    if (placa) {
      const cleanPlaca = String(placa).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const vehiculo = await prisma.vehiculo.findUnique({
        where: { placa: cleanPlaca },
      });
      if (vehiculo) vId = vehiculo.id;
    }

    const now = new Date();
    const horaLocalCo = now.toLocaleTimeString("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const horaFinal = horaSalida && horaSalida !== "06:00" ? horaSalida : horaLocalCo;

    // Empaquetar datos adicionales en riskInputs y signatures estructurados
    const finalRiskInputs = {
      ...(typeof riskInputs === "object" ? riskInputs : {}),
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

    const finalSignatures = typeof signatures === "object" ? signatures : {};

    const viaje = await prisma.viaje.create({
      data: {
        conductorId: cId || "conductor-general",
        conductorNombre:
          auth.session.rolPrincipal === "conductor"
            ? auth.session.nombre
            : conductorNombre || "Conductor Asignado",
        vehiculoId: vId || "vehiculo-general",
        placa: (placa || "WGM212").toUpperCase().trim(),
        contratistaNombre: body.contratistaNombre || "TRANS SERVICES COOPERATIVA A&B",
        origen: origen || "Base Operativa",
        destino: destino || "Destino Operativo",
        fechaSalida: fechaSalida ? new Date(fechaSalida) : now,
        horaSalida: horaFinal,
        distanciaKm: distanciaKm ? Number(distanciaKm) : null,
        duracionEstimadaHoras: duracionEstimadaHoras ? Number(duracionEstimadaHoras) : 2.0,
        estado: estado || "en_curso",
        riskScore: riskScore !== undefined && riskScore !== null ? Number(riskScore) : null,
        riskLevel: riskLevel || null,
        riskInputs: finalRiskInputs,
        signatures: finalSignatures,
        observaciones: observaciones || null,
      },
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
      esNocturno: Boolean(finalRiskInputs.esNocturno),
    });
    await recordAudit({ action: "CREATE", entityType: "Viaje", entityId: viaje.id, after: viaje, actor: auth.session });

    return NextResponse.json({
      success: true,
      id: viaje.id,
      message: "Viaje registrado exitosamente en el ERP",
      alerta,
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
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const id = searchParams.get("id") || body.id;

    if (!id) {
      return NextResponse.json({ error: "ID de viaje requerido" }, { status: 400 });
    }

    const existing = await prisma.viaje.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Viaje no encontrado" }, { status: 404 });
    }
    if (
      auth.session.rolPrincipal === "conductor" &&
      (existing.conductorId !== auth.session.id ||
        body.estado === "Autorizado" ||
        body.signatures?.hse ||
        body.signatures?.gerencia)
    ) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const currentRiskInputs = (existing.riskInputs as Record<string, any>) || {};
    const currentSignatures = (existing.signatures as Record<string, any>) || {};

    const updatedRiskInputs = {
      ...currentRiskInputs,
      ...(body.riskInputs || body.risk_inputs || {}),
      ...(body.origenDivipola ? { origenDivipola: body.origenDivipola } : {}),
      ...(body.destinoDivipola ? { destinoDivipola: body.destinoDivipola } : {}),
      ...(body.kmLlegada !== undefined ? { kmLlegada: Number(body.kmLlegada) } : {}),
      ...(body.gpsLlegada ? { gpsLlegada: body.gpsLlegada } : {}),
      ...(body.puntosControl || body.puntos_control ? { puntosControl: body.puntosControl || body.puntos_control } : {}),
    };

    const updatedSignatures = {
      ...currentSignatures,
      ...(body.signatures || {}),
    };

    const updateData: any = {
      signatures: updatedSignatures,
      riskInputs: updatedRiskInputs,
    };

    if (body.estado) updateData.estado = body.estado;
    if (body.observaciones !== undefined) updateData.observaciones = body.observaciones;
    if (body.horaLlegada || body.hora_llegada) updateData.horaLlegada = body.horaLlegada || body.hora_llegada;
    if (body.kmLlegada !== undefined || body.km_llegada !== undefined) {
      const km = body.kmLlegada !== undefined ? body.kmLlegada : body.km_llegada;
      if (km !== null && km !== "") {
        updateData.fechaLlegadaReal = new Date();
      }
    }
    if (body.riskScore !== undefined || body.risk_score !== undefined) {
      updateData.riskScore = Number(body.riskScore ?? body.risk_score);
    }
    if (body.riskLevel || body.risk_level) {
      updateData.riskLevel = body.riskLevel || body.risk_level;
    }

    const viaje = await prisma.viaje.update({
      where: { id },
      data: updateData,
    });
    await recordAudit({ action: "UPDATE", entityType: "Viaje", entityId: viaje.id, before: existing, after: viaje, actor: auth.session });

    return NextResponse.json({
      success: true,
      id: viaje.id,
      message: "Viaje actualizado exitosamente",
      viaje: mapViajeResponse(viaje),
    });
  } catch (error: any) {
    console.error("Error al actualizar viaje (PUT):", error);
    return NextResponse.json({ error: error.message || "Error al actualizar viaje" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const id = searchParams.get("id") || body.id;

    if (!id) {
      return NextResponse.json({ error: "ID de viaje requerido" }, { status: 400 });
    }

    const existingTrip = await prisma.viaje.findUnique({ where: { id } });
    if (
      !existingTrip ||
      (auth.session.rolPrincipal === "conductor" &&
        existingTrip.conductorId !== auth.session.id)
    ) {
      return NextResponse.json(
        { error: existingTrip ? "No autorizado." : "Viaje no encontrado" },
        { status: existingTrip ? 403 : 404 }
      );
    }

    const now = new Date();
    const horaLlegadaCo = now.toLocaleTimeString("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const updateData: any = {
      estado: body.estado || "finalizado",
      fechaLlegadaReal: now,
      horaLlegada: body.horaLlegada || horaLlegadaCo,
    };

    if (body.observaciones !== undefined) updateData.observaciones = body.observaciones;
    if (body.signatures) {
      const existing = await prisma.viaje.findUnique({ where: { id } });
      const currentSignatures = (existing?.signatures as Record<string, any>) || {};
      updateData.signatures = { ...currentSignatures, ...body.signatures };
    }

    const viaje = await prisma.viaje.update({
      where: { id },
      data: updateData,
    });
    await recordAudit({ action: "STATUS_CHANGE", entityType: "Viaje", entityId: viaje.id, before: existingTrip, after: viaje, actor: auth.session });

    return NextResponse.json({
      success: true,
      id: viaje.id,
      message: "Viaje actualizado exitosamente",
      viaje: mapViajeResponse(viaje),
    });
  } catch (error: any) {
    console.error("Error al actualizar viaje (PATCH):", error);
    return NextResponse.json({ error: error.message || "Error al actualizar viaje" }, { status: 500 });
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
