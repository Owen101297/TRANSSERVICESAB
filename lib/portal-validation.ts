import type { SessionUser } from "@/lib/session";

export function normalizeVehiclePlate(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function conductorIdentityFromSession(
  session: SessionUser,
  requested: { id?: unknown; name?: unknown; document?: unknown } = {},
) {
  if (session.rolPrincipal === "conductor") {
    return { id: session.id, name: session.nombre, document: session.documento };
  }

  return {
    id: String(requested.id || "").trim() || null,
    name: String(requested.name || "").trim() || null,
    document: String(requested.document || "").trim() || null,
  };
}
