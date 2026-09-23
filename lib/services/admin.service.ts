"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffSession } from "@/lib/auth";
import { SEED_ROLES } from "@/lib/data/roles";
import { fallbackOrThrow, isProductionRuntime, requireDatabaseInProduction, rethrowMutationInProduction } from "@/lib/production-safety";

export interface RolSistemaData {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: string[];
  esConfigurable: boolean;
}

let localRolesState: RolSistemaData[] = SEED_ROLES.map((r) => ({
  ...r,
  permisos: ["Personas", "Contratistas", "Flota", "Operación", "HSEQ"],
}));

/**
 * Obtiene todos los roles del sistema
 */
export async function getRolesDb(): Promise<RolSistemaData[]> {
  requireDatabaseInProduction();
  try {
    if (!process.env.DATABASE_URL) {
      return isProductionRuntime() ? [] : localRolesState;
    }

    const dbRoles = await (prisma as any).rolSistema.findMany({
      orderBy: { nombre: "asc" },
    });

    if (!dbRoles || dbRoles.length === 0) {
      return localRolesState;
    }

    return dbRoles.map((r: any) => ({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion,
      permisos: Array.isArray(r.permisos) ? r.permisos : typeof r.permisos === "string" ? JSON.parse(r.permisos) : [],
      esConfigurable: r.esConfigurable,
    }));
  } catch (error) {
    console.warn("Aviso DB Roles (usando fallback local):", error);
    return fallbackOrThrow(error, localRolesState, "No fue posible consultar roles");
  }
}

/**
 * Server Action para crear un nuevo rol en el sistema
 */
export async function createRolAction(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await requireStaffSession(["administrativo"]);
    const nombre = (formData.get("nombre") as string).trim().toUpperCase();
    const descripcion = formData.get("descripcion") as string;
    const permisosRaw = formData.getAll("permisos") as string[];

    const newId = `rol_${Date.now()}`;
    const newRol: RolSistemaData = {
      id: newId,
      nombre,
      descripcion,
      permisos: permisosRaw,
      esConfigurable: true,
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await (prisma as any).rolSistema.create({
          data: {
            nombre,
            descripcion,
            permisos: permisosRaw,
            esConfigurable: true,
          },
        });
        newRol.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Rol en PostgreSQL:", dbErr);
        rethrowMutationInProduction(dbErr, "No fue posible guardar el rol");
      }
    }

    localRolesState.push(newRol);
    revalidatePath("/administracion");

    return { success: true, id: newRol.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear el rol." };
  }
}
