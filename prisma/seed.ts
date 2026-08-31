import { PrismaClient } from "@prisma/client";
import { SEED_PERSONAS } from "../lib/data/personas";
import { SEED_CONTRATISTAS } from "../lib/data/contratistas";
import { SEED_VEHICULOS } from "../lib/data/vehiculos";
import { SEED_ASIGNACIONES } from "../lib/data/asignaciones";
import { SEED_HALLAZGOS } from "../lib/data/hallazgos";
import { SEED_ITEMS_SGSST } from "../lib/data/sgsst-items";
import { SEED_PASOS_PESV } from "../lib/data/pesv-pasos";
import { SEED_CAPACITACIONES } from "../lib/data/capacitaciones";
import { SEED_ROLES } from "../lib/data/roles";
import { SEED_VIAJES } from "../lib/data/viajes";
import { SEED_FUECS } from "../lib/data/fuec";

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
  console.log("✓ Contratistas sembrados.");

  // 2. Personas y Expedientes
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
  console.log("✓ Personas sembradas.");

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
  console.log("✓ Vehículos sembrados.");

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
  console.log("✓ Asignaciones sembradas.");

  // 5. FUECs
  for (const f of SEED_FUECS) {
    await (prisma as any).fuec.upsert({
      where: { id: f.id },
      update: {
        numeroConsecutivo: f.numeroConsecutivo,
        codigoUnicoNacional: f.codigoUnicoNacional,
        contratoNumero: f.contratoNumero,
        contratanteNombre: f.contratanteNombre,
        objetoContrato: f.objetoContrato,
        origen: f.origen,
        destino: f.destino,
        rutaDetalle: f.rutaDetalle ?? null,
        vehiculoId: f.vehiculoId,
        placa: f.placa,
        marca: f.marca,
        modelo: f.modelo,
        conductorPrincipalId: f.conductorPrincipalId,
        conductorPrincipalNombre: f.conductorPrincipalNombre,
        fechaInicio: new Date(f.fechaInicio),
        fechaFin: new Date(f.fechaFin),
        estado: f.estado,
      },
      create: {
        id: f.id,
        numeroConsecutivo: f.numeroConsecutivo,
        codigoUnicoNacional: f.codigoUnicoNacional,
        contratoNumero: f.contratoNumero,
        contratanteNombre: f.contratanteNombre,
        objetoContrato: f.objetoContrato,
        origen: f.origen,
        destino: f.destino,
        rutaDetalle: f.rutaDetalle ?? null,
        vehiculoId: f.vehiculoId,
        placa: f.placa,
        marca: f.marca,
        modelo: f.modelo,
        conductorPrincipalId: f.conductorPrincipalId,
        conductorPrincipalNombre: f.conductorPrincipalNombre,
        fechaInicio: new Date(f.fechaInicio),
        fechaFin: new Date(f.fechaFin),
        estado: f.estado,
      },
    });
  }
  console.log("✓ FUECs sembrados.");

  // 6. Viajes
  for (const v of SEED_VIAJES) {
    await (prisma as any).viaje.upsert({
      where: { id: v.id },
      update: {
        conductorId: v.conductorId,
        conductorNombre: v.conductorNombre,
        vehiculoId: v.vehiculoId,
        placa: v.placa,
        contratistaNombre: v.contratistaNombre,
        origen: v.origen,
        destino: v.destino,
        servicio: v.servicio,
        fechaSalida: new Date(v.fechaSalida),
        duracionEstimadaHoras: v.duracionEstimadaHoras,
        fechaLlegadaReal: v.fechaLlegadaReal ? new Date(v.fechaLlegadaReal) : null,
        estado: v.estado,
      },
      create: {
        id: v.id,
        conductorId: v.conductorId,
        conductorNombre: v.conductorNombre,
        vehiculoId: v.vehiculoId,
        placa: v.placa,
        contratistaNombre: v.contratistaNombre,
        origen: v.origen,
        destino: v.destino,
        servicio: v.servicio,
        fechaSalida: new Date(v.fechaSalida),
        duracionEstimadaHoras: v.duracionEstimadaHoras,
        fechaLlegadaReal: v.fechaLlegadaReal ? new Date(v.fechaLlegadaReal) : null,
        estado: v.estado,
      },
    });
  }
  console.log("✓ Viajes sembrados.");

  // 7. HSEQ Hallazgos
  for (const h of SEED_HALLAZGOS) {
    await (prisma as any).hallazgoHseq.upsert({
      where: { id: h.id },
      update: {
        codigo: h.codigo,
        titulo: h.titulo,
        descripcion: h.descripcion,
        tipo: h.tipo,
        severidad: h.severidad,
        estado: h.estado,
        origenModulo: h.origenModulo,
        responsableNombre: h.responsableNombre,
        fechaReporte: new Date(h.fechaReporte),
        fechaCierre: h.fechaCierre ? new Date(h.fechaCierre) : null,
      },
      create: {
        id: h.id,
        codigo: h.codigo,
        titulo: h.titulo,
        descripcion: h.descripcion,
        tipo: h.tipo,
        severidad: h.severidad,
        estado: h.estado,
        origenModulo: h.origenModulo,
        responsableNombre: h.responsableNombre,
        fechaReporte: new Date(h.fechaReporte),
        fechaCierre: h.fechaCierre ? new Date(h.fechaCierre) : null,
      },
    });
  }
  console.log("✓ Hallazgos HSEQ sembrados.");

  // 8. SG-SST Items
  for (const i of SEED_ITEMS_SGSST) {
    await (prisma as any).itemSgsst.upsert({
      where: { id: i.id },
      update: {
        estandarId: i.estandarId,
        numeral: i.numeral,
        descripcion: i.descripcion,
        pesoPorcentual: i.pesoPorcentual,
        estado: i.estado,
        evidenciaDescripcion: i.evidenciaDescripcion ?? null,
      },
      create: {
        id: i.id,
        estandarId: i.estandarId,
        numeral: i.numeral,
        descripcion: i.descripcion,
        pesoPorcentual: i.pesoPorcentual,
        estado: i.estado,
        evidenciaDescripcion: i.evidenciaDescripcion ?? null,
      },
    });
  }
  console.log("✓ Ítems SG-SST sembrados.");

  // 9. PESV Pasos
  for (const p of SEED_PASOS_PESV) {
    await (prisma as any).pasoPesv.upsert({
      where: { id: p.id },
      update: {
        numero: p.numero,
        fase: p.fase,
        nombre: p.nombre,
        descripcion: p.descripcion,
        nivelVigencia: p.nivelVigencia,
        estado: p.estado,
        aplica: p.aplica,
      },
      create: {
        id: p.id,
        numero: p.numero,
        fase: p.fase,
        nombre: p.nombre,
        descripcion: p.descripcion,
        nivelVigencia: p.nivelVigencia,
        estado: p.estado,
        aplica: p.aplica,
      },
    });
  }
  console.log("✓ Pasos PESV sembrados.");

  // 10. Capacitaciones
  for (const cap of SEED_CAPACITACIONES) {
    await (prisma as any).capacitacion.upsert({
      where: { id: cap.id },
      update: {
        tema: cap.tema,
        fecha: new Date(cap.fecha),
        hora: cap.hora,
        duracionHoras: cap.duracionHoras,
        modalidad: cap.modalidad,
        facilitador: cap.facilitador,
        lugar: cap.lugar ?? null,
        cupoMaximo: cap.cupoMaximo,
        asistentesEsperados: cap.asistentesEsperados,
        asistentesConfirmados: cap.asistentesConfirmados,
        estado: cap.estado,
        perfilesObjetivo: cap.perfilesObjetivo,
      },
      create: {
        id: cap.id,
        tema: cap.tema,
        fecha: new Date(cap.fecha),
        hora: cap.hora,
        duracionHoras: cap.duracionHoras,
        modalidad: cap.modalidad,
        facilitador: cap.facilitador,
        lugar: cap.lugar ?? null,
        cupoMaximo: cap.cupoMaximo,
        asistentesEsperados: cap.asistentesEsperados,
        asistentesConfirmados: cap.asistentesConfirmados,
        estado: cap.estado,
        perfilesObjetivo: cap.perfilesObjetivo,
      },
    });
  }
  console.log("✓ Capacitaciones sembradas.");

  // 11. Roles del Sistema
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
  console.log("✓ Roles sembrados.");

  console.log("¡Seed completo de TRANSSERVICES finalizado con éxito!");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
