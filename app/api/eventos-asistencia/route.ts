import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import {
  crearConsecutivoEvento,
  documentosSugeridos,
  fechaValida,
  textoOpcional,
  textoRequerido,
} from "@/lib/eventos-asistencia";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const where: Record<string, unknown> = {};
  if (estado && estado !== "todos") where.estado = estado;
  if (desde || hasta) {
    where.fechaInicio = {
      ...(desde ? { gte: new Date(`${desde}T00:00:00-05:00`) } : {}),
      ...(hasta ? { lte: new Date(`${hasta}T23:59:59-05:00`) } : {}),
    };
  }

  const eventos = await prisma.eventoAsistencia.findMany({
    where,
    include: {
      documentos: { orderBy: { codigo: "asc" } },
      participantes: {
        select: {
          id: true,
          tipoConvocatoria: true,
          resultadoPreliminar: true,
          resultadoDefinitivo: true,
        },
      },
    },
    orderBy: { fechaInicio: "desc" },
    take: 200,
  });

  return NextResponse.json({
    success: true,
    isAdmin: auth.session.rolPrincipal === "administrativo" || auth.session.rolPrincipal === "hseq",
    eventos: eventos.map((evento) => {
      const obligatorios = evento.participantes.filter((p) => p.tipoConvocatoria === "obligatoria");
      const asistenciaValida = obligatorios.filter((p) =>
        ["presente", "tardanza", "participacion_parcial"].includes(
          p.resultadoDefinitivo || p.resultadoPreliminar
        )
      ).length;
      const pendientes = obligatorios.filter(
        (p) => !p.resultadoDefinitivo && p.resultadoPreliminar === "pendiente"
      ).length;
      return {
        ...evento,
        participantes: undefined,
        resumen: {
          total: evento.participantes.length,
          obligatorios: obligatorios.length,
          asistenciaValida,
          pendientes,
        },
      };
    }),
  });
}

export async function POST(req: Request) {
  const auth = await requireStaff();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const fechaInicio = fechaValida(body.fechaInicio, "La fecha inicial");
    const fechaFin = fechaValida(body.fechaFin, "La fecha final");
    if (fechaFin <= fechaInicio) {
      return NextResponse.json(
        { success: false, error: "La fecha final debe ser posterior a la inicial." },
        { status: 400 }
      );
    }

    const tipo = textoRequerido(body.tipo, "El tipo", 60);
    const caracter = textoRequerido(body.caracter || "informativo", "El carácter", 30);
    const personaIds: string[] = Array.isArray(body.personaIds)
      ? [...new Set((body.personaIds as unknown[]).filter((id): id is string => typeof id === "string"))]
      : [];
    const personas = personaIds.length
      ? await prisma.persona.findMany({ where: { id: { in: personaIds } } })
      : [];
    const novedades = personaIds.length
      ? await prisma.novedadPersonal.findMany({
          where: {
            personaId: { in: personaIds },
            estado: "aprobada",
            fechaInicio: { lte: fechaFin },
            fechaFin: { gte: fechaInicio },
          },
          orderBy: { fechaInicio: "desc" },
        })
      : [];
    const novedadPorPersona = new Map<string, string>();
    for (const novedad of novedades) {
      if (!novedadPorPersona.has(novedad.personaId)) {
        novedadPorPersona.set(novedad.personaId, novedad.tipo);
      }
    }

    const documentos = Array.isArray(body.documentos) && body.documentos.length
      ? body.documentos
      : documentosSugeridos(tipo, caracter);

    const evento = await prisma.eventoAsistencia.create({
      data: {
        consecutivo: crearConsecutivoEvento(),
        nombre: textoRequerido(body.nombre, "El nombre", 180),
        tipo,
        caracter,
        proceso: textoRequerido(body.proceso || "hseq", "El proceso", 40),
        objetivo: textoRequerido(body.objetivo, "El objetivo", 1200),
        descripcion: textoOpcional(body.descripcion, 3000),
        fechaInicio,
        fechaFin,
        modalidad: textoRequerido(body.modalidad || "presencial", "La modalidad", 30),
        lugar: textoRequerido(body.lugar, "El lugar", 220),
        proyecto: textoOpcional(body.proyecto, 120),
        responsableId: textoOpcional(body.responsableId, 80),
        responsableNombre: textoRequerido(body.responsableNombre || auth.session.nombre, "El responsable", 160),
        facilitadorTipo: textoRequerido(body.facilitadorTipo || "interno", "El tipo de facilitador", 30),
        facilitadorNombre: textoRequerido(body.facilitadorNombre || auth.session.nombre, "El facilitador", 160),
        facilitadorEmpresa: textoOpcional(body.facilitadorEmpresa, 180),
        estado: "borrador",
        toleranciaMinutos: Math.max(0, Math.min(180, Number(body.toleranciaMinutos) || 15)),
        permanenciaMinima: Math.max(0, Math.min(100, Number(body.permanenciaMinima) || 80)),
        requiereEntrada: body.requiereEntrada !== false,
        requiereSalida: body.requiereSalida === true,
        requiereFirma: body.requiereFirma !== false,
        requiereFoto: body.requiereFoto === true,
        requiereEvaluacion: body.requiereEvaluacion === true,
        notaMinima: body.requiereEvaluacion ? Math.max(0, Math.min(100, Number(body.notaMinima) || 80)) : null,
        contenido: textoOpcional(body.contenido, 5000),
        materialUrl: textoOpcional(body.materialUrl, 1000),
        creadoPorId: auth.session.id,
        creadoPorNombre: auth.session.nombre,
        participantes: {
          create: personas.map((persona) => ({
            personaId: persona.id,
            personaNombre: `${persona.nombres} ${persona.apellidos}`.trim(),
            personaDocumento: persona.numeroDocumento,
            tipoPersona: "interno",
            cargo: persona.perfiles.join(", "),
            proyecto: persona.contratistaNombre,
            tipoConvocatoria: "obligatoria",
            condicionLaboral: novedadPorPersona.get(persona.id) ||
              (persona.estado === "activo" ? "disponible" : persona.estado),
          })),
        },
        documentos: {
          create: documentos.map((documento: Record<string, unknown>) => ({
            codigo: textoRequerido(documento.codigo, "El código documental", 40),
            nombre: textoRequerido(documento.nombre, "El nombre documental", 180),
            version: textoRequerido(documento.version, "La versión documental", 20),
            tipo: typeof documento.tipo === "string" ? documento.tipo.slice(0, 40) : "formato",
            obligatorio: documento.obligatorio !== false,
          })),
        },
      },
      include: { participantes: true, documentos: true },
    });

    await recordAudit({
      action: "CREATE",
      entityType: "EventoAsistencia",
      entityId: evento.id,
      after: evento,
      actor: auth.session,
    });
    return NextResponse.json({ success: true, evento }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible crear el evento.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
