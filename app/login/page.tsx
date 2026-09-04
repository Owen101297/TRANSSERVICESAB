"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, User, Lock, KeyRound, Truck, ArrowRight, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [activeTab, setActiveTab] = useState<"conductor" | "admin">("conductor");
  const [documento, setDocumento] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload =
        activeTab === "conductor"
          ? { type: "conductor", documento, pin: pin || "1234" }
          : { type: "staff", email, password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Credenciales incorrectas");
      }

      // Guardar también en localStorage para el auth-bridge de las micro-apps
      if (data.user) {
        localStorage.setItem(
          "transservices_conductor",
          JSON.stringify({
            id: data.user.id,
            documento: data.user.documento,
            nombre: data.user.nombre,
            placa: data.user.placaAsignada || "SIN ASIGNAR",
          })
        );
      }

      // Redireccionar según rol
      const target =
        data.user.rolPrincipal === "conductor"
          ? "/portal-conductor"
          : callbackUrl && callbackUrl !== "/login"
          ? callbackUrl
          : "/";

      router.push(target);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al ingresar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-asphalt-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-[family-name:var(--font-body)]">
      {/* Luces de fondo ambient */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-radar-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-signal-amber/10 rounded-full blur-3xl pointer-events-none" />

      {/* Contenedor Principal */}
      <div className="w-full max-w-md bg-asphalt-900 border border-line-600 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Cabecera Institucional */}
        <div className="p-6 bg-asphalt-800/80 border-b border-line-600 text-center">
          <div className="w-12 h-12 rounded-xl bg-radar-cyan/10 border border-radar-cyan/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
            <ShieldCheck className="text-radar-cyan" size={26} />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-black text-paper-50 uppercase tracking-wide">
            TRANS SERVICES A&B
          </h1>
          <p className="text-xs text-mist-200 mt-1 uppercase tracking-widest font-mono">
            SISTEMA INTEGRAL DE TRANSPORTE & GESTIÓN
          </p>
        </div>

        {/* Selector de Rol */}
        <div className="flex border-b border-line-600 bg-asphalt-950/40 p-1.5 gap-1.5 m-4 rounded-xl border">
          <button
            type="button"
            onClick={() => {
              setActiveTab("conductor");
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === "conductor"
                ? "bg-radar-cyan text-asphalt-950 font-bold shadow-md shadow-radar-cyan/20"
                : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
            }`}
          >
            <Truck size={16} /> Soy Conductor
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === "admin"
                ? "bg-radar-cyan text-asphalt-950 font-bold shadow-md shadow-radar-cyan/20"
                : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
            }`}
          >
            <User size={16} /> Administrativo
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
          {error && (
            <div className="p-3.5 bg-alert-red/10 border border-alert-red/30 rounded-xl flex items-center gap-2.5 text-alert-red text-xs">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === "conductor" ? (
            <>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-fog-400 mb-1.5">
                  Número de Cédula
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-400" size={18} />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    placeholder="Ej. 1002345678"
                    className="w-full bg-asphalt-950 border border-line-600 rounded-xl pl-11 pr-4 py-3 text-paper-50 font-mono text-sm placeholder:text-fog-400/50 focus:outline-none focus:border-radar-cyan focus:ring-1 focus:ring-radar-cyan transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-fog-400 mb-1.5 flex justify-between">
                  <span>PIN de Seguridad</span>
                  <span className="text-fog-400/60 font-mono">Default: 1234</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-400" size={18} />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-asphalt-950 border border-line-600 rounded-xl pl-11 pr-4 py-3 text-paper-50 font-mono text-lg tracking-widest placeholder:text-fog-400/50 focus:outline-none focus:border-radar-cyan focus:ring-1 focus:ring-radar-cyan transition-colors"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-fog-400 mb-1.5">
                  Correo o Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-400" size={18} />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@transservices.com"
                    className="w-full bg-asphalt-950 border border-line-600 rounded-xl pl-11 pr-4 py-3 text-paper-50 font-mono text-sm placeholder:text-fog-400/50 focus:outline-none focus:border-radar-cyan focus:ring-1 focus:ring-radar-cyan transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-fog-400 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog-400" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-asphalt-950 border border-line-600 rounded-xl pl-11 pr-4 py-3 text-paper-50 text-sm placeholder:text-fog-400/50 focus:outline-none focus:border-radar-cyan focus:ring-1 focus:ring-radar-cyan transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 bg-radar-cyan hover:bg-radar-cyan/90 text-asphalt-950 font-bold rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider text-xs shadow-lg shadow-radar-cyan/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span>Verificando...</span>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Pie de página institucional */}
        <div className="p-4 bg-asphalt-950/60 border-t border-line-600 text-center text-[11px] text-fog-400">
          Operación Segura · SG-SST & PESV Res. 40595
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-asphalt-950 flex items-center justify-center text-fog-400 font-mono text-xs">
          Cargando portal de acceso...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
