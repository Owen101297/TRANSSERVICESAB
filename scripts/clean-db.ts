import { PrismaClient } from "@prisma/client";
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
    await prisma.$disconnect();
  });
