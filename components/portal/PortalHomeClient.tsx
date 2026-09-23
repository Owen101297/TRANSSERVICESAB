"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRight, BookOpenCheck, CalendarCheck, Camera, CheckCircle2,
  ClipboardCheck, Droplets, FileQuestion, HeartPulse, LifeBuoy, Loader2, LogOut,
  Route, ShieldAlert, Sparkles, Truck, UserRound, Workflow,
} from "lucide-react";

type ViewName = "hoy" | "jornada" | "tareas" | "perfil";
type PortalContext = {
  usuario: { id: string; nombre: string; documento: string; rol: string; perfiles: string[] };
  asignacion: null | {
    id: string; placa: string; turno?: string | null; tipo: string; contratista: string;
    autorizacionOperativa: boolean;
    vehiculo: { id: string; placa: string; marca: string; modelo: number; estado: string };
  };
  jornada: {
    turno: null | { id: string; hora: string; estado: string; placa: string; odometroInicial: number };
    preoperacional: null | { id: string; estadoConcepto: string; placa: string; fecha: string };
    viajeActivo: null | { id: string; placa: string; origen: string; destino: string; estado: string };
  };
  formacion: { pendientes: { id: string; nombre: string; fecha: string; tipo: string; categoria: string }[] };
};

const TOOLS = [
  { title: "Gerenciamiento de viaje", detail: "Ruta, pasajeros y evaluación HSE", href: "/apps/viajes/index.html", icon: Route },
  { title: "Control de lavado", detail: "Limpieza exterior e interior", href: "/apps/lavado/index.html", icon: Droplets },
  { title: "Aseo y desinfección", detail: "Cabina y superficies", href: "/apps/aseo/index.html", icon: Sparkles },
  { title: "Inspección de extintor", detail: "Presión, sello y vigencia", href: "/apps/extintor/index.html", icon: ShieldAlert },
  { title: "Inspección de botiquín", detail: "Dotación y vencimientos", href: "/apps/botiquin/index.html", icon: HeartPulse },
  { title: "Encuesta de riesgo vial", detail: "Caracterización PESV", href: "/apps/encuesta/index.html", icon: FileQuestion },
];

function StatusRow({ complete, title, detail, href, blocked }: { complete: boolean; title: string; detail: string; href: string; blocked?: boolean }) {
  const content = (
    <div className={`flex min-h-18 items-center gap-3 rounded-2xl border p-3 ${blocked ? "border-slate-200 bg-slate-100 opacity-65" : "border-slate-200 bg-white"}`}>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${complete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
        {complete ? <CheckCircle2 size={21} /> : <Workflow size={21} />}
      </div>
      <div className="min-w-0 flex-1"><p className="font-bold text-slate-950">{title}</p><p className="truncate text-sm text-slate-500">{detail}</p></div>
      {!blocked && <ArrowRight size={18} className="shrink-0 text-slate-400" />}
    </div>
  );
  return blocked ? content : <Link href={href}>{content}</Link>;
}

export function PortalHomeClient({ initialView }: { initialView: string }) {
  const router = useRouter();
  const view: ViewName = ["jornada", "tareas", "perfil"].includes(initialView) ? initialView as ViewName : "hoy";
  const [data, setData] = useState<PortalContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/portal-conductor/contexto", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "No fue posible cargar el portal.");
        return body;
      })
      .then(setData)
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "No fue posible cargar el portal.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    localStorage.removeItem("transservices_conductor");
    router.replace("/login");
    router.refresh();
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" aria-label="Cargando portal" /></div>;
  if (error || !data) return <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center"><AlertTriangle className="text-amber-600" /><h1 className="text-xl font-bold">No se pudo abrir el portal</h1><p className="text-slate-600">{error}</p><Link href="/login" className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white">Ingresar nuevamente</Link></div>;

  const { usuario, asignacion, jornada, formacion } = data;
  const nextStep = !asignacion ? "asignacion" : !jornada.turno ? "turno" : !jornada.preoperacional ? "preoperacional" : "viaje";

  return (
    <div className="min-h-screen pb-24 font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div><p className="text-xs font-bold text-blue-700">TRANS SERVICES A&amp;B</p><h1 className="text-lg font-extrabold tracking-tight">Portal operativo</h1></div>
          <button onClick={logout} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700" aria-label="Cerrar sesión"><LogOut size={17} /> Salir</button>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {view === "hoy" && <>
          <section className="overflow-hidden rounded-3xl bg-slate-950 p-5 text-white shadow-lg">
            <p className="text-sm text-slate-300">Hoy</p><h2 className="mt-1 text-2xl font-extrabold">Hola, {usuario.nombre.split(" ")[0]}</h2>
            <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-xs text-slate-400">Vehículo asignado</p><p className="mt-1 font-mono text-xl font-black tracking-widest text-amber-300">{asignacion?.placa || "SIN ASIGNACIÓN"}</p></div><CalendarCheck className="text-blue-400" size={34} /></div>
          </section>
          {!asignacion && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="font-bold text-amber-900">Coordinación debe asignar un vehículo</p><p className="mt-1 text-sm text-amber-800">Las tareas de jornada permanecerán bloqueadas hasta contar con una asignación activa.</p></div>}
          <section aria-labelledby="siguiente"><h2 id="siguiente" className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">Siguiente acción</h2>
            {nextStep === "asignacion" && <StatusRow complete={false} blocked title="Esperar asignación" detail="La coordinación debe autorizar conductor y vehículo" href="#" />}
            {nextStep === "turno" && <StatusRow complete={false} title="Abrir jornada" detail="Registra odómetro y fotografías" href="/portal-conductor/turno" />}
            {nextStep === "preoperacional" && <StatusRow complete={false} title="Realizar preoperacional" detail="Verifica el estado técnico del vehículo" href="/portal-conductor/preoperacional" />}
            {nextStep === "viaje" && <StatusRow complete={Boolean(jornada.viajeActivo)} title={jornada.viajeActivo ? "Viaje en curso" : "Iniciar gerenciamiento"} detail={jornada.viajeActivo ? `${jornada.viajeActivo.origen} → ${jornada.viajeActivo.destino}` : "La jornada está habilitada para operar"} href="/apps/viajes/index.html" />}
          </section>
          {formacion.pendientes.length > 0 && <Link href="/portal-conductor/capacitaciones" className="flex min-h-20 items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4"><BookOpenCheck className="text-blue-700" /><div className="flex-1"><p className="font-bold text-blue-950">Formación pendiente</p><p className="text-sm text-blue-800">{formacion.pendientes.length} actividad(es) por completar</p></div><ArrowRight size={18} className="text-blue-700" /></Link>}
        </>}

        {view === "jornada" && <section className="space-y-3"><div><p className="text-sm font-bold text-blue-700">Secuencia operativa</p><h2 className="text-2xl font-extrabold">Jornada</h2><p className="mt-1 text-sm text-slate-600">Completa cada control en orden antes de iniciar la ruta.</p></div>
          <StatusRow complete={Boolean(jornada.turno)} title="1. Apertura de jornada" detail={jornada.turno ? `Abierta a las ${jornada.turno.hora}` : "Odómetro, vehículo y ubicación"} href="/portal-conductor/turno" blocked={!asignacion} />
          <StatusRow complete={Boolean(jornada.preoperacional)} title="2. Inspección preoperacional" detail={jornada.preoperacional ? `Concepto: ${jornada.preoperacional.estadoConcepto.replaceAll("_", " ")}` : "Checklist técnico del vehículo"} href="/portal-conductor/preoperacional" blocked={!jornada.turno} />
          <StatusRow complete={Boolean(jornada.viajeActivo)} title="3. Gerenciamiento de viaje" detail={jornada.viajeActivo ? `${jornada.viajeActivo.origen} → ${jornada.viajeActivo.destino}` : "Ruta, riesgos y pasajeros"} href="/apps/viajes/index.html" blocked={!jornada.preoperacional} />
        </section>}

        {view === "tareas" && <section><div><p className="text-sm font-bold text-blue-700">Herramientas asignables</p><h2 className="text-2xl font-extrabold">Tareas</h2><p className="mt-1 text-sm text-slate-600">Usa estos formularios cuando coordinación o HSEQ indique su ejecución.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{TOOLS.map((tool) => <Link key={tool.href} href={tool.href} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><tool.icon size={22} /></div><div className="min-w-0 flex-1"><p className="font-bold">{tool.title}</p><p className="truncate text-sm text-slate-500">{tool.detail}</p></div><ArrowRight size={17} className="text-slate-400" /></Link>)}</div></section>}

        {view === "perfil" && <section className="space-y-4"><div><p className="text-sm font-bold text-blue-700">Identidad verificada</p><h2 className="text-2xl font-extrabold">Perfil</h2></div><div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-3"><div className="flex size-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><UserRound /></div><div><p className="font-extrabold">{usuario.nombre}</p><p className="text-sm text-slate-500">C.C. {usuario.documento}</p></div></div><dl className="mt-5 grid gap-3 text-sm"><div className="flex justify-between gap-3 border-t border-slate-100 pt-3"><dt className="text-slate-500">Rol</dt><dd className="font-bold capitalize">{usuario.rol}</dd></div><div className="flex justify-between gap-3 border-t border-slate-100 pt-3"><dt className="text-slate-500">Vehículo</dt><dd className="font-mono font-black">{asignacion?.placa || "Sin asignación"}</dd></div><div className="flex justify-between gap-3 border-t border-slate-100 pt-3"><dt className="text-slate-500">Contratista</dt><dd className="text-right font-bold">{asignacion?.contratista || "No aplica"}</dd></div></dl></div>{usuario.rol !== "conductor" && <Link href="/dashboard" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 font-bold text-white"><Truck size={18} /> Volver al ERP</Link>}<a href="tel:+573100000000" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 font-bold text-rose-700"><LifeBuoy size={18} /> Emergencia HSE</a></section>}
      </main>
    </div>
  );
}
