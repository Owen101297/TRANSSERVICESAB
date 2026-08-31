import { PrismaClient } from "@prisma/client";
import { SEED_PERSONAS } from "../lib/data/personas";
import { SEED_CONTRATISTAS } from "../lib/data/contratistas";
import { SEED_VEHICULOS } from "../lib/data/vehiculos";
import { SEED_ASIGNACIONES } from "../lib/data/asignaciones";
import { ITEMS_SGSST } from "../lib/data/sgsst-items";
import { PASOS_PESV } from "../lib/data/pesv-pasos";
import { SEED_ROLES } from "../lib/data/roles";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de datos para TRANSSERVICES ERP...");

  // 1. Contratistas
  for (const c of SEED_CONTRATISTAS) {
    await (prisma as any).contratista.upsert({
      where: { id: c.id },
      update: {
        razonSocial: c.nombre,
        nit: c.nit,
        telefono: c.contactoTelefono,
        email: c.contactoEmail,
        estado: c.estado,
        fechaVinculacion: new Date(c.fechaVinculacion),
      },
      create: {
        id: c.id,
        razonSocial: c.nombre,
        nit: c.nit,
        telefono: c.contactoTelefono,
        email: c.contactoEmail,
        estado: c.estado,
        fechaVinculacion: new Date(c.fechaVinculacion),
      },
    });
  }

  // 2. Personas
  for (const p of SEED_PERSONAS) {
    await (prisma as any).persona.upsert({
      where: { numeroDocumento: p.numeroDocumento },
      update: {
        nombres: p.nombres,
        apellidos: p.apellidos,
        tipoDocumento: p.tipoDocumento,
        telefono: p.telefono,
        email: p.email,
        perfiles: p.perfiles,
        estado: p.estado,
        fechaIngreso: new Date(p.fechaIngreso),
        contratistaId: p.contratistaId ?? null,
        contratistaNombre: p.contratistaNombre ?? null,
        fotoIniciales: p.fotoIniciales,
      },
      create: {
        id: p.id,
        nombres: p.nombres,
        apellidos: p.apellidos,
        tipoDocumento: p.tipoDocumento,
        numeroDocumento: p.numeroDocumento,
        telefono: p.telefono,
        email: p.email,
        perfiles: p.perfiles,
        estado: p.estado,
        fechaIngreso: new Date(p.fechaIngreso),
        contratistaId: p.contratistaId ?? null,
        contratistaNombre: p.contratistaNombre ?? null,
        fotoIniciales: p.fotoIniciales,
      },
    });
  }

  // 3. Vehículos
  for (const v of SEED_VEHICULOS) {
    await (prisma as any).vehiculo.upsert({
      where: { placa: v.placa },
      update: {
        marca: v.marca,
        modelo: v.modelo,
        anio: v.anio,
        capacidad: v.capacidad,
        tipo: v.tipo,
        servicio: v.servicio,
        contratistaId: v.contratistaId,
        contratistaNombre: v.contratistaNombre,
        estado: v.estado,
        soatVencimiento: new Date(v.documentos.soatVencimiento),
        rtmVencimiento: new Date(v.documentos.rtmVencimiento),
        polizaVencimiento: new Date(v.documentos.polizaVencimiento),
      },
      create: {
        id: v.id,
        placa: v.placa,
        marca: v.marca,
        modelo: v.modelo,
        anio: v.anio,
        capacidad: v.capacidad,
        tipo: v.tipo,
        servicio: v.servicio,
        contratistaId: v.contratistaId,
        contratistaNombre: v.contratistaNombre,
        estado: v.estado,
        soatVencimiento: new Date(v.documentos.soatVencimiento),
        rtmVencimiento: new Date(v.documentos.rtmVencimiento),
        polizaVencimiento: new Date(v.documentos.polizaVencimiento),
      },
    });
  }

  // 4. Asignaciones
  for (const a of SEED_ASIGNACIONES) {
    await (prisma as any).asignacion.upsert({
      where: { id: a.id },
      update: {
        conductorId: a.conductorId,
        conductorNombre: a.conductorNombre,
        vehiculoId: a.vehiculoId,
        placa: a.placa,
        contratistaId: a.contratistaId,
        contratistaNombre: a.contratistaNombre,
        tipoAsignacion: a.tipoAsignacion,
        turno: a.turno ?? null,
        fechaInicio: new Date(a.fechaInicio),
        fechaFin: a.fechaFin ? new Date(a.fechaFin) : null,
        estado: a.estado,
        observaciones: a.observaciones ?? null,
      },
      create: {
        id: a.id,
        conductorId: a.conductorId,
        conductorNombre: a.conductorNombre,
        vehiculoId: a.vehiculoId,
        placa: a.placa,
        contratistaId: a.contratistaId,
        contratistaNombre: a.contratistaNombre,
        tipoAsignacion: a.tipoAsignacion,
        turno: a.turno ?? null,
        fechaInicio: new Date(a.fechaInicio),
        fechaFin: a.fechaFin ? new Date(a.fechaFin) : null,
        estado: a.estado,
        observaciones: a.observaciones ?? null,
      },
    });
  }

  // 5. SG-SST Items
  for (const i of ITEMS_SGSST) {
    await (prisma as any).itemSgsst.upsert({
      where: { id: i.id },
      update: {
        numeral: i.numeral,
        estandarId: i.estandarId,
        nombre: i.nombre,
        estado: i.estado,
      },
      create: {
        id: i.id,
        numeral: i.numeral,
        estandarId: i.estandarId,
        nombre: i.nombre,
        estado: i.estado,
      },
    });
  }

  // 6. PESV Pasos
  for (const p of PASOS_PESV) {
    await (prisma as any).pasoPesv.upsert({
      where: { id: p.id },
      update: {
        numero: p.numero,
        fase: p.fase,
        nombre: p.nombre,
        estado: p.estado,
      },
      create: {
        id: p.id,
        numero: p.numero,
        fase: p.fase,
        nombre: p.nombre,
        estado: p.estado,
      },
    });
  }

  // 7. Roles del Sistema
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

  console.log("¡Seed de TRANSSERVICES finalizado!");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
