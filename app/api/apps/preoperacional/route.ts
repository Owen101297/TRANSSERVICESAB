import { NextResponse } from "next/server";
import { createPreoperacionalDb, getPreoperacionalesDb } from "@/lib/services/preoperacional.service";
import { requireApiSession } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const conductorId = auth.session.rolPrincipal === "conductor" ? auth.session.id : body.conductorId;
    const conductorNombre = auth.session.rolPrincipal === "conductor" ? auth.session.nombre : body.conductorNombre;

    const result = await createPreoperacionalDb({
      conductorId,
      conductorNombre,
      conductorDocumento: body.conductorDocumento || body.documento,
      placa: body.placa,
      kilometraje: body.kilometraje,
      checklist: body.checklist || body.checks || {},
      observaciones: body.observaciones,
      signature: body.signature || body.firmaConductor,
      fotoEvidenciaUrl: body.fotoEvidenciaUrl,
    });
    await recordAudit({ action: "CREATE", entityType: "InspeccionPreoperacional", entityId: result.data?.id, after: result.data, actor: auth.session });

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
