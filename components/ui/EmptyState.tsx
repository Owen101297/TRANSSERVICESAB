"use client";

import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: LucideIcon;
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
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-line-600/80 bg-asphalt-900/50 backdrop-blur-sm animate-fadeIn ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-asphalt-800/80 border border-line-600 flex items-center justify-center text-fog-400 mb-4 shadow-inner">
        <Icon size={26} className={iconClassName || "text-fog-400"} />
      </div>

      <h3 className="text-base font-bold text-paper-50 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-xs text-mist-200/80 max-w-md mt-1.5 leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <div className="mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            className="text-xs flex items-center gap-1.5 border-line-500 hover:bg-asphalt-800 text-paper-50"
          >
            <span>{actionLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
