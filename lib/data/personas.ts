import { Persona } from "@/lib/types/persona";

export const SEED_PERSONAS: Persona[] = [];

export function getPersonaById(id: string): Persona | undefined {
  return SEED_PERSONAS.find((p) => p.id === id);
}
