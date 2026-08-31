import { Vehiculo } from "@/lib/types/vehiculo";

export const SEED_VEHICULOS: Vehiculo[] = [];

export function getVehiculoById(id: string): Vehiculo | undefined {
  return SEED_VEHICULOS.find((v) => v.id === id);
}
