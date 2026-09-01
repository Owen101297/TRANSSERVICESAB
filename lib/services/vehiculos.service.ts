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
import { DiagnosticoFilaVehiculo } from "@/lib/data/flota-upsert";

let localVehiculosState: Vehiculo[] = [];

/**
 * Obtiene todos los vehículos desde PostgreSQL (o fallback local)
 */
export async function getVehiculosDb(): Promise<Vehiculo[]> {
  try {
    const dbVehicles = await prisma.vehiculo.findMany({
      orderBy: { placa: "asc" },
    });

    if (dbVehicles && dbVehicles.length > 0) {
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
          soatVencimiento: v.soatVencimiento ? v.soatVencimiento.toISOString().split("T")[0] : "",
          rtmVencimiento: v.rtmVencimiento ? v.rtmVencimiento.toISOString().split("T")[0] : "",
          polizaVencimiento: v.polizaVencimiento ? v.polizaVencimiento.toISOString().split("T")[0] : "",
        },
      }));
    }
  } catch (error) {
    console.warn("Aviso de conexión DB Vehículos (usando almacén local):", error);
  }

  return localVehiculosState;
}

/**
 * Obtiene un vehículo por ID
 */
export async function getVehiculoByIdDb(id: string): Promise<Vehiculo | undefined> {
  try {
    const v = await prisma.vehiculo.findUnique({
      where: { id },
    });

    if (v) {
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
          soatVencimiento: v.soatVencimiento ? v.soatVencimiento.toISOString().split("T")[0] : "",
          rtmVencimiento: v.rtmVencimiento ? v.rtmVencimiento.toISOString().split("T")[0] : "",
          polizaVencimiento: v.polizaVencimiento ? v.polizaVencimiento.toISOString().split("T")[0] : "",
        },
      };
    }
  } catch (error) {
    console.warn("Error consultando vehículo por id:", error);
  }

  return localVehiculosState.find((v) => v.id === id) || getSeedVehiculoById(id);
}

/**
 * Registra un nuevo vehículo en la flota
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
    const contratistaNombre = (formData.get("contratistaNombre") as string) || (contratista ? contratista.nombre : "Propio / Cooperativa");
    const servicio = (formData.get("servicio") as ServicioVehiculo) || "especial";

    const soatVencimiento = (formData.get("soatVencimiento") as string) || new Date().toISOString().split("T")[0];
    const rtmVencimiento = (formData.get("rtmVencimiento") as string) || new Date().toISOString().split("T")[0];
    const polizaVencimiento = (formData.get("polizaVencimiento") as string) || new Date().toISOString().split("T")[0];

    let newId = `v_${Date.now()}`;

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
      newId = created.id;
    } catch (dbErr) {
      console.warn("Guardando vehículo en memoria por error DB:", dbErr);
    }

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

    localVehiculosState.unshift(newVehiculoObj);
    revalidatePath("/flota");
    revalidatePath("/dashboard");
    revalidatePath("/asignaciones");

    return { success: true, vehiculoId: newId };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar vehículo." };
  }
}

/**
 * Cambia el estado operativo de un vehículo en 1 clic
 */
export async function cambiarEstadoVehiculoDb(
  id: string,
  nuevoEstado: EstadoVehiculo
): Promise<{ success: boolean; error?: string }> {
  try {
    try {
      await prisma.vehiculo.update({
        where: { id },
        data: { estado: nuevoEstado },
      });
    } catch (err) {
      const idx = localVehiculosState.findIndex((v) => v.id === id);
      if (idx >= 0) {
        localVehiculosState[idx].estado = nuevoEstado;
      }
    }

    revalidatePath("/flota");
    revalidatePath(`/flota/${id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al cambiar estado del vehículo." };
  }
}

/**
 * Elimina un vehículo por ID
 */
export async function deleteVehiculoDb(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    try {
      await prisma.vehiculo.delete({
        where: { id },
      });
    } catch (err) {
      localVehiculosState = localVehiculosState.filter((v) => v.id !== id);
    }

    revalidatePath("/flota");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar vehículo." };
  }
}

/**
 * Elimina múltiples vehículos seleccionados
 */
export async function deleteMultipleVehiculosDb(ids: string[]): Promise<{ success: boolean; count: number }> {
  let count = 0;
  for (const id of ids) {
    const res = await deleteVehiculoDb(id);
    if (res.success) count++;
  }
  revalidatePath("/flota");
  return { success: true, count };
}

/**
 * Carga masiva de vehículos desde diagnóstico de Excel
 */
export async function bulkUpsertVehiculosDb(
  filas: DiagnosticoFilaVehiculo[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;

    for (const f of filas) {
      if (!f.valido || !f.placa) continue;

      const soatDate = f.soatVencimiento ? new Date(f.soatVencimiento) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
      const rtmDate = f.rtmVencimiento ? new Date(f.rtmVencimiento) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
      const polizaDate = f.polizaVencimiento ? new Date(f.polizaVencimiento) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);

      try {
        await prisma.vehiculo.upsert({
          where: { placa: f.placa },
          update: {
            marca: f.marca,
            modelo: f.modelo,
            anio: f.anio,
            tipo: f.tipo,
            servicio: f.servicio,
            capacidad: f.capacidad,
            contratistaNombre: f.contratistaNombre || "Propio / Cooperativa",
            soatVencimiento: soatDate,
            rtmVencimiento: rtmDate,
            polizaVencimiento: polizaDate,
            estado: f.estado || "activo",
          },
          create: {
            placa: f.placa,
            marca: f.marca,
            modelo: f.modelo,
            anio: f.anio,
            tipo: f.tipo,
            servicio: f.servicio,
            capacidad: f.capacidad,
            contratistaId: "c_general",
            contratistaNombre: f.contratistaNombre || "Propio / Cooperativa",
            soatVencimiento: soatDate,
            rtmVencimiento: rtmDate,
            polizaVencimiento: polizaDate,
            estado: f.estado || "activo",
          },
        });
        count++;
      } catch (dbErr) {
        // Fallback local
        const idx = localVehiculosState.findIndex((x) => x.placa === f.placa);
        const vObj: Vehiculo = {
          id: idx >= 0 ? localVehiculosState[idx].id : `v_${Date.now()}_${count}`,
          placa: f.placa,
          tipo: f.tipo,
          marca: f.marca,
          modelo: f.modelo,
          anio: f.anio,
          capacidad: f.capacidad,
          contratistaId: "c_general",
          contratistaNombre: f.contratistaNombre || "Propio / Cooperativa",
          servicio: f.servicio,
          estado: f.estado || "activo",
          documentos: {
            soatVencimiento: f.soatVencimiento || new Date().toISOString().split("T")[0],
            rtmVencimiento: f.rtmVencimiento || new Date().toISOString().split("T")[0],
            polizaVencimiento: f.polizaVencimiento || new Date().toISOString().split("T")[0],
          },
        };

        if (idx >= 0) localVehiculosState[idx] = vObj;
        else localVehiculosState.push(vObj);
        count++;
      }
    }

    revalidatePath("/flota");
    revalidatePath("/dashboard");
    return { success: true, count };
  } catch (error: any) {
    return { success: false, count: 0, error: error.message || "Error en carga masiva de vehículos." };
  }
}

/**
 * Obtiene los documentos adjuntos de un vehículo
 */
export async function getAdjuntosVehiculoDb(vehiculoId: string) {
  try {
    const adjuntos = await (prisma as any).documentoAdjunto.findMany({
      where: {
        entidadTipo: "vehiculo",
        entidadId: vehiculoId,
      },
      orderBy: { createdAt: "desc" },
    });
    return adjuntos || [];
  } catch (err) {
    return [];
  }
}

/**
 * Registra un documento adjunto en el expediente del vehículo
 */
export async function crearAdjuntoVehiculoDb(
  vehiculoId: string,
  tipoDocumento: string,
  nombre: string,
  archivoUrl: string,
  fechaVencimiento?: string
) {
  try {
    const created = await (prisma as any).documentoAdjunto.create({
      data: {
        entidadTipo: "vehiculo",
        entidadId: vehiculoId,
        tipoDocumento,
        nombre,
        archivoUrl,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
      },
    });

    revalidatePath(`/flota/${vehiculoId}`);
    return { success: true, adjunto: created };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al adjuntar documento del vehículo." };
  }
}

/**
 * Elimina un documento adjunto del vehículo
 */
export async function deleteAdjuntoVehiculoDb(adjuntoId: string, vehiculoId: string) {
  try {
    await (prisma as any).documentoAdjunto.delete({
      where: { id: adjuntoId },
    });
    revalidatePath(`/flota/${vehiculoId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al eliminar documento adjunto." };
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

    revalidatePath(`/flota/${id}`);
    revalidatePath("/flota");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar vehículo." };
  }
}

