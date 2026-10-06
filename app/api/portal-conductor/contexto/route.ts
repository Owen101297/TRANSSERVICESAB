import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

import { operationalDay, plateVariants } from "@/lib/operational-day";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;

  const session = auth.session;
  const { inicio, fin } = operationalDay();
  const asignacion = await prisma.asignacion.findFirst({
    where: {
      conductorId: session.id,
      estado: "activa",
      fechaInicio: { lte: new Date() },
      OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }],
    },
    include: {
      vehiculo: {
        select: { id: true, placa: true, marca: true, modelo: true, estado: true },
      },
    },
    orderBy: { fechaInicio: "desc" },
  });

  const placa = asignacion?.placa || null;
  const [turno, preoperacional, viajeActivo, capacitacionesPendientes] = await Promise.all([
    prisma.turnoDespacho.findFirst({
      where: {
        conductorDocumento: session.documento,
        fecha: { gte: inicio, lte: fin },
        placa: { in: placa ? plateVariants(placa) : [], mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, hora: true, estado: true, placa: true, odometroInicial: true, horaCierre: true },
    }),
    prisma.inspeccionPreoperacional.findFirst({
      where: { conductorId: session.id, fecha: { gte: inicio, lte: fin }, placa: { in: placa ? plateVariants(placa) : [], mode: "insensitive" } },
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
    jornada: { turno: turno?.estado === "activo" ? turno : null, cierre: turno?.estado === "cerrado" ? turno : null, preoperacional, viajeActivo },
    formacion: { pendientes: capacitacionesPendientes },
  });
}
