"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  GraduationCap,
  Video,
  FileText,
  Camera,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Award,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Capacitacion, PreguntaEvaluacion } from "@/lib/types/capacitacion";

export default function PortalCapacitacionesPage() {
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCap, setSelectedCap] = useState<Capacitacion | null>(null);

  // Sesión del Conductor
  const [driverSession, setDriverSession] = useState<{
    id?: string;
    nombre?: string;
    documento?: string;
    placa?: string;
  } | null>(null);

  // Form State para la Asistencia
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successSubmitted, setSuccessSubmitted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Signature Canvas
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSigBlank, setIsSigBlank] = useState(true);

  // 1. Cargar Sesión del Conductor
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ab_driver_session");
      if (stored) {
        setDriverSession(JSON.parse(stored));
      } else if (typeof window !== "undefined" && (window as any).TransServices?.getSession) {
        setDriverSession((window as any).TransServices.getSession());
      }
    } catch (e) {
      console.warn("No active session:", e);
    }
  }, []);

  // 2. Cargar Capacitaciones desde API
  const loadCapacitaciones = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/capacitaciones");
      if (res.ok) {
        const data = await res.json();
        setCapacitaciones(data.capacitaciones || []);
      }
    } catch (err) {
      console.error("Error al cargar capacitaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCapacitaciones();
  }, []);

  // Timer de lectura/estudio
  useEffect(() => {
    let interval: any;
    if (selectedCap && !successSubmitted) {
      interval = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [selectedCap, successSubmitted]);

  // Manejo de Cámara Selfie
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Error al acceder a la cámara:", err);
      setCameraError("No se pudo acceder a la cámara. Por favor autoriza los permisos.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setSelfieBase64(dataUrl);
    }
    stopCamera();
  };

  const retakeSelfie = () => {
    setSelfieBase64(null);
    startCamera();
  };

  // Manejo de Canvas de Firma
  const initSignaturePad = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = 120;
    }
  };

  useEffect(() => {
    if (selectedCap) {
      setTimeout(initSignaturePad, 200);
    }
  }, [selectedCap]);

  const getCanvasPos = (e: any) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e: any) => {
    setIsDrawing(true);
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      const p = getCanvasPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      const p = getCanvasPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      setIsSigBlank(false);
    }
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsSigBlank(true);
    }
  };

  // Enviar Asistencia
  const handleSubmitAttendance = async () => {
    if (!selectedCap) return;
    if (selectedCap.requiereSelfie && !selfieBase64) {
      alert("Por favor toma una foto selfie para verificar tu asistencia.");
      return;
    }
    if (selectedCap.requiereFirma && isSigBlank) {
      alert("Por favor firma en el recuadro antes de enviar.");
      return;
    }

    setSubmitting(true);
    try {
      const firmaDataUrl = sigCanvasRef.current?.toDataURL("image/png") || null;

      // Calcular calificación del test
      const preguntasList = (selectedCap.preguntas || []) as PreguntaEvaluacion[];
      let correctas = 0;
      preguntasList.forEach((p) => {
        if (respuestas[p.id] === p.respuestaCorrecta) {
          correctas++;
        }
      });
      const calificacion =
        preguntasList.length > 0 ? Math.round((correctas / preguntasList.length) * 100) : 100;

      const payload = {
        capacitacionId: selectedCap.id,
        personaId: driverSession?.id || null,
        personaDocumento: driverSession?.documento || null,
        personaNombre: driverSession?.nombre || "Conductor Operativo",
        cargo: "Conductor",
        proyecto: "Operación General",
        firmaUrl: firmaDataUrl,
        fotoUrl: selfieBase64, // Selfie
        calificacion,
        respuestas,
        tiempoLectura: timeSpent,
      };

      const res = await fetch("/api/capacitaciones/asistir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar la asistencia.");
      }

      setSuccessSubmitted(true);
      loadCapacitaciones();
    } catch (err: any) {
      alert("Error al registrar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24 font-sans selection:bg-[#0F172A] selection:text-white">
      {/* ── HEADER APPLE GLASS ── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link
            href="/portal-conductor"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Portal</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-extrabold tracking-tight">Charlas & Capacitaciones</h1>
            <p className="text-[10px] font-mono text-slate-400">PLAN PESV & SG-SST</p>
          </div>
          <button
            onClick={loadCapacitaciones}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
            title="Actualizar"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5">
        {/* ════════════════════════════════════════════════════════ */}
        {/* VISTA 1: LISTA DE CHARLAS Y CAPACITACIONES */}
        {/* ════════════════════════════════════════════════════════ */}
        {!selectedCap ? (
          <div className="space-y-4">
            <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-[0_4px_25px_-4px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#FF9500] border border-amber-200 flex items-center justify-center font-bold text-xl shadow-sm">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                    Formación Continua & Charlas
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Estudia el material de seguridad y registra tu asistencia digital.
                  </p>
                </div>
              </div>

              {driverSession?.nombre && (
                <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Conductor:</span>
                  <span className="font-bold text-slate-900">{driverSession.nombre}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider px-1">
                Charlas Disponibles ({capacitaciones.length})
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Cargando charlas programadas...
                </div>
              ) : capacitaciones.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-[22px] border border-slate-200 text-xs text-slate-400">
                  No hay charlas pendientes en este momento. ¡Estás al día!
                </div>
              ) : (
                capacitaciones.map((cap) => (
                  <div
                    key={cap.id}
                    onClick={() => {
                      setSelectedCap(cap);
                      setSuccessSubmitted(false);
                      setSelfieBase64(null);
                      setRespuestas({});
                      setTimeSpent(0);
                    }}
                    className="bg-white rounded-[22px] p-4 border border-slate-200/80 hover:border-slate-400 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {cap.tipo === "pesv" ? "🚦 PESV" : "🛡️ SG-SST"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {cap.duracionHoras ? `${Math.round(cap.duracionHoras * 60)} min` : "15 min"}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {cap.nombre}
                        </h3>
                        {cap.objetivo && (
                          <p className="text-xs text-slate-500 line-clamp-2">{cap.objetivo}</p>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors shrink-0">
                        <ChevronLeft size={16} className="rotate-180" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════ */
          /* VISTA 2: DETALLE, MATERIAL, TEST, SELFIE Y FIRMA */
          /* ════════════════════════════════════════════════════════ */
          <div className="space-y-5 animate-fadeIn">
            <button
              onClick={() => {
                setSelectedCap(null);
                stopCamera();
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              <ChevronLeft size={14} /> Volver al listado
            </button>

            {successSubmitted ? (
              <div className="bg-white rounded-[26px] p-8 border border-emerald-200 shadow-lg text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  ¡Asistencia y Evidencia Registradas!
                </h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tu participación en <strong>"{selectedCap.nombre}"</strong> quedó respaldada con tu foto selfie y firma en el sistema central de TRANS SERVICES A&B.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSelectedCap(null);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-md hover:bg-black transition-colors"
                  >
                    Entendido, Volver
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header de la Charla */}
                <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {selectedCap.tipo === "pesv" ? "🚦 PLAN PESV" : "🛡️ SG-SST"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Tiempo de lectura: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                    {selectedCap.nombre}
                  </h2>
                  {selectedCap.facilitador && (
                    <p className="text-xs text-slate-500 font-medium">
                      Facilitador: <strong>{selectedCap.facilitador}</strong>
                    </p>
                  )}
                </div>

                {/* 01. MATERIAL DIDÁCTICO (VIDEO O TEXTO) */}
                <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-sm space-y-3">
                  <div className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wide flex items-center gap-2">
                    <FileText size={14} className="text-blue-600" />
                    <span>01 • Material de Estudio & Recomendaciones</span>
                  </div>

                  {/* Video si aplica */}
                  {selectedCap.materialUrl && (
                    <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                      {selectedCap.materialUrl.includes("youtube.com") || selectedCap.materialUrl.includes("youtu.be") ? (
                        <iframe
                          src={selectedCap.materialUrl.replace("watch?v=", "embed/")}
                          className="w-full h-full"
                          allowFullScreen
                          title="Video de Capacitación"
                        />
                      ) : (
                        <div className="p-6 text-center text-white text-xs space-y-2">
                          <Video size={24} className="mx-auto text-blue-400" />
                          <div>Enlace de material externo:</div>
                          <a
                            href={selectedCap.materialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 rounded-lg text-white font-bold text-xs"
                          >
                            Abrir Material <ChevronLeft size={14} className="rotate-180" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Puntos clave */}
                  {selectedCap.materialContenido && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                      {selectedCap.materialContenido}
                    </div>
                  )}
                </div>

                {/* 02. EVALUACIÓN DE COMPRENSIÓN (SI EXISTEN PREGUNTAS) */}
                {selectedCap.preguntas && selectedCap.preguntas.length > 0 && (
                  <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-sm space-y-4">
                    <div className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wide flex items-center gap-2">
                      <Award size={14} className="text-amber-500" />
                      <span>02 • Validación de Comprensión</span>
                    </div>

                    <div className="space-y-4">
                      {(selectedCap.preguntas as PreguntaEvaluacion[]).map((p, idx) => (
                        <div key={p.id || idx} className="space-y-2">
                          <p className="text-xs font-bold text-slate-900">
                            {idx + 1}. {p.pregunta}
                          </p>
                          <div className="space-y-1.5">
                            {p.opciones.map((op, oIdx) => (
                              <label
                                key={oIdx}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                                  respuestas[p.id] === oIdx
                                    ? "bg-slate-900 text-white border-slate-900 font-bold"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`p_${p.id}`}
                                  checked={respuestas[p.id] === oIdx}
                                  onChange={() =>
                                    setRespuestas((prev) => ({ ...prev, [p.id]: oIdx }))
                                  }
                                  className="hidden"
                                />
                                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] shrink-0">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span>{op}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 03. EVIDENCIA FOTOGRÁFICA (SELFIE CON CÁMARA) */}
                {selectedCap.requiereSelfie && (
                  <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-sm space-y-3">
                    <div className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wide flex items-center gap-2">
                      <Camera size={14} className="text-emerald-600" />
                      <span>03 • Verificación Facial (Selfie) *</span>
                    </div>

                    {cameraError && (
                      <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                        {cameraError}
                      </div>
                    )}

                    {!selfieBase64 && !isCameraActive && (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full py-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-300 text-emerald-800 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-colors"
                      >
                        <Camera size={24} />
                        <span>Abrir Cámara para Tomar Selfie</span>
                      </button>
                    )}

                    {isCameraActive && (
                      <div className="space-y-3 text-center">
                        <div className="relative rounded-2xl overflow-hidden bg-black max-w-xs mx-auto aspect-square border-2 border-emerald-400">
                          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                        </div>
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={captureSelfie}
                            className="px-6 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-md hover:bg-emerald-700 transition-colors"
                          >
                            📸 Capturar Foto
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-4 py-2.5 rounded-full bg-slate-200 text-slate-700 font-bold text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {selfieBase64 && (
                      <div className="text-center space-y-2">
                        <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-500 mx-auto shadow-md">
                          <img src={selfieBase64} alt="Selfie" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={retakeSelfie}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900"
                        >
                          <RotateCcw size={12} /> Tomar otra foto
                        </button>
                      </div>
                    )}

                    {/* Canvas oculto para procesar foto */}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}

                {/* 04. FIRMA DIGITAL */}
                {selectedCap.requiereFirma && (
                  <div className="bg-white rounded-[26px] p-5 border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wide flex items-center gap-2">
                        <PenTool size={14} className="text-slate-900" />
                        <span>04 • Firma del Conductor *</span>
                      </div>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="text-[11px] font-bold text-red-500 hover:underline"
                      >
                        Limpiar
                      </button>
                    </div>

                    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-2 cursor-crosshair">
                      <canvas
                        ref={sigCanvasRef}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={endDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={endDraw}
                        className="w-full h-[120px] block"
                      />
                    </div>
                    <p className="text-[10px] text-center text-slate-400 font-mono">
                      Firma con tu dedo o lápiz dentro del recuadro
                    </p>
                  </div>
                )}

                {/* BOTÓN FINAL DE ENVÍO */}
                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-slate-900 text-white font-extrabold text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <CheckCircle2 size={18} />
                  <span>{submitting ? "Registrando Asistencia..." : "Confirmar y Enviar Asistencia"}</span>
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
