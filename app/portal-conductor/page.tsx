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
  Shield,
  Phone,
  AlertTriangle,
  ArrowRight,
  User,
  RefreshCw,
  Check,
  Search,
  X,
  Zap,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Home,
  Navigation,
  FileText,
  LifeBuoy,
} from "lucide-react";
import { PlateTag } from "@/components/ui/PlateTag";

interface AppCategory {
  category: string;
  apps: {
    id: string;
    title: string;
    subtitle: string;
    icon: any;
    href: string;
    badge: string;
    color: "cyan" | "amber" | "green" | "red";
    priority?: boolean;
  }[];
}

const CATEGORIAS_APPS: AppCategory[] = [
  {
    category: "Operación & Ruta Diaria",
    apps: [
      {
        id: "preoperacional",
        title: "Inspección Preoperacional",
        subtitle: "Checklist técnico-mecánico obligatorio de inicio de turno",
        icon: ClipboardCheck,
        href: "/apps/preoperacional/index.html",
        badge: "Obligatorio",
        color: "amber",
        priority: true,
      },
      {
        id: "viajes",
        title: "Plan de Viaje & Riesgo",
        subtitle: "Gerenciamiento de ruta, pasajeros y evaluación HSE",
        icon: Truck,
        href: "/apps/viajes/index.html",
        badge: "Prioritario",
        color: "cyan",
        priority: true,
      },
      {
        id: "asistencia",
        title: "Registro de Asistencia",
        subtitle: "Marcación de turno y firma digital diaria",
        icon: UserCheck,
        href: "/apps/asistencia/index.html",
        badge: "Diario",
        color: "green",
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
        color: "cyan",
      },
      {
        id: "aseo",
        title: "Aseo y Desinfección",
        subtitle: "Protocolo de bioseguridad y desinfección de cabina",
        icon: Sparkles,
        href: "/apps/aseo/index.html",
        badge: "Semanal",
        color: "green",
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
        color: "red",
      },
      {
        id: "botiquin",
        title: "Inspección de Botiquín",
        subtitle: "Inventario de dotación y fechas de caducidad",
        icon: HeartPulse,
        href: "/apps/botiquin/index.html",
        badge: "Mensual",
        color: "amber",
      },
      {
        id: "encuesta",
        title: "Encuesta de Riesgo Vial",
        subtitle: "Valoración de hábitos y caracterización PESV",
        icon: FileQuestion,
        href: "/apps/encuesta/index.html",
        badge: "PESV",
        color: "cyan",
      },
    ],
  },
];

export default function PortalConductorMobilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inicio" | "apps" | "ayuda">("inicio");
  const [driver, setDriver] = useState<{
    id?: string;
    nombre: string;
    documento: string;
    placa: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para Cambio Rápido de Vehículo
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
          msg: `¡Vehículo actualizado a ${updatedPlaca} con éxito!`,
        });

        setTimeout(() => {
          setIsVehicleModalOpen(false);
          setVehicleFeedback(null);
          setVehicleSearch("");
        }, 1200);
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

  // Filtrar vehículos disponibles
  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return availableVehicles;
    const q = vehicleSearch.toLowerCase().replace(/[^a-z0-9]/g, "");
    return availableVehicles.filter((v) => {
      const cleanPlaca = v.placa.toLowerCase().replace(/[^a-z0-9]/g, "");
      const full = `${v.placa} ${v.marca || ""} ${v.modelo || ""} ${v.contratistaNombre || ""}`.toLowerCase();
      return cleanPlaca.includes(q) || full.includes(vehicleSearch.toLowerCase());
    });
  }, [availableVehicles, vehicleSearch]);

  const colorStyles = {
    cyan: "border-radar-cyan/30 text-radar-cyan bg-radar-cyan/5 hover:border-radar-cyan shadow-radar-cyan/5",
    amber: "border-signal-amber/30 text-signal-amber bg-signal-amber/5 hover:border-signal-amber shadow-signal-amber/5",
    green: "border-ok-green/30 text-ok-green bg-ok-green/5 hover:border-ok-green shadow-ok-green/5",
    red: "border-alert-red/30 text-alert-red bg-alert-red/5 hover:border-alert-red shadow-alert-red/5",
  };

  return (
    <div className="min-h-screen bg-asphalt-950 text-paper-50 flex flex-col font-[family-name:var(--font-body)] pb-20">
      {/* Cabecera Principal con Logo Oficial */}
      <header className="sticky top-0 z-40 bg-asphalt-900/95 backdrop-blur-md border-b border-line-600 px-4 py-2.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-28 shrink-0 flex items-center">
            <Image
              src="/brand/logo.png"
              alt="Trans Services Cooperativa A&B"
              width={112}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block border-l border-line-600 pl-3">
            <h1 className="font-[family-name:var(--font-display)] text-sm font-black tracking-wide text-paper-50 leading-tight">
              PORTAL DEL CONDUCTOR
            </h1>
            <p className="text-[9px] text-radar-cyan font-mono font-bold tracking-wider">
              OPERACIÓN CONECTADA 24/7
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-2 rounded-xl bg-asphalt-800 border border-line-600 hover:border-alert-red text-fog-400 hover:text-alert-red transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-4">
        {/* Tarjeta de Perfil y Asignación de Vehículo */}
        <div className="bg-asphalt-900 border border-line-600 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-asphalt-800 border border-radar-cyan/30 flex items-center justify-center font-[family-name:var(--font-display)] text-xl font-black text-radar-cyan shadow-inner">
                {driver?.nombre
                  ? driver.nombre
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                  : "CO"}
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-radar-cyan">
                  <UserCheck size={12} /> Conductor Activo
                </span>
                <h2 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-paper-50 leading-tight">
                  {driver?.nombre || "Cargando perfil..."}
                </h2>
                <p className="text-xs text-mist-200 font-mono mt-0.5">
                  C.C. {driver?.documento || "—"}
                </p>
              </div>
            </div>

            {/* Placa Asignada con botón para cambiar */}
            <div className="text-right flex flex-col items-end">
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

              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono text-radar-cyan hover:underline font-bold bg-radar-cyan/10 hover:bg-radar-cyan/20 border border-radar-cyan/30 px-2.5 py-1 rounded-lg transition-all active:scale-95 shadow-sm"
              >
                <RefreshCw size={12} className="shrink-0" />
                <span>{driver?.placa && driver.placa !== "SIN ASIGNAR" ? "Cambiar Placa" : "Elegir Placa"}</span>
              </button>
            </div>
          </div>

          {!driver?.placa || driver?.placa === "SIN ASIGNAR" ? (
            <div className="mt-3.5 p-3 bg-signal-amber/15 border border-signal-amber/30 rounded-xl text-xs text-signal-amber flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>Selecciona el vehículo que vas a operar para habilitar tus formatos.</span>
              </div>
              <button
                onClick={() => setIsVehicleModalOpen(true)}
                className="px-3 py-1 bg-signal-amber text-asphalt-950 font-bold rounded-lg text-xs uppercase tracking-wider shrink-0 shadow-md"
              >
                Asignar
              </button>
            </div>
          ) : null}
        </div>

        {/* Tarjeta Interactiva: Estado de Turno & Preoperacional de Hoy */}
        <div className="bg-gradient-to-br from-asphalt-900 via-asphalt-900 to-asphalt-800 border border-signal-amber/30 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-signal-amber/20 border border-signal-amber/40 flex items-center justify-center text-signal-amber">
                <Clock size={15} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-paper-50 uppercase tracking-wide">
                  Turno Operativo de Hoy
                </h3>
                <p className="text-[10px] text-fog-400 font-mono">
                  {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-signal-amber/15 border border-signal-amber/30 text-signal-amber flex items-center gap-1">
              <AlertCircle size={11} /> Requisito PESV
            </span>
          </div>

          <div className="p-3 bg-asphalt-950/70 border border-line-600 rounded-xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-paper-50">
                Inspección Preoperacional Diaria (IMTO-F-010)
              </p>
              <p className="text-[11px] text-fog-400">
                Debes diligenciar y firmar el estado mecánico antes de encender el vehículo.
              </p>
            </div>
            <button
              onClick={() => handleOpenApp("/apps/preoperacional/index.html")}
              className="px-3.5 py-2 bg-signal-amber hover:bg-signal-amber/90 text-asphalt-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 shrink-0 shadow-lg shadow-signal-amber/20 transition-all active:scale-95"
            >
              <span>Diligenciar</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Sección de Aplicaciones Operativas Organizadas */}
        {CATEGORIAS_APPS.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fog-400 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-radar-cyan"></span>
                {cat.category}
              </h3>
              <span className="text-[10px] text-mist-200 font-mono">
                {cat.apps.length} formatos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cat.apps.map((app) => {
                const Icon = app.icon;
                const style = colorStyles[app.color];

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleOpenApp(app.href)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-md ${style}`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="w-10 h-10 rounded-xl bg-asphalt-900/90 border border-line-600 flex items-center justify-center text-inherit group-hover:scale-110 transition-transform shadow-inner">
                        <Icon size={20} />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-asphalt-950/80 border border-line-600 text-mist-200">
                        {app.badge}
                      </span>
                    </div>

                    <div className="mt-3.5 flex items-end justify-between w-full">
                      <div>
                        <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-paper-50 leading-snug group-hover:text-inherit transition-colors">
                          {app.title}
                        </h4>
                        <p className="text-[11px] text-mist-200 mt-0.5 line-clamp-1 leading-normal">
                          {app.subtitle}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-asphalt-900 border border-line-600 flex items-center justify-center text-fog-400 group-hover:text-paper-50 group-hover:border-paper-50 transition-all shrink-0">
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Soporte de Emergencias y HSE */}
        <div className="mt-6 bg-asphalt-900/70 border border-line-600 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-mist-200 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-signal-amber/10 border border-signal-amber/30 flex items-center justify-center text-signal-amber shrink-0">
              <Phone size={18} />
            </div>
            <div>
              <p className="font-bold text-paper-50 text-xs">Línea de Emergencia & HSE 24/7</p>
              <p className="text-[11px] text-fog-400">Atención inmediata en carretera y contingencias</p>
            </div>
          </div>
          <a
            href="tel:+573100000000"
            className="py-2 px-3.5 bg-signal-amber text-asphalt-950 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-signal-amber/90 transition-colors shrink-0 shadow-md"
          >
            Llamar
          </a>
        </div>
      </main>

      {/* Modal Táctil de Cambio de Vehículo */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-asphalt-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-asphalt-900 border border-line-500 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Cabecera */}
            <div className="p-4 border-b border-line-600 bg-asphalt-950/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-radar-cyan/15 border border-radar-cyan/30 flex items-center justify-center text-radar-cyan">
                  <Truck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-paper-50 font-display uppercase tracking-wide">
                    Seleccionar Vehículo / Placa
                  </h3>
                  <p className="text-[11px] text-fog-400">
                    Elige el vehículo que conducirás en este turno
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="p-1.5 rounded-lg text-fog-400 hover:text-paper-50 hover:bg-asphalt-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {vehicleFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    vehicleFeedback.type === "success"
                      ? "bg-ok-green/15 border border-ok-green/30 text-ok-green"
                      : "bg-alert-red/15 border border-alert-red/30 text-alert-red"
                  }`}
                >
                  {vehicleFeedback.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
                  <span>{vehicleFeedback.msg}</span>
                </div>
              )}

              {/* Buscador de Placa */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" size={15} />
                <input
                  type="text"
                  autoFocus
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Buscar o escribir placa (ej. NSY-352, WGM-212)..."
                  className="w-full bg-asphalt-950 border border-line-600 rounded-xl pl-9 pr-3 py-2.5 text-xs text-paper-50 placeholder:text-fog-400/50 font-mono focus:border-radar-cyan focus:outline-none uppercase"
                />
              </div>

              {/* Opción Directa si escribe una placa personalizada */}
              {vehicleSearch.trim().length >= 5 && (
                <button
                  type="button"
                  onClick={() => handleConfirmVehicleChange(vehicleSearch)}
                  disabled={isSubmittingVehicle}
                  className="w-full p-2.5 rounded-xl bg-radar-cyan/15 border border-radar-cyan/40 hover:bg-radar-cyan/25 text-radar-cyan flex items-center justify-between text-xs font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2 font-mono">
                    <Zap size={14} /> Usar placa escrita: {vehicleSearch.toUpperCase()}
                  </span>
                  <span className="text-[10px] uppercase font-bold">Seleccionar</span>
                </button>
              )}

              {/* Lista de Vehículos de la Flota */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredVehicles.length === 0 ? (
                  <div className="p-4 text-center text-xs text-fog-400 bg-asphalt-950/40 rounded-xl border border-line-600/50">
                    No se encontraron coincidencias. Puedes usar la placa que escribiste arriba.
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
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all active:scale-[0.98] ${
                          isCurrent
                            ? "bg-radar-cyan/15 border-radar-cyan text-radar-cyan font-bold"
                            : "bg-asphalt-950 border-line-600 hover:border-line-500 text-paper-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-md bg-asphalt-800 border border-line-600 font-mono font-black text-sm text-paper-50 tracking-wider">
                            {v.placa}
                          </span>
                          <div>
                            <p className="font-semibold text-xs text-paper-50">
                              {v.marca} {v.modelo}
                            </p>
                            <p className="text-[10px] text-fog-400 font-mono">
                              {v.contratistaNombre || "Propio / Cooperativa"}
                            </p>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-radar-cyan text-asphalt-950">
                            Actual
                          </span>
                        ) : (
                          <span className="text-[11px] text-fog-400 font-mono group-hover:text-radar-cyan">
                            Elegir ➔
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pie del modal */}
            <div className="p-4 border-t border-line-600 bg-asphalt-950/50 flex items-center justify-between">
              <span className="text-[11px] text-fog-400">
                Se actualizará tu sesión y Preoperacional
              </span>
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-fog-400 hover:text-paper-50 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegación Inferior Fija para Móviles (Bottom Navigation Bar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-asphalt-900/95 backdrop-blur-lg border-t border-line-600 px-4 py-2 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab("inicio")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === "inicio" ? "text-radar-cyan" : "text-fog-400 hover:text-paper-50"
          }`}
        >
          <Home size={18} />
          <span className="text-[10px] font-semibold tracking-wide">Inicio</span>
        </button>

        <button
          onClick={() => handleOpenApp("/apps/viajes/index.html")}
          className="flex flex-col items-center gap-1 text-fog-400 hover:text-paper-50 transition-colors"
        >
          <Navigation size={18} />
          <span className="text-[10px] font-semibold tracking-wide">Mis Viajes</span>
        </button>

        <button
          onClick={() => handleOpenApp("/apps/preoperacional/index.html")}
          className="flex flex-col items-center gap-1 text-signal-amber hover:text-signal-amber/80 transition-colors"
        >
          <div className="p-1.5 rounded-full bg-signal-amber/20 border border-signal-amber/40 -mt-3 shadow-lg">
            <ClipboardCheck size={20} className="text-signal-amber" />
          </div>
          <span className="text-[10px] font-bold tracking-wide text-signal-amber">Preoperacional</span>
        </button>

        <button
          onClick={() => setIsVehicleModalOpen(true)}
          className="flex flex-col items-center gap-1 text-fog-400 hover:text-paper-50 transition-colors"
        >
          <Truck size={18} />
          <span className="text-[10px] font-semibold tracking-wide">Mi Vehículo</span>
        </button>

        <a
          href="tel:+573100000000"
          className="flex flex-col items-center gap-1 text-fog-400 hover:text-alert-red transition-colors"
        >
          <LifeBuoy size={18} />
          <span className="text-[10px] font-semibold tracking-wide">S.O.S</span>
        </a>
      </nav>
    </div>
  );
}
