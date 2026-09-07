"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Video,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Camera,
  PenTool,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface PreguntaForm {
  id: number;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
}

export default function NuevaCapacitacionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("pesv");
  const [programa, setPrograma] = useState("Plan de Capacitacion PESV (Paso 9/18)");
  const [categoria, setCategoria] = useState("charla_semanal");
  const [fecha, setFecha] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });
  const [duracionHoras, setDuracionHoras] = useState("0.25");
  const [facilitador, setFacilitador] = useState("Coordinador HSEQ / PESV");
  const [objetivo, setObjetivo] = useState("");
  const [asistentesEsperados, setAsistentesEsperados] = useState("10");

  // Material State (Google Form como opción por defecto e integrada)
  const [materialTipo, setMaterialTipo] = useState<"google_form" | "texto" | "video" | "pdf">("google_form");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialContenido, setMaterialContenido] = useState("");

  // Requisitos State
  const [requiereSelfie, setRequiereSelfie] = useState(true);
  const [requiereFirma, setRequiereFirma] = useState(true);

  // Preguntas State
  const [preguntas, setPreguntas] = useState<PreguntaForm[]>([]);

  const handleTipoChange = (newTipo: string) => {
    setTipo(newTipo);
    if (newTipo === "pesv") {
      setPrograma("Plan de Capacitacion PESV (Paso 9/18)");
      if (!nombre) setNombre("Charla Semanal de Seguridad Vial");
    } else if (newTipo === "sg-sst") {
      setPrograma("Plan Anual SG-SST (Dec 1072 / Res 0312)");
      if (!nombre) setNombre("Charla de Seguridad y Salud en el Trabajo");
    } else {
      setPrograma("Formacion Operativa y de Servicio");
    }
  };

  const addPregunta = () => {
    setPreguntas((prev) => [
      ...prev,
      {
        id: Date.now(),
        pregunta: "",
        opciones: ["Opción A", "Opción B", "Opción C"],
        respuestaCorrecta: 0,
      },
    ]);
  };

  const removePregunta = (id: number) => {
    setPreguntas((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePreguntaText = (id: number, text: string) => {
    setPreguntas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pregunta: text } : p))
    );
  };

  const updateOpcionText = (preguntaId: number, index: number, text: string) => {
    setPreguntas((prev) =>
      prev.map((p) => {
        if (p.id !== preguntaId) return p;
        const newOpciones = [...p.opciones];
        newOpciones[index] = text;
        return { ...p, opciones: newOpciones };
      })
    );
  };

  const updateRespuestaCorrecta = (preguntaId: number, index: number) => {
    setPreguntas((prev) =>
      prev.map((p) => (p.id === preguntaId ? { ...p, respuestaCorrecta: index } : p))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg("El nombre o tema de la capacitación es requerido.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        nombre,
        tipo,
        programa,
        categoria,
        fecha,
        duracionHoras: parseFloat(duracionHoras) || 0.25,
        facilitador,
        objetivo,
        materialTipo,
        materialUrl,
        materialContenido,
        preguntas: preguntas.filter((p) => p.pregunta.trim() !== ""),
        requiereSelfie,
        requiereFirma,
        asistentesEsperados: parseInt(asistentesEsperados, 10) || 0,
      };

      const res = await fetch("/api/capacitaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar la capacitación.");
      }

      router.push("/capacitaciones");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al crear la capacitación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      <Link
        href="/capacitaciones"
        className="inline-flex items-center gap-1.5 text-xs text-fog-400 hover:text-paper-50 font-mono transition-colors"
      >
        <ArrowLeft size={14} /> VOLVER A CAPACITACIONES
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-signal-amber bg-signal-amber-dim px-2 py-0.5 rounded border border-signal-amber/30">
            HSEQ & FORMACIÓN
          </span>
          <span className="text-xs text-fog-400 font-mono">TH-FOR-04</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-paper-50 uppercase mt-1">
          Programar Charla o Capacitación
        </h1>
        <p className="text-sm text-mist-200">
          Publica material de estudio, videos y evaluaciones para registro digital con selfie y firma en el portal móvil.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-alert-red/30 bg-alert-red-dim/40 p-4 text-sm text-alert-red">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: DATOS GENERALES */}
        <Card className="p-6 border-line-600 bg-asphalt-900 space-y-5">
          <div className="border-b border-line-600 pb-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 uppercase tracking-wide">
              01 · Información General del Programa
            </h2>
            <p className="text-xs text-fog-400">
              Clasificación normativa para SG-SST (Res. 0312) o PESV (Res. 40595 - Paso 9).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
                Tema / Nombre de la Charla o Capacitación *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Charla Semanal: Puntos Ciegos y Distancia de Seguimiento"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-asphalt-950 border border-line-600 rounded-xl px-3.5 py-2.5 text-paper-50 text-sm focus:border-signal-amber focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
                Programa Principal *
              </label>
              <select
                value={tipo}
                onChange={(e) => handleTipoChange(e.target.value)}
                className="w-full bg-asphalt-950 border border-line-600 rounded-xl px-3.5 py-2.5 text-paper-50 text-sm focus:border-signal-amber focus:outline-none"
              >
                <option value="pesv">🚦 PESV (Plan de Seguridad Vial - Paso 9/18)</option>
                <option value="sg-sst">🛡️ SG-SST (Seguridad y Salud en el Trabajo)</option>
                <option value="hseq">🌿 HSEQ (Calidad, Ambiente y Sostenibilidad)</option>
                <option value="operativa">⚙️ Operativa, Servicio y Mecánica</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
                Frecuencia / Categoría *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full bg-asphalt-950 border border-line-600 rounded-xl px-3.5 py-2.5 text-paper-50 text-sm focus:border-signal-amber focus:outline-none"
              >
                <option value="charla_semanal">⚡ Charla Semanal de Seguridad (5-10 min)</option>
                <option value="capacitacion_mensual">🎓 Capacitación Mensual Formal</option>
                <option value="induccion">📋 Inducción / Reinducción Institucional</option>
                <option value="entrenamiento">🛠️ Entrenamiento Práctico / Simulación</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
                Fecha y Hora de Convocatoria *
              </label>
              <input
                type="datetime-local"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-asphalt-950 border border-line-600 rounded-xl px-3.5 py-2.5 text-paper-50 text-sm font-mono focus:border-signal-amber focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
                  Duración (Horas)
                </label>
                <select
                  value={duracionHoras}
                  onChange={(e) => setDuracionHoras(e.target.value)}
                  className="w-full bg-asphalt-950 border border-line-600 rounded-xl px-3 py-2.5 text-paper-50 text-sm font-mono focus:border-signal-amber focus:outline-none"
                >
                  <option value="0.17">10 min (0.17h)</option>
                  <option value="0.25">15 min (0.25h)</option>
                  <option value="0.5">30 min (0.5h)</option>
                  <option value="1">1 hora (1.0h)</option>
                  <option value="2">2 horas (2.0h)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
                  Meta Asistentes
                </label>
                <input
                  type="number"
                  min={1}
                  value={asistentesEsperados}
                  onChange={(e) => setAsistentesEsperados(e.target.value)}
                  className="w-full bg-asphalt-950 border border-line-600 rounded-xl px-3 py-2.5 text-paper-50 text-sm font-mono focus:border-signal-amber focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
                Instructor / Facilitador
              </label>
              <input
                type="text"
                placeholder="Ej. Ing. HSEQ / ARL Bolívar / Instructor"
                value={facilitador}
                onChange={(e) => setFacilitador(e.target.value)}
                className="w-full bg-asphalt-950 border border-line-600 rounded-xl px-3.5 py-2.5 text-paper-50 text-sm focus:border-signal-amber focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
                Objetivo de Aprendizaje
              </label>
              <input
                type="text"
                placeholder="Ej. Reforzar técnicas de frenado en terreno húmedo y destapado"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="w-full bg-asphalt-950 border border-line-600 rounded-xl px-3.5 py-2.5 text-paper-50 text-sm focus:border-signal-amber focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* SECCIÓN 2: MATERIAL DIDÁCTICO */}
        <Card className="p-6 border-line-600 bg-asphalt-900 space-y-5">
          <div className="border-b border-line-600 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 uppercase tracking-wide">
                02 · Material Didáctico de la Charla
              </h2>
              <p className="text-xs text-fog-400">
                El conductor podrá ver este contenido en su celular antes de firmar la asistencia.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMaterialTipo("google_form")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  materialTipo === "google_form"
                    ? "bg-emerald-500 text-asphalt-950 border-emerald-500 shadow"
                    : "bg-asphalt-950 text-fog-400 border-line-600 hover:text-paper-50"
                }`}
              >
                <ExternalLink size={13} /> Google Form / Nube
              </button>
              <button
                type="button"
                onClick={() => setMaterialTipo("texto")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  materialTipo === "texto"
                    ? "bg-signal-amber text-asphalt-950 border-signal-amber shadow"
                    : "bg-asphalt-950 text-fog-400 border-line-600 hover:text-paper-50"
                }`}
              >
                <FileText size={13} /> Texto Directo
              </button>
              <button
                type="button"
                onClick={() => setMaterialTipo("video")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  materialTipo === "video"
                    ? "bg-radar-cyan text-asphalt-950 border-radar-cyan shadow"
                    : "bg-asphalt-950 text-fog-400 border-line-600 hover:text-paper-50"
                }`}
              >
                <Video size={13} /> Video (YouTube)
              </button>
            </div>
          </div>

          {materialTipo === "google_form" && (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ExternalLink size={15} />
                <span>Enlace a Google Form / Material en la Nube</span>
              </div>
              <p className="text-xs text-fog-400">
                Pega la URL de tu formulario de Google (ej: <code className="text-emerald-300">https://forms.gle/...</code> o <code className="text-emerald-300">https://docs.google.com/forms/...</code>). El participante responderá las preguntas en Google Forms y registrará su firma legal en el ERP.
              </p>
              <input
                type="url"
                required
                placeholder="https://forms.gle/abcdef123456..."
                value={materialUrl}
                onChange={(e) => setMaterialUrl(e.target.value)}
                className="w-full bg-asphalt-950 border border-emerald-500/50 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-paper-50 text-sm font-mono focus:outline-none"
              />
            </div>
          )}

          {materialTipo === "video" && (
            <div>
              <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
                Enlace de Video (YouTube / Vimeo / Drive)
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={materialUrl}
                onChange={(e) => setMaterialUrl(e.target.value)}
                className="w-full bg-asphalt-950 border border-line-600 rounded-xl px-3.5 py-2.5 text-paper-50 text-sm font-mono focus:border-radar-cyan focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-bold text-fog-400 uppercase mb-1">
              Instrucciones / Puntos Clave para el Conductor (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Instrucciones adicionales o recomendaciones para los conductores..."
              value={materialContenido}
              onChange={(e) => setMaterialContenido(e.target.value)}
              className="w-full bg-asphalt-950 border border-line-600 rounded-xl p-3 text-paper-50 text-sm focus:border-signal-amber focus:outline-none leading-relaxed"
            />
          </div>
        </Card>

        {/* SECCIÓN 3: PREGUNTAS DE EVALUACIÓN */}
        <Card className="p-6 border-line-600 bg-asphalt-900 space-y-5">
          <div className="border-b border-line-600 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 uppercase tracking-wide">
                03 · Validación de Comprensión (Evaluación)
              </h2>
              <p className="text-xs text-fog-400">
                {materialTipo === "google_form"
                  ? "Las preguntas se responden en tu Google Form. Si deseas agregar preguntas adicionales en el ERP, puedes añadirlas aquí."
                  : "Preguntas de selección múltiple para verificar que el conductor leyó y comprendió el tema."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPregunta}
              className="text-xs flex items-center gap-1 text-signal-amber border-signal-amber/30"
            >
              <Plus size={14} /> Agregar Pregunta ERP
            </Button>
          </div>

          {materialTipo === "google_form" && preguntas.length === 0 && (
            <div className="p-4 rounded-xl bg-asphalt-950/60 border border-line-600 text-center text-xs text-fog-400 space-y-1">
              <span className="text-emerald-400 font-bold block">✓ Evaluación gestionada externamente con Google Forms</span>
              <span>El enlace de tu Google Form se incluirá automáticamente en la difusión por WhatsApp y en el portal de asistencia.</span>
            </div>
          )}

          <div className="space-y-4">
            {preguntas.map((p, pIdx) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-line-600 bg-asphalt-950/80 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-signal-amber">
                    PREGUNTA #{pIdx + 1}
                  </span>
                  {preguntas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePregunta(p.id)}
                      className="text-fog-400 hover:text-alert-red transition-colors p-1"
                      title="Eliminar pregunta"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required
                  placeholder="Escribe la pregunta aquí..."
                  value={p.pregunta}
                  onChange={(e) => updatePreguntaText(p.id, e.target.value)}
                  className="w-full bg-asphalt-900 border border-line-600 rounded-lg px-3 py-2 text-paper-50 text-sm font-semibold focus:border-signal-amber focus:outline-none"
                />

                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-mono text-fog-400 uppercase">
                    Opciones de Respuesta (Marca la correcta):
                  </div>
                  {p.opciones.map((op, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correcta_${p.id}`}
                        checked={p.respuestaCorrecta === oIdx}
                        onChange={() => updateRespuestaCorrecta(p.id, oIdx)}
                        className="accent-signal-amber cursor-pointer"
                        title="Marcar como respuesta correcta"
                      />
                      <input
                        type="text"
                        required
                        value={op}
                        onChange={(e) => updateOpcionText(p.id, oIdx, e.target.value)}
                        className={`flex-1 bg-asphalt-900 border rounded-lg px-3 py-1.5 text-xs text-paper-50 focus:outline-none ${
                          p.respuestaCorrecta === oIdx
                            ? "border-ok-green text-ok-green font-bold"
                            : "border-line-600"
                        }`}
                      />
                      {p.respuestaCorrecta === oIdx && (
                        <span className="text-[10px] font-mono font-bold text-ok-green px-2 py-0.5 rounded bg-ok-green/10 border border-ok-green/30">
                          CORRECTA
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* SECCIÓN 4: EVIDENCIAS OBLIGATORIAS */}
        <Card className="p-6 border-line-600 bg-asphalt-900 space-y-4">
          <div className="border-b border-line-600 pb-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 uppercase tracking-wide">
              04 · Evidencias Forenses Requeridas
            </h2>
            <p className="text-xs text-fog-400">
              Mecanismos de no-repudio para auditorías sin necesidad de fotos manuales en WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-line-600 bg-asphalt-950 cursor-pointer hover:border-signal-amber transition-colors">
              <input
                type="checkbox"
                checked={requiereSelfie}
                onChange={(e) => setRequiereSelfie(e.target.checked)}
                className="w-4 h-4 accent-signal-amber"
              />
              <div>
                <div className="text-xs font-bold text-paper-50 flex items-center gap-1.5">
                  <Camera size={14} className="text-radar-cyan" />
                  Foto Selfie Facial con Cámara
                </div>
                <div className="text-[11px] text-fog-400">
                  Valida biométricamente la presencia del conductor.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-line-600 bg-asphalt-950 cursor-pointer hover:border-signal-amber transition-colors">
              <input
                type="checkbox"
                checked={requiereFirma}
                onChange={(e) => setRequiereFirma(e.target.checked)}
                className="w-4 h-4 accent-signal-amber"
              />
              <div>
                <div className="text-xs font-bold text-paper-50 flex items-center gap-1.5">
                  <PenTool size={14} className="text-signal-amber" />
                  Firma Digital Táctil en Pantalla
                </div>
                <div className="text-[11px] text-fog-400">
                  Aceptación legal de la formación recibida.
                </div>
              </div>
            </label>
          </div>
        </Card>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/capacitaciones">
            <Button type="button" variant="outline" disabled={loading}>
              Cancelar
            </Button>
          </Link>
          <Button type="submit" variant="primary" disabled={loading} className="font-bold">
            <Save size={16} />
            {loading ? "Programando y Publicando..." : "Publicar Charla / Capacitación"}
          </Button>
        </div>
      </form>
    </div>
  );
}
