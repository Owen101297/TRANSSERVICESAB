import "server-only";

import { prisma } from "@/lib/prisma";
import { plateVariants } from "@/lib/operational-day";
import type { SessionUser } from "@/lib/session";
import { normalizeVehiclePlate } from "@/lib/portal-validation";

export { conductorIdentityFromSession, normalizeVehiclePlate } from "@/lib/portal-validation";

export async function canAccessPortalVehicle(session: SessionUser, plate: string) {
  if (session.rolPrincipal !== "conductor") return true;

  const cleanPlate = normalizeVehiclePlate(plate);
  if (!cleanPlate) return false;

  const assignment = await prisma.asignacion.findFirst({
    where: {
      conductorId: session.id,
      estado: "activa",
      placa: { in: plateVariants(cleanPlate), mode: "insensitive" },
      fechaInicio: { lte: new Date() },
      OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }],
    },
    select: { id: true },
  });
  return Boolean(assignment);
}
