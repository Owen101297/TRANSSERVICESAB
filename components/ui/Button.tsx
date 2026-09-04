import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 shadow-sm active:scale-[0.98] font-semibold",
  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200/80 border border-slate-200/80 shadow-xs active:scale-[0.98] font-medium",
  ghost:
    "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium active:scale-[0.98]",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.98] font-semibold",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-[0.98] font-semibold",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-5 py-2.5 text-base rounded-xl gap-2.5",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-sans transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
