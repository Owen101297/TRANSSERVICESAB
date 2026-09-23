"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";

export default function CambiarClavePage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visibility, setVisibility] = useState({ current: false, next: false, confirmation: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requirements = useMemo(() => [
    { label: "8 caracteres como mínimo", met: newPassword.length >= 8 },
    { label: "Una letra", met: /[A-Za-z]/.test(newPassword) },
    { label: "Un número", met: /\d/.test(newPassword) },
    { label: "Un símbolo", met: /[^A-Za-z\d]/.test(newPassword) },
  ], [newPassword]);
  const newPasswordValid = requirements.every((item) => item.met) && newPassword.length <= 72;
  const confirmationMatches = confirmation.length > 0 && newPassword === confirmation;

  function toggle(field: keyof typeof visibility) {
    setVisibility((value) => ({ ...value, [field]: !value[field] }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!newPasswordValid) {
      setError("Completa los requisitos de la nueva contraseña.");
      return;
    }
    if (!confirmationMatches) {
      setError("La confirmación debe coincidir con la nueva contraseña.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible guardar la nueva contraseña.");
      router.replace(data.user?.rolPrincipal === "conductor" ? "/portal-conductor" : "/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible guardar la nueva contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Actualización de seguridad"
      title="Crea una clave segura"
      description="Tu clave actual puede ser el PIN temporal asignado. La nueva clave protegerá tus próximos ingresos."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <PasswordField
          id="current-password"
          label="Clave actual"
          value={currentPassword}
          onChange={setCurrentPassword}
          visible={visibility.current}
          onToggleVisibility={() => toggle("current")}
          autoComplete="current-password"
          hint="Si recibiste una clave temporal, escríbela exactamente como fue asignada."
        />

        <PasswordField
          id="new-password"
          label="Nueva clave"
          value={newPassword}
          onChange={setNewPassword}
          visible={visibility.next}
          onToggleVisibility={() => toggle("next")}
          autoComplete="new-password"
          minLength={8}
        />

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-3.5" aria-label="Requisitos de la nueva clave">
          {requirements.map((item) => (
            <div key={item.label} className={`flex items-center gap-2 text-xs ${item.met ? "text-emerald-700" : "text-slate-500"}`}>
              {item.met ? <CheckCircle2 size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <PasswordField
          id="confirmation"
          label="Confirmar nueva clave"
          value={confirmation}
          onChange={setConfirmation}
          visible={visibility.confirmation}
          onToggleVisibility={() => toggle("confirmation")}
          autoComplete="new-password"
          minLength={8}
          hint={confirmation.length > 0 ? (confirmationMatches ? "Las claves coinciden." : "La confirmación aún no coincide.") : undefined}
        />

        {error && (
          <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:cursor-wait disabled:opacity-60">
          <span>{loading ? "Guardando clave…" : "Guardar nueva clave"}</span>
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>
    </AuthShell>
  );
}
