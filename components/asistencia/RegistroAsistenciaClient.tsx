"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Download,
  ImagePlus,
  Loader2,
  MapPin,
  PenLine,
  RotateCcw,
  Share2,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { generateEvidenceCollage } from "@/lib/client/event-evidence-collage";

type PublicEvent = {
  nombre: string;
  tipo: string;
  proceso: string;
  caracter: string;
  objetivo: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string;
  modalidad: string;
  lugar: string;
  responsableNombre: string;
  facilitadorNombre: string;
  facilitadorEmpresa: string | null;
  materialUrl: string | null;
  materialOrigen: "empresa" | "facilitador_externo" | "no_aplica";
  validacionTipo: "solo_asistencia" | "formulario_enviado" | "formulario_aprobado";
  formConnectorStatus: "no_aplica" | "pendiente" | "conectado" | "error";
  enlaceReunion: string | null;
  evidenciaTipo: "individual" | "general" | "ambas" | "no_aplica";
  notaMinima: number | null;
  instruccionesRegistro: string | null;
  declaracionAsistencia: string;
  permiteExternos: boolean;
  requiereFoto: boolean;
  driveDisponible: boolean;
  documentos: Array<{ id: string; codigo: string; nombre: string; version: string; tipo: string }>;
};

type Participant = {
  autenticado: boolean;
  id?: string;
  nombre?: string;
  documento?: string;
  perfiles?: string[];
  registro?: {
    registroCodigo: string | null;
    firmaAt: string | null;
    evidenciaCompleta: boolean;
    evidenciaToken: string | null;
  } | null;
};

type PublicPayload = {
  success: boolean;
  estadoRegistro: "abierta" | "no_abierta" | "cerrada" | "cancelada";
  evento: PublicEvent;
  participante: Participant;
  error?: string;
};

type SuccessRecord = { codigo: string; nombre: string; fecha: string; actividad: string };
type PendingEvidence = { record: SuccessRecord; token: string };
type FormValidation = { checked: boolean; completed: boolean; approved: boolean; status: string; score: number | null };

const TYPE_LABELS: Record<string, string> = {
  charla_informativa: "Charla informativa",
  charla_formativa: "Charla formativa",
  capacitacion: "Capacitación",
  induccion: "Inducción",
  reinduccion: "Reinducción",
  entrenamiento_practico: "Entrenamiento práctico",
  divulgacion: "Divulgación",
  reunion: "Reunión",
  comite: "Comité",
  simulacro: "Simulacro",
  actividad_operativa: "Actividad operativa",
  otro: "Actividad",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function maskedDocument(value?: string) {
  if (!value) return "Documento verificado";
  return `••••••${value.slice(-4)}`;
}

export default function RegistroAsistenciaClient({ token }: { token: string }) {
  const [data, setData] = useState<PublicPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantType, setParticipantType] = useState<"vinculado" | "externo">("vinculado");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [success, setSuccess] = useState<SuccessRecord | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence | null>(null);
  const [collageFile, setCollageFile] = useState<File | null>(null);
  const [collagePreview, setCollagePreview] = useState<string | null>(null);
  const [progress, setProgress] = useState("Guardando asistencia…");
  const [materialOpened, setMaterialOpened] = useState(false);
  const [checkingForm, setCheckingForm] = useState(false);
  const [formValidation, setFormValidation] = useState<FormValidation>({ checked: false, completed: false, approved: false, status: "pendiente", score: null });
  const formRef = useRef<HTMLFormElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signatureRef = useRef<SignaturePad | null>(null);
  const verificationInFlightRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/asistencia/publica/${encodeURIComponent(token)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No fue posible abrir la actividad.");
      setData(payload);
      if (!payload.participante.autenticado && payload.evento.permiteExternos) setParticipantType("externo");
      const stored = window.sessionStorage.getItem(`attendance:${token}:material-opened`);
      setMaterialOpened(stored === "true");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible abrir la actividad.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.estadoRegistro !== "abierta" || data.participante.registro) return;
    const signature = new SignaturePad(canvas, {
      minWidth: 1.2,
      maxWidth: 2.8,
      penColor: "#0f172a",
      backgroundColor: "rgb(255,255,255)",
    });
    signature.addEventListener("endStroke", () => setHasSignature(!signature.isEmpty()));
    signatureRef.current = signature;

    const resize = () => {
      if (!canvas.parentElement) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.parentElement.clientWidth;
      const height = 220;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext("2d")?.scale(ratio, ratio);
      signature.clear();
      setHasSignature(false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => {
      observer.disconnect();
      signature.off();
      signatureRef.current = null;
    };
  }, [data, participantType]);

  useEffect(() => {
    if (!selfie) {
      setSelfiePreview(null);
      return;
    }
    const url = URL.createObjectURL(selfie);
    setSelfiePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selfie]);

  useEffect(() => () => {
    if (collagePreview) URL.revokeObjectURL(collagePreview);
  }, [collagePreview]);

  function clearSignature() {
    signatureRef.current?.clear();
    setHasSignature(false);
  }

  function openExternalLink(url: string) {
    setMaterialOpened(true);
    window.sessionStorage.setItem(`attendance:${token}:material-opened`, "true");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const verifyGoogleForm = useCallback(async () => {
    if (!data) return;
    if (verificationInFlightRef.current) return;
    const formData = formRef.current ? new FormData(formRef.current) : null;
    const personaDocumento = participantType === "externo" ? formData?.get("personaDocumento") : null;
    verificationInFlightRef.current = true;
    setCheckingForm(true);
    setError(null);
    try {
      const response = await fetch(`/api/asistencia/publica/${encodeURIComponent(token)}/validacion-formulario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaDocumento, tipoParticipante: participantType }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No fue posible verificar Google Forms.");
      setFormValidation({
        checked: true,
        completed: payload.completada === true,
        approved: payload.aprobada === true,
        status: payload.estado || "pendiente",
        score: typeof payload.calificacion === "number" ? payload.calificacion : null,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible verificar Google Forms.");
    } finally {
      verificationInFlightRef.current = false;
      setCheckingForm(false);
    }
  }, [data, participantType, token]);

  useEffect(() => {
    if (!data || data.evento.validacionTipo === "solo_asistencia" || !materialOpened || formValidation.completed) return;
    const verifyWhenVisible = () => {
      if (document.visibilityState === "visible") void verifyGoogleForm();
    };
    document.addEventListener("visibilitychange", verifyWhenVisible);
    window.addEventListener("focus", verifyWhenVisible);
    return () => {
      document.removeEventListener("visibilitychange", verifyWhenVisible);
      window.removeEventListener("focus", verifyWhenVisible);
    };
  }, [data, formValidation.completed, materialOpened, verifyGoogleForm]);

  async function saveRemoteEvidence(record: SuccessRecord, evidenceToken: string, selectedSelfie: File) {
    if (!data) throw new Error("No fue posible recuperar la información de la actividad.");
    setProgress("Preparando collage uniforme…");
    const collage = await generateEvidenceCollage({
      selfie: selectedSelfie,
      materialPreviewUrl: data.evento.materialUrl
        ? `/api/asistencia/publica/${encodeURIComponent(token)}/material-preview`
        : null,
      materialUrl: data.evento.materialUrl,
      eventName: data.evento.nombre,
      eventType: TYPE_LABELS[data.evento.tipo] || "Actividad",
      participantName: record.nombre,
      registeredAt: record.fecha,
      registrationCode: record.codigo,
    });
    setProgress("Archivando evidencia en Google Drive…");
    const formData = new FormData();
    formData.set("evidenciaToken", evidenceToken);
    formData.set("archivo", collage);
    const response = await fetch(`/api/asistencia/publica/${encodeURIComponent(token)}/evidencia`, {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No fue posible archivar la evidencia.");
    if (collagePreview) URL.revokeObjectURL(collagePreview);
    setCollageFile(collage);
    setCollagePreview(URL.createObjectURL(collage));
    setPendingEvidence(null);
    setSuccess(record);
  }

  async function retryRemoteEvidence(selectedSelfie: File) {
    if (!pendingEvidence) return;
    setSubmitting(true);
    setError(null);
    try {
      await saveRemoteEvidence(pendingEvidence.record, pendingEvidence.token, selectedSelfie);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible archivar la evidencia.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError("Firma dentro del recuadro antes de registrar tu asistencia.");
      return;
    }
    if (!declarationAccepted || !privacyAccepted) {
      setError("Confirma la declaración de asistencia y el tratamiento de datos.");
      return;
    }
    if (data?.evento.materialOrigen === "empresa" && data.evento.validacionTipo !== "solo_asistencia" && !formValidation.completed) {
      setError("Completa el Google Forms y pulsa “Verificar respuesta” antes de firmar.");
      return;
    }
    if (data?.evento.requiereFoto && !data.evento.driveDisponible) {
      setError("La cuenta documental de Google Drive aún no está conectada. Comunícate con el administrador.");
      return;
    }
    if (data?.evento.requiereFoto && !selfie) {
      setError("Toma o selecciona una selfie para preparar la evidencia remota.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      tipoParticipante: participantType,
      tipoDocumento: form.get("tipoDocumento"),
      personaDocumento: form.get("personaDocumento"),
      nombres: form.get("nombres"),
      apellidos: form.get("apellidos"),
      empresa: form.get("empresa"),
      cargo: form.get("cargo"),
      declaracionAceptada: declarationAccepted,
      tratamientoDatosAceptado: privacyAccepted,
      firmaUrl: signatureRef.current.toDataURL("image/png"),
    };

    setSubmitting(true);
    setProgress("Guardando asistencia firmada…");
    try {
      const response = await fetch(`/api/asistencia/publica/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No fue posible registrar la asistencia.");
      if (data?.evento.requiereFoto) {
        if (!result.evidenciaToken || !selfie) throw new Error("No fue posible autorizar el archivo de la evidencia.");
        setPendingEvidence({ record: result.registro, token: result.evidenciaToken });
        await saveRemoteEvidence(result.registro, result.evidenciaToken, selfie);
      } else {
        setSuccess(result.registro);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible registrar la asistencia.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="grid min-h-dvh place-items-center bg-slate-100 p-6"><div className="flex items-center gap-3 text-sm font-semibold text-slate-600"><Loader2 className="animate-spin text-sky-600" size={22} /> Cargando actividad…</div></main>;
  }

  if (!data || error && !data) {
    return <StateScreen icon={<AlertCircle size={28} />} title="No pudimos abrir el registro" description={error || "Verifica el enlace e intenta nuevamente."} tone="error" />;
  }

  if (success) return <SuccessScreen record={success} collageFile={collageFile} collagePreview={collagePreview} />;

  if (pendingEvidence) {
    return <EvidenceCompletionScreen event={data.evento} record={pendingEvidence.record} busy={submitting} error={error} progress={progress} initialFile={selfie} onSubmit={retryRemoteEvidence} />;
  }

  const previousRegistration = data.participante.registro;
  if (previousRegistration) {
    const record = { codigo: previousRegistration.registroCodigo || "Registro confirmado", nombre: data.participante.nombre || "Participante", fecha: previousRegistration.firmaAt || new Date().toISOString(), actividad: data.evento.nombre };
    if (data.evento.requiereFoto && !previousRegistration.evidenciaCompleta && previousRegistration.evidenciaToken) {
      return <EvidenceCompletionScreen event={data.evento} record={record} busy={submitting} error={error} progress={progress} onSubmit={async (file) => {
        setPendingEvidence({ record, token: previousRegistration.evidenciaToken as string });
        setSelfie(file);
        setSubmitting(true);
        setError(null);
        try { await saveRemoteEvidence(record, previousRegistration.evidenciaToken as string, file); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible archivar la evidencia."); }
        finally { setSubmitting(false); }
      }} />;
    }
    return <SuccessScreen record={record} alreadyRegistered />;
  }

  if (data.estadoRegistro !== "abierta") {
    const states = {
      no_abierta: ["El registro aún no está abierto", "El responsable habilitará el enlace al iniciar la actividad."],
      cerrada: ["El registro está cerrado", "Comunícate con el responsable si necesitas reportar una novedad."],
      cancelada: ["La actividad fue cancelada", "No es posible registrar asistencia en esta actividad."],
    } as const;
    const [title, description] = states[data.estadoRegistro];
    return <StateScreen icon={<Clock3 size={28} />} title={title} description={description} eventName={data.evento.nombre} />;
  }

  const event = data.evento;
  const callbackUrl = `/asistir/${encodeURIComponent(token)}`;
  const canUseLinked = data.participante.autenticado;
  const hasMaterialStep = event.materialOrigen !== "no_aplica" || Boolean(event.enlaceReunion);
  const evidenceStep = hasMaterialStep ? "3" : "2";
  const confirmationStep = String(Number(evidenceStep) + (event.requiereFoto ? 1 : 0));
  const signatureStep = String(Number(confirmationStep) + 1);

  return (
    <main className="min-h-dvh bg-slate-100 px-3 py-4 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-[680px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.38)]">
        <header className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-400 text-slate-950"><ShieldCheck size={24} /></span>
            <div>
              <p className="text-sm font-extrabold tracking-tight">TRANS SERVICES A&amp;B</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Registro de asistencia</p>
            </div>
          </div>
        </header>

        <section className="border-b border-slate-200 px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">{TYPE_LABELS[event.tipo] || "Actividad"}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold capitalize text-slate-700">{event.modalidad}</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]">{event.nombre}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{event.objetivo}</p>
          <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <Meta icon={CalendarDays} text={formatDate(event.fechaInicio)} />
            <Meta icon={MapPin} text={event.lugar} />
            <Meta icon={UserRound} text={`Responsable: ${event.responsableNombre}`} />
            <Meta icon={UsersRound} text={`Facilitador: ${event.facilitadorNombre}`} />
          </div>
          {event.documentos.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{event.documentos.map((document) => <span key={document.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-600"><FileText size={13} />{document.codigo} · v{document.version}</span>)}</div>}
          {event.instruccionesRegistro && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{event.instruccionesRegistro}</p>}
        </section>

        <form ref={formRef} onSubmit={submit} className="space-y-7 px-5 py-6 sm:px-7">
          <section aria-labelledby="identity-title">
            <SectionHeading number="1" title="Identificación" id="identity-title" />
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Tipo de participante">
              <TypeButton active={participantType === "vinculado"} onClick={() => setParticipantType("vinculado")} icon={UserRound}>Personal vinculado</TypeButton>
              <TypeButton active={participantType === "externo"} onClick={() => setParticipantType("externo")} icon={Building2} disabled={!event.permiteExternos}>Persona externa</TypeButton>
            </div>

            {participantType === "vinculado" ? (
              canUseLinked ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><Check size={20} /></span><div><p className="font-bold text-slate-950">{data.participante.nombre}</p><p className="mt-0.5 text-sm text-slate-600">{maskedDocument(data.participante.documento)} · Identidad verificada</p></div></div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-sm leading-6 text-slate-700">Ingresa con tu cuenta para proteger la identidad asociada a la firma.</p>
                  <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200">Ingresar y continuar <ArrowRight size={16} /></Link>
                </div>
              )
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Tipo de documento" htmlFor="tipoDocumento"><select id="tipoDocumento" name="tipoDocumento" className="field" defaultValue="CC"><option>CC</option><option>CE</option><option>PA</option><option>TI</option><option>PEP</option><option>NIT</option><option>OTRO</option></select></Field>
                <Field label="Número de documento" htmlFor="personaDocumento"><input id="personaDocumento" name="personaDocumento" className="field" inputMode="numeric" autoComplete="off" required minLength={4} maxLength={40} /></Field>
                <Field label="Nombres" htmlFor="nombres"><input id="nombres" name="nombres" className="field" autoComplete="given-name" required maxLength={90} /></Field>
                <Field label="Apellidos" htmlFor="apellidos"><input id="apellidos" name="apellidos" className="field" autoComplete="family-name" required maxLength={90} /></Field>
                <Field label="Empresa o procedencia" htmlFor="empresa"><input id="empresa" name="empresa" className="field" required maxLength={180} /></Field>
                <Field label="Cargo o relación" htmlFor="cargo"><input id="cargo" name="cargo" className="field" required maxLength={120} placeholder="Ej. Capacitador externo" /></Field>
              </div>
            )}
          </section>

          {hasMaterialStep && (
            <section aria-labelledby="material-title">
              <SectionHeading number="2" title={event.materialOrigen === "facilitador_externo" ? "Acceso a la actividad" : "Material y validación"} id="material-title" />
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {event.materialOrigen === "empresa" ? <><p className="text-sm font-bold text-slate-950">Material administrado por TRANS SERVICES A&amp;B</p><p className="mt-1 text-xs leading-5 text-slate-600">Abre Google Forms en una pestaña nueva, revisa el contenido y envía la respuesta usando el mismo documento.</p></> : event.materialOrigen === "facilitador_externo" ? <><p className="text-sm font-bold text-slate-950">Actividad dirigida por un facilitador externo</p><p className="mt-1 text-xs leading-5 text-slate-600">El facilitador gestiona su presentación y la reunión. Aquí registras la misma asistencia y evidencia definida por la empresa.</p></> : <p className="text-sm font-bold text-slate-950">Acceso a la sesión en vivo</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.enlaceReunion && <button type="button" onClick={() => openExternalLink(event.enlaceReunion as string)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-bold text-white"><ExternalLink size={16} /> Entrar a la reunión</button>}
                  {event.materialUrl && <button type="button" onClick={() => openExternalLink(event.materialUrl as string)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200 bg-white px-3.5 text-sm font-bold text-sky-800"><ExternalLink size={16} /> {event.materialOrigen === "empresa" ? "Abrir Google Forms" : "Abrir material"}</button>}
                  {event.materialOrigen === "empresa" && event.validacionTipo !== "solo_asistencia" && <button type="button" onClick={() => void verifyGoogleForm()} disabled={checkingForm || !materialOpened} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-600 px-3.5 text-sm font-bold text-white disabled:opacity-45">{checkingForm ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {checkingForm ? "Buscando respuesta…" : "Verificar respuesta"}</button>}
                </div>
                {event.materialOrigen === "empresa" && event.validacionTipo !== "solo_asistencia" && event.formConnectorStatus !== "conectado" && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">La sincronización del formulario está pendiente de revisión administrativa. Tu respuesta permanece guardada en Google Forms.</div>}
                {event.materialOrigen === "empresa" && event.validacionTipo !== "solo_asistencia" && formValidation.checked && <div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${formValidation.completed ? formValidation.status === "no_aprobado" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{formValidation.completed ? formValidation.status === "no_aprobado" ? `Respuesta encontrada${formValidation.score !== null ? ` · ${formValidation.score}%` : ""}. Puedes registrar la asistencia y repetir la evaluación para completar la actividad.` : `Respuesta verificada${formValidation.score !== null ? ` · ${formValidation.score}%` : ""}.` : "Todavía no encontramos una respuesta con este documento. Envíala en Google Forms y vuelve a verificar."}</div>}
              </div>
            </section>
          )}

          {event.requiereFoto && (
            <section aria-labelledby="evidence-title">
              <SectionHeading number={evidenceStep} title="Evidencia individual" id="evidence-title" />
              <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm"><Camera size={20} /></span>
                  <div>
                    <p className="text-sm font-bold text-slate-950">Toma una fotografía individual de la participación</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">La foto original permanece en este dispositivo. El sistema crea un collage ordenado y archiva únicamente ese resultado en Google Drive.</p>
                  </div>
                </div>
              </div>
              {!event.driveDisponible && <div role="alert" className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">El archivo documental aún no está disponible. El administrador debe conectar Google Drive antes de recibir evidencias remotas.</div>}
              <label className="mt-3 block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-sky-400 hover:bg-sky-50/40 focus-within:ring-4 focus-within:ring-sky-100">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  className="sr-only"
                  onChange={(changeEvent) => {
                    const file = changeEvent.target.files?.[0] || null;
                    if (file && file.size > 8 * 1024 * 1024) {
                      setError("La selfie supera 8 MB. Toma una fotografía con menor resolución.");
                      changeEvent.target.value = "";
                      return;
                    }
                    setError(null);
                    setSelfie(file);
                  }}
                />
                {selfiePreview ? (
                  <div className="grid gap-4 sm:grid-cols-[150px_1fr] sm:items-center">
                    <img src={selfiePreview} alt="Vista previa de la selfie" className="aspect-square w-full rounded-xl object-cover sm:w-[150px]" />
                    <div><p className="font-bold text-slate-950">Selfie lista</p><p className="mt-1 text-sm leading-6 text-slate-600">Verifica que tu rostro sea visible y que la imagen corresponda a esta actividad.</p><span className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-sky-700"><RotateCcw size={16} /> Tocar para repetir</span></div>
                  </div>
                ) : (
                  <span className="flex min-h-24 flex-col items-center justify-center text-center"><ImagePlus size={28} className="text-sky-700" /><span className="mt-2 text-sm font-bold text-slate-900">Tomar selfie o seleccionar foto</span><span className="mt-1 text-xs text-slate-500">JPG, PNG o WEBP · máximo 8 MB</span></span>
                )}
              </label>
            </section>
          )}

          <section aria-labelledby="confirmation-title">
            <SectionHeading number={confirmationStep} title="Confirmación" id="confirmation-title" />
            <div className="mt-3 space-y-3">
              <CheckRow checked={declarationAccepted} onChange={setDeclarationAccepted}>{event.declaracionAsistencia}</CheckRow>
              <CheckRow checked={privacyAccepted} onChange={setPrivacyAccepted}>Autorizo el tratamiento de mis datos y de mi firma para la evidencia interna de SG-SST, PESV, formación y auditoría.</CheckRow>
            </div>
          </section>

          <section aria-labelledby="signature-title">
            <div className="flex items-end justify-between gap-3"><SectionHeading number={signatureStep} title="Firma manuscrita obligatoria" id="signature-title" /><button type="button" onClick={clearSignature} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-sky-700 hover:bg-sky-50"><RotateCcw size={14} /> Limpiar</button></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Firma dentro del recuadro usando el dedo, lápiz táctil o puntero.</p>
            <div className={`mt-3 overflow-hidden rounded-2xl border-2 bg-white transition ${hasSignature ? "border-emerald-400" : "border-slate-300"}`}><canvas ref={canvasRef} className="block touch-none" aria-label="Área para firma manuscrita" /></div>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><PenLine size={14} /> {hasSignature ? "Firma capturada. Puedes limpiarla y repetirla." : "La firma todavía está vacía."}</p>
          </section>

          {error && <div role="alert" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"><AlertCircle className="mt-0.5 shrink-0" size={18} />{error}</div>}

          <button type="submit" disabled={submitting || participantType === "vinculado" && !canUseLinked || event.requiereFoto && !event.driveDisponible} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-base font-extrabold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-45">{submitting ? <><Loader2 size={19} className="animate-spin" /> {progress}</> : <><CheckCircle2 size={19} /> {event.requiereFoto ? "Firmar y preparar evidencia" : "Registrar asistencia"}</>}</button>
        </form>

        <footer className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-center text-[11px] leading-5 text-slate-500">Plataforma interna · La firma y la evidencia se asocian únicamente con esta actividad.</footer>
      </div>
      <style jsx global>{`.field{min-height:48px;width:100%;border:1px solid rgb(203 213 225);border-radius:12px;background:white;padding:10px 12px;font-size:16px;color:rgb(15 23 42);outline:none}.field:focus{border-color:rgb(2 132 199);box-shadow:0 0 0 4px rgb(224 242 254)}`}</style>
    </main>
  );
}

function Meta({ icon: Icon, text }: { icon: React.ElementType; text: string }) { return <div className="flex items-start gap-2"><Icon size={17} className="mt-0.5 shrink-0 text-sky-700" /><span className="leading-5 first-letter:uppercase">{text}</span></div>; }
function SectionHeading({ number, title, id }: { number: string; title: string; id: string }) { return <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-slate-950 font-mono text-xs font-bold text-white">{number}</span><h2 id={id} className="text-base font-extrabold text-slate-950">{title}</h2></div>; }
function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) { return <div><label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>{children}</div>; }
function TypeButton({ active, onClick, icon: Icon, disabled, children }: { active: boolean; onClick: () => void; icon: React.ElementType; disabled?: boolean; children: React.ReactNode }) { return <button type="button" role="tab" aria-selected={active} onClick={onClick} disabled={disabled} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition disabled:opacity-40 ${active ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}><Icon size={17} />{children}</button>; }
function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) { return <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700 transition hover:border-slate-300"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-5 shrink-0 accent-sky-600" /><span>{children}</span></label>; }

function StateScreen({ icon, title, description, eventName, tone = "neutral" }: { icon: React.ReactNode; title: string; description: string; eventName?: string; tone?: "neutral" | "error" }) { return <main className="grid min-h-dvh place-items-center bg-slate-100 p-4"><div className="w-full max-w-lg rounded-[26px] border border-slate-200 bg-white p-7 text-center shadow-apple"><span className={`mx-auto grid size-14 place-items-center rounded-2xl ${tone === "error" ? "bg-rose-100 text-rose-700" : "bg-sky-100 text-sky-700"}`}>{icon}</span>{eventName && <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{eventName}</p>}<h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{description}</p></div></main>; }

function EvidenceCompletionScreen({
  event,
  record,
  busy,
  error,
  progress,
  initialFile = null,
  onSubmit,
}: {
  event: PublicEvent;
  record: SuccessRecord;
  busy: boolean;
  error: string | null;
  progress: string;
  initialFile?: File | null;
  onSubmit: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <main className="min-h-dvh bg-slate-100 p-4 sm:p-7">
      <div className="mx-auto w-full max-w-xl rounded-[26px] border border-slate-200 bg-white p-6 shadow-apple sm:p-8">
        <span className="grid size-14 place-items-center rounded-2xl bg-sky-100 text-sky-700"><Camera size={28} /></span>
        <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Asistencia firmada · Falta la evidencia</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Completa el archivo de la actividad</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Tu asistencia ya quedó registrada con el código <strong className="font-mono text-slate-900">{record.codigo}</strong>. Toma una selfie para crear y archivar el collage.</p>
        {event.materialUrl && <a href={event.materialUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 text-sm font-bold text-sky-800"><ExternalLink size={16} /> Revisar material</a>}
        <label className="mt-5 block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 focus-within:ring-4 focus-within:ring-sky-100">
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" onChange={(changeEvent) => setFile(changeEvent.target.files?.[0] || null)} />
          {preview ? <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center"><img src={preview} alt="Vista previa de la selfie" className="aspect-square w-full rounded-xl object-cover sm:w-40" /><div><p className="font-bold text-slate-950">Fotografía lista</p><p className="mt-1 text-sm text-slate-600">Toca aquí si deseas repetirla.</p></div></div> : <span className="flex min-h-36 flex-col items-center justify-center text-center"><ImagePlus size={30} className="text-sky-700" /><span className="mt-2 text-sm font-bold text-slate-900">Tomar selfie o seleccionar foto</span></span>}
        </label>
        {error && <div role="alert" className="mt-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"><AlertCircle className="mt-0.5 shrink-0" size={18} />{error}</div>}
        <button type="button" disabled={!file || busy || !event.driveDisponible} onClick={() => file && void onSubmit(file)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45">{busy ? <><Loader2 size={18} className="animate-spin" /> {progress}</> : <><CheckCircle2 size={18} /> Crear y guardar evidencia</>}</button>
        <p className="mt-3 text-center text-xs leading-5 text-slate-500">La selfie original no se sube por separado. Solo se archiva el collage final en Google Drive.</p>
      </div>
    </main>
  );
}

function SuccessScreen({ record, alreadyRegistered = false, collageFile, collagePreview }: { record: SuccessRecord; alreadyRegistered?: boolean; collageFile?: File | null; collagePreview?: string | null }) {
  function downloadCollage() {
    if (!collageFile || !collagePreview) return;
    const anchor = document.createElement("a");
    anchor.href = collagePreview;
    anchor.download = collageFile.name;
    anchor.click();
  }

  async function shareCollage() {
    if (!collageFile) return;
    const message = `Evidencia de asistencia: ${record.actividad}\nCódigo: ${record.codigo}`;
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [collageFile] }))) {
      try {
        await navigator.share({ title: "Evidencia de asistencia", text: message, files: [collageFile] });
        return;
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
      }
    }
    downloadCollage();
    window.open(`https://wa.me/?text=${encodeURIComponent(`${message}\nAdjunta el collage descargado a este mensaje.`)}`, "_blank", "noopener,noreferrer");
  }

  return <main className="grid min-h-dvh place-items-center bg-slate-100 p-4"><div className="w-full max-w-lg rounded-[26px] border border-slate-200 bg-white p-7 text-center shadow-apple"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={34} /></span><p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">{alreadyRegistered ? "Registro existente" : "Registro confirmado"}</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{alreadyRegistered ? "Tu asistencia ya estaba registrada" : "Asistencia registrada correctamente"}</h1>{collagePreview && <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2"><img src={collagePreview} alt="Collage final de evidencia" className="w-full rounded-xl" /></div>}<div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm"><ReceiptRow label="Participante" value={record.nombre} /><ReceiptRow label="Actividad" value={record.actividad} /><ReceiptRow label="Fecha y hora" value={formatDate(record.fecha)} /><ReceiptRow label="Código" value={record.codigo} mono /></div>{collageFile && <div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void shareCollage()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"><Share2 size={17} /> Compartir por WhatsApp</button><button type="button" onClick={downloadCollage} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800"><Download size={17} /> Descargar collage</button></div>}<p className="mt-5 text-xs leading-5 text-slate-500">{collageFile ? "El collage quedó archivado en Google Drive. Al compartir, selecciona WhatsApp y el grupo de la empresa." : "La firma quedó asociada exclusivamente con esta actividad."}</p></div></main>;
}
function ReceiptRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-0.5 font-bold text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</p></div>; }
