import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { normalizeDocument, requiresFormValidation } from "@/lib/event-strategy";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const limit = consumeRateLimit(`form-validation:${clientIp(req)}:${token.slice(0, 16)}`, 30, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ success: false, error: "Espera unos minutos antes de volver a verificar." }, { status: 429 });
  }

  const evento = await prisma.eventoAsistencia.findUnique({ where: { tokenRegistro: token } });
  if (!evento) return NextResponse.json({ success: false, error: "El enlace no es válido." }, { status: 404 });
  if (!requiresFormValidation(evento.validacionTipo)) {
    return NextResponse.json({ success: true, requerida: false, estado: "no_aplica" });
  }

  const session = await getServerSession();
  const body = await req.json().catch(() => ({}));
  let documento = normalizeDocument(body.personaDocumento);
  if (session && body.tipoParticipante !== "externo") {
    const persona = await prisma.persona.findUnique({ where: { id: session.id }, select: { numeroDocumento: true } });
    documento = normalizeDocument(persona?.numeroDocumento);
  }
  if (documento.length < 4) {
    return NextResponse.json({ success: false, error: "Indica el documento usado en Google Forms." }, { status: 400 });
  }

  const validaciones = await prisma.eventoValidacionFormulario.findMany({
    where: { eventoId: evento.id, personaDocumento: documento },
    orderBy: { submittedAt: "desc" },
    take: 20,
  });
  const validacion = evento.validacionTipo === "formulario_aprobado"
    ? validaciones.find((item) => item.estado === "aprobado") || validaciones[0]
    : validaciones[0];
  const respondida = Boolean(validacion);

  return NextResponse.json({
    success: true,
    requerida: true,
    completada: respondida,
    aprobada: validacion?.estado === "aprobado",
    estado: validacion?.estado || "pendiente",
    calificacion: validacion?.calificacion ?? null,
    submittedAt: validacion?.submittedAt ?? null,
  });
}
