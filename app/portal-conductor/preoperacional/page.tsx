"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ShieldCheck,
  Truck,
  User,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Check,
  X,
  Minus,
  Sparkles,
  Eraser,
  Save,
  Loader2,
  Calendar,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  PREOPERACIONAL_SECCIONES,
  TOTAL_ITEMS_PREOPERACIONAL,
  ValorItemChecklist,
} from "@/lib/types/preoperacional";
import { PlateTag } from "@/components/ui/PlateTag";

export default function PreoperacionalDriverPage() {
  const router = useRouter();

  // Estados de Sesión y Datos Base
  const [driverName, setDriverName] = useState<string>("Conductor");
  const [driverDoc, setDriverDoc] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [selectedPlaca, setSelectedPlaca] = useState<string>("WGM-212");
  const [kilometraje, setKilometraje] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");

  // Estado del Checklist (32 ítems)
  const [checklist, setChecklist] = useState<Record<string, ValorItemChecklist>>({});
  const [activeSectionKey, setActiveSectionKey] = useState<string>("parteA");

  // Firma Digital
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Estados de Envío y Modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar sesión del Portal del Conductor
  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem("ab_portal_conductor_auth") || localStorage.getItem("transservices_auth");
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        if (parsed.nombres) {
          setDriverName(`${parsed.nombres} ${parsed.apellidos || ""}`.trim());
        }
        if (parsed.numeroDocumento || parsed.documento) {
          setDriverDoc(parsed.numeroDocumento || parsed.documento);
        }
        if (parsed.id) setDriverId(parsed.id);
        if (parsed.vehiculoPlaca || parsed.placa) {
          setSelectedPlaca(parsed.vehiculoPlaca || parsed.placa);
        }
      }
    } catch (e) {
      console.warn("No se pudo leer la sesión activa:", e);
    }
  }, []);

  // Configuración de Canvas de Firma Táctil
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajustar resolución retina
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#F0F0F5";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

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

  // Asignar valor a ítem
  const handleSetItemValue = (itemId: string, value: ValorItemChecklist) => {
    setChecklist((prev) => ({ ...prev, [itemId]: value }));
  };

  // Marcar toda la sección activa como "C" (Cumple)
  const handleMarkSectionAllGood = (sectionKey: string) => {
    const sec = PREOPERACIONAL_SECCIONES[sectionKey as keyof typeof PREOPERACIONAL_SECCIONES];
    if (!sec) return;
    const updates: Record<string, ValorItemChecklist> = {};
    sec.items.forEach((item) => {
      updates[item.id] = "C";
    });
    setChecklist((prev) => ({ ...prev, ...updates }));
  };

  // Marcar todas las 32 preguntas como "C"
  const handleMarkEverythingGood = () => {
    const updates: Record<string, ValorItemChecklist> = {};
    Object.values(PREOPERACIONAL_SECCIONES).forEach((sec) => {
      sec.items.forEach((item) => {
        updates[item.id] = "C";
      });
    });
    setChecklist(updates);
  };

  // Conteo de ítems completados
  const totalCompleted = Object.keys(checklist).length;
  const progressPercent = Math.round((totalCompleted / TOTAL_ITEMS_PREOPERACIONAL) * 100);

  // Envío a Railway PostgreSQL
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (totalCompleted < TOTAL_ITEMS_PREOPERACIONAL) {
      setErrorMessage(`Por favor completa los 32 puntos antes de enviar (llevas ${totalCompleted}/${TOTAL_ITEMS_PREOPERACIONAL}).`);
      return;
    }

    if (!hasSignature) {
      setErrorMessage("Es obligatorio estampar tu firma digital en el recuadro inferior.");
      return;
    }

    setIsSubmitting(true);

    try {
      const signatureBase64 = canvasRef.current?.toDataURL("image/png") || null;

      const res = await fetch("/api/apps/preoperacional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conductorId: driverId,
          conductorNombre: driverName,
          conductorDocumento: driverDoc,
          placa: selectedPlaca,
          kilometraje: kilometraje ? Number(kilometraje) : null,
          checklist,
          observaciones,
          signature: signatureBase64,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar la inspección preoperacional");
      }

      setSubmitResult(data.data);
      setSubmitSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSection = PREOPERACIONAL_SECCIONES[activeSectionKey as keyof typeof PREOPERACIONAL_SECCIONES];

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
            <span className="text-[10px] font-mono text-signal-amber font-bold tracking-wider uppercase block">
              HSEQ-FOR-08 · PESV PASO 14
            </span>
            <h1 className="text-sm font-bold text-paper-50 tracking-tight">
              Inspección Preoperacional
            </h1>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-fog-400 bg-asphalt-900 px-2.5 py-1 rounded-lg border border-line-600/70">
            <span className="font-bold text-radar-cyan">{totalCompleted}</span>
            <span>/{TOTAL_ITEMS_PREOPERACIONAL}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Tarjeta Resumen del Vehículo y Conductor (Estilo Tarjeta Apple) */}
        <div className="rounded-2xl border border-line-600/70 bg-gradient-to-b from-asphalt-900/90 to-asphalt-900/40 p-4 backdrop-blur-md shadow-lg space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-line-600/50 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-radar-cyan/15 text-radar-cyan border border-radar-cyan/30">
                <Truck size={20} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-fog-400 block uppercase tracking-wider">
                  Vehículo en Operación
                </span>
                <PlateTag plate={selectedPlaca} />
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-fog-400 block uppercase tracking-wider">
                Conductor Asignado
              </span>
              <span className="text-xs font-bold text-paper-50 truncate block max-w-[140px]">
                {driverName}
              </span>
              {driverDoc && (
                <span className="text-[10px] font-mono text-fog-400 block">
                  CC: {driverDoc}
                </span>
              )}
            </div>
          </div>

          {/* Odómetro / Kilometraje Actual */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-2 text-xs text-fog-400">
              <Gauge size={16} className="text-signal-amber" />
              <span>Kilometraje de Inicio:</span>
            </div>
            <div className="relative w-36">
              <input
                type="number"
                placeholder="Ej. 145200"
                value={kilometraje}
                onChange={(e) => setKilometraje(e.target.value)}
                className="w-full rounded-xl border border-line-600 bg-asphalt-950 px-3 py-1.5 text-right font-mono text-sm font-bold text-paper-50 focus:border-signal-amber focus:outline-none focus:ring-1 focus:ring-signal-amber transition-all"
              />
              <span className="absolute left-2.5 top-2 text-[10px] font-mono text-fog-400 font-semibold pointer-events-none">
                KM
              </span>
            </div>
          </div>
        </div>

        {/* Segmented Control por Secciones (Deslizamiento Horizontal Apple) */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
          <div className="flex items-center gap-1.5 min-w-max p-1 rounded-xl bg-asphalt-900 border border-line-600/70">
            {Object.entries(PREOPERACIONAL_SECCIONES).map(([key, sec]) => {
              const secCompleted = sec.items.filter((i) => checklist[i.id]).length;
              const isAllDone = secCompleted === sec.items.length;
              const isActive = activeSectionKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSectionKey(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? "bg-radar-cyan text-asphalt-950 shadow-md scale-100"
                      : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-800"
                  }`}
                >
                  <span className="font-mono text-[11px] font-bold">{sec.codigo}</span>
                  <span className="truncate">{sec.titulo.split(". ")[1] || sec.titulo}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isAllDone
                        ? isActive
                          ? "bg-asphalt-950/30 text-asphalt-950 font-extrabold"
                          : "bg-ok-green-dim text-ok-green border border-ok-green/30"
                        : isActive
                        ? "bg-asphalt-950/20 text-asphalt-950"
                        : "bg-asphalt-950 text-fog-400"
                    }`}
                  >
                    {secCompleted}/{sec.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarjeta de la Sección Activa */}
        <div className="rounded-2xl border border-line-600/80 bg-asphalt-900/90 p-4 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-600/50 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-signal-amber/15 text-signal-amber font-mono font-bold text-xs border border-signal-amber/30">
                  {currentSection.codigo}
                </span>
                <h2 className="text-base font-bold text-paper-50">
                  {currentSection.titulo}
                </h2>
              </div>
              <p className="text-xs text-fog-400 mt-0.5">{currentSection.subtitulo}</p>
            </div>

            <button
              type="button"
              onClick={() => handleMarkSectionAllGood(activeSectionKey)}
              className="px-2.5 py-1.5 rounded-lg bg-ok-green-dim hover:bg-ok-green-dim/80 text-ok-green font-bold text-xs border border-ok-green/30 flex items-center gap-1.5 transition-all tap-effect"
            >
              <Sparkles size={13} />
              <span>Marcar Todo Cumple (C)</span>
            </button>
          </div>

          {/* Lista de Ítems Técnicos */}
          <div className="space-y-2.5">
            {currentSection.items.map((item, idx) => {
              const val = checklist[item.id];

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    val === "NC"
                      ? "border-alert-red/60 bg-alert-red-dim/15"
                      : val === "C"
                      ? "border-ok-green/30 bg-asphalt-950/60"
                      : val === "NA"
                      ? "border-line-600/40 bg-asphalt-950/30 opacity-70"
                      : "border-line-600/60 bg-asphalt-950/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-fog-400">
                          {idx + 1}.
                        </span>
                        <span className="text-xs font-semibold text-paper-50 leading-snug">
                          {item.nombre}
                        </span>
                      </div>
                      {item.esCritico && (
                        <span className="inline-block text-[9px] font-mono uppercase text-signal-amber font-semibold bg-signal-amber-dim px-1.5 py-0.2 rounded border border-signal-amber/30">
                          Ítem Crítico PESV
                        </span>
                      )}
                    </div>

                    {/* Selector de 3 Estados Estilo Apple (C, NC, NA) */}
                    <div className="flex items-center rounded-lg bg-asphalt-900 border border-line-600 p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetItemValue(item.id, "C")}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                          val === "C"
                            ? "bg-ok-green text-asphalt-950 shadow-sm"
                            : "text-fog-400 hover:text-ok-green"
                        }`}
                        title="Cumple / Bueno"
                      >
                        C
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetItemValue(item.id, "NC")}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                          val === "NC"
                            ? "bg-alert-red text-paper-50 shadow-sm animate-pulse"
                            : "text-fog-400 hover:text-alert-red"
                        }`}
                        title="No Cumple / Malo"
                      >
                        NC
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetItemValue(item.id, "NA")}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                          val === "NA"
                            ? "bg-asphalt-700 text-paper-50 shadow-sm"
                            : "text-fog-400 hover:text-paper-50"
                        }`}
                        title="No Aplica"
                      >
                        NA
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navegación entre Secciones */}
          <div className="flex items-center justify-between pt-2 border-t border-line-600/40">
            {Object.keys(PREOPERACIONAL_SECCIONES).indexOf(activeSectionKey) > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const keys = Object.keys(PREOPERACIONAL_SECCIONES);
                  const prevIdx = keys.indexOf(activeSectionKey) - 1;
                  setActiveSectionKey(keys[prevIdx]);
                }}
                className="px-3 py-1.5 rounded-lg border border-line-600 bg-asphalt-950 text-xs font-semibold text-fog-400 hover:text-paper-50"
              >
                ← Sección Anterior
              </button>
            ) : <div />}

            {Object.keys(PREOPERACIONAL_SECCIONES).indexOf(activeSectionKey) < Object.keys(PREOPERACIONAL_SECCIONES).length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  const keys = Object.keys(PREOPERACIONAL_SECCIONES);
                  const nextIdx = keys.indexOf(activeSectionKey) + 1;
                  setActiveSectionKey(keys[nextIdx]);
                }}
                className="px-3 py-1.5 rounded-lg bg-radar-cyan text-asphalt-950 text-xs font-bold flex items-center gap-1 shadow-md hover:bg-radar-cyan/90"
              >
                <span>Siguiente Sección</span>
                <ArrowRight size={14} />
              </button>
            ) : <div />}
          </div>
        </div>

        {/* Observaciones Generales */}
        <div className="rounded-2xl border border-line-600/80 bg-asphalt-900/90 p-4 backdrop-blur-md shadow-xl space-y-2">
          <label className="text-xs font-bold text-paper-50 flex items-center gap-2">
            <span>Observaciones y Novedades Adicionales</span>
            <span className="text-[10px] font-mono text-fog-400 font-normal">(Opcional)</span>
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Reporta aquí ruidos extraños, llantas bajas de aire o novedades del recorrido..."
            className="w-full rounded-xl border border-line-600 bg-asphalt-950 p-3 text-xs text-paper-50 placeholder:text-fog-400/50 focus:border-signal-amber focus:outline-none transition-all"
          />
        </div>

        {/* Lienzo de Firma Digital Táctil (Apple Signature Canvas) */}
        <div className="rounded-2xl border border-line-600/80 bg-asphalt-900/90 p-4 backdrop-blur-md shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-radar-cyan" />
              <label className="text-xs font-bold text-paper-50">
                Firma Digital del Conductor
              </label>
            </div>
            {hasSignature && (
              <button
                type="button"
                onClick={clearSignature}
                className="text-[11px] font-semibold text-alert-red hover:underline flex items-center gap-1"
              >
                <Eraser size={12} />
                <span>Borrar Firma</span>
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
              className="w-full h-36 cursor-crosshair touch-none"
            />
            {!hasSignature && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-mono text-fog-400/60">
                ✍️ Firma aquí con tu dedo o lápiz táctil
              </div>
            )}
          </div>

          <p className="text-[10px] text-fog-400 text-center">
            Certifico bajo juramento que los 32 puntos evaluados corresponden a la condición real del vehículo.
          </p>
        </div>

        {/* Mensaje de Error si Aplica */}
        {errorMessage && (
          <div className="rounded-xl border border-alert-red/40 bg-alert-red-dim/20 p-3.5 text-xs text-alert-red flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </main>

      {/* Barra de Acción Flotante Inferior (iOS Bottom Bar) */}
      <div className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-2xl bg-asphalt-950/90 border-t border-line-600/80 p-3 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-fog-400">Progreso Total</span>
              <span className="font-bold text-radar-cyan">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-asphalt-900 overflow-hidden border border-line-600">
              <div
                className="h-full bg-gradient-to-r from-signal-amber to-ok-green transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-signal-amber to-signal-amber/90 hover:brightness-110 text-asphalt-950 font-bold text-sm shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none transition-all tap-effect shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Enviar Inspección</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Confirmación Estilo Apple (Checkmark Animado) */}
      {submitSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-ok-green/40 bg-asphalt-900 p-6 text-center space-y-4 shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ok-green-dim text-ok-green border border-ok-green/40 mx-auto animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-ok-green font-bold">
                Inspección Guardada en PostgreSQL
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
                ¡Preoperacional Completado!
              </h3>
              <p className="text-xs text-fog-400">
                Vehículo <strong className="text-paper-50 font-mono">{selectedPlaca}</strong> listo para operar según el PESV.
              </p>
            </div>

            <div className="rounded-xl bg-asphalt-950 p-3 text-xs font-mono space-y-1.5 text-fog-400 border border-line-600">
              <div className="flex justify-between">
                <span>Concepto HSEQ:</span>
                <span className="text-ok-green font-bold uppercase">
                  {submitResult?.estadoConcepto || "APTO"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fecha y Hora:</span>
                <span className="text-paper-50">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
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
