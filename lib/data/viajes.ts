import { Viaje } from "@/lib/types/viaje";

export const SEED_VIAJES: Viaje[] = [];

export function getViajeById(id: string): Viaje | undefined {
  return SEED_VIAJES.find((v) => v.id === id);
}
