import { PrismaClient } from "@prisma/client";
import { SEED_PERSONAS } from "../lib/data/personas";
import { SEED_CONTRATISTAS } from "../lib/data/contratistas";
import { SEED_VEHICULOS } from "../lib/data/vehiculos";
import { SEED_ASIGNACIONES } from "../lib/data/asignaciones";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de datos para A&B OS...");

  // 1. Contratistas
  for (const c of SEED_CONTRATISTAS) {
    await prisma.contratista.upsert({
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
    await prisma.persona.upsert({
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
        datosSalud: p.datosSalud
          ? {
              create: {
                grupoSanguineoRH: p.datosSalud.grupoSanguineoRH,
                eps: p.datosSalud.eps,
                arl: p.datosSalud.arl,
                fondoPensiones: p.datosSalud.fondoPensiones ?? null,
                alergias: p.datosSalud.alergias ?? null,
              },
            }
          : undefined,
        contactoEmergencia: p.contactoEmergencia
          ? {
              create: {
                nombreCompleto: p.contactoEmergencia.nombreCompleto,
                parentesco: p.contactoEmergencia.parentesco,
                telefono: p.contactoEmergencia.telefono,
              },
            }
          : undefined,
        licenciaConduccion: p.licenciaConduccion
          ? {
              create: {
                numero: p.licenciaConduccion.numero,
                categorias: p.licenciaConduccion.categorias,
                fechaVencimiento: new Date(p.licenciaConduccion.fechaVencimiento),
                organismoTransito: p.licenciaConduccion.organismoTransito ?? null,
              },
            }
          : undefined,
        examenMedico: p.examenMedico
          ? {
              create: {
                tipo: p.examenMedico.tipo,
                fechaRealizacion: new Date(p.examenMedico.fechaRealizacion),
                fechaVigencia: new Date(p.examenMedico.fechaVigencia),
                enfasis: p.examenMedico.enfasis,
                concepto: p.examenMedico.concepto,
                restricciones: p.examenMedico.restricciones ?? null,
                centroMedico: p.examenMedico.centroMedico ?? null,
              },
            }
          : undefined,
      },
    });
  }
  console.log("✓ Personas y expedientes sembrados.");

  // 3. Vehículos
  for (const v of SEED_VEHICULOS) {
    await prisma.vehiculo.upsert({
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
    await prisma.asignacion.upsert({
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

  // 5. Contratos de Transporte
  const { SEED_CONTRATOS, SEED_FUECS } = await import("../lib/data/fuec");
  for (const c of SEED_CONTRATOS) {
    await (prisma as any).contratoTransporte.upsert({
      where: { numeroContrato: c.numeroContrato },
      update: {
        contratanteNombre: c.contratanteNombre,
        contratanteNit: c.contratanteNit,
        objetoContrato: c.objetoContrato,
        fechaInicio: new Date(c.fechaInicio),
        fechaFin: new Date(c.fechaFin),
        estado: c.estado,
      },
      create: {
        id: c.id,
        numeroContrato: c.numeroContrato,
        contratanteNombre: c.contratanteNombre,
        contratanteNit: c.contratanteNit,
        objetoContrato: c.objetoContrato,
        fechaInicio: new Date(c.fechaInicio),
        fechaFin: new Date(c.fechaFin),
        estado: c.estado,
      },
    });
  }
  console.log("✓ Contratos de transporte sembrados.");

  // 6. FUECs oficiales
  for (const f of SEED_FUECS) {
    await (prisma as any).fuec.upsert({
      where: { codigoFUEC: f.codigoFUEC },
      update: {
        contratoId: f.contratoId,
        contratoNumero: f.contratoNumero,
        contratante: f.contratante,
        objetoContrato: f.objetoContrato,
        origen: f.origen,
        destino: f.destino,
        rutaDetalle: f.rutaDetalle ?? null,
        vehiculoId: f.vehiculoId,
        placa: f.placa,
        marca: f.marca,
        modelo: f.modelo,
        tarjetaOperacionNumero: f.tarjetaOperacionNumero ?? null,
        conductorPrincipalId: f.conductorPrincipalId,
        conductorPrincipalNombre: f.conductorPrincipalNombre,
        fechaInicio: new Date(f.fechaInicio),
        fechaFin: new Date(f.fechaFin),
        estado: f.estado,
        qrCodeUrl: f.qrCodeUrl ?? null,
      },
      create: {
        id: f.id,
        numeroConsecutivo: f.numeroConsecutivo,
        codigoFUEC: f.codigoFUEC,
        contratoId: f.contratoId,
        contratoNumero: f.contratoNumero,
        contratante: f.contratante,
        objetoContrato: f.objetoContrato,
        origen: f.origen,
        destino: f.destino,
        rutaDetalle: f.rutaDetalle ?? null,
        vehiculoId: f.vehiculoId,
        placa: f.placa,
        marca: f.marca,
        modelo: f.modelo,
        tarjetaOperacionNumero: f.tarjetaOperacionNumero ?? null,
        conductorPrincipalId: f.conductorPrincipalId,
        conductorPrincipalNombre: f.conductorPrincipalNombre,
        fechaInicio: new Date(f.fechaInicio),
        fechaFin: new Date(f.fechaFin),
        estado: f.estado,
        qrCodeUrl: f.qrCodeUrl ?? null,
      },
    });
  }
  console.log("✓ FUECs oficiales sembrados.");

  // 7. Viajes Operacionales
  const { SEED_VIAJES } = await import("../lib/data/viajes");
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
        novedades: {
          create: v.novedades.map((n) => ({
            id: n.id,
            fecha: new Date(n.fecha),
            descripcion: n.descripcion,
          })),
        },
      },
    });
  }
  console.log("✓ Viajes sembrados.");


  console.log("¡Seed completado con éxito!");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
