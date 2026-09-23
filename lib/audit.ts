import "server-only";

import { headers } from "next/headers";
import { prisma } from "./prisma";
import { getServerSession } from "./auth";
import type { SessionUser } from "./session";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "APPROVE"
  | "LOGIN"
  | "PASSWORD_CHANGE";

interface AuditInput {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  actor?: SessionUser | null;
}

function jsonValue(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const actor = input.actor ?? (await getServerSession());
  if (!actor) throw new Error("No se pudo identificar al actor de auditoría.");

  const requestHeaders = await headers();
  const ipAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    null;

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.nombre,
      actorRole: actor.rolPrincipal,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      before: jsonValue(input.before),
      after: jsonValue(input.after),
      metadata: jsonValue(input.metadata),
      ipAddress,
      userAgent: requestHeaders.get("user-agent"),
    },
  });
}
