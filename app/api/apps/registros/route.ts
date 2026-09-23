import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Endpoint genérico deshabilitado. Utiliza el endpoint específico del módulo para garantizar persistencia y auditoría.",
    },
    { status: 410 }
  );
}
