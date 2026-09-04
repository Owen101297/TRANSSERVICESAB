import React from "react";

export function PlateTag({
  plate,
  className = "",
}: {
  plate: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border border-amber-400 bg-amber-300 px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs font-extrabold tracking-widest text-slate-950 shadow-2xs select-all ${className}`}
    >
      {plate}
    </span>
  );
}
