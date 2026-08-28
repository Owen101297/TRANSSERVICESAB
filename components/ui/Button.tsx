import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-signal-amber text-asphalt-950 hover:bg-signal-amber/90 font-semibold",
  secondary:
    "bg-asphalt-700 text-paper-50 hover:bg-asphalt-700/70 border border-line-600",
  ghost: "bg-transparent text-mist-200 hover:bg-asphalt-800",
  danger: "bg-alert-red text-paper-50 hover:bg-alert-red/90",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
