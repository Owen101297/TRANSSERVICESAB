import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-slate-900 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-0.5 text-xs text-slate-500 font-medium">{description}</p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-700">
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </label>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  wrapperClassName?: string;
}

export function TextField({ label, required, wrapperClassName = "", ...props }: FieldProps) {
  return (
    <div className={wrapperClassName}>
      <Label required={required}>{label}</Label>
      <input
        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all"
        {...props}
      />
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  wrapperClassName?: string;
}

export function SelectField({
  label,
  required,
  options,
  wrapperClassName = "",
  ...props
}: SelectFieldProps) {
  return (
    <div className={wrapperClassName}>
      <Label required={required}>{label}</Label>
      <select
        className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all"
        {...props}
      >
        <option value="">Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  wrapperClassName?: string;
}

export function TextAreaField({
  label,
  required,
  wrapperClassName = "",
  ...props
}: TextAreaFieldProps) {
  return (
    <div className={wrapperClassName}>
      <Label required={required}>{label}</Label>
      <textarea
        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all"
        {...props}
      />
    </div>
  );
}
