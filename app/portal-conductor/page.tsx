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
  ChevronRight,
  Sliders,
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
    gradient: string;
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
        href: "/apps/preoperacional/index.html",
        badge: "Obligatorio",
        gradient: "from-[#FF9500]/20 via-[#FF9500]/5 to-transparent",
        iconColor: "text-[#FF9500]",
        badgeColor: "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30",
      },
      {
        id: "viajes",
        title: "Plan de Viaje & Riesgo",
        subtitle: "Gerenciamiento de ruta, pasajeros y evaluación HSE",
        icon: Truck,
        href: "/apps/viajes/index.html",
        badge: "Prioritario",
        gradient: "from-[#007AFF]/20 via-[#007AFF]/5 to-transparent",
        iconColor: "text-[#007AFF]",
        badgeColor: "bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30",
      },
      {
        id: "asistencia",
        title: "Registro de Asistencia",
        subtitle: "Marcación de turno y firma digital diaria",
        icon: UserCheck,
        href: "/apps/asistencia/index.html",
        badge: "Diario",
        gradient: "from-[#34C759]/20 via-[#34C759]/5 to-transparent",
        iconColor: "text-[#34C759]",
        badgeColor: "bg-[#34C759]/15 text-[#34C759] border-[#34C759]/30",
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
        gradient: "from-[#32ADE6]/20 via-[#32ADE6]/5 to-transparent",
        iconColor: "text-[#32ADE6]",
        badgeColor: "bg-[#32ADE6]/15 text-[#32ADE6] border-[#32ADE6]/30",
      },
      {
        id: "aseo",
        title: "Aseo y Desinfección",
        subtitle: "Protocolo de bioseguridad y desinfección de cabina",
        icon: Sparkles,
        href: "/apps/aseo/index.html",
        badge: "Semanal",
        gradient: "from-[#30B0C7]/20 via-[#30B0C7]/5 to-transparent",
        iconColor: "text-[#30B0C7]",
        badgeColor: "bg-[#30B0C7]/15 text-[#30B0C7] border-[#30B0C7]/30",
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
        gradient: "from-[#FF3B30]/20 via-[#FF3B30]/5 to-transparent",
        iconColor: "text-[#FF3B30]",
        badgeColor: "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/30",
      },
      {
        id: "botiquin",
        title: "Inspección de Botiquín",
        subtitle: "Inventario de dotación y fechas de caducidad",
        icon: HeartPulse,
        href: "/apps/botiquin/index.html",
        badge: "Mensual",
        gradient: "from-[#FF9500]/20 via-[#FF9500]/5 to-transparent",
        iconColor: "text-[#FF9500]",
        badgeColor: "bg-[#FF9500]/15 text-[#FF9500] border-[#FF9500]/30",
      },
      {
        id: "encuesta",
        title: "Encuesta de Riesgo Vial",
        subtitle: "Valoración de hábitos y caracterización PESV",
        icon: FileQuestion,
        href: "/apps/encuesta/index.html",
        badge: "PESV",
        gradient: "from-[#5856D6]/20 via-[#5856D6]/5 to-transparent",
        iconColor: "text-[#5856D6]",
        badgeColor: "bg-[#5856D6]/15 text-[#5856D6] border-[#5856D6]/30",
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
    <div className="min-h-screen bg-black text-[#F5F5F7] flex flex-col font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',Helvetica,Arial,sans-serif] selection:bg-[#007AFF] selection:text-white pb-28">
      {/* Fondo con Iluminación Ambiental Apple */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(0,122,255,0.08),transparent_50%),radial-gradient(circle_at_100%_20%,rgba(255,149,0,0.05),transparent_40%)]" />

      {/* Cabecera Estilo Apple Glass */}
      <header className="sticky top-0 z-40 bg-black/75 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 max-w-[110px] shrink-0 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png"
              alt="Trans Services"
              className="h-7 w-auto max-w-[110px] object-contain"
            />
          </div>
          <div className="border-l border-white/10 pl-2.5 py-0.5">
            <span className="text-[11px] font-bold text-white tracking-tight block leading-tight">
              Portal del Conductor
            </span>
            <span className="text-[9px] font-mono text-[#007AFF] block leading-tight">
              Trans Services A&B
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 text-white/80 hover:text-white border border-white/[0.08] transition-all text-xs font-medium flex items-center gap-1.5 backdrop-blur-md"
        >
          <LogOut size={13} />
          <span>Salir</span>
        </button>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 space-y-4 relative z-10">
        {/* Dynamic Island / Live Activity Widget de Turno */}
        <div className="bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] border border-white/[0.12] rounded-[24px] p-3.5 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF9500] animate-pulse shadow-[0_0_10px_#FF9500]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Turno en Curso · {new Date().toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <h3 className="text-xs font-semibold text-white tracking-tight">
                Inspección Preoperacional Requerida
              </h3>
            </div>
          </div>
          <button
            onClick={() => handleOpenApp("/apps/preoperacional/index.html")}
            className="px-3 py-1.5 rounded-full bg-[#FF9500] hover:bg-[#FF9500]/90 active:scale-95 text-black font-bold text-xs shadow-[0_2px_12px_rgba(255,149,0,0.3)] transition-all flex items-center gap-1 shrink-0"
          >
            <span>Iniciar</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Apple Card Widget: Conductor & Vehículo de Titanio */}
        <div className="bg-gradient-to-br from-[#1C1C1E] via-[#151517] to-[#0D0D0E] border border-white/[0.12] rounded-[28px] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] relative overflow-hidden group">
          {/* Brillo especular de luz superior */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-white/[0.06] rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#007AFF] to-[#5856D6] p-0.5 shadow-lg shadow-[#007AFF]/20">
                <div className="w-full h-full rounded-[14px] bg-black/30 backdrop-blur-sm flex items-center justify-center font-bold text-base text-white">
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
                <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
                  {driver?.nombre || "Cargando conductor..."}
                </h2>
                <p className="text-xs text-white/50 font-mono mt-0.5">
                  C.C. {driver?.documento || "—"}
                </p>
              </div>
            </div>

            {/* Placa con estética Apple */}
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/40 block mb-1">
                Vehículo Activo
              </span>
              {driver?.placa && driver.placa !== "SIN ASIGNAR" ? (
                <div className="px-3 py-1 rounded-xl bg-white/[0.08] border border-white/[0.15] font-mono font-black text-sm text-white tracking-widest shadow-inner">
                  {driver.placa}
                </div>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-[#FF9500]/15 border border-[#FF9500]/30 text-[#FF9500] text-[11px] font-bold">
                  Sin Asignar
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#007AFF] hover:text-[#007AFF]/80 active:scale-95 font-semibold transition-all"
              >
                <RefreshCw size={11} className="shrink-0" />
                <span>Cambiar Placa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Categorías de Aplicaciones estilo iOS Control Center & Widgets */}
        {CATEGORIAS_APPS.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                {cat.category}
              </h3>
              <span className="text-[10px] text-white/30 font-mono">
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
                    className={`w-full text-left p-4 rounded-[26px] bg-gradient-to-b ${app.gradient} bg-[#141416]/90 border border-white/[0.08] hover:border-white/[0.18] transition-all duration-200 flex flex-col justify-between group active:scale-[0.97] shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl relative overflow-hidden`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <Icon size={20} className={app.iconColor} />
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${app.badgeColor}`}>
                        {app.badge}
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between w-full">
                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight leading-snug group-hover:text-white transition-colors">
                          {app.title}
                        </h4>
                        <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1 leading-normal">
                          {app.subtitle}
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/[0.12] transition-all shrink-0">
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
        <div className="mt-4 bg-gradient-to-r from-white/[0.04] to-white/[0.02] border border-white/[0.08] rounded-[24px] p-4 flex items-center justify-between gap-3 text-xs text-white/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FF3B30]/15 border border-[#FF3B30]/30 flex items-center justify-center text-[#FF3B30] shrink-0">
              <Phone size={17} />
            </div>
            <div>
              <p className="font-bold text-white text-xs">Línea de Emergencia HSE 24/7</p>
              <p className="text-[11px] text-white/40">Asistencia inmediata en ruta</p>
            </div>
          </div>
          <a
            href="tel:+573100000000"
            className="px-3.5 py-2 rounded-full bg-[#FF3B30] text-white font-bold text-xs shadow-md shadow-[#FF3B30]/20 hover:bg-[#FF3B30]/90 active:scale-95 transition-all shrink-0"
          >
            Llamar
          </a>
        </div>
      </main>

      {/* Modal Táctil de Cambio de Vehículo (Apple Bottom Sheet) */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1C1C1E] border border-white/[0.15] rounded-t-[32px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Grabber decorativo de iOS */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 sm:hidden" />

            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Seleccionar Vehículo
                </h3>
                <p className="text-[11px] text-white/50">
                  Elige la placa para tu turno actual
                </p>
              </div>
              <button
                onClick={() => setIsVehicleModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.08] text-white/70 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {vehicleFeedback && (
                <div
                  className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                    vehicleFeedback.type === "success"
                      ? "bg-[#34C759]/15 border border-[#34C759]/30 text-[#34C759]"
                      : "bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-[#FF3B30]"
                  }`}
                >
                  {vehicleFeedback.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
                  <span>{vehicleFeedback.msg}</span>
                </div>
              )}

              {/* Buscador iOS */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={15} />
                <input
                  type="text"
                  autoFocus
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Buscar o escribir placa (ej. NSY-352)..."
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-white/30 font-mono focus:border-[#007AFF] focus:outline-none uppercase"
                />
              </div>

              {vehicleSearch.trim().length >= 5 && (
                <button
                  type="button"
                  onClick={() => handleConfirmVehicleChange(vehicleSearch)}
                  disabled={isSubmittingVehicle}
                  className="w-full p-3 rounded-2xl bg-[#007AFF]/15 border border-[#007AFF]/40 hover:bg-[#007AFF]/25 text-[#007AFF] flex items-center justify-between text-xs font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2 font-mono">
                    <Zap size={14} /> Usar: {vehicleSearch.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold">Confirmar ➔</span>
                </button>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredVehicles.length === 0 ? (
                  <div className="p-4 text-center text-xs text-white/40 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
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
                            ? "bg-[#007AFF]/15 border-[#007AFF] text-[#007AFF] font-bold"
                            : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.12] font-mono font-black text-sm text-white tracking-wider">
                            {v.placa}
                          </span>
                          <div>
                            <p className="font-semibold text-xs text-white">
                              {v.marca} {v.modelo}
                            </p>
                            <p className="text-[10px] text-white/40 font-mono">
                              {v.contratistaNombre || "Propio / Cooperativa"}
                            </p>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#007AFF] text-white">
                            Activo
                          </span>
                        ) : (
                          <span className="text-[11px] text-white/40 font-mono">
                            Elegir ➔
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.08] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsVehicleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white rounded-full bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Glass Capsule Dock (Barra Inferior Flotante de Apple) */}
      <nav className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/[0.12] rounded-full px-5 py-2.5 flex items-center justify-around shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
        <button
          onClick={() => setActiveTab("inicio")}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            activeTab === "inicio" ? "text-[#007AFF] scale-105" : "text-white/50 hover:text-white"
          }`}
        >
          <Home size={19} />
          <span className="text-[9px] font-semibold tracking-tight">Inicio</span>
        </button>

        <button
          onClick={() => handleOpenApp("/apps/viajes/index.html")}
          className="flex flex-col items-center gap-0.5 text-white/50 hover:text-white transition-all active:scale-95"
        >
          <Navigation size={19} />
          <span className="text-[9px] font-semibold tracking-tight">Viajes</span>
        </button>

        <button
          onClick={() => handleOpenApp("/apps/preoperacional/index.html")}
          className="flex flex-col items-center gap-0.5 text-[#FF9500] hover:text-[#FF9500]/90 transition-all active:scale-95 -mt-3.5"
        >
          <div className="p-2.5 rounded-full bg-gradient-to-tr from-[#FF9500] to-[#FF5E3A] text-black shadow-[0_4px_16px_rgba(255,149,0,0.4)]">
            <ClipboardCheck size={20} className="stroke-[2.5]" />
          </div>
          <span className="text-[9px] font-bold tracking-tight text-[#FF9500]">Preoperacional</span>
        </button>

        <button
          onClick={() => setIsVehicleModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-white/50 hover:text-white transition-all active:scale-95"
        >
          <Truck size={19} />
          <span className="text-[9px] font-semibold tracking-tight">Vehículo</span>
        </button>

        <a
          href="tel:+573100000000"
          className="flex flex-col items-center gap-0.5 text-white/50 hover:text-[#FF3B30] transition-all active:scale-95"
        >
          <LifeBuoy size={19} />
          <span className="text-[9px] font-semibold tracking-tight">S.O.S</span>
        </a>
      </nav>
    </div>
  );
}
