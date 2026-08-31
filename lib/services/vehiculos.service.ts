"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_VEHICULOS, getVehiculoById as getSeedVehiculoById } from "@/lib/data/vehiculos";
import { getContratistaById } from "@/lib/data/contratistas";
import {
  Vehiculo,
  TipoVehiculo,
  ServicioVehiculo,
  EstadoVehiculo,
} from "@/lib/types/vehiculo";

let localVehiculosState: Vehiculo[] = [...SEED_VEHICULOS];

/**
 * Obtiene todos los vehículos desde PostgreSQL (o fallback local)
 */
export async function getVehiculosDb(): Promise<Vehiculo[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localVehiculosState;
    }

    const dbVehicles = await prisma.vehiculo.findMany({
      orderBy: { placa: "asc" },
    });

    return dbVehicles.map((v) => ({
      id: v.id,
      placa: v.placa,
      tipo: v.tipo as TipoVehiculo,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      capacidad: v.capacidad,
      contratistaId: v.contratistaId,
      contratistaNombre: v.contratistaNombre,
      servicio: v.servicio as ServicioVehiculo,
      estado: v.estado as EstadoVehiculo,
      documentos: {
        soatVencimiento: v.soatVencimiento.toISOString().split("T")[0],
        rtmVencimiento: v.rtmVencimiento.toISOString().split("T")[0],
        polizaVencimiento: v.polizaVencimiento.toISOString().split("T")[0],
      },
    }));
  } catch (error) {
    console.warn("Aviso de conexión DB Vehículos (usando almacén local):", error);
    return localVehiculosState;
  }
}

/**
 * Obtiene un vehículo por ID
 */
export async function getVehiculoByIdDb(id: string): Promise<Vehiculo | undefined> {
  try {
    if (!process.env.DATABASE_URL) {
      return localVehiculosState.find((v) => v.id === id) || getSeedVehiculoById(id);
    }

    const v = await prisma.vehiculo.findUnique({
      where: { id },
    });

    if (!v) {
      return localVehiculosState.find((vehiculo) => vehiculo.id === id) || getSeedVehiculoById(id);
    }

    return {
      id: v.id,
      placa: v.placa,
      tipo: v.tipo as TipoVehiculo,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      capacidad: v.capacidad,
      contratistaId: v.contratistaId,
      contratistaNombre: v.contratistaNombre,
      servicio: v.servicio as ServicioVehiculo,
      estado: v.estado as EstadoVehiculo,
      documentos: {
        soatVencimiento: v.soatVencimiento.toISOString().split("T")[0],
        rtmVencimiento: v.rtmVencimiento.toISOString().split("T")[0],
        polizaVencimiento: v.polizaVencimiento.toISOString().split("T")[0],
      },
    };
  } catch (error) {
    return localVehiculosState.find((v) => v.id === id) || getSeedVehiculoById(id);
  }
}

/**
 * Server Action para registrar un nuevo vehículo en la flota
 */
export async function createVehiculoAction(
  formData: FormData
): Promise<{ success: boolean; vehiculoId?: string; error?: string }> {
  try {
    const placa = ((formData.get("placa") as string) || "").toUpperCase().trim();
    const tipo = (formData.get("tipo") as TipoVehiculo) || "van";
    const marca = (formData.get("marca") as string) || "";
    const modelo = (formData.get("modelo") as string) || "";
    const anio = parseInt((formData.get("anio") as string) || "2022", 10);
    const capacidad = parseInt((formData.get("capacidad") as string) || "15", 10);
    const contratistaId = (formData.get("contratistaId") as string) || "c1";
    const contratista = getContratistaById(contratistaId);
    const contratistaNombre = contratista ? contratista.nombre : "Contratista General";
    const servicio = (formData.get("servicio") as ServicioVehiculo) || "especial";

    const soatVencimiento = (formData.get("soatVencimiento") as string) || new Date().toISOString().split("T")[0];
    const rtmVencimiento = (formData.get("rtmVencimiento") as string) || new Date().toISOString().split("T")[0];
    const polizaVencimiento = (formData.get("polizaVencimiento") as string) || new Date().toISOString().split("T")[0];

    const newId = `v_${Date.now()}`;

    const newVehiculoObj: Vehiculo = {
      id: newId,
      placa,
      tipo,
      marca,
      modelo,
      anio,
      capacidad,
      contratistaId,
      contratistaNombre,
      servicio,
      estado: "activo",
      documentos: {
        soatVencimiento,
        rtmVencimiento,
        polizaVencimiento,
      },
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.vehiculo.create({
          data: {
            placa,
            tipo,
            marca,
            modelo,
            anio,
            capacidad,
            contratistaId,
            contratistaNombre,
            servicio,
            estado: "activo",
            soatVencimiento: new Date(soatVencimiento),
            rtmVencimiento: new Date(rtmVencimiento),
            polizaVencimiento: new Date(polizaVencimiento),
          },
        });
        newVehiculoObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando Vehículo en PostgreSQL:", dbErr);
      }
    }

    localVehiculosState.unshift(newVehiculoObj);
    revalidatePath("/flota");
    revalidatePath("/asignaciones/nueva");
    revalidatePath("/documentos");

    return { success: true, vehiculoId: newVehiculoObj.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar vehículo." };
  }
}

/**
 * Server Action para actualizar información y documentos de un vehículo
 */
export async function updateVehiculoAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const marca = formData.get("marca") as string;
    const modelo = formData.get("modelo") as string;
    const capacidad = formData.get("capacidad") ? parseInt(formData.get("capacidad") as string, 10) : undefined;
    const estado = formData.get("estado") as EstadoVehiculo;
    const servicio = formData.get("servicio") as ServicioVehiculo;

    const soatVencimiento = formData.get("soatVencimiento") as string;
    const rtmVencimiento = formData.get("rtmVencimiento") as string;
    const polizaVencimiento = formData.get("polizaVencimiento") as string;

    const index = localVehiculosState.findIndex((v) => v.id === id);
    if (index >= 0) {
      const prev = localVehiculosState[index];
      localVehiculosState[index] = {
        ...prev,
        marca: marca || prev.marca,
        modelo: modelo || prev.modelo,
        capacidad: capacidad !== undefined ? capacidad : prev.capacidad,
        estado: estado || prev.estado,
        servicio: servicio || prev.servicio,
        documentos: {
          soatVencimiento: soatVencimiento || prev.documentos.soatVencimiento,
          rtmVencimiento: rtmVencimiento || prev.documentos.rtmVencimiento,
          polizaVencimiento: polizaVencimiento || prev.documentos.polizaVencimiento,
        },
      };
    }

    if (process.env.DATABASE_URL) {
      try {
        await prisma.vehiculo.update({
          where: { id },
          data: {
            marca: marca || undefined,
            modelo: modelo || undefined,
            capacidad: capacidad !== undefined ? capacidad : undefined,
            estado: estado || undefined,
            servicio: servicio || undefined,
            soatVencimiento: soatVencimiento ? new Date(soatVencimiento) : undefined,
            rtmVencimiento: rtmVencimiento ? new Date(rtmVencimiento) : undefined,
            polizaVencimiento: polizaVencimiento ? new Date(polizaVencimiento) : undefined,
          },
        });
      } catch (err) {
        console.warn("No se pudo actualizar en DB Vehículo:", err);
      }
    }

    revalidatePath(`/flota/${id}`);
    revalidatePath("/flota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar vehículo." };
  }
}
