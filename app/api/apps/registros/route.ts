import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";

export async function POST() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  return NextResponse.json(
    {
      success: false,
      error: "Endpoint genérico deshabilitado. Utiliza el endpoint específico del módulo para garantizar persistencia y auditoría.",
    },
    { status: 410 }
  );
}
