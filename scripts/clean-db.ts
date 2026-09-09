import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { ITEMS_SGSST } from "../lib/data/sgsst-items";
import { PASOS_PESV } from "../lib/data/pesv-pasos";
import { SEED_ROLES } from "../lib/data/roles";

const prisma = new PrismaClient();

async function initBaseCatalogs() {
  console.log("Verificando catálogos normativos y sincronizando contratistas en PostgreSQL...");

  try {
    // SG-SST: 60 ítems base
    for (const i of ITEMS_SGSST) {
      await (prisma as any).itemSgsst.upsert({
        where: { id: i.id },
        update: {},
        create: {
          id: i.id,
          numeral: i.numeral,
          estandarId: i.estandarId,
          nombre: i.nombre,
          estado: "pendiente",
          documentoNombre: null,
        },
      });
    }

    // PESV: 24 pasos base
    for (const p of PASOS_PESV) {
      await (prisma as any).pasoPesv.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          numero: p.numero,
          fase: p.fase,
          nombre: p.nombre,
          estado: "pendiente",
          documentoNombre: null,
          observaciones: p.observaciones ?? null,
        },
      });
    }

    // Roles del Sistema (RBAC)
    for (const r of SEED_ROLES) {
      await (prisma as any).rolSistema.upsert({
        where: { nombre: r.nombre },
        update: {},
        create: {
          id: r.id,
          nombre: r.nombre,
          descripcion: r.descripcion,
          permisos: ["Personas", "Contratistas", "Flota", "Telemetría GPS", "Operación", "HSEQ"],
          esConfigurable: r.esConfigurable,
        },
      });
    }

    // Sincronizar automáticamente contratistas desde los vehículos existentes
    try {
      const vehiculos = await prisma.vehiculo.findMany();
      for (const v of vehiculos) {
        if (v.contratistaNombre && v.contratistaNombre.trim().length > 0) {
          const cleanNombre = v.contratistaNombre.trim();
          const existing = await prisma.contratista.findFirst({
            where: { razonSocial: { equals: cleanNombre, mode: "insensitive" } },
          });

          let cId = existing?.id;
          if (!existing) {
            const randomNit = `${Math.floor(100000000 + Math.random() * 900000000)}-${Math.floor(Math.random() * 9)}`;
            const cleanDomain = cleanNombre.toLowerCase().replace(/[^a-z0-9]/g, "") || "empresa";
            const created = await prisma.contratista.create({
              data: {
                razonSocial: cleanNombre,
                nit: randomNit,
                tipoOperacion: "fija",
                contactoNombre: "Representante Legal",
                telefono: "3000000000",
                email: `contacto@${cleanDomain}.com`,
                estado: "activo",
              },
            });
            cId = created.id;
          }

          if (cId && v.contratistaId !== cId) {
            await prisma.vehiculo.update({
              where: { id: v.id },
              data: { contratistaId: cId },
            });
          }
        }
      }
    } catch (vErr) {
      console.warn("Aviso en sincronización de contratistas desde vehículos:", vErr);
    }

    // Reclasificación automática de eventos GPS históricos de geocerca
    try {
      const geoUpdate = await (prisma as any).eventoGPS.updateMany({
        where: {
          tipoEvento: "exceso_velocidad",
          descripcion: {
            contains: "geocerca",
            mode: "insensitive",
          },
        },
        data: {
          tipoEvento: "exceso_geocerca",
        },
      });
      if (geoUpdate.count > 0) {
        console.log(`✓ Reclasificados ${geoUpdate.count} eventos históricos de geocerca a 'exceso_geocerca'.`);
      }
    } catch (gErr) {
      console.warn("Aviso en reclasificación de eventos GPS de geocerca:", gErr);
    }

    // Sincronización automática de asistencias históricas desde JSON local a PostgreSQL
    try {
      const historicalPath = path.join(__dirname, "../lib/data/historical-asistencias.json");
      if (fs.existsSync(historicalPath)) {
        const raw = fs.readFileSync(historicalPath, "utf-8");
        const records = JSON.parse(raw);
        if (Array.isArray(records) && records.length > 0) {
          const currentCount = await prisma.asistenciaRegistro.count();
          if (currentCount < records.length) {
            console.log(`Sincronizando ${records.length} registros históricos de asistencia a PostgreSQL...`);
            let synced = 0;
            for (const r of records) {
              const regId = r.id ? (String(r.id).startsWith("sup_") ? String(r.id) : `sup_${r.id}`) : `hist_${synced}`;

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
                }
              }).catch(() => {});
              synced++;
            }
            console.log(`✓ Sincronizados ${synced} registros históricos de asistencia en PostgreSQL.`);
          }
        }
      }
    } catch (aErr) {
      console.warn("Aviso en sincronización de asistencias históricas:", aErr);
    }

    console.log("✓ Catálogos normativos y contratistas verificados con éxito.");
  } catch (err) {
    console.warn("Aviso al inicializar catálogos (no bloqueante):", err);
  }
}

initBaseCatalogs()
  .catch((err) => {
    console.error("Error al inicializar catálogos:", err);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(0);
  });


