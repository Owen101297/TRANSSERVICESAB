"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  ClipboardCheck,
  Sparkles,
  ShieldAlert,
  HeartPulse,
  UserCheck,
  FileQuestion,
  Droplets,
  LogOut,
  Shield,
  Phone,
  AlertTriangle,
  ArrowRight,
  User,
} from "lucide-react";
import { PlateTag } from "@/components/ui/PlateTag";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface AppTile {
  title: string;
  subtitle: string;
  icon: any;
  href: string;
  badge: string;
  color: "cyan" | "amber" | "green" | "red";
}

const APPS: AppTile[] = [
  {
    title: "Plan de Viaje & Riesgo",
    subtitle: "Evaluación HSE y hoja de ruta",
    icon: Truck,
    href: "/apps/viajes/index.html",
    badge: "Prioritario",
    color: "cyan",
  },
  {
    title: "Preoperacional Diario",
    subtitle: "Checklist técnico-mecánico",
    icon: ClipboardCheck,
    href: "/apps/preoperacional/index.html",
    badge: "Obligatorio",
    color: "amber",
  },
  {
    title: "Registro de Asistencia",
    subtitle: "Firma digital y registro diario",
    icon: UserCheck,
    href: "/apps/asistencia/index.html",
    badge: "Diario",
    color: "green",
  },
  {
    title: "Control de Lavado",
    subtitle: "Registro de limpieza y lavado",
    icon: Droplets,
    href: "/apps/lavado/index.html",
    badge: "Control",
    color: "cyan",
  },
  {
    title: "Aseo y Desinfección",
    subtitle: "Protocolo de bioseguridad",
    icon: Sparkles,
    href: "/apps/aseo/index.html",
    badge: "Semanal",
    color: "green",
  },
  {
    title: "Inspección de Extintor",
    subtitle: "Control de carga y manómetro",
    icon: ShieldAlert,
    href: "/apps/extintor/index.html",
    badge: "Mensual",
    color: "red",
  },
  {
    title: "Inspección de Botiquín",
    subtitle: "Inventario de insumos médicos",
    icon: HeartPulse,
    href: "/apps/botiquin/index.html",
    badge: "Mensual",
    color: "amber",
  },
  {
    title: "Encuesta de Riesgo Vial",
    subtitle: "Valoración PESV anual",
    icon: FileQuestion,
    href: "/apps/encuesta/index.html",
    badge: "Periódico",
    color: "cyan",
  },
];

export default function PortalConductorMobilePage() {
  const router = useRouter();
  const [driver, setDriver] = useState<{
    id?: string;
    nombre: string;
    documento: string;
    placa: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión de API /api/auth/me o localStorage
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          const u = data.user;
          const sessionObj = {
            id: u.id,
            nombre: u.nombre,
            documento: u.documento,
            placa: u.placaAsignada || null,
          };
          setDriver(sessionObj);
          localStorage.setItem("transservices_conductor", JSON.stringify(sessionObj));
        } else {
          // Intentar leer de localStorage si existe
          try {
            const raw = localStorage.getItem("transservices_conductor");
            if (raw) {
              setDriver(JSON.parse(raw));
            }
          } catch {}
        }
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem("transservices_conductor");
          if (raw) setDriver(JSON.parse(raw));
        } catch {}
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("transservices_conductor");
    router.push("/login");
    router.refresh();
  };

  const handleOpenApp = (href: string) => {
    // Sincronizar sesión activa en localStorage antes de abrir
    if (driver) {
      localStorage.setItem("transservices_conductor", JSON.stringify(driver));
    }
    window.location.href = href;
  };

  const colorStyles = {
    cyan: "border-radar-cyan/30 text-radar-cyan bg-radar-cyan/5 hover:border-radar-cyan shadow-radar-cyan/5",
    amber: "border-signal-amber/30 text-signal-amber bg-signal-amber/5 hover:border-signal-amber shadow-signal-amber/5",
    green: "border-ok-green/30 text-ok-green bg-ok-green/5 hover:border-ok-green shadow-ok-green/5",
    red: "border-alert-red/30 text-alert-red bg-alert-red/5 hover:border-alert-red shadow-alert-red/5",
  };

  return (
    <div className="min-h-screen bg-asphalt-950 text-paper-50 flex flex-col font-[family-name:var(--font-body)]">
      {/* Barra de Encabezado Móvil */}
      <header className="sticky top-0 z-40 bg-asphalt-900/90 backdrop-blur-md border-b border-line-600 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-radar-cyan/10 border border-radar-cyan/30 flex items-center justify-center text-radar-cyan shadow-sm">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-lg font-black tracking-wide leading-tight text-paper-50">
              PORTAL DEL CONDUCTOR
            </h1>
            <p className="text-[10px] text-mist-200 font-mono tracking-wider">
              TRANS SERVICES COOPERATIVA A&B
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className="p-2 rounded-xl bg-asphalt-800 border border-line-600 hover:border-alert-red text-fog-400 hover:text-alert-red transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        {/* Tarjeta de Perfil y Vehículo Asignado */}
        <div className="bg-asphalt-900 border border-line-600 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-asphalt-800 border border-line-600 flex items-center justify-center font-[family-name:var(--font-display)] text-xl font-bold text-radar-cyan shadow-inner">
                {driver?.nombre
                  ? driver.nombre
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                  : "CO"}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-radar-cyan">
                  Conductor Activo
                </span>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-paper-50 leading-tight">
                  {driver?.nombre || "Cargando perfil..."}
                </h2>
                <p className="text-xs text-mist-200 font-mono mt-0.5">
                  C.C. {driver?.documento || "—"}
                </p>
              </div>
            </div>

            {/* Placa Asignada */}
            <div className="text-right">
              <span className="text-[10px] font-medium uppercase tracking-wider text-fog-400 block mb-1">
                Vehículo Asignado
              </span>
              {driver?.placa && driver.placa !== "SIN ASIGNAR" ? (
                <PlateTag plate={driver.placa} />
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-signal-amber/10 border border-signal-amber/30 text-signal-amber">
                  <AlertTriangle size={12} /> Sin Asignar
                </span>
              )}
            </div>
          </div>

          {!driver?.placa || driver?.placa === "SIN ASIGNAR" ? (
            <div className="mt-3.5 p-2.5 bg-signal-amber/10 border border-signal-amber/20 rounded-xl text-xs text-signal-amber flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>
                No tienes un vehículo asignado. Contacta al coordinador de despacho.
              </span>
            </div>
          ) : null}
        </div>

        {/* Título de Sección */}
        <div className="flex items-center justify-between pt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-fog-400">
            Aplicaciones Operativas ({APPS.length})
          </h3>
          <span className="text-[11px] text-mist-200 font-mono">
            Acceso Directo Unificado
          </span>
        </div>

        {/* Cuadrícula de Aplicaciones Táctiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {APPS.map((app, idx) => {
            const Icon = app.icon;
            const style = colorStyles[app.color];

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleOpenApp(app.href)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-md ${style}`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="w-11 h-11 rounded-xl bg-asphalt-900/80 border border-line-600 flex items-center justify-center text-inherit group-hover:scale-110 transition-transform">
                    <Icon size={22} />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-asphalt-950/70 border border-line-600 text-mist-200">
                    {app.badge}
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between w-full">
                  <div>
                    <h4 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 leading-snug group-hover:text-inherit transition-colors">
                      {app.title}
                    </h4>
                    <p className="text-xs text-mist-200 mt-0.5 line-clamp-1">
                      {app.subtitle}
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-asphalt-900 border border-line-600 flex items-center justify-center text-fog-400 group-hover:text-paper-50 group-hover:border-paper-50 transition-all shrink-0">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Soporte de Emergencias y HSE */}
        <div className="mt-6 bg-asphalt-900/60 border border-line-600 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-mist-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-signal-amber/10 border border-signal-amber/30 flex items-center justify-center text-signal-amber">
              <Phone size={18} />
            </div>
            <div>
              <p className="font-bold text-paper-50">Línea de Emergencia & HSE</p>
              <p className="text-[11px] text-fog-400">Atención 24/7 en carretera</p>
            </div>
          </div>
          <a
            href="tel:+573100000000"
            className="py-2 px-3.5 bg-signal-amber text-asphalt-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-signal-amber/90 transition-colors"
          >
            Llamar
          </a>
        </div>
      </main>

      {/* Pie de página */}
      <footer className="p-4 text-center text-[11px] text-fog-400 border-t border-line-600/50 mt-auto">
        Trans Services Cooperativa A&B · Conexión Operativa Segura
      </footer>
    </div>
  );
}
