import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/api-auth";
import { recordAudit } from "@/lib/audit";
import {
  crearTokenRegistro,
  crearConsecutivoEvento,
  DECLARACION_ASISTENCIA_DEFAULT,
  documentosSugeridos,
  esAdministradorAsistencia,
  fechaValida,
  textoOpcional,
  textoRequerido,
} from "@/lib/eventos-asistencia";
import { categoriaCapacitacionDesdeEvento } from "@/lib/capacitacion-evento";
import {
  parseEvidenceType,
  parseMaterialOrigin,
  parseValidationType,
  requiresFormValidation,
  requiresIndividualEvidence,
  validHttpsUrl,
} from "@/lib/event-strategy";

export const dynamic = "force-dynamic";

const MODALIDADES = new Set(["presencial", "virtual", "mixta", "remota"]);

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
    const modalidad = textoRequerido(body.modalidad || "presencial", "La modalidad", 30);
    if (!MODALIDADES.has(modalidad)) throw new Error("La modalidad seleccionada no es válida.");
    const nombre = textoRequerido(body.nombre, "El nombre", 180);
    const materialOrigen = parseMaterialOrigin(body.materialOrigen, body.materialUrl ? "empresa" : "no_aplica");
    const validacionTipo = parseValidationType(body.validacionTipo, "solo_asistencia");
    const evidenciaTipo = parseEvidenceType(
      body.evidenciaTipo,
      modalidad === "remota" ? "individual" : modalidad === "mixta" ? "ambas" : "general",
    );
    if (materialOrigen !== "empresa" && requiresFormValidation(validacionTipo)) {
      throw new Error("La validación con Google Forms solo aplica cuando el material es gestionado por la empresa.");
    }
    const materialUrl = validHttpsUrl(
      body.materialUrl,
      materialOrigen === "empresa" ? "El enlace de Google Forms" : "El enlace del material",
      materialOrigen === "empresa" && requiresFormValidation(validacionTipo),
    );
    const enlaceReunion = validHttpsUrl(body.enlaceReunion, "El enlace de la reunión");
    const esFormativo = caracter === "formativo" || new Set([
      "charla_formativa",
      "capacitacion",
      "induccion",
      "reinduccion",
      "entrenamiento_practico",
    ]).has(tipo);
    const aprobarAlCrear = body.aprobarAlCrear === true && esAdministradorAsistencia(auth.session);
    const objetivoSugerido = esFormativo
      ? `Fortalecer conocimientos sobre «${nombre}» y dejar evidencia verificable de la participación.`
      : `Socializar «${nombre}» y dejar evidencia verificable de la participación.`;
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

    const evento = await prisma.$transaction(async (tx) => {
      const created = await tx.eventoAsistencia.create({
        data: {
        consecutivo: crearConsecutivoEvento(),
        tokenRegistro: crearTokenRegistro(),
        nombre,
        tipo,
        caracter,
        proceso: textoRequerido(body.proceso || "hseq", "El proceso", 40),
        objetivo: textoRequerido(body.objetivo || objetivoSugerido, "El objetivo", 1200),
        descripcion: textoOpcional(body.descripcion, 3000),
        fechaInicio,
        fechaFin,
        modalidad,
        lugar: textoRequerido(body.lugar, "El lugar", 220),
        proyecto: textoOpcional(body.proyecto, 120),
        responsableId: textoOpcional(body.responsableId, 80),
        responsableNombre: textoRequerido(body.responsableNombre || auth.session.nombre, "El responsable", 160),
        facilitadorTipo: textoRequerido(body.facilitadorTipo || "interno", "El tipo de facilitador", 30),
        facilitadorNombre: textoRequerido(body.facilitadorNombre || auth.session.nombre, "El facilitador", 160),
        facilitadorEmpresa: textoOpcional(body.facilitadorEmpresa, 180),
        estado: aprobarAlCrear ? "programado" : "borrador",
        aprobadoPorId: aprobarAlCrear ? auth.session.id : null,
        aprobadoPorNombre: aprobarAlCrear ? auth.session.nombre : null,
        aprobadoAt: aprobarAlCrear ? new Date() : null,
        toleranciaMinutos: Math.max(0, Math.min(180, Number(body.toleranciaMinutos) || 15)),
        permanenciaMinima: Math.max(0, Math.min(100, Number(body.permanenciaMinima) || 80)),
        requiereEntrada: body.requiereEntrada !== false,
        requiereSalida: body.requiereSalida === true,
        requiereFirma: true,
        requiereFoto: requiresIndividualEvidence(evidenciaTipo),
        requiereEvaluacion: validacionTipo === "formulario_aprobado",
        notaMinima: validacionTipo === "formulario_aprobado" ? Math.max(0, Math.min(100, Number(body.notaMinima) || 80)) : null,
        contenido: textoOpcional(body.contenido, 5000),
        materialUrl,
        materialOrigen,
        validacionTipo,
        enlaceReunion,
        evidenciaTipo,
        permiteExternos: body.permiteExternos !== false,
        instruccionesRegistro: textoOpcional(body.instruccionesRegistro, 1000),
        declaracionAsistencia:
          textoOpcional(body.declaracionAsistencia, 1200) || DECLARACION_ASISTENCIA_DEFAULT,
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
            origenRegistro: "convocatoria",
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

      if (esFormativo) {
        const duracionHoras = Math.max(
          0.25,
          (fechaFin.getTime() - fechaInicio.getTime()) / (60 * 60 * 1000)
        );
        await tx.capacitacion.create({
          data: {
            nombre: created.nombre,
            tipo: created.proceso === "sg-sst" ? "sg-sst" : created.proceso,
            programa: created.proceso === "pesv"
              ? "Plan de Capacitacion PESV (Paso 9/18)"
              : created.proceso === "sg-sst"
                ? "Plan Anual SG-SST (Dec 1072 / Res 0312)"
                : "Formacion Operativa y de Servicio",
            categoria: categoriaCapacitacionDesdeEvento(tipo),
            fecha: fechaInicio,
            duracionHoras,
            facilitador: created.facilitadorNombre,
            objetivo: created.objetivo,
            lugar: created.lugar,
            materialTipo: created.materialUrl ? "google_form" : "texto",
            materialUrl: created.materialUrl,
            materialContenido: created.contenido,
            requiereSelfie: created.requiereFoto,
            requiereFirma: created.requiereFirma,
            asistentesEsperados: personas.length,
            estado: aprobarAlCrear ? "programada" : "borrador",
            eventoId: created.id,
          },
        });
      }
      return created;
    });

    await recordAudit({
      action: "CREATE",
      entityType: "EventoAsistencia",
      entityId: evento.id,
      after: evento,
      metadata: { operation: aprobarAlCrear ? "QUICK_CREATE_APPROVED" : "CREATE_DRAFT" },
      actor: auth.session,
    });
    return NextResponse.json({ success: true, evento }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible crear el evento.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
