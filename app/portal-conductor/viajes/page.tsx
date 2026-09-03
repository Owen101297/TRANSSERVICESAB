"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Route,
  Truck,
  User,
  Gauge,
  MapPin,
  Users,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowRight,
  Clock,
  Calendar,
  Sparkles,
  Eraser,
  Phone,
  FileText,
} from "lucide-react";
import { PlateTag } from "@/components/ui/PlateTag";
import {
  FACTORES_RIESGO_VIAJE,
  calcularScoreRiesgo,
  NivelRiesgoViaje,
} from "@/lib/types/viaje-form";

interface Pasajero {
  id: string;
  nombre: string;
  documento: string;
  telefono: string;
  destino: string;
}

interface PuntoControl {
  id: string;
  lugar: string;
  horaEstimada: string;
  observacion: string;
}

export default function GerenciamientoViajeDriverPage() {
  const router = useRouter();

  // Paso Activo (1 a 6)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Paso 1: Ruta
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split("T")[0]);
  const [horaSalida, setHoraSalida] = useState<string>(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
  const [horaLlegada, setHoraLlegada] = useState<string>("");
  const [origen, setOrigen] = useState<string>("");
  const [destino, setDestino] = useState<string>("");
  const [kmSalida, setKmSalida] = useState<string>("");
  const [kmLlegada, setKmLlegada] = useState<string>("");

  // Paso 2: Vehículo y Conductor
  const [placa, setPlaca] = useState<string>("WGM-212");
  const [tipoVehiculo, setTipoVehiculo] = useState<string>("Camioneta 4x4");
  const [contratistaNombre, setContratistaNombre] = useState<string>("TRANS SERVICES COOPERATIVA A&B");
  const [conductorNombre, setConductorNombre] = useState<string>("Conductor Asignado");
  const [conductorDoc, setConductorDoc] = useState<string>("");
  const [conductorLicencia, setConductorLicencia] = useState<string>("");
  const [conductorTelefono, setConductorTelefono] = useState<string>("");
  const [conductorId, setConductorId] = useState<string>("");

  // Paso 3: Puntos de Control / Paradas
  const [puntosControl, setPuntosControl] = useState<PuntoControl[]>([
    { id: "pc-1", lugar: "", horaEstimada: "", observacion: "Pausa activa / Reporte de ruta" },
  ]);

  // Paso 4: Pasajeros
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([]);

  // Paso 5: Matriz de Riesgo (7 Factores)
  const [riskInputs, setRiskInputs] = useState<Record<string, number>>({
    rDistancia: 1,
    rClima: 2,
    rVehiculos: 1,
    rVia: 1,
    rCom: 0,
    rFatiga: 1,
    rHora: 1,
  });

  // Paso 6: Observaciones y Firma
  const [observaciones, setObservaciones] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Estados de Envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdTrip, setCreatedTrip] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar sesión del Portal Conductor
  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem("ab_portal_conductor_auth") || localStorage.getItem("transservices_auth");
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        if (parsed.nombres) {
          setConductorNombre(`${parsed.nombres} ${parsed.apellidos || ""}`.trim());
        }
        if (parsed.numeroDocumento || parsed.documento) {
          setConductorDoc(parsed.numeroDocumento || parsed.documento);
        }
        if (parsed.id) setConductorId(parsed.id);
        if (parsed.telefono) setConductorTelefono(parsed.telefono);
        if (parsed.vehiculoPlaca || parsed.placa) {
          setPlaca(parsed.vehiculoPlaca || parsed.placa);
        }
      }
    } catch (e) {
      console.warn("Aviso al leer sesión:", e);
    }
  }, []);

  // Inicializar Canvas de Firma
  useEffect(() => {
    if (currentStep !== 6) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#F0F0F5";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [currentStep]);

  // Manejadores de Canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Cálculo de KM
  const kmInit = Number(kmSalida) || 0;
  const kmEnd = Number(kmLlegada) || 0;
  const kmRecorridos = kmEnd > kmInit ? kmEnd - kmInit : 0;

  // Cálculo de Riesgo en Vivo
  const { score, nivel, etiqueta, tipoAutorizacion } = calcularScoreRiesgo(riskInputs);

  // Agregar Pasajero
  const handleAddPasajero = () => {
    setPasajeros((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}`,
        nombre: "",
        documento: "",
        telefono: "",
        destino: destino || "",
      },
    ]);
  };

  const handleRemovePasajero = (id: string) => {
    setPasajeros((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePasajero = (id: string, field: keyof Pasajero, value: string) => {
    setPasajeros((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Agregar Punto de Control
  const handleAddPuntoControl = () => {
    setPuntosControl((prev) => [
      ...prev,
      {
        id: `pc-${Date.now()}`,
        lugar: "",
        horaEstimada: "",
        observacion: "Punto de descanso / Checkpoint",
      },
    ]);
  };

  const handleRemovePuntoControl = (id: string) => {
    setPuntosControl((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePuntoControl = (id: string, field: keyof PuntoControl, value: string) => {
    setPuntosControl((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Enviar a Railway PostgreSQL
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!origen.trim() || !destino.trim()) {
      setErrorMessage("Por favor especifica el Origen y Destino del viaje en el Paso 1.");
      setCurrentStep(1);
      return;
    }

    if (!hasSignature) {
      setErrorMessage("Es obligatorio estampar tu firma digital antes de enviar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const signatureBase64 = canvasRef.current?.toDataURL("image/png") || null;

      const res = await fetch("/api/apps/viajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conductorId,
          conductorNombre,
          conductorDocumento: conductorDoc,
          placa,
          contratistaNombre,
          origen,
          destino,
          fechaSalida: fecha,
          horaSalida,
          horaLlegada: horaLlegada || null,
          distanciaKm: kmRecorridos || null,
          riskScore: score,
          riskLevel: nivel,
          riskInputs,
          signatures: { conductor: signatureBase64 },
          observaciones: `${observaciones} | Pasajeros: ${pasajeros.length} | Puntos control: ${puntosControl.length}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el viaje");
      }

      setCreatedTrip(data.viaje);
      setSubmitSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const STEPS_NAMES = [
    "1. Ruta & KM",
    "2. Vehículo & Conductor",
    "3. Puntos de Control",
    "4. Pasajeros",
    "5. Matriz de Riesgo",
    "6. Score & Firma",
  ];

  return (
    <div className="min-h-screen bg-asphalt-950 text-paper-50 antialiased pb-28">
      {/* Barra Superior Fija Estilo iOS */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-asphalt-950/80 border-b border-line-600/60 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/portal-conductor"
            className="flex items-center gap-1.5 text-xs font-semibold text-fog-400 hover:text-paper-50 transition-colors py-1 px-2 rounded-lg bg-asphalt-900 border border-line-600/70"
          >
            <ChevronLeft size={16} />
            <span>Portal</span>
          </Link>

          <div className="text-center">
            <span className="text-[10px] font-mono text-radar-cyan font-bold tracking-wider uppercase block">
              STE-F-010 · OP-FOR-02
            </span>
            <h1 className="text-sm font-bold text-paper-50 tracking-tight">
              Gerenciamiento de Viaje
            </h1>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs text-fog-400 bg-asphalt-900 px-2 py-1 rounded-lg border border-line-600/70">
            <span className="font-bold text-radar-cyan">{currentStep}</span>
            <span>/6</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Barra de Progreso de Pasos (Estilo Apple Segmented Control) */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
          <div className="flex items-center gap-1.5 min-w-max p-1 rounded-xl bg-asphalt-900 border border-line-600/70">
            {STEPS_NAMES.map((name, idx) => {
              const stepNumber = idx + 1;
              const isActive = currentStep === stepNumber;
              const isPast = currentStep > stepNumber;

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCurrentStep(stepNumber)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? "bg-radar-cyan text-asphalt-950 shadow-md scale-100"
                      : isPast
                      ? "bg-asphalt-800 text-ok-green hover:text-paper-50"
                      : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
                  }`}
                >
                  <span>{name}</span>
                  {isPast && <CheckCircle2 size={12} className="text-ok-green" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* PASO 1: RUTA Y KILOMETRAJE                                   */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-line-600/80 bg-asphalt-900/90 p-5 backdrop-blur-md shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 border-b border-line-600/50 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-radar-cyan/15 text-radar-cyan border border-radar-cyan/30">
                <Route size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-paper-50">1. Ruta del Viaje</h2>
                <p className="text-xs text-fog-400">Origen, destino, horarios y kilometraje inicial</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-fog-400">Fecha del Viaje</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-xl border border-line-600 bg-asphalt-950 p-2.5 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-fog-400">Hora Salida</label>
                  <input
                    type="time"
                    value={horaSalida}
                    onChange={(e) => setHoraSalida(e.target.value)}
                    className="w-full rounded-xl border border-line-600 bg-asphalt-950 p-2.5 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-fog-400">Hora Llegada (Est.)</label>
                  <input
                    type="time"
                    value={horaLlegada}
                    onChange={(e) => setHoraLlegada(e.target.value)}
                    className="w-full rounded-xl border border-line-600 bg-asphalt-950 p-2.5 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-fog-400">Origen</label>
                <input
                  type="text"
                  placeholder="Ej. Villagarzón (Base Principal)"
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  className="w-full rounded-xl border border-line-600 bg-asphalt-950 p-2.5 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-fog-400">Destino</label>
                <input
                  type="text"
                  placeholder="Ej. Puerto Asís / Locación Petrolera"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="w-full rounded-xl border border-line-600 bg-asphalt-950 p-2.5 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none"
                />
              </div>
            </div>

            {/* Bloque Odómetro */}
            <div className="p-3.5 rounded-xl bg-asphalt-950 border border-line-600 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-fog-400 border-b border-line-600/50 pb-2">
                <span className="flex items-center gap-1.5">
                  <Gauge size={14} className="text-signal-amber" />
                  <span>Control Odómetro</span>
                </span>
                <span className="text-radar-cyan font-bold">
                  {kmRecorridos > 0 ? `${kmRecorridos} KM Estimados` : "KM Pendiente"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-fog-400">KM Inicial (Salida)</label>
                  <input
                    type="number"
                    placeholder="00000"
                    value={kmSalida}
                    onChange={(e) => setKmSalida(e.target.value)}
                    className="w-full rounded-lg border border-line-600 bg-asphalt-900 p-2 text-xs text-paper-50 font-mono font-bold focus:border-signal-amber focus:outline-none text-right"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-fog-400">KM Final (Llegada)</label>
                  <input
                    type="number"
                    placeholder="Opcional al inicio"
                    value={kmLlegada}
                    onChange={(e) => setKmLlegada(e.target.value)}
                    className="w-full rounded-lg border border-line-600 bg-asphalt-900 p-2 text-xs text-paper-50 font-mono font-bold focus:border-signal-amber focus:outline-none text-right"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 2: VEHÍCULO Y CONDUCTOR                                 */}
        {/* ============================================================ */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-line-600/80 bg-asphalt-900/90 p-5 backdrop-blur-md shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 border-b border-line-600/50 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-amber/15 text-signal-amber border border-signal-amber/30">
                <Truck size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-paper-50">2. Vehículo y Conductor</h2>
                <p className="text-xs text-fog-400">Verifica los datos técnicos antes del despacho</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-asphalt-950 border border-line-600 space-y-2">
                <span className="text-[10px] font-mono uppercase text-fog-400 block tracking-wider">
                  Datos del Vehículo
                </span>
                <div className="flex items-center justify-between">
                  <PlateTag plate={placa} />
                  <span className="text-xs font-mono text-fog-400">{tipoVehiculo}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <span className="text-fog-400 block text-[11px]">Empresa / Contratista:</span>
                  <input
                    type="text"
                    value={contratistaNombre}
                    onChange={(e) => setContratistaNombre(e.target.value)}
                    className="w-full rounded-lg border border-line-600 bg-asphalt-900 p-2 text-xs text-paper-50"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-asphalt-950 border border-line-600 space-y-2">
                <span className="text-[10px] font-mono uppercase text-fog-400 block tracking-wider">
                  Datos del Conductor
                </span>
                <div className="text-xs font-bold text-paper-50">{conductorNombre}</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-fog-400 block text-[10px]">CÉDULA</span>
                    <span className="text-paper-50">{conductorDoc || "—"}</span>
                  </div>
                  <div>
                    <span className="text-fog-400 block text-[10px]">CELULAR</span>
                    <input
                      type="tel"
                      value={conductorTelefono}
                      onChange={(e) => setConductorTelefono(e.target.value)}
                      placeholder="3000000000"
                      className="w-full rounded-lg border border-line-600 bg-asphalt-900 p-1 text-xs text-paper-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 3: PUNTOS DE CONTROL / PARADAS                         */}
        {/* ============================================================ */}
        {currentStep === 3 && (
          <div className="rounded-2xl border border-line-600/80 bg-asphalt-900/90 p-5 backdrop-blur-md shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-line-600/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-radar-cyan/15 text-radar-cyan border border-radar-cyan/30">
                  <MapPin size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-paper-50">3. Puntos de Control & Paradas</h2>
                  <p className="text-xs text-fog-400">Pausas activas y reportes para viajes &gt; 2 horas</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddPuntoControl}
                className="px-2.5 py-1.5 rounded-lg bg-radar-cyan text-asphalt-950 text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <Plus size={13} />
                <span>Agregar Punto</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {puntosControl.map((pc, idx) => (
                <div
                  key={pc.id}
                  className="p-3 rounded-xl bg-asphalt-950 border border-line-600 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-signal-amber font-bold">
                      Punto #{idx + 1}
                    </span>
                    {puntosControl.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePuntoControl(pc.id)}
                        className="text-alert-red hover:underline text-[11px] flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Lugar (ej. Peaje El Placer / Estación Terpel)"
                      value={pc.lugar}
                      onChange={(e) => handleUpdatePuntoControl(pc.id, "lugar", e.target.value)}
                      className="rounded-lg border border-line-600 bg-asphalt-900 p-2 text-xs text-paper-50"
                    />
                    <input
                      type="time"
                      value={pc.horaEstimada}
                      onChange={(e) => handleUpdatePuntoControl(pc.id, "horaEstimada", e.target.value)}
                      className="rounded-lg border border-line-600 bg-asphalt-900 p-2 text-xs text-paper-50 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 4: LISTA DE PASAJEROS                                   */}
        {/* ============================================================ */}
        {currentStep === 4 && (
          <div className="rounded-2xl border border-line-600/80 bg-asphalt-900/90 p-5 backdrop-blur-md shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-line-600/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ok-green-dim text-ok-green border border-ok-green/30">
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-paper-50">4. Lista de Pasajeros</h2>
                  <p className="text-xs text-fog-400">
                    {pasajeros.length === 0 ? "Sin pasajeros registrados (Opcional)" : `${pasajeros.length} Pasajero(s) registrado(s)`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddPasajero}
                className="px-2.5 py-1.5 rounded-lg bg-ok-green-dim text-ok-green border border-ok-green/30 text-xs font-bold flex items-center gap-1"
              >
                <Plus size={13} />
                <span>+ Pasajero</span>
              </button>
            </div>

            {pasajeros.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-line-600 text-center space-y-2">
                <Users size={24} className="text-fog-400 mx-auto" />
                <p className="text-xs text-fog-400">
                  Si este viaje transporta personal de empresa o pasajeros, agrégalos aquí.
                </p>
                <button
                  type="button"
                  onClick={handleAddPasajero}
                  className="px-3 py-1.5 bg-asphalt-800 rounded-lg text-xs font-bold text-paper-50"
                >
                  Agregar Primer Pasajero
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pasajeros.map((pas, idx) => (
                  <div
                    key={pas.id}
                    className="p-3 rounded-xl bg-asphalt-950 border border-line-600 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-ok-green font-bold">
                        Pasajero #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePasajero(pas.id)}
                        className="text-alert-red hover:underline text-[11px] flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Eliminar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre Completo"
                        value={pas.nombre}
                        onChange={(e) => handleUpdatePasajero(pas.id, "nombre", e.target.value)}
                        className="rounded-lg border border-line-600 bg-asphalt-900 p-2 text-xs text-paper-50"
                      />
                      <input
                        type="text"
                        placeholder="Cédula / Documento"
                        value={pas.documento}
                        onChange={(e) => handleUpdatePasajero(pas.id, "documento", e.target.value)}
                        className="rounded-lg border border-line-600 bg-asphalt-900 p-2 text-xs text-paper-50 font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 5: MATRIZ DE ANÁLISIS DE RIESGO VIAL PESV (7 FACTORES)  */}
        {/* ============================================================ */}
        {currentStep === 5 && (
          <div className="rounded-2xl border border-line-600/80 bg-asphalt-900/90 p-5 backdrop-blur-md shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-line-600/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-amber-dim text-signal-amber border border-signal-amber/30">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-paper-50">5. Análisis de Riesgo Vial</h2>
                  <p className="text-xs text-fog-400">7 Factores normativos de la matriz PESV</p>
                </div>
              </div>

              {/* Píldora de Score en Vivo */}
              <div
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border shadow-sm ${
                  nivel === "alto"
                    ? "bg-alert-red-dim text-alert-red border-alert-red/40"
                    : nivel === "medio"
                    ? "bg-signal-amber-dim text-signal-amber border-signal-amber/40"
                    : "bg-ok-green-dim text-ok-green border-ok-green/40"
                }`}
              >
                <span>Score: {score}</span>
                <span>· {etiqueta}</span>
              </div>
            </div>

            <div className="space-y-4">
              {FACTORES_RIESGO_VIAJE.map((factor) => {
                const currentVal = riskInputs[factor.id];

                return (
                  <div key={factor.id} className="p-3 rounded-xl bg-asphalt-950 border border-line-600/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-paper-50 font-mono">
                        {factor.letra}. {factor.titulo}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {factor.opciones.map((opt) => {
                        const isSelected = currentVal === opt.valor;

                        return (
                          <button
                            key={opt.valor}
                            type="button"
                            onClick={() =>
                              setRiskInputs((prev) => ({
                                ...prev,
                                [factor.id]: opt.valor,
                              }))
                            }
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "border-radar-cyan bg-radar-cyan/15 text-paper-50 ring-1 ring-radar-cyan"
                                : "border-line-600/60 bg-asphalt-900/60 text-fog-400 hover:bg-asphalt-900"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-bold text-paper-50">
                                {opt.etiqueta}
                              </span>
                              <span className="text-[10px] font-mono text-signal-amber font-bold">
                                +{opt.valor}
                              </span>
                            </div>
                            {opt.subetiqueta && (
                              <span className="text-[10px] text-fog-400 block truncate">
                                {opt.subetiqueta}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PASO 6: SCORE FINAL, OBSERVACIONES & FIRMA DIGITAL           */}
        {/* ============================================================ */}
        {currentStep === 6 && (
          <div className="rounded-2xl border border-line-600/80 bg-asphalt-900/90 p-5 backdrop-blur-md shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5 border-b border-line-600/50 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ok-green-dim text-ok-green border border-ok-green/30">
                <FileCheck size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-paper-50">6. Score de Riesgo & Firma</h2>
                <p className="text-xs text-fog-400">Verifica la autorización y estampa tu firma</p>
              </div>
            </div>

            {/* Tarjeta de Nivel de Riesgo y Autorización */}
            <div
              className={`p-4 rounded-2xl border text-center space-y-2 ${
                nivel === "alto"
                  ? "border-alert-red/50 bg-alert-red-dim/20"
                  : nivel === "medio"
                  ? "border-signal-amber/50 bg-signal-amber-dim/20"
                  : "border-ok-green/50 bg-ok-green-dim/20"
              }`}
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-fog-400 block">
                Nivel de Riesgo Vial Calculado
              </span>
              <div className="text-2xl font-bold font-mono text-paper-50">
                Puntaje Total: <span className="text-signal-amber">{score} Pts</span>
              </div>
              <div
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  nivel === "alto"
                    ? "bg-alert-red text-paper-50"
                    : nivel === "medio"
                    ? "bg-signal-amber text-asphalt-950"
                    : "bg-ok-green text-asphalt-950"
                }`}
              >
                RIESGO {etiqueta}
              </div>
              <p className="text-xs text-fog-400 pt-1">{tipoAutorizacion}</p>
            </div>

            {/* Observaciones Generales */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-paper-50">
                Observaciones y Medidas de Seguridad
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Indica precauciones tomadas (ej. descanso previo realizado, kit completo)..."
                className="w-full rounded-xl border border-line-600 bg-asphalt-950 p-3 text-xs text-paper-50 focus:border-radar-cyan focus:outline-none"
              />
            </div>

            {/* Canvas de Firma Digital */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-paper-50 flex items-center gap-1.5">
                  <FileText size={14} className="text-radar-cyan" />
                  <span>Firma Digital del Conductor</span>
                </label>
                {hasSignature && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[11px] font-semibold text-alert-red hover:underline flex items-center gap-1"
                  >
                    <Eraser size={12} />
                    <span>Borrar</span>
                  </button>
                )}
              </div>

              <div className="relative rounded-xl border-2 border-dashed border-line-600/80 bg-asphalt-950 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-32 cursor-crosshair touch-none"
                />
                {!hasSignature && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-mono text-fog-400/60">
                    ✍️ Firma aquí con tu dedo
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="rounded-xl border border-alert-red/40 bg-alert-red-dim/20 p-3.5 text-xs text-alert-red flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Botones de Navegación de Pasos */}
        <div className="flex items-center justify-between pt-2">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((p) => p - 1)}
              className="px-4 py-2.5 rounded-xl border border-line-600 bg-asphalt-900 text-xs font-bold text-fog-400 hover:text-paper-50"
            >
              ← Anterior
            </button>
          ) : <div />}

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((p) => p + 1)}
              className="px-5 py-2.5 rounded-xl bg-radar-cyan text-asphalt-950 text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-radar-cyan/90"
            >
              <span>Continuar al Paso {currentStep + 1}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-signal-amber to-signal-amber/90 text-asphalt-950 font-bold text-sm flex items-center gap-2 shadow-xl hover:brightness-110 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Registrar Gerenciamiento</span>
                </>
              )}
            </button>
          )}
        </div>
      </main>

      {/* Modal de Éxito Estilo Apple */}
      {submitSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-ok-green/40 bg-asphalt-900 p-6 text-center space-y-4 shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ok-green-dim text-ok-green border border-ok-green/40 mx-auto animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ok-green font-bold">
                Viaje Guardado en PostgreSQL (Railway)
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
                ¡Gerenciamiento Registrado!
              </h3>
              <p className="text-xs text-fog-400">
                Ruta <strong className="text-paper-50">{origen}</strong> → <strong className="text-paper-50">{destino}</strong>
              </p>
            </div>

            <div className="rounded-xl bg-asphalt-950 p-3 text-xs font-mono space-y-1.5 text-fog-400 border border-line-600">
              <div className="flex justify-between">
                <span>Vehículo:</span>
                <span className="text-paper-50 font-bold">{placa}</span>
              </div>
              <div className="flex justify-between">
                <span>Riesgo Evaluado:</span>
                <span className={nivel === "alto" ? "text-alert-red font-bold" : "text-ok-green font-bold"}>
                  {etiqueta} ({score} Pts)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estado:</span>
                <span className="text-radar-cyan font-bold">En curso</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/portal-conductor")}
              className="w-full py-3 rounded-xl bg-radar-cyan text-asphalt-950 font-bold text-sm hover:bg-radar-cyan/90 transition-colors shadow-lg"
            >
              Volver al Portal del Conductor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
