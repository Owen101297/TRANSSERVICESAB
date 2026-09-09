import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface AsistenciaConfig {
  tema: string;
  tipoEvento: string;
  lugar: string;
  facilitador: string;
  updatedAt: string;
}

const CONFIG_FILE = path.join(process.cwd(), "lib/data/asistencia-config.json");

// Configuración inicial estándar
let currentConfig: AsistenciaConfig = {
  tema: "CHARLA 5 MINUTOS: PREVENCIÓN DE FATIGA Y CONTROL DE MICROSUEÑOS",
  tipoEvento: "Charla 5 Minutos (PESV/HSEQ)",
  lugar: "VILLAGARZÓN (PUTUMAYO)",
  facilitador: "COORDINACIÓN HSEQ & PESV",
  updatedAt: new Date().toISOString(),
};

// Carga persistida desde disco o PostgreSQL
async function loadPersistedConfig(): Promise<AsistenciaConfig> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8").replace(/^\uFEFF/, "").trim();
      const parsed = JSON.parse(raw);
      if (parsed.tema) {
        currentConfig = { ...currentConfig, ...parsed };
        return currentConfig;
      }
    }
  } catch {}

  // Fallback: Si no hay archivo, consultar el tema más reciente en la base de datos
  try {
    const lastRecord = await prisma.asistenciaRegistro.findFirst({
      orderBy: { createdAt: "desc" },
      select: { evento: true, tipoEvento: true, lugar: true, facilitador: true, createdAt: true },
    });
    if (lastRecord && lastRecord.evento) {
      currentConfig.tema = lastRecord.evento;
      if (lastRecord.tipoEvento) currentConfig.tipoEvento = lastRecord.tipoEvento;
      if (lastRecord.lugar) currentConfig.lugar = lastRecord.lugar;
      if (lastRecord.facilitador) currentConfig.facilitador = lastRecord.facilitador;
      currentConfig.updatedAt = lastRecord.createdAt.toISOString();
    }
  } catch {}

  return currentConfig;
}

function savePersistedConfig(config: AsistenciaConfig) {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.warn("Aviso guardando asistencia-config.json:", err);
  }
}

export async function GET() {
  const config = await loadPersistedConfig();
  return NextResponse.json({
    success: true,
    config,
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

    savePersistedConfig(currentConfig);

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
