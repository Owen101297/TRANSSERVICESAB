"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Truck, UserRound } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [activeTab, setActiveTab] = useState<"conductor" | "admin">("admin");
  const [documento, setDocumento] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = activeTab === "conductor"
        ? { type: "conductor", documento, pin }
        : { type: "staff", email, password };
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Credenciales incorrectas.");

      if (data.user) {
        localStorage.setItem("transservices_conductor", JSON.stringify({
          id: data.user.id,
          documento: data.user.documento,
          nombre: data.user.nombre,
          placa: data.user.placaAsignada || "SIN ASIGNAR",
        }));
      }

      const target = data.user.mustChangePassword
        ? "/cambiar-clave"
        : data.user.rolPrincipal === "conductor"
          ? "/portal-conductor"
          : callbackUrl && callbackUrl !== "/login" ? callbackUrl : "/";
      router.push(target);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  function selectAccess(type: "conductor" | "admin") {
    setActiveTab(type);
    setError(null);
  }

  return (
    <AuthShell
      eyebrow="Acceso seguro"
      title="Bienvenido al ERP"
      description="Selecciona tu tipo de acceso e ingresa las credenciales asignadas por la empresa."
    >
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Tipo de acceso">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "admin"}
          onClick={() => selectAccess("admin")}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${activeTab === "admin" ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}
        >
          <UserRound size={18} /> Administrativo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "conductor"}
          onClick={() => selectAccess("conductor")}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${activeTab === "conductor" ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Truck size={18} /> Conductor
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        {activeTab === "conductor" ? (
          <>
            <div>
              <label htmlFor="documento" className="block text-sm font-semibold text-slate-700">Número de documento</label>
              <div className="relative mt-2">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input id="documento" type="text" inputMode="numeric" autoComplete="username" required value={documento} onChange={(event) => setDocumento(event.target.value)} placeholder="Ej. 1002345678" className="h-13 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100" />
              </div>
            </div>
            <PasswordField id="pin" label="PIN de acceso" value={pin} onChange={setPin} visible={showPin} onToggleVisibility={() => setShowPin((value) => !value)} autoComplete="current-password" maxLength={72} />
          </>
        ) : (
          <>
            <div>
              <label htmlFor="usuario" className="block text-sm font-semibold text-slate-700">Correo o número de documento</label>
              <div className="relative mt-2">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input id="usuario" type="text" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.com" className="h-13 w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-100" />
              </div>
            </div>
            <PasswordField id="password" label="Contraseña" value={password} onChange={setPassword} visible={showPassword} onToggleVisibility={() => setShowPassword((value) => !value)} autoComplete="current-password" />
          </>
        )}

        {error && (
          <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:cursor-wait disabled:opacity-60">
          <span>{loading ? "Verificando acceso…" : "Ingresar al sistema"}</span>
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center bg-slate-100 text-sm text-slate-500">Cargando acceso seguro…</div>}>
      <LoginForm />
    </Suspense>
  );
}
