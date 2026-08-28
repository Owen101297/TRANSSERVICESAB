import { PerfilPersona, PERFIL_LABELS } from "@/lib/types/persona";

export function ProfileTag({ perfil }: { perfil: PerfilPersona }) {
  return (
    <span className="inline-flex items-center rounded border border-line-600 bg-asphalt-800 px-2 py-0.5 text-xs text-mist-200">
      {PERFIL_LABELS[perfil]}
    </span>
  );
}
