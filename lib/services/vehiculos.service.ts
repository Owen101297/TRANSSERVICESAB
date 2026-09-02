"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_VEHICULOS, getVehiculoById as getSeedVehiculoById } from "@/lib/data/vehiculos";
import {
  Vehiculo,
  TipoVehiculo,
  ServicioVehiculo,
  EstadoVehiculo,
} from "@/lib/types/vehiculo";
import { DiagnosticoFilaVehiculo } from "@/lib/data/flota-upsert";
import { ensureContratistaExistsDb } from "@/lib/services/contratistas.service";

let localVehiculosState: Vehiculo[] = [];

/**
 * Obtiene todos los vehículos desde PostgreSQL (o fallback local)
 */
export async function getVehiculosDb(): Promise<Vehiculo[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbVehicles = await prisma.vehiculo.findMany({
        orderBy: { placa: "asc" },
      });

      if (Array.isArray(dbVehicles)) {
        return dbVehicles.map((v) => ({
          id: v.id,
          placa: v.placa,
          tipo: (v.tipo as TipoVehiculo) || "van",
          marca: v.marca,
          modelo: v.modelo,
          anio: v.anio,
          capacidad: v.capacidad,
          contratistaId: v.contratistaId || "c_propio",
          contratistaNombre: v.contratistaNombre || "Propio / Cooperativa",
          servicio: (v.servicio as ServicioVehiculo) || "especial",
          estado: (v.estado as EstadoVehiculo) || "activo",
          documentos: {
            soatVencimiento: v.soatVencimiento ? v.soatVencimiento.toISOString().split("T")[0] : "",
            rtmVencimiento: v.rtmVencimiento ? v.rtmVencimiento.toISOString().split("T")[0] : "",
            polizaVencimiento: v.polizaVencimiento ? v.polizaVencimiento.toISOString().split("T")[0] : "",
          },
        }));
      }
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
    if (process.env.DATABASE_URL) {
      const v = await prisma.vehiculo.findUnique({
        where: { id },
      });

      if (v) {
        return {
          id: v.id,
          placa: v.placa,
          tipo: (v.tipo as TipoVehiculo) || "van",
          marca: v.marca,
          modelo: v.modelo,
          anio: v.anio,
          capacidad: v.capacidad,
          contratistaId: v.contratistaId || "c_propio",
          contratistaNombre: v.contratistaNombre || "Propio / Cooperativa",
          servicio: (v.servicio as ServicioVehiculo) || "especial",
          estado: (v.estado as EstadoVehiculo) || "activo",
          documentos: {
            soatVencimiento: v.soatVencimiento ? v.soatVencimiento.toISOString().split("T")[0] : "",
            rtmVencimiento: v.rtmVencimiento ? v.rtmVencimiento.toISOString().split("T")[0] : "",
            polizaVencimiento: v.polizaVencimiento ? v.polizaVencimiento.toISOString().split("T")[0] : "",
          },
        };
      }
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
    const rawContratista = (formData.get("contratistaNombre") as string) || (formData.get("contratistaId") as string) || "Propio / Cooperativa";

    let contratistaId: string | null = null;
    let contratistaNombre = rawContratista;

    try {
      const cObj = await ensureContratistaExistsDb(rawContratista);
      contratistaId = cObj.id;
      contratistaNombre = cObj.razonSocial;
    } catch (cErr) {
      console.warn("Aviso resolviendo contratista:", cErr);
    }

    const servicio = (formData.get("servicio") as ServicioVehiculo) || "especial";
    const soatVencimiento = (formData.get("soatVencimiento") as string) || new Date().toISOString().split("T")[0];
    const rtmVencimiento = (formData.get("rtmVencimiento") as string) || new Date().toISOString().split("T")[0];
    const polizaVencimiento = (formData.get("polizaVencimiento") as string) || new Date().toISOString().split("T")[0];

    let newId = `v_${Date.now()}`;

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
            contratistaId: contratistaId || undefined,
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
        console.error("Error guardando vehículo en PostgreSQL:", dbErr);
      }
    }

    const newVehiculoObj: Vehiculo = {
      id: newId,
      placa,
      tipo,
      marca,
      modelo,
      anio,
      capacidad,
      contratistaId: contratistaId || "c_propio",
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
    if (process.env.DATABASE_URL) {
      try {
        await prisma.vehiculo.update({
          where: { id },
          data: { estado: nuevoEstado },
        });
      } catch (err) {
        console.warn("Aviso actualizando estado en DB:", err);
      }
    }

    const idx = localVehiculosState.findIndex((v) => v.id === id);
    if (idx >= 0) {
      localVehiculosState[idx].estado = nuevoEstado;
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
    if (process.env.DATABASE_URL) {
      try {
        const v = await prisma.vehiculo.findUnique({ where: { id } });
        if (v) {
          // Finalizar cualquier asignación activa para que el historial quede cerrado formalmente
          await prisma.asignacion.updateMany({
            where: {
              OR: [{ vehiculoId: id }, { placa: v.placa }],
              estado: "activa",
            },
            data: {
              estado: "finalizada",
              fechaFin: new Date(),
            },
          });
        }
        await prisma.vehiculo.delete({
          where: { id },
        });
      } catch (err) {
        console.warn("Aviso eliminando de DB:", err);
      }
    }

    localVehiculosState = localVehiculosState.filter((v) => v.id !== id);

    revalidatePath("/flota");
    revalidatePath("/dashboard");
    revalidatePath("/asignaciones");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar vehículo." };
  }
}

/**
 * Elimina múltiples vehículos seleccionados
 */
export async function deleteMultipleVehiculosDb(ids: string[]): Promise<{ success: boolean; count: number }> {
  try {
    let count = 0;
    if (process.env.DATABASE_URL) {
      try {
        const vehs = await prisma.vehiculo.findMany({ where: { id: { in: ids } } });
        const placas = vehs.map((v) => v.placa);

        // Finalizar asignaciones activas de los vehículos a eliminar
        await prisma.asignacion.updateMany({
          where: {
            OR: [{ vehiculoId: { in: ids } }, { placa: { in: placas } }],
            estado: "activa",
          },
          data: {
            estado: "finalizada",
            fechaFin: new Date(),
          },
        });

        const res = await prisma.vehiculo.deleteMany({
          where: { id: { in: ids } },
        });
        count = res.count;
      } catch (err) {
        console.warn("Aviso eliminando múltiples de DB:", err);
      }
    }

    localVehiculosState = localVehiculosState.filter((v) => !ids.includes(v.id));

    revalidatePath("/flota");
    revalidatePath("/dashboard");
    revalidatePath("/asignaciones");
    return { success: true, count: count || ids.length };
  } catch (error) {
    return { success: false, count: 0 };
  }
}

/**
 * Importación masiva de vehículos desde Excel con Upsert en PostgreSQL
 */
export async function bulkUpsertVehiculosDb(
  filas: DiagnosticoFilaVehiculo[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let count = 0;

    for (const f of filas) {
      const soatDate = f.soatVencimiento ? new Date(f.soatVencimiento) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
      const rtmDate = f.rtmVencimiento ? new Date(f.rtmVencimiento) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);
      const polizaDate = f.polizaVencimiento ? new Date(f.polizaVencimiento) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 180);

      // Auto-asegurar que el contratista exista en el módulo Contratistas
      let contratistaId: string | null = null;
      let contratistaNombre = f.contratistaNombre || "Propio / Cooperativa";

      try {
        const cObj = await ensureContratistaExistsDb(contratistaNombre);
        contratistaId = cObj.id;
        contratistaNombre = cObj.razonSocial;
      } catch (cErr) {
        console.warn("Aviso ensureContratistaExistsDb:", cErr);
      }

      if (process.env.DATABASE_URL) {
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
              contratistaId: contratistaId || undefined,
              contratistaNombre,
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
              contratistaId: contratistaId || undefined,
              contratistaNombre,
              soatVencimiento: soatDate,
              rtmVencimiento: rtmDate,
              polizaVencimiento: polizaDate,
              estado: f.estado || "activo",
            },
          });
          count++;
        } catch (dbErr) {
          console.error(`Error al hacer upsert de ${f.placa} en PostgreSQL:`, dbErr);
        }
      }

      // Almacenar localmente también
      const idx = localVehiculosState.findIndex((x) => x.placa === f.placa);
      const vObj: Vehiculo = {
        id: idx >= 0 ? localVehiculosState[idx].id : `v_${Date.now()}_${count}`,
        placa: f.placa,
        tipo: f.tipo,
        marca: f.marca,
        modelo: f.modelo,
        anio: f.anio,
        capacidad: f.capacidad,
        contratistaId: contratistaId || "c_propio",
        contratistaNombre,
        servicio: f.servicio,
        estado: f.estado || "activo",
        documentos: {
          soatVencimiento: soatDate.toISOString().split("T")[0],
          rtmVencimiento: rtmDate.toISOString().split("T")[0],
          polizaVencimiento: polizaDate.toISOString().split("T")[0],
        },
      };

      if (idx >= 0) {
        localVehiculosState[idx] = vObj;
      } else {
        localVehiculosState.push(vObj);
      }
    }

    revalidatePath("/flota");
    revalidatePath("/dashboard");
    revalidatePath("/asignaciones");
    return { success: true, count: count || filas.length };
  } catch (error: any) {
    console.error("Error en bulkUpsertVehiculosDb:", error);
    return { success: false, count: 0, error: error.message || "Error al cargar la flota." };
  }
}

/**
 * Actualiza un vehículo existente
 */
export async function updateVehiculoAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const marca = formData.get("marca") as string;
    const modelo = formData.get("modelo") as string;
    const anio = parseInt((formData.get("anio") as string) || "2022", 10);
    const capacidad = parseInt((formData.get("capacidad") as string) || "15", 10);
    const tipo = formData.get("tipo") as TipoVehiculo;
    const servicio = formData.get("servicio") as ServicioVehiculo;
    const estado = formData.get("estado") as EstadoVehiculo;
    const rawContratista = (formData.get("contratistaNombre") as string) || (formData.get("contratistaId") as string) || "";

    let contratistaId: string | null = null;
    let contratistaNombre = rawContratista;

    if (rawContratista) {
      try {
        const cObj = await ensureContratistaExistsDb(rawContratista);
        contratistaId = cObj.id;
        contratistaNombre = cObj.razonSocial;
      } catch (cErr) {
        console.warn("Aviso resolviendo contratista:", cErr);
      }
    }

    const soatVencimiento = formData.get("soatVencimiento") as string;
    const rtmVencimiento = formData.get("rtmVencimiento") as string;
    const polizaVencimiento = formData.get("polizaVencimiento") as string;

    if (process.env.DATABASE_URL) {
      try {
        await prisma.vehiculo.update({
          where: { id },
          data: {
            marca: marca || undefined,
            modelo: modelo || undefined,
            anio: isNaN(anio) ? undefined : anio,
            capacidad: isNaN(capacidad) ? undefined : capacidad,
            tipo: tipo || undefined,
            servicio: servicio || undefined,
            estado: estado || undefined,
            contratistaId: contratistaId || undefined,
            contratistaNombre: contratistaNombre || undefined,
            soatVencimiento: soatVencimiento ? new Date(soatVencimiento) : undefined,
            rtmVencimiento: rtmVencimiento ? new Date(rtmVencimiento) : undefined,
            polizaVencimiento: polizaVencimiento ? new Date(polizaVencimiento) : undefined,
          },
        });
      } catch (dbErr) {
        console.warn("Aviso actualizando vehículo en DB:", dbErr);
      }
    }

    const idx = localVehiculosState.findIndex((v) => v.id === id);
    if (idx >= 0) {
      const prev = localVehiculosState[idx];
      localVehiculosState[idx] = {
        ...prev,
        marca: marca || prev.marca,
        modelo: modelo || prev.modelo,
        anio: isNaN(anio) ? prev.anio : anio,
        capacidad: isNaN(capacidad) ? prev.capacidad : capacidad,
        tipo: tipo || prev.tipo,
        servicio: servicio || prev.servicio,
        estado: estado || prev.estado,
        contratistaId: contratistaId || prev.contratistaId,
        contratistaNombre: contratistaNombre || prev.contratistaNombre,
        documentos: {
          soatVencimiento: soatVencimiento || prev.documentos?.soatVencimiento || "",
          rtmVencimiento: rtmVencimiento || prev.documentos?.rtmVencimiento || "",
          polizaVencimiento: polizaVencimiento || prev.documentos?.polizaVencimiento || "",
        },
      };
    }

    revalidatePath("/flota");
    revalidatePath(`/flota/${id}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar vehículo." };
  }
}

/**
 * Obtiene los documentos adjuntos de un vehículo
 */
export async function getAdjuntosVehiculoDb(vehiculoId: string) {
  try {
    if (process.env.DATABASE_URL) {
      const dbAdjuntos = await prisma.documentoAdjunto.findMany({
        where: { entidadTipo: "vehiculo", entidadId: vehiculoId },
        orderBy: { createdAt: "desc" },
      });
      return dbAdjuntos.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        tipoDocumento: d.tipoDocumento,
        archivoUrl: d.archivoUrl,
        tamano: d.tamano || undefined,
        mimeType: d.mimeType || undefined,
        fechaVencimiento: d.fechaVencimiento ? d.fechaVencimiento.toISOString().split("T")[0] : undefined,
        createdAt: d.createdAt.toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Aviso consultando adjuntos de vehiculo:", err);
  }
  return [];
}

/**
 * Crea un documento adjunto en el expediente del vehículo
 */
export async function crearAdjuntoVehiculoDb(
  vehiculoId: string,
  tipoDocumento: string,
  nombre: string,
  archivoUrl: string,
  fechaVencimiento?: string
) {
  try {
    let createdId = `adj_${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (process.env.DATABASE_URL) {
      const created = await prisma.documentoAdjunto.create({
        data: {
          entidadTipo: "vehiculo",
          entidadId: vehiculoId,
          tipoDocumento,
          nombre,
          archivoUrl,
          fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        },
      });
      createdId = created.id;
    }

    const adjuntoObj = {
      id: createdId,
      nombre,
      tipoDocumento,
      archivoUrl,
      fechaVencimiento,
      createdAt: nowIso,
    };

    revalidatePath(`/flota/${vehiculoId}`);
    return { success: true, adjunto: adjuntoObj };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Elimina un documento adjunto del expediente del vehículo
 */
export async function deleteAdjuntoVehiculoDb(id: string, vehiculoId: string) {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.documentoAdjunto.delete({ where: { id } });
      revalidatePath(`/flota/${vehiculoId}`);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
