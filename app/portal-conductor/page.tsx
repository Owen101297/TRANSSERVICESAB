"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Phone,
  AlertTriangle,
  RefreshCw,
  Check,
  Search,
  X,
  Zap,
  ChevronRight,
  Home,
  Navigation,
  LifeBuoy,
  GraduationCap,
} from "lucide-react";

interface AppCategory {
  category: string;
  apps: {
    id: string;
    title: string;
    subtitle: string;
    icon: any;
    href: string;
    badge: string;
    iconBg: string;
    iconColor: string;
    badgeColor: string;
  }[];
}

const CATEGORIAS_APPS: AppCategory[] = [
  {
    category: "Operación & Ruta Diaria",
    apps: [
      {
        id: "preoperacional",
        title: "Preoperacional Diario",
        subtitle: "Checklist técnico-mecánico obligatorio de inicio de turno",
        icon: ClipboardCheck,
        href: "/portal-conductor/preoperacional",
        badge: "Obligatorio",
        iconBg: "bg-amber-50 border-amber-200/60 text-[#FF9500]",
        iconColor: "text-[#FF9500]",
        badgeColor: "bg-amber-100/70 text-amber-800 border-amber-300/60",
      },
      {
        id: "viajes",
        title: "Gerenciamiento de Viaje",
        subtitle: "Gerenciamiento de ruta, pasajeros y evaluación HSE",
        icon: Truck,
        href: "/apps/viajes/index.html",
        badge: "Prioritario",
        iconBg: "bg-blue-50 border-blue-200/60 text-[#007AFF]",
        iconColor: "text-[#007AFF]",
        badgeColor: "bg-blue-100/70 text-blue-800 border-blue-300/60",
      },
      {
        id: "asistencia",
        title: "Registro de Asistencia",
        subtitle: "Marcación de turno y firma digital diaria TH-FOR-03",
        icon: UserCheck,
        href: "/apps/asistencia/index.html",
        badge: "Diario",
        iconBg: "bg-emerald-50 border-emerald-200/60 text-[#34C759]",
        iconColor: "text-[#34C759]",
        badgeColor: "bg-emerald-100/70 text-emerald-800 border-emerald-300/60",
      },
    ],
  },
  {
    category: "Formación & Seguridad Vial",
    apps: [
      {
        id: "capacitaciones",
        title: "Charlas & Capacitaciones",
        subtitle: "Formación continua SG-SST y PESV con selfie y firma",
        icon: GraduationCap,
        href: "/portal-conductor/capacitaciones",
        badge: "Semanal",
        iconBg: "bg-amber-50 border-amber-200/60 text-[#FF9500]",
        iconColor: "text-[#FF9500]",
        badgeColor: "bg-amber-100/70 text-amber-800 border-amber-300/60",
      },
      {
        id: "encuesta",
        title: "Encuesta de Riesgo Vial",
        subtitle: "Valoración de hábitos y caracterización PESV",
        icon: FileQuestion,
        href: "/apps/encuesta/index.html",
        badge: "PESV",
        iconBg: "bg-indigo-50 border-indigo-200/60 text-[#5856D6]",
        iconColor: "text-[#5856D6]",
        badgeColor: "bg-indigo-100/70 text-indigo-800 border-indigo-300/60",
      },
    ],
  },
  {
    category: "Higiene & Desinfección Vehicular",
    apps: [
      {
        id: "lavado",
        title: "Control de Lavado",
        subtitle: "Registro y control de limpieza exterior e interior",
        icon: Droplets,
        href: "/apps/lavado/index.html",
        badge: "Operativo",
        iconBg: "bg-cyan-50 border-cyan-200/60 text-[#32ADE6]",
        iconColor: "text-[#32ADE6]",
        badgeColor: "bg-cyan-100/70 text-cyan-800 border-cyan-300/60",
      },
      {
        id: "aseo",
        title: "Aseo y Desinfección",
        subtitle: "Protocolo de bioseguridad y desinfección de cabina",
        icon: Sparkles,
        href: "/apps/aseo/index.html",
        badge: "Semanal",
        iconBg: "bg-teal-50 border-teal-200/60 text-[#30B0C7]",
        iconColor: "text-[#30B0C7]",
        badgeColor: "bg-teal-100/70 text-teal-800 border-teal-300/60",
      },
    ],
  },
  {
    category: "Inspecciones de Seguridad & Emergencia",
    apps: [
      {
        id: "extintor",
        title: "Inspección de Extintor",
        subtitle: "Control de presión, manómetro y fecha de recarga",
        icon: ShieldAlert,
        href: "/apps/extintor/index.html",
        badge: "Mensual",
        iconBg: "bg-rose-50 border-rose-200/60 text-[#FF3B30]",
        iconColor: "text-[#FF3B30]",
        badgeColor: "bg-rose-100/70 text-rose-800 border-rose-300/60",
      },
      {
        id: "botiquin",
        title: "Inspección de Botiquín",
        subtitle: "Inventario de dotación y fechas de caducidad",
        icon: HeartPulse,
        href: "/apps/botiquin/index.html",
        badge: "Mensual",
        iconBg: "bg-orange-50 border-orange-200/60 text-[#FF9500]",
        iconColor: "text-[#FF9500]",
        badgeColor: "bg-orange-100/70 text-orange-800 border-orange-300/60",
      },
    ],
  },
];

export default function PortalConductorMobilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inicio" | "viajes" | "vehiculo" | "ayuda">("inicio");
  const [driver, setDriver] = useState<{
    id?: string;
    nombre: string;
    documento: string;
    placa: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para Cambio Rápido de Vehículo (Apple Sheet Modal)
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<
    { id: string; placa: string; marca?: string; modelo?: string; contratistaNombre?: string }[]
  >([]);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [vehicleFeedback, setVehicleFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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

    // 2. Cargar vehículos disponibles para cambio rápido
    fetch("/api/portal-conductor/cambiar-vehiculo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.vehiculos) {
          setAvailableVehicles(data.vehiculos);
        }
      })
      .catch(() => {});
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
    if (driver) {
      localStorage.setItem("transservices_conductor", JSON.stringify(driver));
    }
    window.location.href = href;
  };

  const handleConfirmVehicleChange = async (targetPlaca: string) => {
    if (!targetPlaca.trim()) return;
    setIsSubmittingVehicle(true);
    setVehicleFeedback(null);

    try {
      const res = await fetch("/api/portal-conductor/cambiar-vehiculo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conductorId: driver?.id,
          documento: driver?.documento,
          placa: targetPlaca.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const updatedPlaca = data.placa || targetPlaca.trim().toUpperCase();
        const updatedDriver = {
          ...driver!,
          placa: updatedPlaca,
        };
        setDriver(updatedDriver);
        localStorage.setItem("transservices_conductor", JSON.stringify(updatedDriver));

        setVehicleFeedback({
          type: "success",
          msg: `¡Vehículo asignado a ${updatedPlaca}!`,
        });

        setTimeout(() => {
          setIsVehicleModalOpen(false);
          setVehicleFeedback(null);
          setVehicleSearch("");
        }, 1100);
      } else {
        setVehicleFeedback({
          type: "error",
          msg: data.error || "No se pudo cambiar el vehículo.",
        });
      }
    } catch (err: any) {
      setVehicleFeedback({
        type: "error",
        msg: err.message || "Error de conexión.",
      });
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return availableVehicles;
    const q = vehicleSearch.toLowerCase().replace(/[^a-z0-9]/g, "");
    return availableVehicles.filter((v) => {
      const cleanPlaca = v.placa.toLowerCase().replace(/[^a-z0-9]/g, "");
      const full = `${v.placa} ${v.marca || ""} ${v.modelo || ""} ${v.contratistaNombre || ""}`.toLowerCase();
      return cleanPlaca.includes(q) || full.includes(vehicleSearch.toLowerCase());
    });
  }, [availableVehicles, vehicleSearch]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',Helvetica,Arial,sans-serif] selection:bg-[#007AFF] selection:text-white pb-32 antialiased">
      {/* Fondo con Iluminación Ambiental Sutil de Apple */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(0,122,255,0.03),transparent_50%),radial-gradient(circle_at_100%_20%,rgba(245,158,11,0.02),transparent_40%)]" />

      {/* Cabecera Estilo Apple Glass */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="h-7 max-w-[110px] shrink-0 flex items-center">
            <img
              src="/brand/logo.png"
              alt="Trans Services"
              className="h-7 w-auto max-w-[110px] object-contain"
            />
          </div>
          <div className="border-l border-slate-200 pl-3 py-0.5">
            <span className="text-[12px] font-bold text-[#0F172A] tracking-tight block leading-tight">
              Portal del Conductor
            </span>
            <span className="text-[10px] font-mono text-[#007AFF] font-medium block leading-tight">
              Trans Services A&B
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 active:scale-95 text-slate-700 hover:text-slate-900 border border-slate-200 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <LogOut size={13} className="text-slate-500" />
          <span>Salir</span>
        </button>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 space-y-4 relative z-10">
        {/* Dynamic Island / Live Activity Widget de Turno */}
        <div className="bg-white/95 border border-slate-200/90 rounded-[24px] p-4 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#FF9500] animate-pulse shadow-[0_0_8px_#FF9500]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Turno en Curso · {new Date().toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <h3 className="text-xs font-bold text-[#0F172A] tracking-tight">
                Inspección Preoperacional Requerida
              </h3>
            </div>
          </div>
          <button
            onClick={() => handleOpenApp("/apps/preoperacional/index.html")}
            className="px-3.5 py-1.5 rounded-full bg-[#FF9500] hover:bg-[#FF9500]/90 active:scale-95 text-white font-bold text-xs shadow-[0_2px_10px_rgba(255,149,0,0.3)] transition-all flex items-center gap-1 shrink-0"
          >
            <span>Iniciar</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Apple Card Widget: Conductor & Vehículo Activo */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#007AFF] to-[#5856D6] p-0.5 shadow-md shadow-blue-500/15">
                <div className="w-full h-full rounded-[14px] bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-base text-white">
                  {driver?.nombre
                    ? driver.nombre
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                    : "CO"}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF]">
                  Conductor Certificado
                </span>
                <h2 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">
                  {driver?.nombre || (loading ? "Cargando conductor..." : "Conductor")}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  C.C. {driver?.documento || "—"}
                </p>
              </div>
            </div>

            {/* Placa con estética Apple */}
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Vehículo Activo
              </span>
              {driver?.placa && driver.placa !== "SIN ASIGNAR" ? (
                <div className="px-3 py-1 rounded-xl bg-amber-300 text-slate-950 border border-amber-400 font-mono font-black text-sm tracking-widest shadow-sm">
                  {driver.placa}
                </div>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
                  Sin Asignar
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#007AFF] hover:text-blue-700 active:scale-95 font-semibold transition-all"
              >
                <RefreshCw size={11} className="shrink-0" />
                <span>Cambiar Placa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Categorías de Aplicaciones estilo iOS Control Center & Widgets */}
        {CATEGORIAS_APPS.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {cat.category}
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {cat.apps.length} módulos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cat.apps.map((app) => {
                const Icon = app.icon;

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleOpenApp(app.href)}
                    className="w-full text-left p-4 rounded-[26px] bg-white hover:bg-slate-50/80 border border-slate-200/90 transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform ${app.iconBg}`}>
                        <Icon size={22} className={app.iconColor} />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-2xs ${app.badgeColor}`}>
                        {app.badge}
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between w-full">
                      <div className="pr-2">
                        <h4 className="text-[15px] font-bold text-[#0F172A] tracking-tight leading-snug group-hover:text-[#007AFF] transition-colors">
                          {app.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 leading-normal">
                          {app.subtitle}
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-200 transition-all shrink-0">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Soporte de Emergencias y HSE estilo Apple Card */}
        <div className="mt-4 bg-rose-50/60 border border-rose-200/70 rounded-[24px] p-4 flex items-center justify-between gap-3 text-xs text-slate-700 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-[#FF3B30] shrink-0">
              <Phone size={17} />
            </div>
            <div>
              <p className="font-bold text-[#0F172A] text-xs">Línea de Emergencia HSE 24/7</p>
              <p className="text-[11px] text-slate-500">Asistencia inmediata en ruta</p>
            </div>
          </div>
          <a
            href="tel:+573100000000"
            className="px-3.5 py-2 rounded-full bg-[#FF3B30] text-white font-bold text-xs shadow-md shadow-rose-500/20 hover:bg-rose-600 active:scale-95 transition-all shrink-0"
          >
            Llamar
          </a>
        </div>
      </main>

      {/* Modal Táctil de Cambio de Vehículo (Apple Bottom Sheet) */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-t-[32px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Grabber decorativo de iOS */}
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-3 sm:hidden" />

            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                  Seleccionar Vehículo
                </h3>
                <p className="text-[11px] text-slate-500">
                  Elige la placa para tu turno actual
                </p>
              </div>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {vehicleFeedback && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                    vehicleFeedback.type === "success"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border border-rose-200 text-rose-800"
                  }`}
                >
                  {vehicleFeedback.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
                  <span>{vehicleFeedback.msg}</span>
                </div>
              )}

              {/* Buscador iOS */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  autoFocus
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Buscar o escribir placa (ej. NSY-352)..."
                  className="w-full bg-slate-100 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:border-[#007AFF] focus:bg-white focus:outline-none uppercase"
                />
              </div>

              {vehicleSearch.trim().length >= 5 && (
                <button
                  type="button"
                  onClick={() => handleConfirmVehicleChange(vehicleSearch)}
                  disabled={isSubmittingVehicle}
                  className="w-full p-3 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#007AFF] flex items-center justify-between text-xs font-bold transition-colors"
                >
                  <span className="flex items-center gap-2 font-mono">
                    <Zap size={14} /> Usar: {vehicleSearch.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold">Confirmar ➔</span>
                </button>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredVehicles.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                    No hay coincidencias. Usa la placa escrita arriba.
                  </div>
                ) : (
                  filteredVehicles.map((v) => {
                    const isCurrent =
                      driver?.placa &&
                      driver.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") ===
                        v.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleConfirmVehicleChange(v.placa)}
                        disabled={isSubmittingVehicle}
                        className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between text-xs transition-all active:scale-[0.98] ${
                          isCurrent
                            ? "bg-blue-50 border-blue-300 text-blue-900 font-bold"
                            : "bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-300 border border-amber-400 font-mono font-black text-xs text-slate-950 tracking-wider">
                            {v.placa}
                          </span>
                          <div>
                            <p className="font-semibold text-xs text-[#0F172A]">
                              {v.marca} {v.modelo}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {v.contratistaNombre || "Propio / Cooperativa"}
                            </p>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#007AFF] text-white">
                            Activo
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            Elegir ➔
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Glass Capsule Dock (Barra Inferior Flotante de Apple Light) */}
      <nav className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto bg-white/85 backdrop-blur-3xl border border-slate-200/90 rounded-full px-5 py-2.5 flex items-center justify-around shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
        <button
          onClick={() => setActiveTab("inicio")}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            activeTab === "inicio" ? "text-[#007AFF] scale-105 font-bold" : "text-slate-400 hover:text-slate-700"
          }`}
        >
          <Home size={19} />
          <span className="text-[9px] font-semibold tracking-tight">Inicio</span>
        </button>

        <button
          onClick={() => handleOpenApp("/apps/viajes/index.html")}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-700 transition-all active:scale-95"
        >
          <Navigation size={19} />
          <span className="text-[9px] font-semibold tracking-tight">Viajes</span>
        </button>

        <button
          onClick={() => handleOpenApp("/apps/preoperacional/index.html")}
          className="flex flex-col items-center gap-0.5 text-[#FF9500] hover:text-[#FF9500]/90 transition-all active:scale-95 -mt-3.5"
        >
          <div className="p-2.5 rounded-full bg-gradient-to-tr from-[#FF9500] to-[#FF5E3A] text-white shadow-[0_4px_16px_rgba(255,149,0,0.35)]">
            <ClipboardCheck size={20} className="stroke-[2.5]" />
          </div>
          <span className="text-[9px] font-bold tracking-tight text-[#FF9500]">Preoperacional</span>
        </button>

        <button
          onClick={() => setIsVehicleModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-700 transition-all active:scale-95"
        >
          <Truck size={19} />
          <span className="text-[9px] font-semibold tracking-tight">Vehículo</span>
        </button>

        <a
          href="tel:+573100000000"
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-[#FF3B30] transition-all active:scale-95"
        >
          <LifeBuoy size={19} />
          <span className="text-[9px] font-semibold tracking-tight">S.O.S</span>
        </a>
      </nav>
    </div>
  );
}
