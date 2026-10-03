import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { extractGoogleDriveFileId, getDriveFile } from "@/lib/storage/google-drive";

export const dynamic = "force-dynamic";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function GET(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const limit = consumeRateLimit(`material-preview:${clientIp(req)}:${token.slice(0, 16)}`, 30, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ success: false, error: "Demasiadas solicitudes." }, { status: 429 });
  const evento = await prisma.eventoAsistencia.findUnique({
    where: { tokenRegistro: token },
    select: { materialUrl: true },
  });
  const fileId = extractGoogleDriveFileId(evento?.materialUrl);
  if (!fileId) return NextResponse.json({ success: false, error: "El material no tiene vista previa disponible." }, { status: 404 });
  try {
    const { metadata, response } = await getDriveFile(fileId);
    if (!metadata.mimeType.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "El material enlazado no es una imagen." }, { status: 415 });
    }
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": metadata.mimeType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "No fue posible preparar la vista del material." }, { status: 404 });
  }
}
