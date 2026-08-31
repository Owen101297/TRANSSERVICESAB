"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Persona } from "@/lib/types/persona";

interface ConductorSwitcherProps {
  conductores: Persona[];
  currentConductorId: string;
}

function ConductorSwitcherInner({
  conductores,
  currentConductorId,
}: ConductorSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("conductorId", newId);
    router.push(`/portal-conductor?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-line-600 bg-asphalt-900/90 px-3 py-2 text-xs">
      <span className="text-fog-400 font-mono">Sesión Móvil:</span>
      <select
        value={currentConductorId}
        onChange={handleChange}
        className="rounded border border-line-600 bg-asphalt-800 px-2 py-1 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none"
      >
        {conductores.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombres} {c.apellidos} ({c.contratistaNombre || "Propio"})
          </option>
        ))}
      </select>
    </div>
  );
}

export function ConductorSwitcher(props: ConductorSwitcherProps) {
  return (
    <Suspense fallback={<div className="h-8 rounded bg-asphalt-900 animate-pulse" />}>
      <ConductorSwitcherInner {...props} />
    </Suspense>
  );
}

