"use server";
import { requireStaffSession } from "@/lib/auth";
export interface RolSistemaData { id: string; nombre: string; descripcion: string; permisos: string[]; esConfigurable: boolean }
export async function getRolesDb(): Promise<RolSistemaData[]> {
  await requireStaffSession(["administrativo"]);
  return [
    { id: "administrativo", nombre: "Administrador", descripcion: "Administra ERP, HSEQ, gerencia, logística y accesos.", permisos: ["erp"], esConfigurable: false },
    { id: "conductor", nombre: "Conductor", descripcion: "Portal, apps y registros propios.", permisos: ["portal_conductor"], esConfigurable: false },
  ];
}
export async function createRolAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  await requireStaffSession(["administrativo"]);
  void formData;
  return { success: false, error: "El sistema utiliza únicamente Administrador y Conductor. Los roles históricos se conservan como referencia." };
}
