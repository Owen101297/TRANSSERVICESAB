import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const [jornadas, inspecciones, viajes] = await Promise.all([
    prisma.turnoDespacho.findMany({ where: { conductorDocumento: auth.session.documento }, orderBy: { fecha: "desc" }, take: 30, select: { id: true, fecha: true, placa: true, estado: true, odometroInicial: true, odometroFinal: true } }),
    prisma.inspeccionPreoperacional.findMany({ where: { conductorId: auth.session.id }, orderBy: { fecha: "desc" }, take: 30, select: { id: true, fecha: true, placa: true, estadoConcepto: true } }),
    prisma.viaje.findMany({ where: { conductorId: auth.session.id }, orderBy: { fechaSalida: "desc" }, take: 30, select: { id: true, fechaSalida: true, placa: true, estado: true, origen: true, destino: true } }),
  ]);
  const controls = await Promise.all([
    prisma.controlLavado.findMany({ where: { conductorDocumento: auth.session.documento }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, createdAt: true, placa: true } }),
    prisma.controlAseo.findMany({ where: { conductorDocumento: auth.session.documento }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, createdAt: true, placa: true } }),
    prisma.controlExtintor.findMany({ where: { conductorDocumento: auth.session.documento }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, createdAt: true, placa: true } }),
    prisma.controlBotiquin.findMany({ where: { conductorDocumento: auth.session.documento }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, createdAt: true, placa: true } }),
    prisma.encuestaRespuesta.findMany({ where: { conductorDocumento: auth.session.documento }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, createdAt: true, placa: true } }),
  ]);
  const names = ["Lavado", "Aseo", "Extintor", "Botiquín", "Encuesta"];
  const apps = controls.flatMap((items, index) => items.map(item => ({ id: item.id, fecha: item.createdAt, placa: item.placa || "Sin vehículo", estado: "guardado", proceso: names[index] }))).sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 30);
  return NextResponse.json({ success: true, jornadas, inspecciones, viajes, apps });
}
