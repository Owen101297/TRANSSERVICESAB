"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_CONTRATISTAS, getContratistaById as getSeedContratistaById } from "@/lib/data/contratistas";
import { Contratista, TipoOperacion, EstadoContratista } from "@/lib/types/contratista";

let localContratistasState: Contratista[] = [];

/**
 * Obtiene todos los contratistas desde DB (o fallback local)
 */
export async function getContratistasDb(): Promise<Contratista[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localContratistasState;
    }

    const dbContratistas = await prisma.contratista.findMany({
      orderBy: { razonSocial: "asc" },
    });

    return dbContratistas.map((c) => ({
      id: c.id,
      nombre: c.razonSocial,
      nit: c.nit,
      tipoOperacion: (c.tipoOperacion as TipoOperacion) || "fija",
      contactoNombre: c.contactoNombre || "Pendiente",
      contactoTelefono: c.telefono,
      contactoEmail: c.email,
      fechaVinculacion: c.fechaVinculacion.toISOString().split("T")[0],
      fechaFinContrato: c.fechaFinContrato ? c.fechaFinContrato.toISOString().split("T")[0] : undefined,
      estado: (c.estado as EstadoContratista) || "activo",
      notas: c.notas ?? undefined,
    }));
  } catch (error) {
    console.warn("Aviso de conexión DB Contratistas (usando almacén local):", error);
    return localContratistasState;
  }
}

/**
 * Obtiene un contratista por ID
 */
export async function getContratistaByIdDb(id: string): Promise<Contratista | undefined> {
  try {
    if (!process.env.DATABASE_URL) {
      return localContratistasState.find((c) => c.id === id) || getSeedContratistaById(id);
    }

    const c = await prisma.contratista.findUnique({
      where: { id },
    });

    if (!c) {
      return localContratistasState.find((contratista) => contratista.id === id) || getSeedContratistaById(id);
    }

    return {
      id: c.id,
      nombre: c.razonSocial,
      nit: c.nit,
      tipoOperacion: (c.tipoOperacion as TipoOperacion) || "fija",
      contactoNombre: c.contactoNombre || "Pendiente",
      contactoTelefono: c.telefono,
      contactoEmail: c.email,
      fechaVinculacion: c.fechaVinculacion.toISOString().split("T")[0],
      fechaFinContrato: c.fechaFinContrato ? c.fechaFinContrato.toISOString().split("T")[0] : undefined,
      estado: (c.estado as EstadoContratista) || "activo",
      notas: c.notas ?? undefined,
    };
  } catch (error) {
    return localContratistasState.find((c) => c.id === id) || getSeedContratistaById(id);
  }
}

/**
 * Server Action para registrar un nuevo contratista
 */
export async function createContratistaAction(formData: FormData): Promise<{ success: boolean; contratistaId?: string; error?: string }> {
  try {
    const nombre = formData.get("nombre") as string;
    const nit = (formData.get("nit") as string)?.trim();
    const tipoOperacion = (formData.get("tipoOperacion") as TipoOperacion) || "fija";
    const contactoNombre = (formData.get("contactoNombre") as string) || "Pendiente";
    const contactoTelefono = (formData.get("contactoTelefono") as string) || "Pendiente";
    const contactoEmail = (formData.get("contactoEmail") as string) || "pendiente@ejemplo.com";
    const fechaVinculacion = (formData.get("fechaVinculacion") as string) || new Date().toISOString().split("T")[0];
    const fechaFinContrato = (formData.get("fechaFinContrato") as string) || undefined;
    const notas = (formData.get("notas") as string) || undefined;

    const newId = `c_${Date.now()}`;

    const newContratistaObj: Contratista = {
      id: newId,
      nombre,
      nit,
      tipoOperacion,
      contactoNombre,
      contactoTelefono,
      contactoEmail,
      fechaVinculacion,
      fechaFinContrato,
      estado: "activo",
      notas,
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.contratista.create({
          data: {
            razonSocial: nombre,
            nit,
            tipoOperacion,
            contactoNombre,
            telefono: contactoTelefono,
            email: contactoEmail,
            fechaVinculacion: new Date(fechaVinculacion),
            fechaFinContrato: fechaFinContrato ? new Date(fechaFinContrato) : null,
            estado: "activo",
            notas,
          },
        });
        newContratistaObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Contratista en PostgreSQL:", dbErr);
      }
    }

    localContratistasState.unshift(newContratistaObj);
    revalidatePath("/contratistas");
    revalidatePath("/flota/nuevo");
    revalidatePath("/asignaciones/nueva");

    return { success: true, contratistaId: newContratistaObj.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar contratista." };
  }
}

/**
 * Server Action para actualizar un contratista
 */
export async function updateContratistaAction(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const nombre = formData.get("nombre") as string;
    const tipoOperacion = formData.get("tipoOperacion") as TipoOperacion;
    const contactoNombre = formData.get("contactoNombre") as string;
    const contactoTelefono = formData.get("contactoTelefono") as string;
    const contactoEmail = formData.get("contactoEmail") as string;
    const estado = formData.get("estado") as EstadoContratista;
    const notas = formData.get("notas") as string;

    const index = localContratistasState.findIndex((c) => c.id === id);
    if (index >= 0) {
      const prev = localContratistasState[index];
      localContratistasState[index] = {
        ...prev,
        nombre: nombre || prev.nombre,
        tipoOperacion: tipoOperacion || prev.tipoOperacion,
        contactoNombre: contactoNombre || prev.contactoNombre,
        contactoTelefono: contactoTelefono || prev.contactoTelefono,
        contactoEmail: contactoEmail || prev.contactoEmail,
        estado: estado || prev.estado,
        notas: notas !== undefined ? notas : prev.notas,
      };
    }

    if (process.env.DATABASE_URL) {
      try {
        await prisma.contratista.update({
          where: { id },
          data: {
            razonSocial: nombre || undefined,
            tipoOperacion: tipoOperacion || undefined,
            contactoNombre: contactoNombre || undefined,
            telefono: contactoTelefono || undefined,
            email: contactoEmail || undefined,
            estado: estado || undefined,
            notas: notas !== undefined ? notas : undefined,
          },
        });
      } catch (err) {
        console.warn("No se pudo actualizar en DB:", err);
      }
    }

    revalidatePath(`/contratistas/${id}`);
    revalidatePath("/contratistas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar contratista." };
  }
}
