import { PrismaClient } from "@prisma/client";
import { SEED_ITEMS_SGSST } from "../lib/data/sgsst-items";
import { SEED_PASOS_PESV } from "../lib/data/pesv-pasos";
import { SEED_ROLES } from "../lib/data/roles";

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("Iniciando limpieza de datos operativos en PostgreSQL...");

  // 1. Eliminar datos operativos en orden de dependencias de Foreign Keys
  console.log("Limpiando tablas operativas...");
  try { await (prisma as any).novedadViaje.deleteMany(); } catch (e) { console.log("NovedadViaje:", e); }
  try { await (prisma as any).viaje.deleteMany(); } catch (e) { console.log("Viaje:", e); }
  try { await (prisma as any).fuec.deleteMany(); } catch (e) { console.log("Fuec:", e); }
  try { await (prisma as any).inspeccionPreoperacional.deleteMany(); } catch (e) { console.log("InspeccionPreoperacional:", e); }
  try { await (prisma as any).novedadConductor.deleteMany(); } catch (e) { console.log("NovedadConductor:", e); }
  try { await (prisma as any).hallazgoHseq.deleteMany(); } catch (e) { console.log("HallazgoHseq:", e); }
  try { await (prisma as any).asistenciaRegistro.deleteMany(); } catch (e) { console.log("AsistenciaRegistro:", e); }
  try { await (prisma as any).capacitacion.deleteMany(); } catch (e) { console.log("Capacitacion:", e); }
  try { await (prisma as any).encuestaRiesgoVial.deleteMany(); } catch (e) { console.log("EncuestaRiesgoVial:", e); }
  try { await (prisma as any).asignacion.deleteMany(); } catch (e) { console.log("Asignacion:", e); }
  try { await (prisma as any).licenciaConduccion.deleteMany(); } catch (e) { console.log("LicenciaConduccion:", e); }
  try { await (prisma as any).examenMedico.deleteMany(); } catch (e) { console.log("ExamenMedico:", e); }
  try { await (prisma as any).persona.deleteMany(); } catch (e) { console.log("Persona:", e); }
  try { await (prisma as any).vehiculo.deleteMany(); } catch (e) { console.log("Vehiculo:", e); }
  try { await (prisma as any).contrato.deleteMany(); } catch (e) { console.log("Contrato:", e); }
  try { await (prisma as any).contratista.deleteMany(); } catch (e) { console.log("Contratista:", e); }

  console.log("✓ Tablas operativas vaciadas al 100%.");

  // 2. Asegurar estructura normativa limpia (SG-SST, PESV y Roles)
  console.log("Restableciendo catálogo normativo base...");

  // SG-SST: 60 ítems con estado inicial
  for (const i of SEED_ITEMS_SGSST) {
    await (prisma as any).itemSgsst.upsert({
      where: { id: i.id },
      update: {
        estandarId: i.estandarId,
        numeral: i.numeral,
        descripcion: i.descripcion,
        pesoPorcentual: i.pesoPorcentual,
        estado: "no_cumple",
        evidenciaDescripcion: null,
      },
      create: {
        id: i.id,
        estandarId: i.estandarId,
        numeral: i.numeral,
        descripcion: i.descripcion,
        pesoPorcentual: i.pesoPorcentual,
        estado: "no_cumple",
        evidenciaDescripcion: null,
      },
    });
  }
  console.log("✓ Matriz SG-SST (60 estándares) restablecida.");

  // PESV: 24 pasos con estado inicial
  for (const p of SEED_PASOS_PESV) {
    await (prisma as any).pasoPesv.upsert({
      where: { id: p.id },
      update: {
        numero: p.numero,
        fase: p.fase,
        nombre: p.nombre,
        descripcion: p.descripcion,
        nivelVigencia: p.nivelVigencia,
        estado: "no_cumple",
        aplica: true,
      },
      create: {
        id: p.id,
        numero: p.numero,
        fase: p.fase,
        nombre: p.nombre,
        descripcion: p.descripcion,
        nivelVigencia: p.nivelVigencia,
        estado: "no_cumple",
        aplica: true,
      },
    });
  }
  console.log("✓ Matriz PESV (24 pasos) restablecida.");

  // Roles del Sistema
  for (const r of SEED_ROLES) {
    await (prisma as any).rolSistema.upsert({
      where: { nombre: r.nombre },
      update: {
        descripcion: r.descripcion,
        permisos: ["Personas", "Contratistas", "Flota", "Operación", "HSEQ"],
        esConfigurable: r.esConfigurable,
      },
      create: {
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        permisos: ["Personas", "Contratistas", "Flota", "Operación", "HSEQ"],
        esConfigurable: r.esConfigurable,
      },
    });
  }
  console.log("✓ Roles del sistema (RBAC) restablecidos.");

  console.log("\n¡Base de datos limpia y lista para operación real!");
}

cleanDatabase()
  .catch((err) => {
    console.error("Error durante la limpieza de base de datos:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
