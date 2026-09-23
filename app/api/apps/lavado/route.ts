import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession, requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import { canAccessPortalVehicle } from "@/lib/portal-access";
import { conductorIdentityFromSession, normalizeVehiclePlate } from "@/lib/portal-validation";

export const dynamic = "force-dynamic";

// ── GET: Consultar registros de lavado con filtros y estadísticas ──
export async function GET(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes"); // YYYY-MM
    const fecha = searchParams.get("fecha"); // YYYY-MM-DD
    const placa = searchParams.get("placa");
    const estadoAprobo = searchParams.get("estadoAprobo");

    const where: any = auth.session.rolPrincipal === "conductor"
      ? { conductorId: auth.session.id }
      : {};

    if (fecha) {
      where.fecha = fecha;
    } else if (mes) {
      where.fecha = { startsWith: mes };
    }

    if (placa) {
      where.placa = placa.toUpperCase().trim();
    }

    if (estadoAprobo !== null && estadoAprobo !== undefined && estadoAprobo !== "") {
      where.estadoAprobo = estadoAprobo === "true";
    }

    const lavados = await prisma.controlLavado.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    });

    const totalCount = lavados.length;
    const totalValor = lavados.reduce((sum, item) => sum + (item.valor || 0), 0);
    const avgValor = totalCount > 0 ? Math.round(totalValor / totalCount) : 0;
    const totalRevisados = lavados.filter((item) => item.estadoReviso).length;
    const totalAprobados = lavados.filter((item) => item.estadoAprobo).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalCount,
        totalValor,
        avgValor,
        totalRevisados,
        totalAprobados,
      },
      lavados,
    });
  } catch (error: any) {
    console.error("Error al obtener registros de lavado:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener lavados" },
      { status: 500 }
    );
  }
}

// ── POST: Guardar nuevo registro de lavado ──
export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const {
      fecha,
      hora,
      placa,
      tipoVehiculo,
      valor,
      empresa,
      conductorNombre,
      conductorDocumento,
      conductorId,
      firmaUrl,
      observaciones,
      operarioUid,
    } = body;

    const identity = conductorIdentityFromSession(auth.session, {
      id: conductorId,
      name: conductorNombre,
      document: conductorDocumento,
    });
    const cleanPlaca = normalizeVehiclePlate(placa);
    if (!(await canAccessPortalVehicle(auth.session, cleanPlaca))) {
      return NextResponse.json({ success: false, error: "No autorizado para operar este vehiculo." }, { status: 403 });
    }

    if (!cleanPlaca || !identity.name) {
      return NextResponse.json(
        { success: false, error: "La placa y el nombre del conductor son obligatorios." },
        { status: 400 }
      );
    }

    const now = new Date();
    const cleanFecha = fecha || now.toISOString().split("T")[0];
    const cleanHora = hora || now.toTimeString().slice(0, 5);
    // Buscar si el conductor existe en el sistema
    let doc = identity.document;
    let cId = identity.id;
    if (!doc && cId) {
      const p = await prisma.persona.findUnique({ where: { id: cId } });
      if (p) doc = p.numeroDocumento;
    }

    const nuevoLavado = await prisma.controlLavado.create({
      data: {
        fecha: cleanFecha,
        hora: cleanHora,
        placa: cleanPlaca,
        tipoVehiculo: tipoVehiculo || "Camioneta",
        valor: Number(valor) || 0,
        empresa: empresa?.trim() || "N/A",
        conductorNombre: identity.name.trim(),
        conductorDocumento: doc || null,
        conductorId: cId || null,
        firmaUrl: firmaUrl || null,
        estadoElaboro: true,
        estadoReviso: false,
        estadoAprobo: false,
        observaciones: observaciones?.trim() || null,
        operarioUid: operarioUid || "operativo",
        timestamp: now,
      },
    });
    await recordAudit({ action: "CREATE", entityType: "ControlLavado", entityId: nuevoLavado.id, after: nuevoLavado, actor: auth.session });

    return NextResponse.json({
      success: true,
      message: "Registro de lavado guardado exitosamente en el ERP.",
      data: nuevoLavado,
    });
  } catch (error: any) {
    console.error("Error al registrar lavado:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar lavado" },
      { status: 500 }
    );
  }
}

// ── PATCH: Actualizar estado de revisión/aprobación ──
export async function PATCH(req: Request) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const { id, estadoReviso, estadoAprobo, valor, empresa, observaciones } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Se requiere el ID del registro." },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (typeof estadoReviso === "boolean") updateData.estadoReviso = estadoReviso;
    if (typeof estadoAprobo === "boolean") updateData.estadoAprobo = estadoAprobo;
    if (valor !== undefined) updateData.valor = Number(valor);
    if (empresa !== undefined) updateData.empresa = empresa;
    if (observaciones !== undefined) updateData.observaciones = observaciones;

    const before = await prisma.controlLavado.findUnique({ where: { id } });
    const updated = await prisma.controlLavado.update({
      where: { id },
      data: updateData,
    });
    await recordAudit({ action: "APPROVE", entityType: "ControlLavado", entityId: id, before, after: updated, actor: auth.session });

    return NextResponse.json({
      success: true,
      message: "Registro actualizado correctamente.",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error al actualizar lavado:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar registro" },
      { status: 500 }
    );
  }
}

// ── DELETE: Eliminar un registro de lavado ──
export async function DELETE(req: Request) {
  const auth = await requireStaff(["administrativo"]);
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Se requiere el ID del registro a eliminar." },
        { status: 400 }
      );
    }

    const before = await prisma.controlLavado.findUnique({ where: { id } });
    await prisma.controlLavado.delete({
      where: { id },
    });
    await recordAudit({ action: "DELETE", entityType: "ControlLavado", entityId: id, before, actor: auth.session });

    return NextResponse.json({
      success: true,
      message: "Registro de lavado eliminado correctamente.",
    });
  } catch (error: any) {
    console.error("Error al eliminar lavado:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar registro" },
      { status: 500 }
    );
  }
}
