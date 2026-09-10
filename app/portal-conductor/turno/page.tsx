"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Camera,
  Gauge,
  Truck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Trash2,
} from "lucide-react";

export default function AperturaTurnoPage() {
  const router = useRouter();

  // Datos de conductor y vehículo
  const [driver, setDriver] = useState<{
    id?: string;
    nombre: string;
    documento: string;
    placa: string | null;
    rol?: string;
  } | null>(null);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [odometroReferencia, setOdometroReferencia] = useState<number>(0);
  const [turnoExistente, setTurnoExistente] = useState<any>(null);

  // Formulario
  const [odometroInput, setOdometroInput] = useState<string>("");
  const [fotoVehiculo, setFotoVehiculo] = useState<string | null>(null);
  const [fotoOdometro, setFotoOdometro] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [ubicacionTexto, setUbicacionTexto] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");

  // Estados UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  const inputVehiculoRef = useRef<HTMLInputElement | null>(null);
  const inputOdometroRef = useRef<HTMLInputElement | null>(null);

  // 1. Cargar sesión y datos del turno actual
  useEffect(() => {
    async function init() {
      let currentDriver = null;
      try {
        const authRes = await fetch("/api/auth/me");
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData?.authenticated && authData.user) {
            currentDriver = {
              id: authData.user.id,
              nombre: authData.user.nombre,
              documento: authData.user.documento,
              placa: authData.user.placaAsignada || null,
              rol: authData.user.rolPrincipal || "conductor",
            };
          }
        }
      } catch {}

      if (!currentDriver) {
        try {
          const raw = localStorage.getItem("transservices_conductor");
          if (raw) currentDriver = JSON.parse(raw);
        } catch {}
      }

      setDriver(currentDriver);

      // Si tenemos placa o documento, consultar odómetro de referencia y si ya hay turno hoy
      if (currentDriver?.placa || currentDriver?.documento) {
        try {
          const params = new URLSearchParams();
          if (currentDriver.placa) params.set("placa", currentDriver.placa);
          if (currentDriver.documento) params.set("documento", currentDriver.documento);

          const turnoRes = await fetch(`/api/portal-conductor/turno?${params.toString()}`);
          if (turnoRes.ok) {
            const data = await turnoRes.json();
            if (data.odometroReferencia) {
              setOdometroReferencia(data.odometroReferencia);
            }
            if (data.turnoHoy) {
              setTurnoExistente(data.turnoHoy);
              setOdometroInput(String(data.turnoHoy.odometroInicial));
              setFotoVehiculo(data.turnoHoy.fotoVehiculoUrl);
              setFotoOdometro(data.turnoHoy.fotoOdometroUrl);
            }
          }
        } catch (e) {
          console.error("Error al consultar odómetro de referencia:", e);
        }
      }

      // Obtener GPS
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            setUbicacionTexto(
              `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (±${Math.round(
                pos.coords.accuracy
              )}m)`
            );
          },
          () => {
            setUbicacionTexto("GPS no disponible");
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }

      setLoadingInitial(false);
    }

    init();
  }, []);

  // Función para comprimir fotos en cliente usando Canvas (WebP < 250KB)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new window.Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve(img.src);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Marca de agua sutil con fecha y hora
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.fillRect(0, height - 32, width, 32);
          ctx.fillStyle = "#ffffff";
          ctx.font = "12px sans-serif";
          ctx.fillText(
            `A&B Control · ${new Date().toLocaleString("es-CO")} · ${driver?.placa || ""}`,
            12,
            height - 11
          );

          const compressed = canvas.toDataURL("image/webp", 0.75);
          resolve(compressed);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoCapture = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "vehiculo" | "odometro"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file);
      if (type === "vehiculo") {
        setFotoVehiculo(compressedBase64);
      } else {
        setFotoOdometro(compressedBase64);
      }
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg("Error al procesar la imagen: " + (err.message || "Formato no válido"));
    }
  };

  const handleSubmitTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numOdo = parseFloat(odometroInput.replace(/,/g, ""));
    if (isNaN(numOdo) || numOdo <= 0) {
      setErrorMsg("Por favor ingresa un kilometraje / odómetro inicial válido.");
      return;
    }

    if (odometroReferencia > 0 && numOdo < odometroReferencia) {
      setErrorMsg(
        `El odómetro no puede ser menor al último registrado (${odometroReferencia.toLocaleString()} km). Revisa el tablero.`
      );
      return;
    }

    if (!fotoVehiculo) {
      setErrorMsg("Debes tomar la fotografía del vehículo para control de estado físico.");
      return;
    }

    if (!fotoOdometro) {
      setErrorMsg("Debes tomar la fotografía legible del odómetro para validar el kilometraje.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        conductorId: driver?.id,
        conductorNombre: driver?.nombre || "Conductor",
        conductorDocumento: driver?.documento,
        placa: driver?.placa,
        odometroInicial: numOdo,
        fotoOdometroUrl: fotoOdometro,
        fotoVehiculoUrl: fotoVehiculo,
        latitud: coords?.lat,
        longitud: coords?.lng,
        ubicacion: ubicacionTexto,
        observaciones: observaciones.trim() || undefined,
      };

      const res = await fetch("/api/portal-conductor/turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Guardar odómetro en almacenamiento local para auto-llenar preoperacional y viajes
        try {
          localStorage.setItem("transservices_odometro_actual", String(numOdo));
          localStorage.setItem("transservices_turno_activo", JSON.stringify(data.turno));
        } catch {}

        setSuccessData(data.turno);
      } else {
        setErrorMsg(data.error || "Ocurrió un error al registrar el turno.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error de conexión con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <Loader2 size={32} className="text-[#007AFF] animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500">Cargando verificación de turno...</p>
      </div>
    );
  }

  // Si se completó con éxito
  if (successData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-4 flex flex-col justify-center max-w-md mx-auto">
        <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/15">
            <CheckCircle2 size={34} />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Turno Aperturado
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
              Control Inicial Registrado
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Las fotografías y el odómetro han sido sincronizados en tiempo real con el sistema ERP.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Placa:</span>
              <span className="font-mono font-bold text-slate-900">{successData.placa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Odómetro Inicial:</span>
              <span className="font-mono font-bold text-[#007AFF]">
                {successData.odometroInicial?.toLocaleString()} km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hora de Registro:</span>
              <span className="font-mono text-slate-700">{successData.hora}</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => router.push("/portal-conductor/preoperacional")}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FF9500] hover:bg-[#FF9500]/90 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <span>Continuar con Preoperacional</span>
              <ArrowRight size={15} />
            </button>

            <button
              onClick={() => router.push("/portal-conductor")}
              className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
            >
              Volver al Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',Helvetica,Arial,sans-serif] selection:bg-[#007AFF] selection:text-white pb-24 antialiased">
      {/* Header Glass */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
        <Link
          href="/portal-conductor"
          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="text-center">
          <h1 className="text-xs font-bold text-slate-900 tracking-tight">Apertura de Turno</h1>
          <p className="text-[10px] font-mono text-[#007AFF]">Control de Fotos & Odómetro</p>
        </div>
        <div className="w-8" />
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {/* Banner Informativo */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-[24px] p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-blue-100 text-[#007AFF] flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-blue-900">Protocolo Operativo de Inicio</h3>
            <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
              Toma la foto del vehículo y la del odómetro para habilitar el despacho y certificar el estado de la unidad.
            </p>
          </div>
        </div>

        {/* Resumen del Conductor & Placa */}
        <div className="bg-white border border-slate-200/90 rounded-[26px] p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Truck size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Vehículo a Operar</p>
              <p className="text-sm font-black font-mono text-slate-900">
                {driver?.placa || "SIN ASIGNAR"}
              </p>
            </div>
          </div>
          <Link
            href="/portal-conductor"
            className="text-[11px] text-[#007AFF] font-semibold hover:underline"
          >
            Cambiar
          </Link>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmitTurno} className="space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertTriangle size={17} className="shrink-0 text-[#FF3B30]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Odómetro Input */}
          <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Gauge size={15} className="text-[#007AFF]" />
                <span>Kilometraje / Odómetro Inicial</span>
              </label>
              {odometroReferencia > 0 && (
                <span className="text-[10px] font-mono text-slate-400">
                  Ant: {odometroReferencia.toLocaleString()} km
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                inputMode="numeric"
                required
                value={odometroInput}
                onChange={(e) => setOdometroInput(e.target.value)}
                placeholder="Ej. 142580"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-lg font-mono font-bold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:border-[#007AFF] focus:outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                KM
              </span>
            </div>

            {odometroReferencia > 0 &&
              odometroInput &&
              parseFloat(odometroInput) < odometroReferencia && (
                <p className="text-[11px] font-medium text-[#FF3B30] flex items-center gap-1">
                  <AlertTriangle size={13} />
                  El valor no puede ser inferior a {odometroReferencia.toLocaleString()} km
                </p>
              )}
          </div>

          {/* Captura de Fotos: 1. Vehículo y 2. Odómetro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Foto 1: Vehículo */}
            <div className="bg-white border border-slate-200/90 rounded-[26px] p-4 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Foto 1: Vehículo
                  </span>
                  {fotoVehiculo && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Cargada
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1">Estado General</h4>
                <p className="text-[10px] text-slate-400">Vista frontal o lateral con placa</p>
              </div>

              {fotoVehiculo ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                  <img
                    src={fotoVehiculo}
                    alt="Vehículo"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFotoVehiculo(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputVehiculoRef.current?.click()}
                  className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#007AFF] hover:bg-blue-50/40 text-slate-500 hover:text-[#007AFF] flex flex-col items-center justify-center gap-1.5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <Camera size={20} />
                  </div>
                  <span className="text-[11px] font-bold">Tomar Foto Vehículo</span>
                  <span className="text-[9px] text-slate-400">Cámara o Galería</span>
                </button>
              )}

              <input
                ref={inputVehiculoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoCapture(e, "vehiculo")}
              />
            </div>

            {/* Foto 2: Odómetro */}
            <div className="bg-white border border-slate-200/90 rounded-[26px] p-4 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Foto 2: Odómetro
                  </span>
                  {fotoOdometro && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Cargada
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-1">Tablero Nítido</h4>
                <p className="text-[10px] text-slate-400">Lectura visible del kilometraje</p>
              </div>

              {fotoOdometro ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                  <img
                    src={fotoOdometro}
                    alt="Odómetro"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFotoOdometro(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputOdometroRef.current?.click()}
                  className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#007AFF] hover:bg-blue-50/40 text-slate-500 hover:text-[#007AFF] flex flex-col items-center justify-center gap-1.5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                    <Gauge size={20} />
                  </div>
                  <span className="text-[11px] font-bold">Tomar Foto Odómetro</span>
                  <span className="text-[9px] text-slate-400">Cámara o Galería</span>
                </button>
              )}

              <input
                ref={inputOdometroRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoCapture(e, "odometro")}
              />
            </div>
          </div>

          {/* Ubicación GPS & Observaciones */}
          <div className="bg-white border border-slate-200/90 rounded-[26px] p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={14} className="text-[#34C759]" />
              <span className="font-mono text-[11px]">{ubicacionTexto || "Detectando GPS..."}</span>
            </div>

            <textarea
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Novedad u observación inicial (opcional)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#007AFF] focus:outline-none transition-all"
            />
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-5 rounded-[22px] bg-[#007AFF] hover:bg-blue-600 active:scale-[0.98] text-white font-bold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Registrando Apertura...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Confirmar & Abrir Turno</span>
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
