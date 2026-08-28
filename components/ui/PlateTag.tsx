export function PlateTag({ plate }: { plate: string }) {
  return (
    <span className="inline-flex items-center rounded border border-line-500 bg-asphalt-800 px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs font-medium tracking-widest text-paper-50">
      {plate}
    </span>
  );
}
