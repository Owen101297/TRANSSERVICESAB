"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEED_CONTRATOS, SEED_FUECS } from "@/lib/data/fuec";
import { getVehiculoByIdDb } from "@/lib/services/vehiculos.service";
import { getPersonaByIdDb } from "@/lib/services/personas.service";
import { ContratoTransporte, Fuec, ObjetoContratoTransporte, EstadoFuec } from "@/lib/types/fuec";

let localContratosState: ContratoTransporte[] = [...SEED_CONTRATOS];
let localFuecsState: Fuec[] = [...SEED_FUECS];

/**
 * Obtiene todos los FUECs emitidos desde DB (o fallback local)
 */
export async function getFuecsDb(): Promise<Fuec[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localFuecsState;
    }

    const dbFuecs = await (prisma as any).fuec.findMany({
      orderBy: { numeroConsecutivo: "desc" },
    });

    if (!dbFuecs || dbFuecs.length === 0) {
      return localFuecsState;
    }

    return dbFuecs.map((f: any) => ({
      id: f.id,
      numeroConsecutivo: f.numeroConsecutivo,
      codigoFUEC: f.codigoFUEC,
      contratoId: f.contratoId,
      contratoNumero: f.contratoNumero,
      contratante: f.contratante,
      objetoContrato: f.objetoContrato as ObjetoContratoTransporte,
      origen: f.origen,
      destino: f.destino,
      rutaDetalle: f.rutaDetalle ?? undefined,
      vehiculoId: f.vehiculoId,
      placa: f.placa,
      marca: f.marca,
      modelo: f.modelo,
      tarjetaOperacionNumero: f.tarjetaOperacionNumero ?? undefined,
      conductorPrincipalId: f.conductorPrincipalId,
      conductorPrincipalNombre: f.conductorPrincipalNombre,
      conductorSecundarioId: f.conductorSecundarioId ?? undefined,
      conductorSecundarioNombre: f.conductorSecundarioNombre ?? undefined,
      fechaInicio: f.fechaInicio.toISOString().split("T")[0],
      fechaFin: f.fechaFin.toISOString().split("T")[0],
      estado: f.estado as EstadoFuec,
      qrCodeUrl: f.qrCodeUrl ?? undefined,
      observaciones: f.observaciones ?? undefined,
    }));
  } catch (error) {
    console.warn("Aviso de conexión DB FUECs (usando almacén local):", error);
    return localFuecsState;
  }
}

/**
 * Obtiene un FUEC por ID o código FUEC
 */
export async function getFuecByIdDb(idOrCode: string): Promise<Fuec | undefined> {
  try {
    if (!process.env.DATABASE_URL) {
      return localFuecsState.find((f) => f.id === idOrCode || f.codigoFUEC === idOrCode);
    }

    const f = await (prisma as any).fuec.findFirst({
      where: {
        OR: [{ id: idOrCode }, { codigoFUEC: idOrCode }],
      },
    });

    if (!f) {
      return localFuecsState.find((fuec) => fuec.id === idOrCode || fuec.codigoFUEC === idOrCode);
    }

    return {
      id: f.id,
      numeroConsecutivo: f.numeroConsecutivo,
      codigoFUEC: f.codigoFUEC,
      contratoId: f.contratoId,
      contratoNumero: f.contratoNumero,
      contratante: f.contratante,
      objetoContrato: f.objetoContrato as ObjetoContratoTransporte,
      origen: f.origen,
      destino: f.destino,
      rutaDetalle: f.rutaDetalle ?? undefined,
      vehiculoId: f.vehiculoId,
      placa: f.placa,
      marca: f.marca,
      modelo: f.modelo,
      tarjetaOperacionNumero: f.tarjetaOperacionNumero ?? undefined,
      conductorPrincipalId: f.conductorPrincipalId,
      conductorPrincipalNombre: f.conductorPrincipalNombre,
      conductorSecundarioId: f.conductorSecundarioId ?? undefined,
      conductorSecundarioNombre: f.conductorSecundarioNombre ?? undefined,
      fechaInicio: f.fechaInicio.toISOString().split("T")[0],
      fechaFin: f.fechaFin.toISOString().split("T")[0],
      estado: f.estado as EstadoFuec,
      qrCodeUrl: f.qrCodeUrl ?? undefined,
      observaciones: f.observaciones ?? undefined,
    };
  } catch (error) {
    return localFuecsState.find((f) => f.id === idOrCode || f.codigoFUEC === idOrCode);
  }
}

/**
 * Obtiene los contratos de transporte disponibles
 */
export async function getContratosTransporteDb(): Promise<ContratoTransporte[]> {
  try {
    if (!process.env.DATABASE_URL) {
      return localContratosState;
    }

    const dbContratos = await (prisma as any).contratoTransporte.findMany({
      orderBy: { fechaInicio: "desc" },
    });

    if (!dbContratos || dbContratos.length === 0) {
      return localContratosState;
    }

    return dbContratos.map((c: any) => ({
      id: c.id,
      numeroContrato: c.numeroContrato,
      contratanteNombre: c.contratanteNombre,
      contratanteNit: c.contratanteNit,
      objetoContrato: c.objetoContrato as ObjetoContratoTransporte,
      fechaInicio: c.fechaInicio.toISOString().split("T")[0],
      fechaFin: c.fechaFin.toISOString().split("T")[0],
      estado: c.estado as any,
    }));
  } catch (error) {
    return localContratosState;
  }
}

/**
 * Server Action para emitir un nuevo FUEC
 */
export async function createFuecAction(
  formData: FormData
): Promise<{ success: boolean; fuecId?: string; codigoFUEC?: string; error?: string }> {
  try {
    const contratoId = formData.get("contratoId") as string;
    const vehiculoId = formData.get("vehiculoId") as string;
    const conductorPrincipalId = formData.get("conductorPrincipalId") as string;
    const conductorSecundarioId = (formData.get("conductorSecundarioId") as string) || undefined;
    const origen = formData.get("origen") as string;
    const destino = formData.get("destino") as string;
    const rutaDetalle = (formData.get("rutaDetalle") as string) || undefined;
    const fechaInicio = formData.get("fechaInicio") as string;
    const fechaFin = formData.get("fechaFin") as string;
    const observaciones = (formData.get("observaciones") as string) || undefined;

    const contrato = localContratosState.find((c) => c.id === contratoId) || localContratosState[0];
    const vehiculo = await getVehiculoByIdDb(vehiculoId);
    const conductorPrinc = await getPersonaByIdDb(conductorPrincipalId);
    const conductorSec = conductorSecundarioId ? await getPersonaByIdDb(conductorSecundarioId) : undefined;

    const consecutive = 1000 + localFuecsState.length + 1;
    const year = new Date().getFullYear();
    const codigoFUEC = `452800111${year}${String(consecutive).padStart(6, "0")}`;
    const qrUrl = `https://transservicesab.com/verificar-fuec/${codigoFUEC}`;

    const newFuecObj: Fuec = {
      id: `fuec_${Date.now()}`,
      numeroConsecutivo: consecutive,
      codigoFUEC,
      contratoId: contrato ? contrato.id : "ct1",
      contratoNumero: contrato ? contrato.numeroContrato : "CT-2026-001",
      contratante: contrato ? contrato.contratanteNombre : "Cliente General",
      objetoContrato: contrato ? contrato.objetoContrato : "empresarial",
      origen,
      destino,
      rutaDetalle,
      vehiculoId,
      placa: vehiculo ? vehiculo.placa : (formData.get("placa") as string) || "PLACA",
      marca: vehiculo ? vehiculo.marca : "Marca",
      modelo: vehiculo ? vehiculo.modelo : "Modelo",
      tarjetaOperacionNumero: "TO-452900",
      conductorPrincipalId,
      conductorPrincipalNombre: conductorPrinc ? `${conductorPrinc.nombres} ${conductorPrinc.apellidos}` : "Conductor 1",
      conductorSecundarioId,
      conductorSecundarioNombre: conductorSec ? `${conductorSec.nombres} ${conductorSec.apellidos}` : undefined,
      fechaInicio,
      fechaFin,
      estado: "emitido",
      qrCodeUrl: qrUrl,
      observaciones,
    };

    if (process.env.DATABASE_URL) {
      try {
        const created = await (prisma as any).fuec.create({
          data: {
            codigoFUEC,
            contratoId: newFuecObj.contratoId,
            contratoNumero: newFuecObj.contratoNumero,
            contratante: newFuecObj.contratante,
            objetoContrato: newFuecObj.objetoContrato,
            origen,
            destino,
            rutaDetalle,
            vehiculoId,
            placa: newFuecObj.placa,
            marca: newFuecObj.marca,
            modelo: newFuecObj.modelo,
            tarjetaOperacionNumero: newFuecObj.tarjetaOperacionNumero,
            conductorPrincipalId,
            conductorPrincipalNombre: newFuecObj.conductorPrincipalNombre,
            conductorSecundarioId: newFuecObj.conductorSecundarioId || null,
            conductorSecundarioNombre: newFuecObj.conductorSecundarioNombre || null,
            fechaInicio: new Date(fechaInicio),
            fechaFin: new Date(fechaFin),
            estado: "emitido",
            qrCodeUrl: qrUrl,
            observaciones,
          },
        });
        newFuecObj.id = created.id;
      } catch (dbErr) {
        console.error("Error guardando FUEC en PostgreSQL:", dbErr);
      }
    }

    localFuecsState.unshift(newFuecObj);

    revalidatePath("/operacion");

    return { success: true, fuecId: newFuecObj.id, codigoFUEC };
  } catch (error: any) {
    return { success: false, error: error.message || "Error al emitir FUEC." };
  }
}
