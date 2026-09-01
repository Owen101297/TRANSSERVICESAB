"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "./Tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-signal-amber text-asphalt-950 hover:bg-signal-amber/90 border border-signal-amber shadow-sm font-semibold",
  secondary:
    "bg-asphalt-800 text-paper-50 hover:bg-asphalt-700 hover:text-paper-50 border border-line-600 shadow-sm",
  ghost:
    "bg-transparent text-mist-200 hover:bg-asphalt-800 hover:text-paper-50 border border-transparent",
  danger:
    "bg-alert-red-dim text-alert-red hover:bg-alert-red hover:text-white border border-alert-red/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8 p-1.5 text-xs",
  md: "h-9 w-9 p-2 text-sm",
  lg: "h-10 w-10 p-2.5 text-base",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  tooltip: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  variant?: Variant;
  size?: Size;
}

export function IconButton({
  icon,
  tooltip,
  tooltipPosition = "bottom",
  variant = "secondary",
  size = "md",
  className = "",
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip content={tooltip} position={tooltipPosition}>
      <button
        type="button"
        aria-label={tooltip}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        {...props}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
