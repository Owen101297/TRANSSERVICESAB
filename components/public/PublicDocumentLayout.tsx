import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type PublicDocumentLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const legalLinks = [
  { href: "/integraciones/google-drive", label: "Integración con Google Drive" },
  { href: "/legal/privacidad-google-drive", label: "Privacidad" },
  { href: "/legal/terminos-google-drive", label: "Términos" },
];

export function PublicDocumentLayout({
  eyebrow,
  title,
  description,
  children,
}: PublicDocumentLayoutProps) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-950">
      <a
        href="#contenido-principal"
        className="sr-only z-50 rounded-xl bg-sky-700 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Ir al contenido principal
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link
            href="/integraciones/google-drive"
            className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700"
          >
            <Image
              src="/brand/logo.png"
              alt="TRANS SERVICES A&B"
              width={48}
              height={48}
              className="h-11 w-11 rounded-xl object-contain"
              priority
            />
            <span className="hidden sm:block">
              <span className="block text-sm font-extrabold tracking-tight">TRANS SERVICES A&amp;B</span>
              <span className="block text-xs font-medium text-slate-500">ERP empresarial</span>
            </span>
          </Link>

          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700"
          >
            Ingresar al ERP
          </Link>
        </div>
      </header>

      <main id="contenido-principal">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
            <p className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-sky-700">{eyebrow}</p>
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {description}
            </p>
          </div>
        </section>

        <article className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
          <div className="space-y-8 text-[1rem] leading-7 text-slate-700 [&_a]:font-semibold [&_a]:text-sky-700 [&_a]:underline [&_a]:decoration-sky-300 [&_a]:underline-offset-4 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-slate-950 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_li]:pl-1 [&_p]:max-w-3xl [&_strong]:font-bold [&_strong]:text-slate-900 [&_ul]:max-w-3xl [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
            {children}
          </div>
        </article>
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">TRANS SERVICES A&amp;B S.A.S.</p>
            <p className="mt-1 text-sm text-slate-500">Aplicación empresarial de uso autorizado.</p>
          </div>
          <nav aria-label="Información legal" className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-11 content-center font-semibold text-slate-600 underline-offset-4 hover:text-sky-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
