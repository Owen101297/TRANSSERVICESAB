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
import { getContratistaByIdDb } from "@/lib/services/contratistas.service";

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

    const contratistaId = formData.get("contratistaId") as string;
    let contratistaNombre: string | undefined;
    if (contratistaId) {
      const c = await getContratistaByIdDb(contratistaId);
      if (c) contratistaNombre = c.nombre;
    }

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
      contratistaId: contratistaId || undefined,
      contratistaNombre: contratistaNombre || undefined,
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
            contratistaId: contratistaId || null,
            contratistaNombre: contratistaNombre || null,
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
    revalidatePath("/dashboard");

    return {
      success: true,
      personaId: newPersonaObj.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error al crear la persona.",
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

    const contratistaId = formData.get("contratistaId") as string;
    let contratistaNombre: string | undefined;
    if (contratistaId) {
      const c = await getContratistaByIdDb(contratistaId);
      if (c) contratistaNombre = c.nombre;
    }

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
        contratistaId: contratistaId !== undefined ? (contratistaId || undefined) : prev.contratistaId,
        contratistaNombre: contratistaNombre !== undefined ? (contratistaNombre || undefined) : prev.contratistaNombre,
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
            contratistaId: contratistaId !== undefined ? (contratistaId || null) : undefined,
            contratistaNombre: contratistaNombre !== undefined ? (contratistaNombre || null) : undefined,
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

function cleanStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/\\/g, "")
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .trim();
}

function parseSafeDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime()) || d.getFullYear() < 1970 || d.getFullYear() > 2100) return null;
  return d;
}

/**
 * Importa o actualiza un lote de personas y sus expedientes en PostgreSQL
 * con sanitización robusta y aislamiento de errores por fila.
 */
export async function batchUpsertPersonasDb(items: any[]) {
  try {
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errorsList: string[] = [];

    for (const item of items) {
      if (item.action === "error") {
        failedCount++;
        continue;
      }

      const numDoc = cleanStr(item.numeroDocumento).replace(/\D/g, "");
      if (!numDoc) {
        failedCount++;
        continue;
      }

      const nombres = cleanStr(item.nombres);
      const apellidos = cleanStr(item.apellidos);
      const tipoDoc = cleanStr(item.tipoDocumento) || "CC";
      const telefono = cleanStr(item.telefono) || "3000000000";
      const email = cleanStr(item.email) || `${nombres.toLowerCase().replace(/[^a-z0-9]/g, ".") || "usuario"}@transservices.com`;
      const contratistaNombre = cleanStr(item.contratistaNombre);
      const estado = cleanStr(item.estado) || "activo";
      const perfiles = Array.isArray(item.perfiles) && item.perfiles.length > 0 ? item.perfiles : ["conductor"];
      const fotoInitials = computeInitials(nombres, apellidos);

      try {
        let contratistaId: string | null = null;
        if (contratistaNombre && process.env.DATABASE_URL) {
          const c = await prisma.contratista.findFirst({
            where: { razonSocial: { contains: contratistaNombre, mode: "insensitive" } },
          });
          if (c) contratistaId = c.id;
        }

        if (process.env.DATABASE_URL) {
          const existing = await prisma.persona.findUnique({
            where: { numeroDocumento: numDoc },
            include: { licenciaConduccion: true, datosSalud: true, contactoEmergencia: true },
          });

          if (existing) {
            await prisma.persona.update({
              where: { id: existing.id },
              data: {
                nombres,
                apellidos,
                tipoDocumento: tipoDoc,
                telefono: telefono || existing.telefono,
                email: email || existing.email,
                perfiles,
                estado,
                contratistaId: contratistaId || existing.contratistaId,
                contratistaNombre: contratistaNombre || existing.contratistaNombre,
                fotoIniciales: fotoInitials,
              },
            });

            // Licencia
            const safeLicVenc = parseSafeDate(item.vencimientoLicencia);
            if (item.numeroLicencia || safeLicVenc) {
              const licNum = cleanStr(item.numeroLicencia) || numDoc;
              if (existing.licenciaConduccion) {
                await prisma.licenciaConduccion.update({
                  where: { personaId: existing.id },
                  data: {
                    numero: licNum || existing.licenciaConduccion.numero,
                    categorias: item.categoriasLicencia && item.categoriasLicencia.length > 0
                      ? item.categoriasLicencia
                      : existing.licenciaConduccion.categorias,
                    fechaVencimiento: safeLicVenc || existing.licenciaConduccion.fechaVencimiento,
                  },
                });
              } else if (safeLicVenc) {
                await prisma.licenciaConduccion.create({
                  data: {
                    personaId: existing.id,
                    numero: licNum,
                    categorias: item.categoriasLicencia && item.categoriasLicencia.length > 0
                      ? item.categoriasLicencia
                      : ["C2"],
                    fechaVencimiento: safeLicVenc,
                  },
                });
              }
            }

            // Salud
            if (item.eps || item.arl || item.fondoPension || item.grupoSanguineo) {
              const eps = cleanStr(item.eps) || "Sura";
              const arl = cleanStr(item.arl) || "Positiva";
              const fondo = cleanStr(item.fondoPension) || undefined;
              const rh = cleanStr(item.grupoSanguineo) || "O_POSITIVO";

              if (existing.datosSalud) {
                await prisma.datosSalud.update({
                  where: { personaId: existing.id },
                  data: {
                    eps: item.eps ? eps : existing.datosSalud.eps,
                    arl: item.arl ? arl : existing.datosSalud.arl,
                    fondoPensiones: fondo || existing.datosSalud.fondoPensiones,
                  },
                });
              } else {
                await prisma.datosSalud.create({
                  data: {
                    personaId: existing.id,
                    eps,
                    arl,
                    fondoPensiones: fondo,
                    grupoSanguineoRH: rh,
                  },
                });
              }
            }

            // Contacto Emergencia
            if (item.contactoEmergenciaNombre) {
              const nomEm = cleanStr(item.contactoEmergenciaNombre);
              const telEm = cleanStr(item.contactoEmergenciaTelefono) || "3000000000";
              const parEm = cleanStr(item.contactoEmergenciaParentesco) || "Familiar";

              if (existing.contactoEmergencia) {
                await prisma.contactoEmergencia.update({
                  where: { personaId: existing.id },
                  data: {
                    nombreCompleto: nomEm,
                    telefono: telEm || existing.contactoEmergencia.telefono,
                    parentesco: parEm || existing.contactoEmergencia.parentesco,
                  },
                });
              } else {
                await prisma.contactoEmergencia.create({
                  data: {
                    personaId: existing.id,
                    nombreCompleto: nomEm,
                    telefono: telEm,
                    parentesco: parEm,
                  },
                });
              }
            }

            updatedCount++;
          } else {
            // Crear Nueva Persona
            const newP = await prisma.persona.create({
              data: {
                nombres,
                apellidos,
                tipoDocumento: tipoDoc,
                numeroDocumento: numDoc,
                telefono,
                email,
                perfiles,
                estado,
                contratistaId,
                contratistaNombre: contratistaNombre || undefined,
                fotoIniciales: fotoInitials,
              },
            });

            // Licencia
            const safeLicVenc = parseSafeDate(item.vencimientoLicencia);
            if (safeLicVenc) {
              await prisma.licenciaConduccion.create({
                data: {
                  personaId: newP.id,
                  numero: cleanStr(item.numeroLicencia) || numDoc,
                  categorias: item.categoriasLicencia && item.categoriasLicencia.length > 0
                    ? item.categoriasLicencia
                    : ["C2"],
                  fechaVencimiento: safeLicVenc,
                },
              });
            }

            // Salud
            if (item.eps || item.arl || item.fondoPension) {
              await prisma.datosSalud.create({
                data: {
                  personaId: newP.id,
                  eps: cleanStr(item.eps) || "Sura",
                  arl: cleanStr(item.arl) || "Positiva",
                  fondoPensiones: cleanStr(item.fondoPension) || undefined,
                  grupoSanguineoRH: cleanStr(item.grupoSanguineo) || "O_POSITIVO",
                },
              });
            }

            // Contacto Emergencia
            if (item.contactoEmergenciaNombre) {
              await prisma.contactoEmergencia.create({
                data: {
                  personaId: newP.id,
                  nombreCompleto: cleanStr(item.contactoEmergenciaNombre),
                  telefono: cleanStr(item.contactoEmergenciaTelefono) || "3000000000",
                  parentesco: cleanStr(item.contactoEmergenciaParentesco) || "Familiar",
                },
              });
            }

            createdCount++;
          }
        } else {
          // Local State fallback
          const idx = localPersonsState.findIndex((p) => p.numeroDocumento === numDoc);
          if (idx >= 0) {
            localPersonsState[idx] = {
              ...localPersonsState[idx],
              nombres,
              apellidos,
              telefono,
              email,
              perfiles,
              estado: estado as any,
              contratistaNombre,
            };
            updatedCount++;
          } else {
            localPersonsState.unshift({
              id: item.id || `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              nombres,
              apellidos,
              tipoDocumento: tipoDoc as any,
              numeroDocumento: numDoc,
              telefono,
              email,
              perfiles,
              estado: estado as any,
              fechaIngreso: new Date().toISOString().split("T")[0],
              contratistaNombre,
              fotoIniciales: fotoInitials,
            });
            createdCount++;
          }
        }
      } catch (rowErr: any) {
        console.warn(`Error al procesar persona con cédula ${numDoc}:`, rowErr.message);
        errorsList.push(`Doc ${numDoc}: ${rowErr.message}`);
        failedCount++;
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
      failedCount,
      errorsList,
      refreshedList,
    };
  } catch (error: any) {
    console.error("Error global en batchUpsertPersonasDb:", error);
    return {
      success: false,
      error: error.message || "Error al procesar la importación masiva.",
    };
  }
}

/**
 * Elimina una persona y sus expedientes asociados de la base de datos
 */
export async function deletePersonaDb(id: string) {
  try {
    if (process.env.DATABASE_URL) {
      // Eliminar asignaciones asociadas
      await prisma.asignacion.deleteMany({
        where: { conductorId: id },
      });
      // Eliminar documentos adjuntos asociados
      await prisma.documentoAdjunto.deleteMany({
        where: { entidadId: id, entidadTipo: "persona" },
      });
      // Eliminar persona en PostgreSQL (cascadea a licencia, examenMedico, datosSalud, contactoEmergencia)
      await prisma.persona.delete({
        where: { id },
      });
    } else {
      localPersonsState = localPersonsState.filter((p) => p.id !== id);
    }

    revalidatePath("/personas");
    revalidatePath("/dashboard");
    revalidatePath("/flota");
    revalidatePath("/asignaciones");

    const refreshedList = await getPersonasDb();
    return { success: true, refreshedList };
  } catch (error: any) {
    console.error("Error al eliminar persona:", error);
    return { success: false, error: error.message || "Error al eliminar registro." };
  }
}

/**
 * Elimina múltiples personas seleccionadas en un solo lote
 */
export async function deleteMultiplePersonasDb(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: true, count: 0 };
    }

    if (process.env.DATABASE_URL) {
      await prisma.asignacion.deleteMany({
        where: { conductorId: { in: ids } },
      });
      await prisma.documentoAdjunto.deleteMany({
        where: { entidadId: { in: ids }, entidadTipo: "persona" },
      });
      await prisma.persona.deleteMany({
        where: { id: { in: ids } },
      });
    } else {
      localPersonsState = localPersonsState.filter((p) => !ids.includes(p.id));
    }

    revalidatePath("/personas");
    revalidatePath("/dashboard");
    revalidatePath("/flota");
    revalidatePath("/asignaciones");

    const refreshedList = await getPersonasDb();
    return { success: true, count: ids.length, refreshedList };
  } catch (error: any) {
    console.error("Error al eliminar personas seleccionadas:", error);
    return { success: false, error: error.message || "Error al eliminar registros." };
  }
}

/**
 * Cambia el estado operativo rápido de una persona (activo, descanso, vacaciones, inactivo)
 */
export async function cambiarEstadoPersonaDb(id: string, nuevoEstado: EstadoPersona) {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.persona.update({
        where: { id },
        data: {
          estado: nuevoEstado,
        },
      });
    } else {
      const idx = localPersonsState.findIndex((p) => p.id === id);
      if (idx >= 0) {
        localPersonsState[idx] = {
          ...localPersonsState[idx],
          estado: nuevoEstado,
        };
      }
    }

    revalidatePath("/personas");
    revalidatePath(`/personas/${id}`);
    revalidatePath("/dashboard");
    revalidatePath("/flota");
    revalidatePath("/asignaciones");

    const refreshedList = await getPersonasDb();
    return { success: true, refreshedList };
  } catch (error: any) {
    console.error("Error al cambiar estado de persona:", error);
    return { success: false, error: error.message || "Error al actualizar estado." };
  }
}

/**
 * Inactiva / Retira lógicamente a una persona preservando todo su expediente histórico
 */
export async function retirarPersonaDb(id: string, motivo: string = "Retiro voluntario") {
  try {
    if (process.env.DATABASE_URL) {
      // 1. Finalizar asignaciones activas del conductor
      await prisma.asignacion.updateMany({
        where: { conductorId: id, estado: "activa" },
        data: {
          estado: "finalizada",
          fechaFin: new Date(),
          observaciones: `Finalizada por retiro de conductor: ${motivo}`,
        },
      });

      // 2. Marcar a la persona como retirada
      await prisma.persona.update({
        where: { id },
        data: {
          estado: "retirado",
        },
      });
    } else {
      const idx = localPersonsState.findIndex((p) => p.id === id);
      if (idx >= 0) {
        localPersonsState[idx] = {
          ...localPersonsState[idx],
          estado: "retirado",
          motivoRetiro: motivo,
          fechaRetiro: new Date().toISOString().split("T")[0],
        };
      }
    }

    revalidatePath("/personas");
    revalidatePath(`/personas/${id}`);
    revalidatePath("/dashboard");
    revalidatePath("/flota");
    revalidatePath("/asignaciones");

    const refreshedList = await getPersonasDb();
    return { success: true, refreshedList };
  } catch (error: any) {
    console.error("Error al retirar persona:", error);
    return { success: false, error: error.message || "Error al retirar registro." };
  }
}

/**
 * Reactiva a una persona previamente retirada o inactiva
 */
export async function reactivarPersonaDb(id: string) {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.persona.update({
        where: { id },
        data: {
          estado: "activo",
        },
      });
    } else {
      const idx = localPersonsState.findIndex((p) => p.id === id);
      if (idx >= 0) {
        localPersonsState[idx] = {
          ...localPersonsState[idx],
          estado: "activo",
          motivoRetiro: undefined,
          fechaRetiro: undefined,
        };
      }
    }

    revalidatePath("/personas");
    revalidatePath(`/personas/${id}`);
    revalidatePath("/dashboard");
    revalidatePath("/flota");
    revalidatePath("/asignaciones");

    const refreshedList = await getPersonasDb();
    return { success: true, refreshedList };
  } catch (error: any) {
    console.error("Error al reactivar persona:", error);
    return { success: false, error: error.message || "Error al reactivar registro." };
  }
}

/**
 * Retira múltiples personas seleccionadas en un solo lote
 */
export async function retirarMultiplePersonasDb(ids: string[], motivo: string = "Retiro masivo operativo") {
  try {
    if (!ids || ids.length === 0) return { success: true, count: 0 };

    if (process.env.DATABASE_URL) {
      await prisma.asignacion.updateMany({
        where: { conductorId: { in: ids }, estado: "activa" },
        data: {
          estado: "finalizada",
          fechaFin: new Date(),
          observaciones: `Finalizada por retiro masivo: ${motivo}`,
        },
      });

      await prisma.persona.updateMany({
        where: { id: { in: ids } },
        data: {
          estado: "retirado",
        },
      });
    } else {
      localPersonsState = localPersonsState.map((p) =>
        ids.includes(p.id)
          ? { ...p, estado: "retirado", motivoRetiro: motivo, fechaRetiro: new Date().toISOString().split("T")[0] }
          : p
      );
    }

    revalidatePath("/personas");
    revalidatePath("/dashboard");
    revalidatePath("/flota");
    revalidatePath("/asignaciones");

    const refreshedList = await getPersonasDb();
    return { success: true, count: ids.length, refreshedList };
  } catch (error: any) {
    console.error("Error al retirar personas seleccionadas:", error);
    return { success: false, error: error.message || "Error al procesar retiro masivo." };
  }
}

export interface DocumentoExpediente {
  id: string;
  entidadId: string;
  tipoDocumento: string;
  nombre: string;
  archivoUrl: string;
  tamano?: string;
  mimeType?: string;
  createdAt: string;
}

let localDocumentosState: DocumentoExpediente[] = [];

/**
 * Obtiene los documentos del expediente de una persona
 */
export async function getDocumentosPersonaDb(personaId: string): Promise<DocumentoExpediente[]> {
  try {
    if (process.env.DATABASE_URL) {
      const docs = await prisma.documentoAdjunto.findMany({
        where: { entidadId: personaId, entidadTipo: "persona" },
        orderBy: { createdAt: "desc" },
      });
      return docs.map((d) => ({
        id: d.id,
        entidadId: d.entidadId,
        tipoDocumento: d.tipoDocumento,
        nombre: d.nombre,
        archivoUrl: d.archivoUrl,
        tamano: d.tamano ?? undefined,
        mimeType: d.mimeType ?? undefined,
        createdAt: d.createdAt.toISOString(),
      }));
    }
    return localDocumentosState.filter((d) => d.entidadId === personaId);
  } catch (error) {
    console.warn("Aviso: usando almacén local de documentos:", error);
    return localDocumentosState.filter((d) => d.entidadId === personaId);
  }
}

/**
 * Guarda o actualiza un documento en el expediente de una persona
 */
export async function guardarDocumentoPersonaDb(
  personaId: string,
  tipoDocumento: string,
  nombre: string,
  archivoUrl: string,
  tamano?: string,
  mimeType?: string
) {
  try {
    if (process.env.DATABASE_URL) {
      // Eliminar versión anterior del mismo tipo de documento si existe
      await prisma.documentoAdjunto.deleteMany({
        where: { entidadId: personaId, entidadTipo: "persona", tipoDocumento },
      });

      const nuevoDoc = await prisma.documentoAdjunto.create({
        data: {
          entidadId: personaId,
          entidadTipo: "persona",
          tipoDocumento,
          nombre,
          archivoUrl,
          tamano,
          mimeType,
        },
      });

      revalidatePath(`/personas/${personaId}`);
      return { success: true, documento: nuevoDoc };
    }

    localDocumentosState = localDocumentosState.filter(
      (d) => !(d.entidadId === personaId && d.tipoDocumento === tipoDocumento)
    );

    const docLocal: DocumentoExpediente = {
      id: `doc_${Date.now()}`,
      entidadId: personaId,
      tipoDocumento,
      nombre,
      archivoUrl,
      tamano,
      mimeType,
      createdAt: new Date().toISOString(),
    };
    localDocumentosState.push(docLocal);

    revalidatePath(`/personas/${personaId}`);
    return { success: true, documento: docLocal };
  } catch (error: any) {
    console.error("Error al guardar documento:", error);
    return { success: false, error: error.message || "Error al guardar documento." };
  }
}

/**
 * Elimina un documento específico del expediente
 */
export async function eliminarDocumentoPersonaDb(documentoId: string, personaId: string) {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.documentoAdjunto.delete({
        where: { id: documentoId },
      });
    } else {
      localDocumentosState = localDocumentosState.filter((d) => d.id !== documentoId);
    }

    revalidatePath(`/personas/${personaId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar documento:", error);
    return { success: false, error: error.message || "Error al eliminar documento." };
  }
}

