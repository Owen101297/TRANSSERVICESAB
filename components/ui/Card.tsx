import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-4.5 shadow-apple-sm transition-all hover:shadow-apple ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  accent = "cyan",
  status,
  compact = false,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode | React.ElementType;
  trend?: string;
  accent?: "cyan" | "amber" | "green" | "red" | "purple";
  status?: "normal" | "warning" | "alert" | string;
  compact?: boolean;
}) {
  const resolvedAccent = status === "warning" ? "amber" : status === "alert" ? "red" : accent;
  const accentStyles = {
    cyan: "text-sky-600 bg-sky-50 border-sky-200/80",
    amber: "text-amber-600 bg-amber-50 border-amber-200/80",
    green: "text-emerald-600 bg-emerald-50 border-emerald-200/80",
    red: "text-rose-600 bg-rose-50 border-rose-200/80",
    purple: "text-indigo-600 bg-indigo-50 border-indigo-200/80",
  }[resolvedAccent] || "text-sky-600 bg-sky-50 border-sky-200/80";

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
      const IconComp = icon as React.ElementType;
      return <IconComp className={compact ? "w-4 h-4" : "w-4.5 h-4.5"} />;
    }
    return null;
  };

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white ${compact ? "p-3" : "p-3.5 sm:p-4"} shadow-apple-sm transition-all hover:shadow-apple flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-2.5">
        <p className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
          {label}
        </p>
        {icon && (
          <div className={`p-1.5 rounded-xl border flex items-center justify-center shrink-0 ${accentStyles}`}>
            {renderIcon()}
          </div>
        )}
      </div>

      <div className="mt-2">
        <p className={`font-[family-name:var(--font-display)] ${compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"} font-extrabold tracking-tight text-slate-900 leading-none`}>
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">
            {subtitle}
          </p>
        )}
        {trend && (
          <p className="mt-1 text-[11px] sm:text-xs font-semibold text-slate-700 leading-tight">
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}

