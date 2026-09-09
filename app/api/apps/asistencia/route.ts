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
  const actividad = (item.evento && item.evento !== "Jornada de Capacitación / Charla" ? item.evento : (obs.actividad || item.evento || "Capacitación")).trim();
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
async function ensureHistoricalSeeded(force = false) {
  try {
    const count = await prisma.asistenciaRegistro.count();
    if (count === 0 || force) {
      const historicalPath = path.join(process.cwd(), "lib", "data", "historical-asistencias.json");
      if (fs.existsSync(historicalPath)) {
        const raw = fs.readFileSync(historicalPath, "utf-8").replace(/^\uFEFF/, "").trim();
        const records = JSON.parse(raw);
        if (Array.isArray(records) && records.length > 0) {
          console.log(`Auto-sembrando ${records.length} asistencias históricas en PostgreSQL...`);
          const dataToInsert = records.map((r: any, i: number) => {
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

            return {
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
            };
          });

          const batchSize = 100;
          let totalInserted = 0;
          for (let i = 0; i < dataToInsert.length; i += batchSize) {
            const batch = dataToInsert.slice(i, i + batchSize);
            const res = await prisma.asistenciaRegistro.createMany({
              data: batch,
              skipDuplicates: true,
            });
            totalInserted += res.count;
          }
          console.log(`✓ Auto-sembrados ${totalInserted} registros en PostgreSQL.`);
          return totalInserted;
        }
      }
    }
  } catch (e) {
    console.warn("Aviso al verificar siembra histórica:", e);
  }
  return 0;
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
    const seed = searchParams.get("seed");

    if (seed === "true") {
      const inserted = await ensureHistoricalSeeded(true);
      const total = await prisma.asistenciaRegistro.count();
      return NextResponse.json({ success: true, seeded: inserted, totalInDb: total });
    }

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

    if (fecha && fecha !== "TODAS" && fecha.toLowerCase() !== "all") {
      filtered = filtered.filter((r) => r.fecha === fecha);
    }

    const eventoParam = searchParams.get("evento") || searchParams.get("actividad");
    if (eventoParam && eventoParam !== "TODAS" && eventoParam !== "TODOS") {
      filtered = filtered.filter((r) => r.evento && r.evento.trim().toUpperCase() === eventoParam.trim().toUpperCase());
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
      fecha,
      horaLlegada,
      hora_llegada,
    } = body;

    const doc = (conductorDocumento || personaDocumento || "").replace(/[\.\s-]/g, "").trim();
    const nombre = (conductorNombre || personaNombre || "PARTICIPANTE").trim().toUpperCase();
    const firm = signature || firmaUrl || firma_url || firma_base64 || null;
    const fot = fotoUrl || foto_url || body.foto_base64 || body.fotoBase64 || body.foto || null;
    const ev = evento || tipoEvento || tipo_evento || "Jornada de Capacitación / Charla";
    const tipEv = tipoEvento || tipo_evento || (ev.toLowerCase().includes("charla") ? "charla_5min" : "capacitacion");

    const fechaNow = new Date();
    let fechaStr = fecha ? String(fecha).slice(0, 10) : fechaNow.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
    let horaNow = horaLlegada || hora_llegada || fechaNow.toLocaleTimeString("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const observacionesJson = typeof observaciones === "string" && observaciones.startsWith("{")
      ? observaciones
      : JSON.stringify({
          cedula: doc,
          nombre,
          cargo: (cargo || "CONDUCTOR").toUpperCase(),
          proyecto: (proyecto || "TRANS SERVICES A&B").toUpperCase(),
          actividad: ev,
          firma: firm,
          manual: !firm,
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
        fotoUrl: fot,
        evento: ev,
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de registro requerido" }, { status: 400 });
    }

    await prisma.asistenciaRegistro.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Registro de asistencia eliminado exitosamente",
    });
  } catch (error: any) {
    console.error("Error al eliminar asistencia:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar asistencia" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { action, id, oldEvent, newEvent, fecha, data } = body;

    // Caso A: Renombrar tema/evento en lote
    if (action === "rename_event") {
      if (!newEvent || !newEvent.trim()) {
        return NextResponse.json({ success: false, error: "El nuevo nombre del tema es obligatorio" }, { status: 400 });
      }

      const targetNewEvent = newEvent.trim().toUpperCase();
      let idsToUpdate: string[] = [];

      // 1. Si el frontend envió IDs directos
      if (Array.isArray(body.ids) && body.ids.length > 0) {
        idsToUpdate = body.ids.filter(Boolean);
      } else {
        // 2. Buscar por fecha y/o oldEvent
        const dateFilter: any = {};
        if (fecha && fecha !== "TODAS" && fecha.toLowerCase() !== "all") {
          const [y, m, d] = fecha.split("-").map(Number);
          dateFilter.fecha = {
            gte: new Date(Date.UTC(y, m - 1, d, 0, 0, 0)),
            lte: new Date(Date.UTC(y, m - 1, d, 23, 59, 59)),
          };
        }

        const candidates = await prisma.asistenciaRegistro.findMany({
          where: dateFilter,
        });

        const cleanOld = (oldEvent || "").trim().toUpperCase();
        for (const c of candidates) {
          const norm = normalizeRecord(c, 0);
          if (!cleanOld || norm.evento.toUpperCase() === cleanOld || (c.evento && c.evento.toUpperCase() === cleanOld)) {
            idsToUpdate.push(c.id);
          }
        }
      }

      if (idsToUpdate.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No se encontraron registros para actualizar con ese tema.",
          count: 0,
        });
      }

      // Actualizar columna evento
      await prisma.asistenciaRegistro.updateMany({
        where: { id: { in: idsToUpdate } },
        data: {
          evento: targetNewEvent,
        },
      });

      // Sincronizar también campo observaciones (JSON)
      const recordsToSync = await prisma.asistenciaRegistro.findMany({
        where: { id: { in: idsToUpdate } },
        select: { id: true, observaciones: true },
      });

      for (const rec of recordsToSync) {
        if (rec.observaciones && rec.observaciones.startsWith("{")) {
          try {
            const parsed = JSON.parse(rec.observaciones);
            parsed.actividad = targetNewEvent;
            await prisma.asistenciaRegistro.update({
              where: { id: rec.id },
              data: { observaciones: JSON.stringify(parsed) },
            });
          } catch {}
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se actualizaron ${idsToUpdate.length} registros al tema '${targetNewEvent}'`,
        count: idsToUpdate.length,
      });
    }

    // Caso B: Actualizar registro individual
    if (action === "update_record" || id) {
      const targetId = id || body.id;
      if (!targetId) {
        return NextResponse.json({ success: false, error: "ID de registro requerido" }, { status: 400 });
      }

      const updateData: any = {};
      if (data?.personaNombre) updateData.personaNombre = String(data.personaNombre).trim().toUpperCase();
      if (data?.personaDocumento) updateData.personaDocumento = String(data.personaDocumento).trim();
      if (data?.cargo) updateData.cargo = String(data.cargo).trim().toUpperCase();
      if (data?.proyecto) updateData.proyecto = String(data.proyecto).trim().toUpperCase();
      if (data?.evento) updateData.evento = String(data.evento).trim();
      if (data?.horaLlegada) updateData.horaLlegada = String(data.horaLlegada).trim();
      if (data?.estado) updateData.estado = String(data.estado).trim();

      const updated = await prisma.asistenciaRegistro.update({
        where: { id: targetId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        message: "Registro actualizado exitosamente",
        asistencia: updated,
      });
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) {
    console.error("Error al actualizar asistencia:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar asistencia" },
      { status: 500 }
    );
  }
}
