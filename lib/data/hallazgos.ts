import { Hallazgo } from "@/lib/types/hseq";

export const SEED_HALLAZGOS: Hallazgo[] = [];

export function getHallazgoById(id: string): Hallazgo | undefined {
  return SEED_HALLAZGOS.find((h) => h.id === id);
}
