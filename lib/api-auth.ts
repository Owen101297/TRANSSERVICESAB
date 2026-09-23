import { NextResponse } from "next/server";
import { getServerSession } from "./auth";
import type { SessionUser } from "./session";

type StaffRole = Exclude<SessionUser["rolPrincipal"], "conductor">;

export async function requireApiSession(): Promise<
  { session: SessionUser; response?: never } | { session?: never; response: NextResponse }
> {
  const session = await getServerSession();
  if (!session) {
    return {
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }
  return { session };
}

export async function requireStaff(
  allowedRoles: StaffRole[] = ["coordinador", "hseq", "administrativo"]
): Promise<
  { session: SessionUser; response?: never } | { session?: never; response: NextResponse }
> {
  const auth = await requireApiSession();
  if (auth.response) return auth;
  if (!allowedRoles.includes(auth.session.rolPrincipal as StaffRole)) {
    return {
      response: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
    };
  }
  return auth;
}
