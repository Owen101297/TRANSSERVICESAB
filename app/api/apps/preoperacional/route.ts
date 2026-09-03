import { NextResponse } from "next/server";
import { createPreoperacionalDb, getPreoperacionalesDb } from "@/lib/services/preoperacional.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = await createPreoperacionalDb({
      conductorId: body.conductorId,
      conductorNombre: body.conductorNombre,
      conductorDocumento: body.conductorDocumento || body.documento,
      placa: body.placa,
      kilometraje: body.kilometraje,
      checklist: body.checklist || body.checks || {},
      observaciones: body.observaciones,
      signature: body.signature || body.firmaConductor,
      fotoEvidenciaUrl: body.fotoEvidenciaUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Inspección preoperacional guardada exitosamente en PostgreSQL (Railway)",
      data: result.data,
    });
  } catch (error: any) {
    console.error("Error al registrar preoperacional desde App:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar preoperacional" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rangoFecha = searchParams.get("rangoFecha") as any;
    const fechaDesde = searchParams.get("fechaDesde") || undefined;
    const fechaHasta = searchParams.get("fechaHasta") || undefined;
    const placa = searchParams.get("placa") || undefined;
    const conductorId = searchParams.get("conductorId") || undefined;
    const estadoConcepto = searchParams.get("estadoConcepto") || undefined;
    const busqueda = searchParams.get("busqueda") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 25;

    const data = await getPreoperacionalesDb({
      rangoFecha,
      fechaDesde,
      fechaHasta,
      placa,
      conductorId,
      estadoConcepto,
      busqueda,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error("Error al obtener preoperacionales:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar preoperacionales" },
      { status: 500 }
    );
  }
}
