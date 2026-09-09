import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

interface NormalizedAsistencia {
  id: string;
  personaId?: string;
  personaDocumento: string;
  personaNombre: string;
  cargo: string;
  proyecto: string;
  evento: string;
  tipoEvento: string;
  fecha: string; // formato estándar YYYY-MM-DD (America/Bogota)
  horaLlegada: string;
  estado: string;
  firmaUrl: string | null;
  fotoUrl: string | null;
  observaciones?: string | null;
}

// Normaliza cualquier registro proveniente de Prisma de forma consistente
function normalizeRecord(item: any, idx: number): NormalizedAsistencia {
  let obs: any = {};
  if (item.observaciones && typeof item.observaciones === "string") {
    if (item.observaciones.startsWith("{")) {
      try {
        obs = JSON.parse(item.observaciones);
      } catch (e) {}
    } else {
      const cargoMatch = item.observaciones.match(/Cargo:\s*([^,]+)/i);
      const projMatch = item.observaciones.match(/Proyecto:\s*([^,]+)/i);
      const cedMatch = item.observaciones.match(/C[eé]dula:\s*([^,]+)/i);
      if (cargoMatch) obs.cargo = cargoMatch[1].trim();
      if (projMatch) obs.proyecto = projMatch[1].trim();
      if (cedMatch) obs.cedula = cedMatch[1].trim();
    }
  }

  const cedula = (
    obs.cedula ||
    item.personaDocumento ||
    item.conductor_documento ||
    item.conductorDocumento ||
    ""
  )
    .replace(/[\.\s-]/g, "")
    .trim();

  const nombre = (
    item.personaNombre ||
    item.conductor_nombre ||
    item.conductorNombre ||
    obs.nombre ||
    "PARTICIPANTE"
  )
    .trim()
    .toUpperCase();

  const cargo = (obs.cargo || item.cargo || "CONDUCTOR").toUpperCase();
  const proyecto = (obs.proyecto || item.proyecto || "TRANS SERVICES A&B").toUpperCase();
  const firma = obs.firma || item.firmaUrl || item.firma_url || item.firma_base64 || item.signature || null;
  const actividad = obs.actividad || item.evento || item.tipoEvento || item.tipo_evento || "Capacitación";
  const tipoEvento = item.tipoEvento || item.tipo_evento || (actividad.toLowerCase().includes("charla") ? "charla_5min" : "capacitacion");

  // Extracción fiel de la fecha YYYY-MM-DD en zona horaria oficial Colombia (America/Bogota)
  let dateStr = "";
  if (item.fecha) {
    if (item.fecha instanceof Date) {
      dateStr = item.fecha.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    } else if (typeof item.fecha === "string") {
      dateStr = item.fecha.slice(0, 10);
    }
  } else if (item.createdAt || item.created_at) {
    dateStr = new Date(item.createdAt || item.created_at).toLocaleDateString("en-CA", {
      timeZone: "America/Bogota",
    });
  }

  if (!dateStr || dateStr.length < 10) {
    dateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  }

  const horaStr =
    item.horaLlegada ||
    item.hora_llegada ||
    (item.createdAt || item.created_at
      ? new Date(item.createdAt || item.created_at).toLocaleTimeString("es-CO", {
          timeZone: "America/Bogota",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "08:00");

  return {
    id: item.id ? String(item.id) : `rec_${idx}`,
    personaId: item.personaId || item.conductor_id || undefined,
    personaDocumento: cedula || "—",
    personaNombre: nombre,
    cargo,
    proyecto,
    evento: actividad,
    tipoEvento,
    fecha: dateStr,
    horaLlegada: horaStr,
    estado: item.estado || "presente",
    firmaUrl: firma,
    fotoUrl: item.fotoUrl || item.foto_url || null,
    observaciones: item.observaciones || null,
  };
}

export const dynamic = "force-dynamic";

// Auto-siembra segura desde el archivo histórico local en caso de que la tabla esté vacía
async function ensureHistoricalSeeded() {
  try {
    const count = await prisma.asistenciaRegistro.count();
    if (count === 0) {
      const historicalPath = path.join(process.cwd(), "lib/data/historical-asistencias.json");
      if (fs.existsSync(historicalPath)) {
        const raw = fs.readFileSync(historicalPath, "utf-8");
        const records = JSON.parse(raw);
        if (Array.isArray(records) && records.length > 0) {
          console.log(`Auto-sembrando ${records.length} asistencias históricas en PostgreSQL...`);
          for (let i = 0; i < records.length; i++) {
            const r = records[i];
            const regId = r.id ? (String(r.id).startsWith("sup_") ? String(r.id) : `sup_${r.id}`) : `hist_${i}`;
            let obs: any = {};
            if (r.observaciones && typeof r.observaciones === "string") {
              if (r.observaciones.startsWith("{")) {
                try { obs = JSON.parse(r.observaciones); } catch (e) {}
              }
            }

            const cedula = (obs.cedula || r.personaDocumento || r.conductor_documento || r.conductorDocumento || "").replace(/[\.\s-]/g, "").trim();
            const nombre = (r.personaNombre || r.conductor_nombre || r.conductorNombre || obs.nombre || "PARTICIPANTE").trim().toUpperCase();
            const cargo = (obs.cargo || r.cargo || "CONDUCTOR").toUpperCase();
            const proyecto = (obs.proyecto || r.proyecto || "TRANS SERVICES A&B").toUpperCase();
            const firma = obs.firma || r.firmaUrl || r.firma_url || r.firma_base64 || r.signature || null;
            const fot = r.fotoUrl || r.foto_url || null;
            const ev = obs.actividad || r.evento || r.tipoEvento || r.tipo_evento || "Jornada de Capacitación";
            const tipEv = r.tipoEvento || r.tipo_evento || (ev.toLowerCase().includes("charla") ? "charla_5min" : "capacitacion");

            let dateStr = r.fecha ? String(r.fecha).slice(0, 10) : (r.created_at ? new Date(r.created_at).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) : "2026-08-21");
            const [y, m, d] = dateStr.split("-").map(Number);
            const fechaDate = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
            const horaStr = r.hora_llegada || r.horaLlegada || "08:00";

            await prisma.asistenciaRegistro.upsert({
              where: { id: regId },
              update: {},
              create: {
                id: regId,
                personaId: r.personaId || r.conductor_id || (cedula ? `p_${cedula}` : `p_${regId}`),
                personaNombre: nombre,
                personaDocumento: cedula || null,
                cargo,
                proyecto,
                facilitador: r.facilitador || "COORDINADOR HSEQ",
                lugar: r.lugar || "VILLAGARZÓN",
                duracionHoras: r.duracionHoras ? parseFloat(r.duracionHoras) : 0.25,
                fecha: fechaDate,
                horaLlegada: horaStr,
                evento: ev,
                tipoEvento: tipEv,
                estado: r.estado || "presente",
                firmaUrl: firma,
                fotoUrl: fot,
                observaciones: r.observaciones || null,
                asistio: r.estado !== "ausente",
              },
            }).catch(() => {});
          }
        }
      }
    }
  } catch (e) {
    console.warn("Aviso al verificar siembra histórica:", e);
  }
}

// Obtiene todos los registros leyendo EXCLUSIVAMENTE de PostgreSQL (Railway) vía Prisma
async function getAllNormalizedRecords(): Promise<NormalizedAsistencia[]> {
  try {
    await ensureHistoricalSeeded();

    const prismaRecords = await prisma.asistenciaRegistro.findMany({
      orderBy: [
        { fecha: "desc" },
        { horaLlegada: "desc" },
      ],
    });

    return prismaRecords.map((item, idx) => normalizeRecord(item, idx));
  } catch (e) {
    console.error("Error al consultar asistencias en Prisma:", e);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get("fecha");
    const proyecto = searchParams.get("proyecto");
    const tipoEvento = searchParams.get("tipoEvento");
    const cedula = searchParams.get("cedula");
    const datesSummary = searchParams.get("datesSummary");

    // 1. Consulta de conductor por cédula para autocompletado en app móvil
    if (cedula) {
      const cleanCedula = cedula.replace(/[\.\s-]/g, "").trim();
      try {
        const persona = await prisma.persona.findFirst({
          where: {
            numeroDocumento: {
              contains: cleanCedula,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
            perfiles: true,
            telefono: true,
            contratistaNombre: true,
          },
        });

        if (persona) {
          const cargo =
            persona.perfiles && persona.perfiles.length > 0
              ? persona.perfiles[0].toUpperCase()
              : "CONDUCTOR";

          return NextResponse.json({
            success: true,
            persona: {
              id: persona.id,
              nombres: persona.nombres,
              apellidos: persona.apellidos,
              nombreCompleto: `${persona.nombres} ${persona.apellidos}`.trim(),
              numeroDocumento: persona.numeroDocumento,
              cargo,
              proyecto: persona.contratistaNombre || "TRANS SERVICES A&B",
              telefono: persona.telefono,
            },
          });
        }
      } catch (e) {}

      return NextResponse.json({ success: true, persona: null });
    }

    const allRecords = await getAllNormalizedRecords();

    // 2. Resumen de fechas activas para marcar los días en el calendario
    if (datesSummary === "true") {
      const summary: Record<string, { total: number; proyectos: string[] }> = {};
      for (const reg of allRecords) {
        if (reg.fecha) {
          const dateKey = reg.fecha; // YYYY-MM-DD directo
          if (!summary[dateKey]) {
            summary[dateKey] = { total: 0, proyectos: [] };
          }
          summary[dateKey].total += 1;
          const p = (reg.proyecto || "OTRO").toUpperCase();
          if (!summary[dateKey].proyectos.includes(p)) {
            summary[dateKey].proyectos.push(p);
          }
        }
      }

      return NextResponse.json({ success: true, datesSummary: summary });
    }

    // 3. Filtrado de registros
    let filtered = allRecords;

    if (fecha && fecha !== "TODAS") {
      filtered = filtered.filter((r) => r.fecha === fecha);
    }

    if (proyecto && proyecto !== "TODOS") {
      const projUpper = proyecto.toUpperCase();
      if (projUpper === "GT") {
        filtered = filtered.filter(
          (r) =>
            r.proyecto.toUpperCase().includes("GT") ||
            r.proyecto.toUpperCase().includes("TIERRA")
        );
      } else {
        filtered = filtered.filter((r) =>
          r.proyecto.toUpperCase().includes(projUpper)
        );
      }
    }

    if (tipoEvento && tipoEvento !== "TODOS") {
      filtered = filtered.filter(
        (r) =>
          r.tipoEvento.toLowerCase().includes(tipoEvento.toLowerCase()) ||
          r.evento.toLowerCase().includes(tipoEvento.toLowerCase())
      );
    }

    return NextResponse.json({ success: true, asistencias: filtered });
  } catch (error: any) {
    console.error("Error al obtener asistencias:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener asistencias" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      conductorId,
      conductorNombre,
      conductorDocumento,
      personaNombre,
      personaDocumento,
      cargo,
      proyecto,
      facilitador,
      lugar,
      duracionHoras,
      evento,
      tipoEvento,
      tipo_evento,
      estado,
      observaciones,
      signature,
      firmaUrl,
      firma_url,
      firma_base64,
      fotoUrl,
      foto_url,
    } = body;

    const doc = (conductorDocumento || personaDocumento || "").replace(/[\.\s-]/g, "").trim();
    const nombre = (conductorNombre || personaNombre || "PARTICIPANTE").trim().toUpperCase();
    const firm = signature || firmaUrl || firma_url || firma_base64 || null;
    const fot = fotoUrl || foto_url || null;
    const ev = evento || tipoEvento || tipo_evento || "Jornada de Capacitación / Charla";
    const tipEv = tipoEvento || tipo_evento || "capacitacion";

    const fechaNow = new Date();
    const fechaStr = fechaNow.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    const horaNow = fechaNow.toLocaleTimeString("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const observacionesJson = JSON.stringify({
      cedula: doc,
      nombre,
      cargo: (cargo || "CONDUCTOR").toUpperCase(),
      proyecto: (proyecto || "TRANS SERVICES A&B").toUpperCase(),
      actividad: ev,
      firma: firm,
    });

    // Guardar exclusivamente en Prisma (PostgreSQL en Railway)
    let pId = conductorId;
    if (doc && !pId) {
      try {
        const persona = await prisma.persona.findFirst({
          where: { numeroDocumento: doc },
        });
        if (persona) pId = persona.id;
      } catch (e) {}
    }

    const [y, m, d] = fechaStr.split("-").map(Number);
    const fechaCot = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));

    const nuevaAsistencia = await prisma.asistenciaRegistro.create({
      data: {
        personaId: pId || `p_${doc || Date.now()}`,
        personaDocumento: doc || null,
        personaNombre: nombre,
        cargo: (cargo || "CONDUCTOR").toUpperCase(),
        proyecto: (proyecto || "TRANS SERVICES A&B").toUpperCase(),
        facilitador: facilitador ? facilitador.toUpperCase() : "COORDINADOR HSEQ",
        lugar: lugar ? lugar.toUpperCase() : "VILLAGARZÓN",
        duracionHoras: duracionHoras ? parseFloat(duracionHoras) : 0.25,
        fecha: fechaCot,
        horaLlegada: horaNow,
        evento: ev,
        tipoEvento: tipEv,
        estado: estado || "presente",
        firmaUrl: firm,
        fotoUrl: fot,
        observaciones: observacionesJson,
        asistio: estado !== "ausente",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Registro de asistencia guardado exitosamente en PostgreSQL",
      asistencia: {
        id: nuevaAsistencia.id,
        personaNombre: nombre,
        personaDocumento: doc,
        fecha: fechaStr,
        horaLlegada: horaNow,
        firmaUrl: firm,
      },
    });
  } catch (error: any) {
    console.error("Error al registrar asistencia en Prisma:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar asistencia" },
      { status: 500 }
    );
  }
}
