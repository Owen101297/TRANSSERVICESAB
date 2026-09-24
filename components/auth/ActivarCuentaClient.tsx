"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Circle, Loader2, UserRound } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";

type ActivationInfo = {
  person: { name: string; document: string; accessType: "portal" | "erp" };
  expiresAt: string;
};

export default function ActivarCuentaClient({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<ActivationInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState({ password: false, confirmation: false });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/auth/activate/${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "No fue posible validar el enlace.");
        setInfo(body);
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "No fue posible validar el enlace.");
      })
      .finally(() => setLoadingInfo(false));
    return () => controller.abort();
  }, [token]);

  const requirements = useMemo(() => [
    { label: "8 caracteres como mínimo", met: password.length >= 8 },
    { label: "Una letra", met: /[A-Za-z]/.test(password) },
    { label: "Un número", met: /\d/.test(password) },
    { label: "Un símbolo", met: /[^A-Za-z\d]/.test(password) },
  ], [password]);
  const valid = requirements.every((item) => item.met) && password.length <= 72;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!valid) return setError("Completa todos los requisitos de la clave.");
    if (password !== confirmation) return setError("Las claves no coinciden.");
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/activate/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No fue posible activar la cuenta.");
      router.replace(body.redirectUrl || "/login?activated=1");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible activar la cuenta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell eyebrow="Activación de cuenta" title="Crea tu clave personal" description="Este enlace es individual y funciona una sola vez. No compartas tu clave ni este enlace con otras personas.">
      {loadingInfo ? (
        <div className="flex min-h-60 items-center justify-center"><Loader2 className="animate-spin text-sky-600" aria-label="Validando enlace" /></div>
      ) : !info ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-red-800">
          <AlertCircle className="mx-auto mb-3" /><p className="font-bold">No puedes usar este enlace</p><p className="mt-1 text-sm">{error}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="grid size-11 place-items-center rounded-xl bg-sky-100 text-sky-700"><UserRound size={22} /></span>
            <div><p className="font-bold text-slate-950">{info.person.name}</p><p className="text-xs text-slate-500">Documento {info.person.document} · {info.person.accessType === "erp" ? "Acceso al ERP" : "Portal del Conductor"}</p></div>
          </div>
          <PasswordField id="activation-password" label="Nueva clave" value={password} onChange={setPassword} visible={visible.password} onToggleVisibility={() => setVisible((value) => ({ ...value, password: !value.password }))} autoComplete="new-password" minLength={8} />
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3.5" aria-label="Requisitos de la clave">
            {requirements.map((item) => <div key={item.label} className={`flex items-center gap-2 text-xs ${item.met ? "text-emerald-700" : "text-slate-500"}`}>{item.met ? <CheckCircle2 size={15} /> : <Circle size={15} />}<span>{item.label}</span></div>)}
          </div>
          <PasswordField id="activation-confirmation" label="Confirmar nueva clave" value={confirmation} onChange={setConfirmation} visible={visible.confirmation} onToggleVisibility={() => setVisible((value) => ({ ...value, confirmation: !value.confirmation }))} autoComplete="new-password" minLength={8} hint={confirmation ? (password === confirmation ? "Las claves coinciden." : "Las claves aún no coinciden.") : undefined} />
          {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"><AlertCircle className="shrink-0" size={18} /><span>{error}</span></div>}
          <button type="submit" disabled={submitting} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white shadow-lg shadow-sky-600/20 hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"><span>{submitting ? "Activando cuenta…" : "Activar mi cuenta"}</span>{!submitting && <ArrowRight size={18} />}</button>
          <p className="text-center text-xs text-slate-500">Válido hasta {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(info.expiresAt))}.</p>
        </form>
      )}
    </AuthShell>
  );
}
