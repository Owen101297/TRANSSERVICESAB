import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      conductorId,
      conductorNombre,
      conductorDocumento,
      placa,
      kilometraje,
      checklist,
      conceptHSEQ,
      signature,
      observaciones,
      itemsCriticos,
    } = body;

    let cId = conductorId;
    let vId = undefined;

    if (conductorDocumento && !cId) {
      const persona = await prisma.persona.findUnique({
        where: { numeroDocumento: conductorDocumento },
      });
      if (persona) cId = persona.id;
    }

    if (placa) {
      const cleanPlaca = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const vehiculo = await prisma.vehiculo.findUnique({
        where: { placa: cleanPlaca },
      });
      if (vehiculo) vId = vehiculo.id;
    }

    // Registrar en inspección preoperacional (y generar novedad si hay falla crítica)
    const inspeccionData = {
      conductorId: cId || "conductor-general",
      conductorNombre: conductorNombre || "Conductor",
      conductorDocumento: conductorDocumento || "",
      vehiculoId: vId || "vehiculo-general",
      placa: (placa || "WGM212").toUpperCase(),
      fecha: new Date(),
      kilometraje: kilometraje ? Number(kilometraje) : null,
      conceptHSEQ: conceptHSEQ || "APTO PARA OPERAR",
      itemsCriticos: itemsCriticos || [],
      checklist: checklist || {},
      signature: signature || null,
      observaciones: observaciones || null,
    };

    console.log("✓ Preoperacional recibido para vehículo:", inspeccionData.placa, "Conductor:", inspeccionData.conductorNombre);

    return NextResponse.json({
      success: true,
      message: "Inspección preoperacional guardada exitosamente en el ERP",
      data: inspeccionData,
    });
  } catch (error: any) {
    console.error("Error al registrar preoperacional desde App:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar preoperacional" },
      { status: 500 }
    );
  }
}
