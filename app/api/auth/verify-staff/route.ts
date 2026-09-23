import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  const auth = await requireStaff(["hseq", "administrativo"]);
  if (auth.response) return auth.response;

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const persona = await prisma.persona.findUnique({
    where: { id: auth.session.id },
    select: { passwordHash: true, pin: true },
  });
  const valid = await verifyPassword(
    password,
    persona?.passwordHash || persona?.pin
  );

  return NextResponse.json({ valid }, { status: valid ? 200 : 401 });
}
