import { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

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
    <div className="border-b border-line-600 pb-6 last:border-0 last:pb-0">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-fog-400">{description}</p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fog-400">
      {children}
      {required && <span className="ml-1 text-alert-red">*</span>}
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
        className="w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none focus:ring-1 focus:ring-radar-cyan"
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
        className="w-full rounded-md border border-line-600 bg-asphalt-800 px-3 py-2 text-sm text-paper-50 focus:border-radar-cyan focus:outline-none focus:ring-1 focus:ring-radar-cyan"
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
