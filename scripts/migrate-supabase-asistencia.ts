import { prisma } from "../lib/prisma";

export async function migrateSupabaseAsistencia() {
  console.log("=== INICIANDO MIGRACIÓN DE ASISTENCIA SUPABASE -> RAILWAY POSTGRESQL ===");

  const url = "https://xftllyjjqvozjjmgwomg.supabase.co/rest/v1/asistencia?select=*&order=fecha.asc";
  const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdGxseWpqcXZvempqbWd3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjExMTIsImV4cCI6MjA5Mzc5NzExMn0.UURzZOytfoYMrxzpohRams_GcJ3ETsEnNNOaSQqeuu8";

  try {
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
      throw new Error(`Error en Supabase: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log(`Descargados ${data.length} registros desde Supabase.`);

    let migratedCount = 0;

    for (const item of data) {
      let obs: any = {};
      try {
        if (item.observaciones && typeof item.observaciones === "string") {
          if (item.observaciones.startsWith("{")) {
            obs = JSON.parse(item.observaciones);
          } else {
            // Formato texto plano: "Cargo: COORDINADOR, Proyecto: OTRO"
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

      // Parsear fecha a ISO con horario COT
      const [y, m, d] = fechaStr.split("-").map(Number);
      const fechaCot = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

      const regId = `sup_${item.id || Date.now()}_${migratedCount}`;

      try {
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
            personaId: item.conductor_id || `p_${cedula || migratedCount}`,
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
        });
        migratedCount++;
      } catch (dbErr) {
        console.warn(`Error guardando registro ${item.id}:`, dbErr);
      }
    }

    console.log(`=== MIGRACIÓN COMPLETADA: ${migratedCount} registros guardados en PostgreSQL ===`);
    return { success: true, count: migratedCount };
  } catch (error) {
    console.error("Error en migración:", error);
    return { success: false, error };
  }
}

if (require.main === module) {
  migrateSupabaseAsistencia()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
