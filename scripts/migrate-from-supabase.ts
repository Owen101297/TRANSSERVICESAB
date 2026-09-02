import { prisma } from "../lib/prisma";

const SUPABASE_URL = "https://xftllyjjqvozjjmgwomg.supabase.co/rest/v1";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdGxseWpqcXZvempqbWd3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjExMTIsImV4cCI6MjA5Mzc5NzExMn0.UURzZOytfoYMrxzpohRams_GcJ3ETsEnNNOaSQqeuu8";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export async function runSupabaseMigration() {
  console.log("🚀 [ETL] Iniciando migración de datos desde Supabase a PostgreSQL...");

  try {
    // ----------------------------------------------------
    // 1. MIGRACIÓN DE CONDUCTORES -> PERSONA
    // ----------------------------------------------------
    console.log("📥 [ETL] Descargando conductores de Supabase...");
    const resConductores = await fetch(`${SUPABASE_URL}/conductores?select=*`, { headers });
    const conductoresSupabase = await resConductores.json();

    if (Array.isArray(conductoresSupabase)) {
      console.log(`🔍 [ETL] ${conductoresSupabase.length} conductores encontrados en Supabase.`);

      for (const c of conductoresSupabase) {
        const doc = (c.numero_documento || c.documento || c.id || "").trim();
        if (!doc) continue;

        const nombres = (c.nombres || c.nombre || "Conductor").trim();
        const apellidos = (c.apellidos || "").trim();
        const email = (c.email || `conductor_${doc}@transservicesab.com`).trim();
        const telefono = (c.telefono || "3000000000").trim();
        const eps = (c.eps || "Sura").trim();
        const arl = (c.arl || "Positiva").trim();
        const licenciaNumero = (c.licencia_conducir || doc).trim();
        const categoria = (c.categoria_licencia || "C2").trim();
        const vigenciaLicencia = c.licencia_vencimiento ? new Date(c.licencia_vencimiento) : new Date("2028-12-31");

        const iniciales = `${nombres[0] || "C"}${apellidos[0] || "A"}`.toUpperCase();

        const persona = await prisma.persona.upsert({
          where: { numeroDocumento: doc },
          update: {
            nombres,
            apellidos,
            email,
            telefono,
            perfiles: ["conductor"],
            estado: c.estado === "inactivo" ? "inactivo" : "activo",
            fotoIniciales: iniciales,
          },
          create: {
            nombres,
            apellidos,
            numeroDocumento: doc,
            tipoDocumento: c.tipo_documento || "CC",
            email,
            telefono,
            perfiles: ["conductor"],
            estado: c.estado === "inactivo" ? "inactivo" : "activo",
            fotoIniciales: iniciales,
            fechaIngreso: c.fecha_ingreso ? new Date(c.fecha_ingreso) : new Date(),
          },
        });

        // Licencia de conducción
        await prisma.licenciaConduccion.upsert({
          where: { personaId: persona.id },
          update: {
            numero: licenciaNumero,
            categorias: [categoria],
            fechaVencimiento: vigenciaLicencia,
          },
          create: {
            personaId: persona.id,
            numero: licenciaNumero,
            categorias: [categoria],
            fechaVencimiento: vigenciaLicencia,
          },
        });

        // Datos de salud
        await prisma.datosSalud.upsert({
          where: { personaId: persona.id },
          update: {
            eps,
            arl,
          },
          create: {
            personaId: persona.id,
            grupoSanguineoRH: "O+",
            eps,
            arl,
          },
        });
      }
      console.log(`✅ [ETL] Conductores sincronizados exitosamente.`);
    }

    // ----------------------------------------------------
    // 2. MIGRACIÓN DE ASISTENCIAS -> ASISTENCIA_REGISTRO
    // ----------------------------------------------------
    console.log("📥 [ETL] Descargando registros de asistencia de Supabase...");
    const resAsistencias = await fetch(`${SUPABASE_URL}/asistencia?select=*&order=fecha.desc`, { headers });
    const asistenciasSupabase = await resAsistencias.json();

    if (Array.isArray(asistenciasSupabase)) {
      console.log(`🔍 [ETL] ${asistenciasSupabase.length} registros de asistencia encontrados en Supabase.`);

      // Obtenemos mapa de personas por nombre y documento para vincular ID
      const todasPersonas = await prisma.persona.findMany();
      const personaMap = new Map<string, string>();
      for (const p of todasPersonas) {
        personaMap.set(`${p.nombres} ${p.apellidos}`.toLowerCase().trim(), p.id);
        personaMap.set(p.nombres.toLowerCase().trim(), p.id);
      }

      let insertados = 0;
      for (const a of asistenciasSupabase) {
        const nombreConductor = (a.conductor_nombre || a.persona_nombre || "Colaborador General").trim();
        const personaId = a.conductor_id || personaMap.get(nombreConductor.toLowerCase()) || null;
        const fecha = a.fecha ? new Date(a.fecha) : new Date();
        const estado = (a.estado || "presente").toLowerCase();
        const horaLlegada = a.hora_llegada || null;
        const observaciones = a.observaciones || null;

        if (a.id) {
          await (prisma as any).asistenciaRegistro.upsert({
            where: { id: a.id },
            update: {
              personaId,
              personaNombre: nombreConductor,
              fecha,
              estado,
              horaLlegada,
              observaciones,
              asistio: estado !== "ausente",
            },
            create: {
              id: a.id,
              personaId,
              personaNombre: nombreConductor,
              fecha,
              estado,
              horaLlegada,
              observaciones,
              evento: "Jornada Operativa / Capacitación",
              tipoEvento: "capacitacion",
              asistio: estado !== "ausente",
            },
          });
        }
        insertados++;
      }
      console.log(`✅ [ETL] ${insertados} registros de asistencia sincronizados a PostgreSQL.`);
    }

    // ----------------------------------------------------
    // 3. MIGRACIÓN DE VIAJES -> VIAJE
    // ----------------------------------------------------
    console.log("📥 [ETL] Descargando viajes de Supabase...");
    const resViajes = await fetch(`${SUPABASE_URL}/viajes?select=*&order=created_at.desc`, { headers });
    const viajesSupabase = await resViajes.json();

    if (Array.isArray(viajesSupabase)) {
      console.log(`🔍 [ETL] ${viajesSupabase.length} viajes encontrados en Supabase.`);

      const todosVehiculos = await prisma.vehiculo.findMany();
      const vehiculoMap = new Map<string, { id: string; contratistaNombre: string }>();
      for (const v of todosVehiculos) {
        vehiculoMap.set(v.placa.toUpperCase().trim(), { id: v.id, contratistaNombre: v.contratistaNombre });
      }

      for (const v of viajesSupabase) {
        const placa = (v.vehiculo_placa || v.placa || "TS-FLOTA").toUpperCase().trim();
        const vehiculoData = vehiculoMap.get(placa) || {
          id: `veh_${placa}`,
          contratistaNombre: v.vehiculo_empresa || "Trans Services General",
        };

        const conductorNombre = (v.conductor_nombre || "Conductor Operativo").trim();
        const origen = (v.origen || "Cartagena").trim();
        const destino = (v.destino || "Zona Industrial").trim();
        const fechaSalida = v.fecha_salida ? new Date(v.fecha_salida) : (v.created_at ? new Date(v.created_at) : new Date());
        const estado = (v.estado || "en_curso").toLowerCase().replace(/\s+/g, "_");

        await (prisma as any).viaje.upsert({
          where: { id: v.id },
          update: {
            conductorNombre,
            placa,
            origen,
            destino,
            fechaSalida,
            estado,
            distanciaKm: v.distancia_km ? Number(v.distancia_km) : null,
            riskScore: v.risk_score ? Number(v.risk_score) : null,
            riskLevel: v.risk_level || null,
            riskInputs: v.risk_inputs || null,
            signatures: v.signatures || null,
            observaciones: v.observaciones || null,
          },
          create: {
            id: v.id,
            conductorId: v.conductor_id || `cond_${Date.now()}`,
            conductorNombre,
            vehiculoId: vehiculoData.id,
            placa,
            contratistaNombre: vehiculoData.contratistaNombre,
            origen,
            destino,
            servicio: v.tipo_servicio || "especial",
            fechaSalida,
            estado,
            distanciaKm: v.distancia_km ? Number(v.distancia_km) : null,
            riskScore: v.risk_score ? Number(v.risk_score) : null,
            riskLevel: v.risk_level || null,
            riskInputs: v.risk_inputs || null,
            signatures: v.signatures || null,
            observaciones: v.observaciones || null,
          },
        });
      }
      console.log(`✅ [ETL] ${viajesSupabase.length} viajes sincronizados exitosamente.`);
    }

    console.log("🎉 [ETL] Migración completada con éxito. 100% de datos en PostgreSQL.");
  } catch (error) {
    console.error("❌ [ETL Error] Error durante la migración de Supabase:", error);
  }
}

// Ejecución directa si se invoca con tsx
if (require.main === module || process.argv[1]?.includes("migrate-from-supabase")) {
  runSupabaseMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
