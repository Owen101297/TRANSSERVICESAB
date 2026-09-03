import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function syncSupabaseIfNeeded() {
  try {
    const count = await prisma.asistenciaRegistro.count();
    if (count > 20) return; // Ya está poblada

    const url = "https://xftllyjjqvozjjmgwomg.supabase.co/rest/v1/asistencia?select=*&order=fecha.asc";
    const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdGxseWpqcXZvempqbWd3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjExMTIsImV4cCI6MjA5Mzc5NzExMn0.UURzZOytfoYMrxzpohRams_GcJ3ETsEnNNOaSQqeuu8";

    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let obs: any = {};
      try {
        if (item.observaciones && typeof item.observaciones === "string") {
          if (item.observaciones.startsWith("{")) {
            obs = JSON.parse(item.observaciones);
          } else {
            const cargoMatch = item.observaciones.match(/Cargo:\s*([^,]+)/i);
            const projMatch = item.observaciones.match(/Proyecto:\s*([^,]+)/i);
            if (cargoMatch) obs.cargo = cargoMatch[1].trim();
            if (projMatch) obs.proyecto = projMatch[1].trim();
          }
        }
      } catch (e) {}

      const cedula = (obs.cedula || item.conductor_documento || "").replace(/[\.\s-]/g, "").trim();
      const nombre = (item.conductor_nombre || "PARTICIPANTE").trim().toUpperCase();
      const cargo = (obs.cargo || item.cargo || "CONDUCTOR").toUpperCase();
      const proyecto = (obs.proyecto || item.proyecto || "TRANS SERVICES A&B").toUpperCase();
      const firma = obs.firma || item.firma_url || item.firma_base64 || null;
      const actividad = obs.actividad || item.tipo_evento || item.evento || "Capacitación";
      const fechaStr = item.fecha || (item.created_at ? item.created_at.split("T")[0] : "2026-08-21");
      const horaStr = item.hora_llegada || (item.created_at ? item.created_at.slice(11, 16) : "08:00");

      const [y, m, d] = fechaStr.split("-").map(Number);
      const fechaCot = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

      const regId = `sup_${item.id || i}`;

      await prisma.asistenciaRegistro.upsert({
        where: { id: regId },
        update: {
          personaNombre: nombre,
          personaDocumento: cedula || null,
          cargo,
          proyecto,
          evento: actividad,
          tipoEvento: actividad.toLowerCase().includes("charla") ? "charla_5min" : "capacitacion",
          horaLlegada: horaStr,
          fecha: fechaCot,
          estado: item.estado || "presente",
          firmaUrl: firma,
          asistio: item.estado !== "ausente",
        },
        create: {
          id: regId,
          personaId: item.conductor_id || `p_${cedula || i}`,
          personaNombre: nombre,
          personaDocumento: cedula || null,
          cargo,
          proyecto,
          evento: actividad,
          tipoEvento: actividad.toLowerCase().includes("charla") ? "charla_5min" : "capacitacion",
          horaLlegada: horaStr,
          fecha: fechaCot,
          estado: item.estado || "presente",
          firmaUrl: firma,
          asistio: item.estado !== "ausente",
        },
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("Aviso sync Supabase:", e);
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
    const forceSync = searchParams.get("sync");

    if (forceSync === "true") {
      await syncSupabaseIfNeeded();
    } else {
      // Auto-sincronizar de fondo si la base de datos está vacía
      syncSupabaseIfNeeded().catch(() => {});
    }

    // 1. Resumen de fechas activas para marcar los días en el calendario
    if (datesSummary === "true") {
      const allRegs = await prisma.asistenciaRegistro.findMany({
        select: {
          fecha: true,
          proyecto: true,
        },
        orderBy: { fecha: "desc" },
      });

      const summary: Record<string, { total: number; proyectos: string[] }> = {};
      for (const reg of allRegs) {
        if (reg.fecha) {
          const cotDateStr = new Date(reg.fecha).toLocaleDateString("en-CA", {
            timeZone: "America/Bogota",
          });
          if (!summary[cotDateStr]) {
            summary[cotDateStr] = { total: 0, proyectos: [] };
          }
          summary[cotDateStr].total += 1;
          const p = (reg.proyecto || "OTRO").toUpperCase();
          if (!summary[cotDateStr].proyectos.includes(p)) {
            summary[cotDateStr].proyectos.push(p);
          }
        }
      }

      return NextResponse.json({ success: true, datesSummary: summary });
    }

    // 2. Consulta de conductor por cédula para autocompletado en app móvil
    if (cedula) {
      const cleanCedula = cedula.replace(/[\.\s-]/g, "").trim();
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

      if (!persona) {
        return NextResponse.json({ success: true, persona: null });
      }

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

    // 3. Consulta de registros con filtros precisos
    const where: any = {};

    // Filtro por Fecha con ajuste de zona horaria Colombia (UTC-5)
    if (fecha) {
      const [y, m, d] = fecha.split("-").map(Number);
      // 00:00:00 COT = 05:00:00 UTC
      const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      // 23:59:59.999 COT = 23:59:59.999 UTC día siguiente
      const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      where.fecha = { gte: start, lte: end };
    }

    // Filtro flexible por Proyecto
    if (proyecto && proyecto !== "TODOS") {
      if (proyecto.toUpperCase() === "GT") {
        where.OR = [
          { proyecto: { contains: "GT", mode: "insensitive" } },
          { proyecto: { contains: "TIERRA", mode: "insensitive" } },
        ];
      } else {
        where.proyecto = { contains: proyecto, mode: "insensitive" };
      }
    }

    // Filtro por Tipo de Evento
    if (tipoEvento && tipoEvento !== "TODOS") {
      where.tipoEvento = { contains: tipoEvento, mode: "insensitive" };
    }

    const asistencias = await prisma.asistenciaRegistro.findMany({
      where,
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json({ success: true, asistencias });
  } catch (error: any) {
    console.error("Error al obtener asistencias en Railway:", error);
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

    let pId = conductorId;

    if (doc && !pId) {
      const persona = await prisma.persona.findFirst({
        where: { numeroDocumento: doc },
      });
      if (persona) pId = persona.id;
    }

    const fechaNow = new Date();
    const horaNow = fechaNow.toLocaleTimeString("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const asistencia = await prisma.asistenciaRegistro.create({
      data: {
        personaId: pId || "persona-general",
        personaDocumento: doc || null,
        personaNombre: nombre,
        cargo: (cargo || "CONDUCTOR").toUpperCase(),
        proyecto: (proyecto || "TRANS SERVICES A&B").toUpperCase(),
        facilitador: facilitador ? facilitador.toUpperCase() : "COORDINADOR HSEQ",
        lugar: lugar ? lugar.toUpperCase() : "VILLAGARZÓN",
        duracionHoras: duracionHoras ? parseFloat(duracionHoras) : 1.0,
        fecha: fechaNow,
        horaLlegada: horaNow,
        evento: ev,
        tipoEvento: tipEv,
        estado: estado || "presente",
        firmaUrl: firm,
        fotoUrl: fot,
        observaciones: observaciones || null,
        asistio: estado !== "ausente",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Registro de asistencia guardado exitosamente en Railway",
      asistencia,
    });
  } catch (error: any) {
    console.error("Error al registrar asistencia desde App:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar asistencia" },
      { status: 500 }
    );
  }
}
