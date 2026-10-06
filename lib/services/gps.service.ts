"use server";

import { requireStaffSession } from "@/lib/auth";
import * as gps from "@/lib/gps-data";

export async function getEventosGPSDb(...args: Parameters<typeof gps.getEventosGPSDb>) {
  await requireStaffSession();
  return gps.getEventosGPSDb(...args);
}

export async function getEventosGPSConPaginacionDb(...args: Parameters<typeof gps.getEventosGPSConPaginacionDb>) {
  await requireStaffSession();
  return gps.getEventosGPSConPaginacionDb(...args);
}

export async function getEventosNocturnosDb(...args: Parameters<typeof gps.getEventosNocturnosDb>) {
  await requireStaffSession();
  return gps.getEventosNocturnosDb(...args);
}

export async function registrarEventoGPSDb(...args: Parameters<typeof gps.registrarEventoGPSDb>) {
  await requireStaffSession();
  return gps.registrarEventoGPSDb(...args);
}

export async function marcarRetroalimentacionDb(...args: Parameters<typeof gps.marcarRetroalimentacionDb>) {
  await requireStaffSession();
  return gps.marcarRetroalimentacionDb(...args);
}

export async function getResumenAlertasGPSDb(...args: Parameters<typeof gps.getResumenAlertasGPSDb>) {
  await requireStaffSession();
  return gps.getResumenAlertasGPSDb(...args);
}

export async function getCalificacionesConductoresDb(...args: Parameters<typeof gps.getCalificacionesConductoresDb>) {
  await requireStaffSession();
  return gps.getCalificacionesConductoresDb(...args);
}

export async function getCalificacionesMensualesDb(...args: Parameters<typeof gps.getCalificacionesMensualesDb>) {
  await requireStaffSession();
  return gps.getCalificacionesMensualesDb(...args);
}

export async function retroasignarEventosPlacaDb(...args: Parameters<typeof gps.retroasignarEventosPlacaDb>) {
  await requireStaffSession();
  return gps.retroasignarEventosPlacaDb(...args);
}
