import type { ReactNode } from "react";
import { CheckCircle2, Route, ShieldCheck } from "lucide-react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-slate-100 p-3 sm:p-6 lg:grid lg:place-items-center lg:p-8">
      <div className="mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.32)] sm:min-h-[calc(100dvh-3rem)] lg:min-h-[720px] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(14,165,233,0.24),transparent_34%),radial-gradient(circle_at_90%_82%,rgba(245,158,11,0.16),transparent_32%)]" />
          <div className="absolute -right-24 top-24 h-80 w-80 rounded-full border border-dashed border-white/10" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20">
                <ShieldCheck size={26} strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-lg font-extrabold tracking-tight">TRANS SERVICES A&amp;B</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-400">Centro de control</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-md">
            <div className="mb-7 flex items-center gap-3 text-sky-400">
              <Route size={22} />
              <span className="h-px flex-1 bg-gradient-to-r from-sky-400/80 to-transparent" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Operación conectada</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight">
              Seguridad, trazabilidad y control en una sola ruta.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
              Acceso protegido al sistema de gestión, operaciones y seguridad vial de la empresa.
            </p>
          </div>

          <div className="relative grid gap-3 text-xs text-slate-300">
            {[
              "Sesiones protegidas y trazables",
              "Información centralizada por proceso",
              "Acceso según perfil autorizado",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <CheckCircle2 className="text-emerald-400" size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-w-0 flex-col bg-white">
          <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-700">
              <ShieldCheck size={22} />
            </span>
            <div>
              <p className="text-sm font-extrabold text-slate-950">TRANS SERVICES A&amp;B</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Centro de control</p>
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10 lg:px-16">
            <div className="w-full max-w-[470px]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[34px]">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              <div className="mt-8">{children}</div>
            </div>
          </div>

          <footer className="border-t border-slate-100 px-5 py-4 text-center text-[11px] text-slate-500">
            Plataforma interna · SG-SST y PESV · Acceso autorizado
          </footer>
        </section>
      </div>
    </main>
  );
}
