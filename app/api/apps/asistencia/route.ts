import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SUPABASE_URL = "https://xftllyjjqvozjjmgwomg.supabase.co/rest/v1/asistencia?select=*&order=fecha.desc&limit=2000";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdGxseWpqcXZvempqbWd3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjExMTIsImV4cCI6MjA5Mzc5NzExMn0.UURzZOytfoYMrxzpohRams_GcJ3ETsEnNNOaSQqeuu8";

interface NormalizedAsistencia {
  id: string;
  personaId?: string;
  personaDocumento: string;
  personaNombre: string;
  cargo: string;
  proyecto: string;
  evento: string;
  tipoEvento: string;
  fecha: string; // formato estándar YYYY-MM-DD
  horaLlegada: string;
  estado: string;
  firmaUrl: string | null;
  fotoUrl: string | null;
  observaciones?: string | null;
}

// Normaliza cualquier registro (de Supabase o de Prisma) de forma consistente
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

  // Extracción pura de la fecha YYYY-MM-DD sin desfasajes de UTC
  let dateStr = "";
  if (item.fecha) {
    if (typeof item.fecha === "string") {
      dateStr = item.fecha.slice(0, 10);
    } else if (item.fecha instanceof Date) {
      dateStr = item.fecha.toISOString().slice(0, 10);
    }
  } else if (item.created_at) {
    dateStr = new Date(item.created_at).toLocaleDateString("en-CA", {
      timeZone: "America/Bogota",
    });
  }

  if (!dateStr || dateStr.length < 10) {
    dateStr = "2026-08-21";
  }

  const horaStr =
    item.horaLlegada ||
    item.hora_llegada ||
    (item.created_at
      ? new Date(item.created_at).toLocaleTimeString("es-CO", {
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

// Obtiene todos los registros desde Supabase
async function fetchSupabaseRecords(): Promise<NormalizedAsistencia[]> {
  try {
    const res = await fetch(SUPABASE_URL, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item, idx) => normalizeRecord(item, idx));
  } catch (e) {
    console.warn("Aviso fetch Supabase:", e);
    return [];
  }
}

// Sincronización en segundo plano hacia PostgreSQL (Railway)
async function syncToPrisma(records: NormalizedAsistencia[]) {
  try {
    for (const r of records) {
      const regId = r.id.startsWith("sup_") ? r.id : `sup_${r.id}`;
      const [y, m, d] = r.fecha.split("-").map(Number);
      const fechaCot = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));

      await prisma.asistenciaRegistro.upsert({
        where: { id: regId },
        update: {
          personaNombre: r.personaNombre,
          personaDocumento: r.personaDocumento !== "—" ? r.personaDocumento : null,
          cargo: r.cargo,
          proyecto: r.proyecto,
          evento: r.evento,
          tipoEvento: r.tipoEvento,
          horaLlegada: r.horaLlegada,
          fecha: fechaCot,
          estado: r.estado,
          firmaUrl: r.firmaUrl,
          asistio: r.estado !== "ausente",
        },
        create: {
          id: regId,
          personaId: r.personaId || `p_${r.personaDocumento || r.id}`,
          personaNombre: r.personaNombre,
          personaDocumento: r.personaDocumento !== "—" ? r.personaDocumento : null,
          cargo: r.cargo,
          proyecto: r.proyecto,
          evento: r.evento,
          tipoEvento: r.tipoEvento,
          horaLlegada: r.horaLlegada,
          fecha: fechaCot,
          estado: r.estado,
          firmaUrl: r.firmaUrl,
          asistio: r.estado !== "ausente",
        },
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("Aviso sync Prisma:", e);
  }
}

// Obtiene todos los registros combinando Supabase y Prisma de forma resiliente
async function getAllNormalizedRecords(forceSync = false): Promise<NormalizedAsistencia[]> {
  const supabaseRecords = await fetchSupabaseRecords();

  if (forceSync && supabaseRecords.length > 0) {
    syncToPrisma(supabaseRecords).catch(() => {});
  }

  // Si Supabase trajo datos, usar Supabase como fuente primaria enriquecida
  if (supabaseRecords.length > 0) {
    return supabaseRecords;
  }

  // Fallback a Prisma
  try {
    const prismaRecords = await prisma.asistenciaRegistro.findMany({
      orderBy: { fecha: "desc" },
    });
    return prismaRecords.map((item, idx) => normalizeRecord(item, idx));
  } catch (e) {
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
    const forceSync = searchParams.get("sync") === "true";

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

    const allRecords = await getAllNormalizedRecords(forceSync);

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

    if (fecha) {
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

    // Guardar en Supabase para persistencia compartida
    fetch("https://xftllyjjqvozjjmgwomg.supabase.co/rest/v1/asistencia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        fecha: fechaStr,
        hora_llegada: horaNow,
        conductor_documento: doc,
        conductor_nombre: nombre,
        cargo: (cargo || "CONDUCTOR").toUpperCase(),
        proyecto: (proyecto || "TRANS SERVICES A&B").toUpperCase(),
        evento: ev,
        tipo_evento: tipEv,
        facilitador: facilitador || "COORDINADOR HSEQ",
        lugar: lugar || "VILLAGARZÓN",
        estado: estado || "presente",
        firma_url: firm,
        observaciones: observacionesJson,
      }),
    }).catch((e) => console.warn("Aviso POST Supabase:", e));

    // Guardar también en Prisma si está disponible
    try {
      let pId = conductorId;
      if (doc && !pId) {
        const persona = await prisma.persona.findFirst({
          where: { numeroDocumento: doc },
        });
        if (persona) pId = persona.id;
      }

      const [y, m, d] = fechaStr.split("-").map(Number);
      const fechaCot = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));

      await prisma.asistenciaRegistro.create({
        data: {
          personaId: pId || "persona-general",
          personaDocumento: doc || null,
          personaNombre: nombre,
          cargo: (cargo || "CONDUCTOR").toUpperCase(),
          proyecto: (proyecto || "TRANS SERVICES A&B").toUpperCase(),
          facilitador: facilitador ? facilitador.toUpperCase() : "COORDINADOR HSEQ",
          lugar: lugar ? lugar.toUpperCase() : "VILLAGARZÓN",
          duracionHoras: duracionHoras ? parseFloat(duracionHoras) : 1.0,
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
    } catch (e) {
      console.warn("Aviso POST Prisma:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Registro de asistencia guardado exitosamente",
      asistencia: {
        personaNombre: nombre,
        personaDocumento: doc,
        fecha: fechaStr,
        horaLlegada: horaNow,
        firmaUrl: firm,
      },
    });
  } catch (error: any) {
    console.error("Error al registrar asistencia:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar asistencia" },
      { status: 500 }
    );
  }
}
