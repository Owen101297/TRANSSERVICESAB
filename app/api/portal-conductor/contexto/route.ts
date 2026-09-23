import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function limitesDiaColombia(fecha = new Date()) {
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
  return {
    inicio: new Date(`${dia}T00:00:00-05:00`),
    fin: new Date(`${dia}T23:59:59.999-05:00`),
  };
}

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  const session = auth.session;
  const { inicio, fin } = limitesDiaColombia();
  const asignacion = await prisma.asignacion.findFirst({
    where: {
      conductorId: session.id,
      estado: "activa",
      fechaInicio: { lte: fin },
      OR: [{ fechaFin: null }, { fechaFin: { gte: inicio } }],
    },
    include: {
      vehiculo: {
        select: { id: true, placa: true, marca: true, modelo: true, estado: true },
      },
    },
    orderBy: { fechaInicio: "desc" },
  });

  const placa = asignacion?.placa || session.placaAsignada || null;
  const [turno, preoperacional, viajeActivo, capacitacionesPendientes] = await Promise.all([
    prisma.turnoDespacho.findFirst({
      where: {
        conductorDocumento: session.documento,
        fecha: { gte: inicio, lte: fin },
        ...(placa ? { placa: { equals: placa, mode: "insensitive" as const } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, hora: true, estado: true, placa: true, odometroInicial: true },
    }),
    prisma.inspeccionPreoperacional.findFirst({
      where: { conductorId: session.id, fecha: { gte: inicio, lte: fin } },
      orderBy: { createdAt: "desc" },
      select: { id: true, estadoConcepto: true, placa: true, fecha: true },
    }),
    prisma.viaje.findFirst({
      where: {
        conductorId: session.id,
        estado: { in: ["en_curso", "con_novedad"] },
      },
      orderBy: { fechaSalida: "desc" },
      select: { id: true, placa: true, origen: true, destino: true, estado: true, fechaSalida: true },
    }),
    prisma.capacitacion.findMany({
      where: {
        estado: "programada",
        asistencias: {
          none: {
            OR: [
              { personaId: session.id },
              { personaDocumento: session.documento },
            ],
          },
        },
      },
      orderBy: { fecha: "asc" },
      take: 5,
      select: { id: true, nombre: true, fecha: true, tipo: true, categoria: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    usuario: {
      id: session.id,
      nombre: session.nombre,
      documento: session.documento,
      rol: session.rolPrincipal,
      perfiles: session.perfiles,
    },
    asignacion: asignacion
      ? {
          id: asignacion.id,
          placa: asignacion.placa,
          turno: asignacion.turno,
          tipo: asignacion.tipoAsignacion,
          contratista: asignacion.contratistaNombre,
          autorizacionOperativa: asignacion.autorizacionOperativa,
          vehiculo: asignacion.vehiculo,
        }
      : null,
    jornada: { turno, preoperacional, viajeActivo },
    formacion: { pendientes: capacitacionesPendientes },
  });
}
