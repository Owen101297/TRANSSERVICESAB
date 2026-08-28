export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-line-600 bg-asphalt-900 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  trend,
  accent = "cyan",
}: {
  label: string;
  value: string | number;
  trend?: string;
  accent?: "cyan" | "amber" | "green";
}) {
  const accentColor = {
    cyan: "text-radar-cyan",
    amber: "text-signal-amber",
    green: "text-ok-green",
  }[accent];

  return (
    <Card className="min-w-[140px]">
      <p className="font-mono text-[11px] uppercase tracking-wider text-fog-400">
        {label}
      </p>
      <p
        className={`mt-2 font-[family-name:var(--font-display)] text-4xl font-bold leading-none ${accentColor}`}
      >
        {value}
      </p>
      {trend && <p className="mt-2 text-xs text-mist-200">{trend}</p>}
    </Card>
  );
}
