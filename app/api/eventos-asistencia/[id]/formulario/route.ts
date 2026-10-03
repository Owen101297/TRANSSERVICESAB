import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { esAdministradorAsistencia } from "@/lib/eventos-asistencia";
import {
  connectEventGoogleForm,
  refreshEventGoogleFormStatus,
  synchronizeEventGoogleForm,
} from "@/lib/google-forms-connector";
import { prisma } from "@/lib/prisma";
import { resolvePublicOrigin } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  if (!esAdministradorAsistencia(auth.session)) {
    return NextResponse.json(
      { success: false, error: "Solo el administrador puede gestionar la conexión de Google Forms." },
      { status: 403 },
    );
  }
  const { id } = await context.params;
  const before = await prisma.eventoAsistencia.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ success: false, error: "Actividad no encontrada." }, { status: 404 });
  if (before.materialOrigen !== "empresa" || before.validacionTipo === "solo_asistencia") {
    return NextResponse.json(
      { success: false, error: "Esta actividad no requiere sincronización con Google Forms." },
      { status: 409 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "status";
    const result = action === "connect"
      ? await connectEventGoogleForm({
          eventId: id,
          formUrl: typeof body.formUrl === "string" ? body.formUrl : before.googleFormAdminUrl || "",
          webhookOrigin: resolvePublicOrigin(req),
        })
      : action === "sync"
        ? await synchronizeEventGoogleForm(id)
        : action === "status"
          ? await refreshEventGoogleFormStatus(id)
          : null;
    if (!result) {
      return NextResponse.json({ success: false, error: "La operación solicitada no es válida." }, { status: 400 });
    }
    await recordAudit({
      action: "UPDATE",
      entityType: "EventoAsistencia",
      entityId: id,
      before,
      after: result.event,
      metadata: { operation: `GOOGLE_FORM_${action.toUpperCase()}`, connector: result.connector },
      actor: auth.session,
    });
    return NextResponse.json({ success: true, evento: result.event, connector: result.connector });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "No fue posible gestionar el formulario." },
      { status: 400 },
    );
  }
}
