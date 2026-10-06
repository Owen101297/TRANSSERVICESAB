import "server-only";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";
import { operationalDay, plateVariants } from "@/lib/operational-day";
import { TripPolicyError } from "@/lib/trip-policy";

export async function requireDriverOperationalReadiness(session: SessionUser, plate: string) {
  if (session.rolPrincipal !== "conductor") return;
  const now = new Date();
  const { inicio, fin } = operationalDay(now);
  const assignment = await prisma.asignacion.findFirst({ where: {
    conductorId: session.id, estado: "activa", autorizacionOperativa: true,
    placa: { in: plateVariants(plate), mode: "insensitive" }, fechaInicio: { lte: now },
    OR: [{ fechaFin: null }, { fechaFin: { gte: now } }], vehiculo: { estado: "activo" },
  }, select: { id: true } });
  if (!assignment) throw new TripPolicyError("Coordinación debe autorizar la asignación y habilitar el vehículo.", 409);
  const shift = await prisma.turnoDespacho.findFirst({ where: {
    conductorDocumento: session.documento, placa: { in: plateVariants(plate), mode: "insensitive" },
    fecha: { gte: inicio, lte: fin }, estado: "activo",
  }, select: { id: true } });
  if (!shift) throw new TripPolicyError("Primero debes abrir la jornada para este vehículo.", 409);
  const inspection = await prisma.inspeccionPreoperacional.findFirst({ where: {
    conductorId: session.id, placa: { in: plateVariants(plate), mode: "insensitive" }, fecha: { gte: inicio, lte: fin },
  }, orderBy: { createdAt: "desc" }, select: { estadoConcepto: true } });
  if (!inspection) throw new TripPolicyError("Completa el preoperacional de hoy para este vehículo.", 409);
  if (!["apto", "apto_con_observacion"].includes(inspection.estadoConcepto)) {
    throw new TripPolicyError("El vehículo no está apto para operar. Reporta la novedad a coordinación o HSEQ.", 409);
  }
}
