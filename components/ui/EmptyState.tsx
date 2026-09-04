import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  iconClassName?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  iconClassName = "",
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!Icon) return <Inbox size={26} className={iconClassName || "text-slate-600"} />;
    if (React.isValidElement(Icon)) return Icon;
    if (typeof Icon === "function" || (typeof Icon === "object" && Icon !== null)) {
      const Comp = Icon as React.ElementType;
      return <Comp size={26} className={iconClassName || "text-slate-600"} />;
    }
    return <Inbox size={26} className={iconClassName || "text-slate-600"} />;
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-slate-200/80 bg-white shadow-apple-sm animate-fadeIn ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-4 shadow-xs">
        {renderIcon()}
      </div>

      <h3 className="text-base font-bold text-slate-900 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed font-medium">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <div className="mt-5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAction}
            className="text-xs"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
