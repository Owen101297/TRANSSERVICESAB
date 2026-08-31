import { Contratista } from "@/lib/types/contratista";

export const SEED_CONTRATISTAS: Contratista[] = [];

export function getContratistaById(id: string): Contratista | undefined {
  return SEED_CONTRATISTAS.find((c) => c.id === id);
}
