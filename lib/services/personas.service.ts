"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_PERSONAS, getPersonaById as getSeedPersonaById } from "@/lib/data/personas";
import {
  Persona,
  TipoDocumento,
  PerfilPersona,
  EstadoPersona,
  CategoriaLicencia,
  ConceptoMedico,
} from "@/lib/types/persona";

// Memoria volátil de respaldo para cuando se trabaje en modo local sin base de datos activa
let localPersonsState: Persona[] = [];

function computeInitials(nombres: string, apellidos: string): string {
  const first = nombres.trim().charAt(0) || "U";
  const second = apellidos.trim().charAt(0) || "";
  return `${first}${second}`.toUpperCase();
}

/**
 * Obtiene todas las personas de la base de datos (con fallback transparente)
 */
export async function getPersonasDb(): Promise<Persona[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localPersonsState;
    }

    const dbPersons = await prisma.persona.findMany({
      include: {
        licenciaConduccion: true,
        examenMedico: true,
        datosSalud: true,
        contactoEmergencia: true,
      },
      orderBy: { fechaIngreso: "desc" },
    });

    return dbPersons.map((p) => ({
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      tipoDocumento: p.tipoDocumento as TipoDocumento,
      numeroDocumento: p.numeroDocumento,
      telefono: p.telefono,
      email: p.email,
      perfiles: p.perfiles as PerfilPersona[],
      estado: p.estado as EstadoPersona,
      fechaIngreso: p.fechaIngreso.toISOString().split("T")[0],
      contratistaId: p.contratistaId ?? undefined,
      contratistaNombre: p.contratistaNombre ?? undefined,
      fotoIniciales: p.fotoIniciales,
      licenciaConduccion: p.licenciaConduccion
        ? {
            numero: p.licenciaConduccion.numero,
            categorias: p.licenciaConduccion.categorias as CategoriaLicencia[],
            fechaVencimiento: p.licenciaConduccion.fechaVencimiento.toISOString().split("T")[0],
            organismoTransito: p.licenciaConduccion.organismoTransito ?? undefined,
          }
        : undefined,
      examenMedico: p.examenMedico
        ? {
            tipo: p.examenMedico.tipo as any,
            fechaRealizacion: p.examenMedico.fechaRealizacion.toISOString().split("T")[0],
            fechaVigencia: p.examenMedico.fechaVigencia.toISOString().split("T")[0],
            enfasis: p.examenMedico.enfasis,
            concepto: p.examenMedico.concepto as ConceptoMedico,
            restricciones: p.examenMedico.restricciones ?? undefined,
            centroMedico: p.examenMedico.centroMedico ?? undefined,
          }
        : undefined,
      datosSalud: p.datosSalud
        ? {
            grupoSanguineoRH: p.datosSalud.grupoSanguineoRH as any,
            eps: p.datosSalud.eps,
            arl: p.datosSalud.arl,
            fondoPensiones: p.datosSalud.fondoPensiones ?? undefined,
            alergias: p.datosSalud.alergias ?? undefined,
          }
        : undefined,
      contactoEmergencia: p.contactoEmergencia
        ? {
            nombreCompleto: p.contactoEmergencia.nombreCompleto,
            parentesco: p.contactoEmergencia.parentesco,
            telefono: p.contactoEmergencia.telefono,
          }
        : undefined,
    }));
  } catch (error) {
    console.warn("Aviso de conexión a base de datos (usando almacén de personas local):", error);
    return localPersonsState;
  }
}

/**
 * Obtiene una persona por ID con todo su expediente
 */
export async function getPersonaByIdDb(id: string): Promise<Persona | undefined> {
  try {
    if (!process.env.DATABASE_URL) {
      return localPersonsState.find((p) => p.id === id) || getSeedPersonaById(id);
    }

    const p = await prisma.persona.findUnique({
      where: { id },
      include: {
        licenciaConduccion: true,
        examenMedico: true,
        datosSalud: true,
        contactoEmergencia: true,
      },
    });

    if (!p) {
      return localPersonsState.find((person) => person.id === id) || getSeedPersonaById(id);
    }

    return {
      id: p.id,
      nombres: p.nombres,
      apellidos: p.apellidos,
      tipoDocumento: p.tipoDocumento as TipoDocumento,
      numeroDocumento: p.numeroDocumento,
      telefono: p.telefono,
      email: p.email,
      perfiles: p.perfiles as PerfilPersona[],
      estado: p.estado as EstadoPersona,
      fechaIngreso: p.fechaIngreso.toISOString().split("T")[0],
      contratistaId: p.contratistaId ?? undefined,
      contratistaNombre: p.contratistaNombre ?? undefined,
      fotoIniciales: p.fotoIniciales,
      licenciaConduccion: p.licenciaConduccion
        ? {
            numero: p.licenciaConduccion.numero,
            categorias: p.licenciaConduccion.categorias as CategoriaLicencia[],
            fechaVencimiento: p.licenciaConduccion.fechaVencimiento.toISOString().split("T")[0],
            organismoTransito: p.licenciaConduccion.organismoTransito ?? undefined,
          }
        : undefined,
      examenMedico: p.examenMedico
        ? {
            tipo: p.examenMedico.tipo as any,
            fechaRealizacion: p.examenMedico.fechaRealizacion.toISOString().split("T")[0],
            fechaVigencia: p.examenMedico.fechaVigencia.toISOString().split("T")[0],
            enfasis: p.examenMedico.enfasis,
            concepto: p.examenMedico.concepto as ConceptoMedico,
            restricciones: p.examenMedico.restricciones ?? undefined,
            centroMedico: p.examenMedico.centroMedico ?? undefined,
          }
        : undefined,
      datosSalud: p.datosSalud
        ? {
            grupoSanguineoRH: p.datosSalud.grupoSanguineoRH as any,
            eps: p.datosSalud.eps,
            arl: p.datosSalud.arl,
            fondoPensiones: p.datosSalud.fondoPensiones ?? undefined,
            alergias: p.datosSalud.alergias ?? undefined,
          }
        : undefined,
      contactoEmergencia: p.contactoEmergencia
        ? {
            nombreCompleto: p.contactoEmergencia.nombreCompleto,
            parentesco: p.contactoEmergencia.parentesco,
            telefono: p.contactoEmergencia.telefono,
          }
        : undefined,
    };
  } catch (error) {
    return localPersonsState.find((p) => p.id === id) || getSeedPersonaById(id);
  }
}

export interface CreatePersonaResult {
  success: boolean;
  personaId?: string;
  error?: string;
}

/**
 * Server Action para registrar una nueva persona y su expediente
 */
export async function createPersonaAction(formData: FormData): Promise<CreatePersonaResult> {
  try {
    const nombres = formData.get("nombres") as string;
    const apellidos = formData.get("apellidos") as string;
    const tipoDocumento = (formData.get("tipoDocumento") as TipoDocumento) || "CC";
    const numeroDocumento = (formData.get("numeroDocumento") as string)?.trim();
    const telefono = formData.get("telefono") as string;
    const email = formData.get("email") as string;
    const perfil = (formData.get("perfil") as PerfilPersona) || "conductor";
    const perfiles: PerfilPersona[] = [perfil];

    // Salud
    const grupoSanguineoRH = (formData.get("grupoSanguineoRH") as any) || "O+";
    const eps = (formData.get("eps") as string) || "EPS General";
    const arl = (formData.get("arl") as string) || "ARL General";
    const alergias = (formData.get("alergias") as string) || undefined;

    // Contacto de emergencia
    const contactoNombre = formData.get("contactoEmergenciaNombre") as string;
    const contactoParentesco = formData.get("contactoEmergenciaParentesco") as string;
    const contactoTelefono = formData.get("contactoEmergenciaTelefono") as string;

    // Licencia
    const licenciaNumero = formData.get("licenciaNumero") as string;
    const licenciaCategoria = formData.get("licenciaCategoria") as CategoriaLicencia;
    const licenciaVencimiento = formData.get("licenciaVencimiento") as string;
    const licenciaOrganismo = formData.get("licenciaOrganismo") as string;

    // EMO
    const conceptoMedico = formData.get("conceptoMedico") as ConceptoMedico;
    const emoVigencia = formData.get("emoVigencia") as string;
    const emoRestricciones = formData.get("emoRestricciones") as string;

    const fotoIniciales = computeInitials(nombres, apellidos);
    const newId = `p_${Date.now()}`;

    // Construcción del objeto en memoria
    const newPersonaObj: Persona = {
      id: newId,
      nombres,
      apellidos,
      tipoDocumento,
      numeroDocumento,
      telefono,
      email: email || `${nombres.toLowerCase().replace(/\s+/g, ".")}@ejemplo.com`,
      perfiles,
      estado: "activo",
      fechaIngreso: new Date().toISOString().split("T")[0],
      fotoIniciales,
      datosSalud: {
        grupoSanguineoRH,
        eps,
        arl,
        alergias,
      },
      contactoEmergencia: contactoNombre
        ? {
            nombreCompleto: contactoNombre,
            parentesco: contactoParentesco || "Familiar",
            telefono: contactoTelefono || telefono,
          }
        : undefined,
      licenciaConduccion: licenciaNumero && licenciaVencimiento
        ? {
            numero: licenciaNumero,
            categorias: licenciaCategoria ? [licenciaCategoria] : ["C1"],
            fechaVencimiento: licenciaVencimiento,
            organismoTransito: licenciaOrganismo || undefined,
          }
        : undefined,
      examenMedico: emoVigencia
        ? {
            tipo: "periodico",
            fechaRealizacion: new Date().toISOString().split("T")[0],
            fechaVigencia: emoVigencia,
            enfasis: ["Visiometría", "Psicosensométrico", "Audiometría"],
            concepto: conceptoMedico || "apto",
            restricciones: emoRestricciones || undefined,
          }
        : undefined,
    };

    // Si hay conexión a PostgreSQL en Railway, guardar en base de datos
    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.persona.create({
          data: {
            nombres,
            apellidos,
            tipoDocumento,
            numeroDocumento,
            telefono,
            email: email || `${nombres.toLowerCase().replace(/\s+/g, ".")}@ejemplo.com`,
            perfiles: [perfil],
            estado: "activo",
            fotoIniciales,
            datosSalud: {
              create: {
                grupoSanguineoRH,
                eps,
                arl,
                alergias,
              },
            },
            contactoEmergencia: contactoNombre
              ? {
                  create: {
                    nombreCompleto: contactoNombre,
                    parentesco: contactoParentesco || "Familiar",
                    telefono: contactoTelefono || telefono,
                  },
                }
              : undefined,
            licenciaConduccion: licenciaNumero && licenciaVencimiento
              ? {
                  create: {
                    numero: licenciaNumero,
                    categorias: licenciaCategoria ? [licenciaCategoria] : ["C1"],
                    fechaVencimiento: new Date(licenciaVencimiento),
                    organismoTransito: licenciaOrganismo || null,
                  },
                }
              : undefined,
            examenMedico: emoVigencia
              ? {
                  create: {
                    tipo: "periodico",
                    fechaRealizacion: new Date(),
                    fechaVigencia: new Date(emoVigencia),
                    enfasis: ["Visiometría", "Psicosensométrico", "Audiometría"],
                    concepto: conceptoMedico || "apto",
                    restricciones: emoRestricciones || null,
                  },
                }
              : undefined,
          },
        });

        newPersonaObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando en PostgreSQL:", dbErr);
      }
    }

    localPersonsState.unshift(newPersonaObj);
    revalidatePath("/personas");
    revalidatePath("/asignaciones/nueva");
    revalidatePath("/documentos");

    return {
      success: true,
      personaId: newPersonaObj.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al procesar el registro.",
    };
  }
}

/**
 * Server Action para actualizar información de una persona
 */
export async function updatePersonaAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const nombres = formData.get("nombres") as string;
    const apellidos = formData.get("apellidos") as string;
    const telefono = formData.get("telefono") as string;
    const email = formData.get("email") as string;
    const estado = formData.get("estado") as EstadoPersona;

    const eps = formData.get("eps") as string;
    const arl = formData.get("arl") as string;
    const grupoSanguineoRH = formData.get("grupoSanguineoRH") as string;

    const contactoNombre = formData.get("contactoEmergenciaNombre") as string;
    const contactoTelefono = formData.get("contactoEmergenciaTelefono") as string;

    const licenciaVencimiento = formData.get("licenciaVencimiento") as string;
    const emoVigencia = formData.get("emoVigencia") as string;
    const conceptoMedico = formData.get("conceptoMedico") as ConceptoMedico;

    // Actualizar estado local
    const index = localPersonsState.findIndex((p) => p.id === id);
    if (index >= 0) {
      const prev = localPersonsState[index];
      localPersonsState[index] = {
        ...prev,
        nombres: nombres || prev.nombres,
        apellidos: apellidos || prev.apellidos,
        telefono: telefono || prev.telefono,
        email: email || prev.email,
        estado: estado || prev.estado,
        fotoIniciales: computeInitials(nombres || prev.nombres, apellidos || prev.apellidos),
        datosSalud: prev.datosSalud
          ? {
              ...prev.datosSalud,
              eps: eps || prev.datosSalud.eps,
              arl: arl || prev.datosSalud.arl,
              grupoSanguineoRH: (grupoSanguineoRH as any) || prev.datosSalud.grupoSanguineoRH,
            }
          : undefined,
        contactoEmergencia: contactoNombre
          ? {
              nombreCompleto: contactoNombre,
              parentesco: prev.contactoEmergencia?.parentesco || "Familiar",
              telefono: contactoTelefono || prev.contactoEmergencia?.telefono || "",
            }
          : prev.contactoEmergencia,
        licenciaConduccion: prev.licenciaConduccion && licenciaVencimiento
          ? {
              ...prev.licenciaConduccion,
              fechaVencimiento: licenciaVencimiento,
            }
          : prev.licenciaConduccion,
        examenMedico: prev.examenMedico && emoVigencia
          ? {
              ...prev.examenMedico,
              fechaVigencia: emoVigencia,
              concepto: conceptoMedico || prev.examenMedico.concepto,
            }
          : prev.examenMedico,
      };
    }

    // Actualizar en PostgreSQL si DATABASE_URL está activa
    if (process.env.DATABASE_URL) {
      try {
        await prisma.persona.update({
          where: { id },
          data: {
            nombres: nombres || undefined,
            apellidos: apellidos || undefined,
            telefono: telefono || undefined,
            email: email || undefined,
            estado: estado || undefined,
            fotoIniciales: nombres && apellidos ? computeInitials(nombres, apellidos) : undefined,
          },
        });
      } catch (err) {
        console.warn("No se pudo actualizar directamente en DB:", err);
      }
    }

    revalidatePath(`/personas/${id}`);
    revalidatePath("/personas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar información." };
  }
}

/**
 * Importa o actualiza un lote de personas y sus expedientes en PostgreSQL
 */
export async function batchUpsertPersonasDb(items: any[]) {
  try {
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      if (item.action === "error") continue;

      const numDoc = (item.numeroDocumento || "").replace(/\D/g, "");
      if (!numDoc) continue;

      let contratistaId: string | null = null;
      if (item.contratistaNombre && process.env.DATABASE_URL) {
        const c = await prisma.contratista.findFirst({
          where: { razonSocial: { contains: item.contratistaNombre, mode: "insensitive" } },
        });
        if (c) contratistaId = c.id;
      }

      if (process.env.DATABASE_URL) {
        const existing = await prisma.persona.findUnique({
          where: { numeroDocumento: numDoc },
          include: { licenciaConduccion: true, datosSalud: true, contactoEmergencia: true },
        });

        const fotoInitials = computeInitials(item.nombres, item.apellidos);

        if (existing) {
          await prisma.persona.update({
            where: { id: existing.id },
            data: {
              nombres: item.nombres,
              apellidos: item.apellidos,
              tipoDocumento: item.tipoDocumento,
              telefono: item.telefono || existing.telefono,
              email: item.email || existing.email,
              perfiles: item.perfiles,
              estado: item.estado,
              contratistaId: contratistaId || existing.contratistaId,
              contratistaNombre: item.contratistaNombre || existing.contratistaNombre,
              fotoIniciales: fotoInitials,
            },
          });

          // Licencia de Conducción
          if (item.numeroLicencia || item.vencimientoLicencia) {
            if (existing.licenciaConduccion) {
              await prisma.licenciaConduccion.update({
                where: { personaId: existing.id },
                data: {
                  numero: item.numeroLicencia || existing.licenciaConduccion.numero,
                  categorias: item.categoriasLicencia && item.categoriasLicencia.length > 0
                    ? item.categoriasLicencia
                    : existing.licenciaConduccion.categorias,
                  fechaVencimiento: item.vencimientoLicencia
                    ? new Date(item.vencimientoLicencia)
                    : existing.licenciaConduccion.fechaVencimiento,
                },
              });
            } else if (item.numeroLicencia && item.vencimientoLicencia) {
              await prisma.licenciaConduccion.create({
                data: {
                  personaId: existing.id,
                  numero: item.numeroLicencia,
                  categorias: item.categoriasLicencia && item.categoriasLicencia.length > 0
                    ? item.categoriasLicencia
                    : ["C2"],
                  fechaVencimiento: new Date(item.vencimientoLicencia),
                },
              });
            }
          }

          // Seguridad Social
          if (item.eps || item.arl || item.fondoPension || item.grupoSanguineo) {
            if (existing.datosSalud) {
              await prisma.datosSalud.update({
                where: { personaId: existing.id },
                data: {
                  eps: item.eps || existing.datosSalud.eps,
                  arl: item.arl || existing.datosSalud.arl,
                  fondoPensiones: item.fondoPension || existing.datosSalud.fondoPensiones,
                },
              });
            } else {
              await prisma.datosSalud.create({
                data: {
                  personaId: existing.id,
                  eps: item.eps || "Sura",
                  arl: item.arl || "Positiva",
                  fondoPensiones: item.fondoPension,
                  grupoSanguineoRH: "O_POSITIVO",
                },
              });
            }
          }

          // Contacto de Emergencia
          if (item.contactoEmergenciaNombre) {
            if (existing.contactoEmergencia) {
              await prisma.contactoEmergencia.update({
                where: { personaId: existing.id },
                data: {
                  nombreCompleto: item.contactoEmergenciaNombre,
                  telefono: item.contactoEmergenciaTelefono || existing.contactoEmergencia.telefono,
                  parentesco: item.contactoEmergenciaParentesco || existing.contactoEmergencia.parentesco,
                },
              });
            } else {
              await prisma.contactoEmergencia.create({
                data: {
                  personaId: existing.id,
                  nombreCompleto: item.contactoEmergenciaNombre,
                  telefono: item.contactoEmergenciaTelefono || "3000000000",
                  parentesco: item.contactoEmergenciaParentesco || "Familiar",
                },
              });
            }
          }

          updatedCount++;
        } else {
          // Crear Nueva Persona
          const newP = await prisma.persona.create({
            data: {
              nombres: item.nombres,
              apellidos: item.apellidos,
              tipoDocumento: item.tipoDocumento,
              numeroDocumento: numDoc,
              telefono: item.telefono || "3000000000",
              email: item.email || `${item.nombres.toLowerCase().replace(/\s+/g, ".")}@transservices.com`,
              perfiles: item.perfiles,
              estado: item.estado,
              contratistaId,
              contratistaNombre: item.contratistaNombre,
              fotoIniciales: fotoInitials,
            },
          });

          // Licencia
          if (item.numeroLicencia && item.vencimientoLicencia) {
            await prisma.licenciaConduccion.create({
              data: {
                personaId: newP.id,
                numero: item.numeroLicencia,
                categorias: item.categoriasLicencia && item.categoriasLicencia.length > 0
                  ? item.categoriasLicencia
                  : ["C2"],
                fechaVencimiento: new Date(item.vencimientoLicencia),
              },
            });
          }

          // Seguridad Social
          if (item.eps || item.arl || item.fondoPension) {
            await prisma.datosSalud.create({
              data: {
                personaId: newP.id,
                eps: item.eps || "Sura",
                arl: item.arl || "Positiva",
                fondoPensiones: item.fondoPension,
                grupoSanguineoRH: "O_POSITIVO",
              },
            });
          }

          // Contacto Emergencia
          if (item.contactoEmergenciaNombre) {
            await prisma.contactoEmergencia.create({
              data: {
                personaId: newP.id,
                nombreCompleto: item.contactoEmergenciaNombre,
                telefono: item.contactoEmergenciaTelefono || "3000000000",
                parentesco: item.contactoEmergenciaParentesco || "Familiar",
              },
            });
          }

          createdCount++;
        }
      } else {
        const idx = localPersonsState.findIndex((p) => p.numeroDocumento === numDoc);
        if (idx >= 0) {
          localPersonsState[idx] = {
            ...localPersonsState[idx],
            nombres: item.nombres,
            apellidos: item.apellidos,
            telefono: item.telefono,
            email: item.email,
            perfiles: item.perfiles,
            estado: item.estado,
            contratistaNombre: item.contratistaNombre,
          };
          updatedCount++;
        } else {
          localPersonsState.unshift({
            id: item.id,
            nombres: item.nombres,
            apellidos: item.apellidos,
            tipoDocumento: item.tipoDocumento,
            numeroDocumento: numDoc,
            telefono: item.telefono,
            email: item.email,
            perfiles: item.perfiles,
            estado: item.estado,
            fechaIngreso: new Date().toISOString().split("T")[0],
            contratistaNombre: item.contratistaNombre,
            fotoIniciales: item.fotoIniciales,
          });
          createdCount++;
        }
      }
    }

    revalidatePath("/personas");
    revalidatePath("/dashboard");
    revalidatePath("/flota");
    revalidatePath("/asignaciones");

    const refreshedList = await getPersonasDb();
    return {
      success: true,
      createdCount,
      updatedCount,
      refreshedList,
    };
  } catch (error: any) {
    console.error("Error en batchUpsertPersonasDb:", error);
    return {
      success: false,
      error: error.message || "Error al procesar la importación masiva.",
    };
  }
}

