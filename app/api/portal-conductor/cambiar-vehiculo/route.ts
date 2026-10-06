import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quickAsignarConductorVehiculoAction } from "@/lib/services/asignaciones.service";
import { encodeSession, AUTH_COOKIE_NAME } from "@/lib/session";
import { normalizeVehiclePlate } from "@/lib/portal-validation";
import { plateVariants } from "@/lib/operational-day";
import { requireApiSession } from "@/lib/api-auth";


export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const vehiculos = await prisma.vehiculo.findMany({
      where: { estado: "activo" },
      select: {
        id: true,
        placa: true,
        marca: true,
        modelo: true,
        contratistaNombre: true,
        asignaciones: { where: { estado: "activa", fechaInicio: { lte: new Date() }, OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }] }, select: { conductorId: true } },
      },
      orderBy: { placa: "asc" },
    });
    return NextResponse.json({ vehiculos: vehiculos.map(({ asignaciones, ...vehicle }) => ({ ...vehicle,
      disponible: auth.session.rolPrincipal !== "conductor" || !asignaciones.some(assignment => assignment.conductorId !== auth.session.id),
    })) });
  } catch (error: any) {
    return NextResponse.json({ vehiculos: [], error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const { conductorId, placa, documento } = body;

    if (!placa) {
      return NextResponse.json({ error: "Debes ingresar una placa válida." }, { status: 400 });
    }

    // Personal administrativo selecciona un vehículo para su sesión, sin sustituir conductores.
    if (auth.session.rolPrincipal !== "conductor" && !conductorId && !documento) {
      const vehicle = await prisma.vehiculo.findFirst({ where: { placa: { in: plateVariants(normalizeVehiclePlate(placa)), mode: "insensitive" }, estado: "activo" }, select: { placa: true } });
      if (!vehicle) return NextResponse.json({ error: "Selecciona un vehículo activo." }, { status: 400 });
      const token = await encodeSession({ ...auth.session, placaAsignada: vehicle.placa });
      const response = NextResponse.json({ success: true, placa: vehicle.placa, mode: "seleccion_administrativa" });
      response.cookies.set(AUTH_COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
      return response;
    }

    let targetConductorId = auth.session.rolPrincipal === "conductor" ? auth.session.id : conductorId;

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
