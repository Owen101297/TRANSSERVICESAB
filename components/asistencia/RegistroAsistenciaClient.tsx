"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  PenLine,
  RotateCcw,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

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
  instruccionesRegistro: string | null;
  declaracionAsistencia: string;
  permiteExternos: boolean;
  documentos: Array<{ id: string; codigo: string; nombre: string; version: string; tipo: string }>;
};

type Participant = {
  autenticado: boolean;
  id?: string;
  nombre?: string;
  documento?: string;
  perfiles?: string[];
  registro?: { registroCodigo: string | null; firmaAt: string | null } | null;
};

type PublicPayload = {
  success: boolean;
  estadoRegistro: "abierta" | "no_abierta" | "cerrada" | "cancelada";
  evento: PublicEvent;
  participante: Participant;
  error?: string;
};

type SuccessRecord = { codigo: string; nombre: string; fecha: string; actividad: string };

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signatureRef = useRef<SignaturePad | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/asistencia/publica/${encodeURIComponent(token)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No fue posible abrir la actividad.");
      setData(payload);
      if (!payload.participante.autenticado && payload.evento.permiteExternos) setParticipantType("externo");
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

  function clearSignature() {
    signatureRef.current?.clear();
    setHasSignature(false);
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
    try {
      const response = await fetch(`/api/asistencia/publica/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No fue posible registrar la asistencia.");
      setSuccess(result.registro);
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

  if (success) return <SuccessScreen record={success} />;

  const previousRegistration = data.participante.registro;
  if (previousRegistration) {
    return <SuccessScreen record={{ codigo: previousRegistration.registroCodigo || "Registro confirmado", nombre: data.participante.nombre || "Participante", fecha: previousRegistration.firmaAt || new Date().toISOString(), actividad: data.evento.nombre }} alreadyRegistered />;
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
          {event.materialUrl && <a href={event.materialUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"><ExternalLink size={16} /> Consultar material</a>}
          {event.instruccionesRegistro && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{event.instruccionesRegistro}</p>}
        </section>

        <form onSubmit={submit} className="space-y-7 px-5 py-6 sm:px-7">
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

          <section aria-labelledby="confirmation-title">
            <SectionHeading number="2" title="Confirmación" id="confirmation-title" />
            <div className="mt-3 space-y-3">
              <CheckRow checked={declarationAccepted} onChange={setDeclarationAccepted}>{event.declaracionAsistencia}</CheckRow>
              <CheckRow checked={privacyAccepted} onChange={setPrivacyAccepted}>Autorizo el tratamiento de mis datos y de mi firma para la evidencia interna de SG-SST, PESV, formación y auditoría.</CheckRow>
            </div>
          </section>

          <section aria-labelledby="signature-title">
            <div className="flex items-end justify-between gap-3"><SectionHeading number="3" title="Firma manuscrita obligatoria" id="signature-title" /><button type="button" onClick={clearSignature} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-sky-700 hover:bg-sky-50"><RotateCcw size={14} /> Limpiar</button></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Firma dentro del recuadro usando el dedo, lápiz táctil o puntero.</p>
            <div className={`mt-3 overflow-hidden rounded-2xl border-2 bg-white transition ${hasSignature ? "border-emerald-400" : "border-slate-300"}`}><canvas ref={canvasRef} className="block touch-none" aria-label="Área para firma manuscrita" /></div>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><PenLine size={14} /> {hasSignature ? "Firma capturada. Puedes limpiarla y repetirla." : "La firma todavía está vacía."}</p>
          </section>

          {error && <div role="alert" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800"><AlertCircle className="mt-0.5 shrink-0" size={18} />{error}</div>}

          <button type="submit" disabled={submitting || participantType === "vinculado" && !canUseLinked} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-base font-extrabold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-45">{submitting ? <><Loader2 size={19} className="animate-spin" /> Guardando asistencia…</> : <><CheckCircle2 size={19} /> Registrar asistencia</>}</button>
        </form>

        <footer className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-center text-[11px] leading-5 text-slate-500">Plataforma interna · La firma se asocia únicamente con esta actividad.</footer>
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
function SuccessScreen({ record, alreadyRegistered = false }: { record: SuccessRecord; alreadyRegistered?: boolean }) { return <main className="grid min-h-dvh place-items-center bg-slate-100 p-4"><div className="w-full max-w-lg rounded-[26px] border border-slate-200 bg-white p-7 text-center shadow-apple"><span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={34} /></span><p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">{alreadyRegistered ? "Registro existente" : "Registro confirmado"}</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{alreadyRegistered ? "Tu asistencia ya estaba registrada" : "Asistencia registrada correctamente"}</h1><div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm"><ReceiptRow label="Participante" value={record.nombre} /><ReceiptRow label="Actividad" value={record.actividad} /><ReceiptRow label="Fecha y hora" value={formatDate(record.fecha)} /><ReceiptRow label="Código" value={record.codigo} mono /></div><p className="mt-5 text-xs leading-5 text-slate-500">La firma quedó asociada exclusivamente con esta actividad.</p></div></main>; }
function ReceiptRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-0.5 font-bold text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</p></div>; }
