"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Truck,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Sparkles,
  Eraser,
  Save,
  Loader2,
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
      const storedConductor = localStorage.getItem("transservices_conductor");
      if (storedConductor) {
        const parsed = JSON.parse(storedConductor);
        if (parsed.nombre) setDriverName(parsed.nombre);
        if (parsed.documento) setDriverDoc(parsed.documento);
        if (parsed.id) setDriverId(parsed.id);
        if (parsed.placa && parsed.placa !== "SIN ASIGNAR") setSelectedPlaca(parsed.placa);
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
    ctx.strokeStyle = "#0F172A";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Manejadores de Canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

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
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

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
    setChecklist((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  // Autocompletar sección actual como "C" (Cumple)
  const handleMarkSectionAllGood = (sectionKey: string) => {
    const sec = PREOPERACIONAL_SECCIONES[sectionKey as keyof typeof PREOPERACIONAL_SECCIONES];
    if (!sec) return;

    const newEntries: Record<string, ValorItemChecklist> = {};
    sec.items.forEach((item) => {
      newEntries[item.id] = "C";
    });

    setChecklist((prev) => ({
      ...prev,
      ...newEntries,
    }));
  };

  // Cálculo de Progreso
  const totalCompleted = Object.keys(checklist).length;
  const progressPercent = Math.round((totalCompleted / TOTAL_ITEMS_PREOPERACIONAL) * 100);

  // Enviar Formulario a la API
  const handleSubmit = async () => {
    setErrorMessage(null);

    if (totalCompleted < TOTAL_ITEMS_PREOPERACIONAL) {
      setErrorMessage(`Faltan ${TOTAL_ITEMS_PREOPERACIONAL - totalCompleted} puntos por verificar en el checklist.`);
      return;
    }

    if (!hasSignature) {
      setErrorMessage("Debes firmar digitalmente el reporte antes de enviarlo.");
      return;
    }

    setIsSubmitting(true);

    try {
      const canvas = canvasRef.current;
      const signatureBase64 = canvas ? canvas.toDataURL("image/png") : null;

      const res = await fetch("/api/apps/preoperacional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conductorId: driverId || undefined,
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased pb-32 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display',Helvetica,Arial,sans-serif]">
      {/* Barra Superior Fija Estilo Apple Glass */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-white/85 border-b border-slate-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/portal-conductor"
            className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors py-1.5 px-3 rounded-full bg-slate-100 border border-slate-200 shadow-2xs"
          >
            <ChevronLeft size={16} />
            <span>Portal</span>
          </Link>

          <div className="text-center">
            <span className="text-[10px] font-mono text-[#007AFF] font-bold tracking-wider uppercase block">
              HSEQ-FOR-08 · PESV PASO 14
            </span>
            <h1 className="text-sm font-bold text-[#0F172A] tracking-tight">
              Inspección Preoperacional
            </h1>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-semibold shadow-2xs">
            <span className="font-bold text-[#007AFF]">{totalCompleted}</span>
            <span>/{TOTAL_ITEMS_PREOPERACIONAL}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Tarjeta Resumen del Vehículo y Conductor (Estilo Tarjeta Apple) */}
        <div className="rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#007AFF] border border-blue-200 shadow-2xs">
                <Truck size={22} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Vehículo en Operación
                </span>
                <PlateTag plate={selectedPlaca} />
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                Conductor Asignado
              </span>
              <span className="text-xs font-bold text-[#0F172A] truncate block max-w-[140px]">
                {driverName}
              </span>
              {driverDoc && (
                <span className="text-[10px] font-mono text-slate-500 block">
                  CC: {driverDoc}
                </span>
              )}
            </div>
          </div>

          {/* Odómetro / Kilometraje Actual */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <Gauge size={16} className="text-[#FF9500]" />
              <span>Kilometraje de Inicio:</span>
            </div>
            <div className="relative w-36">
              <input
                type="number"
                placeholder="Ej. 145200"
                value={kilometraje}
                onChange={(e) => setKilometraje(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-right font-mono text-sm font-bold text-[#0F172A] focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#007AFF] transition-all"
              />
              <span className="absolute left-3 top-2 text-[10px] font-mono text-slate-400 font-bold pointer-events-none">
                KM
              </span>
            </div>
          </div>
        </div>

        {/* Segmented Control por Secciones (Deslizamiento Horizontal Apple) */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 py-1">
          <div className="flex items-center gap-1.5 min-w-max p-1.5 rounded-2xl bg-slate-200/70 border border-slate-300/60">
            {Object.entries(PREOPERACIONAL_SECCIONES).map(([key, sec]) => {
              const secCompleted = sec.items.filter((i) => checklist[i.id]).length;
              const isAllDone = secCompleted === sec.items.length;
              const isActive = activeSectionKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSectionKey(key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-white text-[#0F172A] shadow-sm scale-100"
                      : "text-slate-600 hover:text-[#0F172A] hover:bg-white/50"
                  }`}
                >
                  <span className="font-mono text-[11px] font-bold">{sec.codigo}</span>
                  <span className="truncate">{sec.titulo.split(". ")[1] || sec.titulo}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isAllDone
                        ? isActive
                          ? "bg-emerald-100 text-emerald-800 font-bold"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isActive
                        ? "bg-slate-100 text-slate-700"
                        : "bg-slate-300/60 text-slate-600"
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
        <div className="rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-700 font-mono font-bold text-xs border border-amber-200">
                  {currentSection.codigo}
                </span>
                <h2 className="text-base font-bold text-[#0F172A]">
                  {currentSection.titulo}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{currentSection.subtitulo}</p>
            </div>

            <button
              type="button"
              onClick={() => handleMarkSectionAllGood(activeSectionKey)}
              className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
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
                  className={`p-3.5 rounded-2xl border transition-all ${
                    val === "NC"
                      ? "border-rose-300 bg-rose-50/70"
                      : val === "C"
                      ? "border-emerald-200 bg-emerald-50/40"
                      : val === "NA"
                      ? "border-slate-200 bg-slate-50 opacity-70"
                      : "border-slate-200/80 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">
                          {idx + 1}.
                        </span>
                        <span className="text-xs font-semibold text-[#0F172A] leading-snug">
                          {item.nombre}
                        </span>
                      </div>
                      {item.esCritico && (
                        <span className="inline-block text-[9px] font-mono uppercase text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300/60 mt-1">
                          Ítem Crítico PESV
                        </span>
                      )}
                    </div>

                    {/* Selector de 3 Estados Estilo Apple (C, NC, NA) */}
                    <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200 p-0.5 shrink-0 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleSetItemValue(item.id, "C")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          val === "C"
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "text-slate-500 hover:text-emerald-700"
                        }`}
                        title="Cumple / Bueno"
                      >
                        C
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetItemValue(item.id, "NC")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          val === "NC"
                            ? "bg-[#FF3B30] text-white shadow-xs"
                            : "text-slate-500 hover:text-rose-700"
                        }`}
                        title="No Cumple / Malo"
                      >
                        NC
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetItemValue(item.id, "NA")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          val === "NA"
                            ? "bg-slate-700 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-900"
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
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {Object.keys(PREOPERACIONAL_SECCIONES).indexOf(activeSectionKey) > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const keys = Object.keys(PREOPERACIONAL_SECCIONES);
                  const prevIdx = keys.indexOf(activeSectionKey) - 1;
                  setActiveSectionKey(keys[prevIdx]);
                }}
                className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors shadow-2xs"
              >
                ← Anterior
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
                className="px-4 py-1.5 rounded-full bg-[#007AFF] text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-blue-600 transition-colors active:scale-95"
              >
                <span>Siguiente</span>
                <ArrowRight size={14} />
              </button>
            ) : <div />}
          </div>
        </div>

        {/* Observaciones Generales */}
        <div className="rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-2">
          <label className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
            <span>Observaciones y Novedades Adicionales</span>
            <span className="text-[10px] font-mono text-slate-400 font-normal">(Opcional)</span>
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Reporta aquí ruidos extraños, llantas bajas de aire o novedades del recorrido..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-[#0F172A] placeholder:text-slate-400 focus:border-[#007AFF] focus:bg-white focus:outline-none transition-all"
          />
        </div>

        {/* Lienzo de Firma Digital Táctil (Apple Signature Canvas) */}
        <div className="rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-[#007AFF]" />
              <label className="text-xs font-bold text-[#0F172A]">
                Firma Digital del Conductor
              </label>
            </div>
            {hasSignature && (
              <button
                type="button"
                onClick={clearSignature}
                className="text-[11px] font-bold text-[#FF3B30] hover:underline flex items-center gap-1"
              >
                <Eraser size={12} />
                <span>Borrar Firma</span>
              </button>
            )}
          </div>

          <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
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
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-400">
                ✍️ Firma aquí con tu dedo o lápiz táctil
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Certifico bajo juramento que los 32 puntos evaluados corresponden a la condición real del vehículo.
          </p>
        </div>

        {/* Mensaje de Error si Aplica */}
        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2.5 shadow-2xs">
            <AlertTriangle size={18} className="shrink-0 text-[#FF3B30]" />
            <span>{errorMessage}</span>
          </div>
        )}
      </main>

      {/* Barra de Acción Flotante Inferior (iOS Bottom Bar) */}
      <div className="fixed bottom-0 inset-x-0 z-40 backdrop-blur-2xl bg-white/90 border-t border-slate-200/80 p-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-500 font-semibold">Progreso</span>
              <span className="font-bold text-[#007AFF]">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 rounded-full bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95 shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Enviar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Confirmación Estilo Apple (Checkmark Animado) */}
      {submitSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[32px] border border-slate-200 bg-white p-6 text-center space-y-4 shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 font-bold">
                Inspección Guardada en PostgreSQL
              </span>
              <h3 className="text-xl font-bold text-[#0F172A]">
                ¡Preoperacional Completado!
              </h3>
              <p className="text-xs text-slate-500">
                Vehículo <strong className="text-[#0F172A] font-mono">{selectedPlaca}</strong> listo para operar según el PESV.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs font-mono space-y-1.5 text-slate-600 border border-slate-200">
              <div className="flex justify-between">
                <span>Concepto HSEQ:</span>
                <span className="text-emerald-700 font-bold uppercase">
                  {submitResult?.estadoConcepto || "APTO"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fecha y Hora:</span>
                <span className="text-[#0F172A]">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/portal-conductor")}
              className="w-full py-3.5 rounded-full bg-[#007AFF] text-white font-bold text-sm hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              Volver al Portal del Conductor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
