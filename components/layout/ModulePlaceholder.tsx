import { Construction } from "lucide-react";

export function ModulePlaceholder({
  moduleName,
  phase,
}: {
  moduleName: string;
  phase: string;
}) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-600 text-center">
      <Construction size={28} className="text-fog-400" />
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
        {moduleName}
      </h2>
      <p className="max-w-sm text-sm text-fog-400">
        Este módulo está definido en el blueprint pero aún no se ha construido.
        Corresponde a <span className="text-mist-200">{phase}</span> del roadmap.
      </p>
    </div>
  );
}
