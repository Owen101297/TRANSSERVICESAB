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
