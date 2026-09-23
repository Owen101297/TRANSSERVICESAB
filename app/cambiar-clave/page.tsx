"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

export default function CambiarClavePage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("La confirmación no coincide con la nueva clave.");
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
      if (!response.ok) throw new Error(data.error || "No fue posible cambiar la clave.");
      router.replace(data.user?.rolPrincipal === "conductor" ? "/portal-conductor" : "/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cambiar la clave.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-asphalt-950 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-line-600 bg-asphalt-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-radar-cyan/10 p-3 text-radar-cyan"><ShieldCheck size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-paper-50">Protege tu cuenta</h1>
            <p className="text-sm text-fog-400">Debes renovar tu clave antes de continuar.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            ["Clave actual", currentPassword, setCurrentPassword],
            ["Nueva clave", newPassword, setNewPassword],
            ["Confirmar nueva clave", confirmation, setConfirmation],
          ].map(([label, value, setter]) => (
            <label key={label as string} className="block text-xs font-medium text-fog-400">
              {label as string}
              <span className="relative mt-1.5 block">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2" size={16} />
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={value as string}
                  onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                  className="w-full rounded-xl border border-line-600 bg-asphalt-950 py-3 pl-10 pr-3 text-paper-50 outline-none focus:border-radar-cyan"
                />
              </span>
            </label>
          ))}
          <p className="text-xs text-fog-400">Mínimo 8 caracteres, con letra, número y símbolo.</p>
          {error && <p className="rounded-lg bg-alert-red/10 p-3 text-sm text-alert-red">{error}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-radar-cyan py-3 font-bold text-asphalt-950 disabled:opacity-50">
            {loading && <Loader2 className="animate-spin" size={17} />}
            Guardar nueva clave
          </button>
        </form>
      </section>
    </main>
  );
}
