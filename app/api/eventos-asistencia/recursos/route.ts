import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaff();
  if (auth.response) return auth.response;

  const personas = await prisma.persona.findMany({
    where: { estado: { not: "inactivo" } },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      numeroDocumento: true,
      perfiles: true,
      estado: true,
      contratistaNombre: true,
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return NextResponse.json({ success: true, personas });
}
