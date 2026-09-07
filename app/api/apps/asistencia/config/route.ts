import { NextResponse } from "next/server";

interface AsistenciaConfig {
  tema: string;
  tipoEvento: string;
  lugar: string;
  facilitador: string;
  updatedAt: string;
}

// Configuración en memoria con valores iniciales estándar del PESV
let currentConfig: AsistenciaConfig = {
  tema: "CHARLA 5 MINUTOS: PREVENCIÓN DE FATIGA Y CONTROL DE MICROSUEÑOS",
  tipoEvento: "Charla 5 Minutos (PESV/HSEQ)",
  lugar: "VILLAGARZÓN (PUTUMAYO)",
  facilitador: "COORDINACIÓN HSEQ & PESV",
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  return NextResponse.json({
    success: true,
    config: currentConfig,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tema, tipoEvento, lugar, facilitador } = body;

    if (tema) currentConfig.tema = String(tema).trim().toUpperCase();
    if (tipoEvento) currentConfig.tipoEvento = String(tipoEvento).trim();
    if (lugar) currentConfig.lugar = String(lugar).trim().toUpperCase();
    if (facilitador) currentConfig.facilitador = String(facilitador).trim().toUpperCase();
    currentConfig.updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: "Tema activo del día actualizado exitosamente",
      config: currentConfig,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}
