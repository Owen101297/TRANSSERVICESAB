"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Download,
  Loader2,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Square,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { HseqSubNav } from "@/components/layout/HseqSubNav";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { generateEventoAsistenciaPDF } from "@/lib/utils/pdfEventoAsistenciaGenerator";

type Resumen = { total: number; obligatorios: number; asistenciaValida: number; pendientes: number };
type Documento = { id: string; codigo: string; nombre: string; version: string; estadoDatos: string };
type EventoLista = {
  id: string;
  consecutivo: string;
  nombre: string;
  tipo: string;
  proceso: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  lugar: string;
  responsableNombre: string;
  facilitadorNombre: string;
  documentos: Documento[];
  resumen: Resumen;
};
type Participante = {
  id: string;
  personaNombre: string;
  personaDocumento?: string | null;
  tipoPersona: string;
  tipoConvocatoria: string;
  condicionLaboral: string;
  resultadoPreliminar: string;
  resultadoDefinitivo?: string | null;
  horaEntrada?: string | null;
  horaSalida?: string | null;
  observaciones?: string | null;
};
type EventoDetalle = EventoLista & {
  objetivo: string;
  caracter: string;
  modalidad: string;
  requiereSalida: boolean;
  requiereFirma: boolean;
  requiereFoto: boolean;
  requiereEvaluacion: boolean;
  revision?: number;
  participantes: Participante[];
  documentos: Documento[];
};
type Persona = {
  id: string;
  nombres: string;
  apellidos: string;
  numeroDocumento: string;
  perfiles: string[];
  estado: string;
  contratistaNombre?: string | null;
};

const TIPO_LABELS: Record<string, string> = {
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
  campana: "Campaña",
  actividad_pesv: "Actividad PESV",
  otro: "Otro",
};

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  pendiente_aprobacion: "Pendiente de aprobación",
  programado: "Programado",
  en_curso: "En curso",
  pendiente_revision: "Pendiente de revisión",
  cerrado: "Cerrado",
  cancelado: "Cancelado",
};

const RESULTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  presente: "Presente",
  tardanza: "Llegada tarde",
  participacion_parcial: "Participación parcial",
  ausencia_justificada: "Ausencia justificada",
  ausencia_no_justificada: "Ausencia no justificada",
  no_aplica: "No aplicaba",
  anulado: "Anulado",
};

function toLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  });
}

function statusClass(estado: string) {
  if (estado === "cerrado") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (estado === "en_curso") return "bg-sky-50 text-sky-700 border-sky-200";
  if (estado === "pendiente_revision" || estado === "pendiente_aprobacion") return "bg-amber-50 text-amber-700 border-amber-200";
  if (estado === "cancelado") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export function EventosAsistenciaClient({ sessionRole }: { sessionRole: string }) {
  const [eventos, setEventos] = useState<EventoLista[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<EventoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const isAdmin = sessionRole === "administrativo" || sessionRole === "hseq";

  const loadEventos = useCallback(async () => {
    const res = await fetch("/api/eventos-asistencia", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No fue posible consultar los eventos.");
    setEventos(data.eventos || []);
  }, []);

  const loadDetalle = useCallback(async (id: string) => {
    const res = await fetch(`/api/eventos-asistencia/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No fue posible consultar el expediente.");
    setDetalle(data.evento);
  }, []);

  useEffect(() => {
    Promise.all([
      loadEventos(),
      fetch("/api/eventos-asistencia/recursos", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => setPersonas(data.personas || [])),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadEventos]);

  useEffect(() => {
    if (!selectedId) return;
    loadDetalle(selectedId).catch((err) => setError(err.message));
  }, [selectedId, loadDetalle]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return eventos;
    return eventos.filter((e) =>
      [e.nombre, e.consecutivo, e.tipo, e.proceso, e.responsableNombre]
        .some((value) => value?.toLowerCase().includes(query))
    );
  }, [eventos, search]);

  const filteredPeople = useMemo(() => {
    const query = peopleSearch.trim().toLowerCase();
    return personas.filter((p) =>
      !query || `${p.nombres} ${p.apellidos} ${p.numeroDocumento} ${p.perfiles.join(" ")}`.toLowerCase().includes(query)
    );
  }, [personas, peopleSearch]);

  const stats = useMemo(() => ({
    total: eventos.length,
    enCurso: eventos.filter((e) => e.estado === "en_curso").length,
    revision: eventos.filter((e) => e.estado === "pendiente_revision" || e.estado === "pendiente_aprobacion").length,
    pendientes: eventos.reduce((sum, e) => sum + e.resumen.pendientes, 0),
  }), [eventos]);

  async function createEvento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const tipo = String(form.get("tipo"));
    const formativos = ["charla_formativa", "capacitacion", "induccion", "reinduccion", "entrenamiento_practico"];
    const body = {
      nombre: form.get("nombre"),
      tipo,
      caracter: formativos.includes(tipo) ? "formativo" : "informativo",
      proceso: form.get("proceso"),
      objetivo: form.get("objetivo"),
      descripcion: form.get("descripcion"),
      fechaInicio: form.get("fechaInicio"),
      fechaFin: form.get("fechaFin"),
      modalidad: form.get("modalidad"),
      lugar: form.get("lugar"),
      proyecto: form.get("proyecto"),
      responsableNombre: form.get("responsableNombre"),
      facilitadorNombre: form.get("facilitadorNombre"),
      facilitadorTipo: form.get("facilitadorTipo"),
      facilitadorEmpresa: form.get("facilitadorEmpresa"),
      toleranciaMinutos: Number(form.get("toleranciaMinutos")),
      permanenciaMinima: Number(form.get("permanenciaMinima")),
      requiereSalida: form.get("requiereSalida") === "on",
      requiereFirma: form.get("requiereFirma") === "on",
      requiereFoto: form.get("requiereFoto") === "on",
      requiereEvaluacion: form.get("requiereEvaluacion") === "on",
      notaMinima: Number(form.get("notaMinima")),
      materialUrl: form.get("materialUrl"),
      contenido: form.get("contenido"),
      personaIds: selectedPeople,
    };
    try {
      const res = await fetch("/api/eventos-asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible crear el evento.");
      setShowCreate(false);
      setSelectedPeople([]);
      await loadEventos();
      setSelectedId(data.evento.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el evento.");
    } finally {
      setBusy(false);
    }
  }

  async function changeState(estado: string) {
    if (!detalle) return;
    let extra: Record<string, unknown> = {};
    if (detalle.estado === "cerrado" && estado === "pendiente_revision") {
      const motivo = window.prompt("Motivo obligatorio de reapertura:");
      if (!motivo) return;
      extra = { motivo };
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/eventos-asistencia/${detalle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible cambiar el estado.");
      await Promise.all([loadEventos(), loadDetalle(detalle.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cambiar el estado.");
    } finally {
      setBusy(false);
    }
  }

  async function updateParticipant(participanteId: string, action: "entrada" | "salida" | "conciliar", resultadoDefinitivo?: string) {
    if (!detalle) return;
    let observaciones: string | null = null;
    if (action === "conciliar" && ["ausencia_justificada", "no_aplica", "anulado"].includes(resultadoDefinitivo || "")) {
      observaciones = window.prompt("Motivo u observación obligatoria:");
      if (!observaciones) return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/eventos-asistencia/${detalle.id}/participantes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participanteId, action, resultadoDefinitivo, observaciones }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible actualizar el registro.");
      await Promise.all([loadEventos(), loadDetalle(detalle.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar el registro.");
    } finally {
      setBusy(false);
    }
  }

  async function reconcileObvious() {
    if (!detalle) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/eventos-asistencia/${detalle.id}/participantes`, { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible conciliar los registros.");
      await Promise.all([loadEventos(), loadDetalle(detalle.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible conciliar los registros.");
    } finally {
      setBusy(false);
    }
  }

  async function addExternal() {
    if (!detalle) return;
    const personaNombre = window.prompt("Nombre completo del participante externo:");
    if (!personaNombre) return;
    const personaDocumento = window.prompt("Documento (opcional):") || undefined;
    const empresa = window.prompt("Empresa (opcional):") || undefined;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/eventos-asistencia/${detalle.id}/participantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaNombre, personaDocumento, empresa, tipoPersona: "externo", tipoConvocatoria: "invitado" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible agregar el participante.");
      await Promise.all([loadEventos(), loadDetalle(detalle.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible agregar el participante.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-500" /></div>;
  }

  return (
    <div className="space-y-5 pb-12">
      <HseqSubNav activeTab="eventos" />

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-600">Sistema de Gestión · PESV</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Eventos y asistencia</h1>
          <p className="mt-1 text-sm text-slate-500">Convocatoria, registro, conciliación y expediente documental.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Nuevo evento</Button>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <span className="flex gap-2"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{error}</span>
          <button onClick={() => setError(null)} aria-label="Cerrar"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard compact label="Eventos" value={stats.total} icon={CalendarDays} />
        <StatCard compact label="En curso" value={stats.enCurso} icon={Play} accent="cyan" />
        <StatCard compact label="Por revisar" value={stats.revision} icon={ClipboardCheck} accent="amber" />
        <StatCard compact label="Personas pendientes" value={stats.pendientes} icon={Users} accent={stats.pendientes ? "red" : "green"} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1 max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por evento, código, proceso o responsable" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
          </div>
          <span className="text-xs font-medium text-slate-500">{filtered.length} expedientes</span>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No hay eventos que coincidan con la búsqueda.</div>
          ) : filtered.map((evento) => (
            <button key={evento.id} onClick={() => setSelectedId(evento.id)} className="grid w-full gap-3 py-3 text-left transition hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-500">{evento.consecutivo}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(evento.estado)}`}>{ESTADO_LABELS[evento.estado] || evento.estado}</span>
                </div>
                <p className="mt-1 truncate text-sm font-bold text-slate-900">{evento.nombre}</p>
                <p className="mt-0.5 text-xs text-slate-500">{TIPO_LABELS[evento.tipo] || evento.tipo} · {formatDate(evento.fechaInicio)} · {evento.lugar}</p>
              </div>
              <div className="text-xs text-slate-600 sm:text-right">
                <p className="font-bold text-slate-900">{evento.resumen.asistenciaValida}/{evento.resumen.obligatorios}</p>
                <p>asistencia válida</p>
              </div>
              <ChevronRight size={17} className="hidden text-slate-400 sm:block" />
            </button>
          ))}
        </div>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <form onSubmit={createEvento} className="mx-auto max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div><h2 className="text-lg font-extrabold text-slate-950">Nuevo expediente de evento</h2><p className="text-xs text-slate-500">Se guardará inicialmente como borrador.</p></div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr_.8fr]">
              <div className="space-y-5">
                <FormSection title="Información del evento">
                  <Field label="Tipo de evento"><select name="tipo" required className="input"><option value="">Seleccionar</option>{Object.entries(TIPO_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                  <Field label="Proceso"><select name="proceso" defaultValue="hseq" className="input"><option value="hseq">HSEQ</option><option value="pesv">PESV</option><option value="sg-sst">SG-SST</option><option value="otro">Otro</option></select></Field>
                  <Field label="Nombre o tema" wide><input name="nombre" required maxLength={180} className="input" /></Field>
                  <Field label="Objetivo" wide><textarea name="objetivo" required rows={3} className="input" /></Field>
                  <Field label="Inicio"><input name="fechaInicio" type="datetime-local" required defaultValue={toLocalInput(new Date(Date.now() + 3600000))} className="input" /></Field>
                  <Field label="Finalización"><input name="fechaFin" type="datetime-local" required defaultValue={toLocalInput(new Date(Date.now() + 7200000))} className="input" /></Field>
                  <Field label="Modalidad"><select name="modalidad" defaultValue="presencial" className="input"><option value="presencial">Presencial</option><option value="virtual">Virtual</option><option value="mixta">Mixta</option></select></Field>
                  <Field label="Lugar o enlace"><input name="lugar" required className="input" /></Field>
                  <Field label="Proyecto / sede"><input name="proyecto" className="input" /></Field>
                  <Field label="Descripción"><input name="descripcion" className="input" /></Field>
                </FormSection>

                <FormSection title="Responsables y contenido">
                  <Field label="Responsable interno"><input name="responsableNombre" required className="input" /></Field>
                  <Field label="Facilitador"><input name="facilitadorNombre" required className="input" /></Field>
                  <Field label="Tipo de facilitador"><select name="facilitadorTipo" defaultValue="interno" className="input"><option value="interno">Interno</option><option value="externo">Externo</option></select></Field>
                  <Field label="Empresa del facilitador"><input name="facilitadorEmpresa" className="input" /></Field>
                  <Field label="Contenido / temas" wide><textarea name="contenido" rows={3} className="input" /></Field>
                  <Field label="Material en Drive, Forms u otro" wide><input name="materialUrl" type="url" placeholder="https://..." className="input" /></Field>
                </FormSection>

                <FormSection title="Reglas del registro">
                  <Field label="Tolerancia (min)"><input name="toleranciaMinutos" type="number" min="0" max="180" defaultValue="15" className="input" /></Field>
                  <Field label="Permanencia mínima (%)"><input name="permanenciaMinima" type="number" min="0" max="100" defaultValue="80" className="input" /></Field>
                  <div className="col-span-full grid gap-2 sm:grid-cols-2">
                    <Check name="requiereFirma" label="Firma obligatoria" defaultChecked />
                    <Check name="requiereSalida" label="Registrar salida" />
                    <Check name="requiereFoto" label="Evidencia fotográfica" />
                    <Check name="requiereEvaluacion" label="Requiere evaluación" />
                  </div>
                  <Field label="Nota mínima"><input name="notaMinima" type="number" min="0" max="100" defaultValue="80" className="input" /></Field>
                </FormSection>
              </div>

              <div>
                <div className="sticky top-24 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-900">Convocatoria</h3><p className="text-xs text-slate-500">Todos comienzan pendientes.</p></div><span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{selectedPeople.length}</span></div>
                  <div className="relative mt-3"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={peopleSearch} onChange={(e) => setPeopleSearch(e.target.value)} placeholder="Nombre o documento" className="input pl-9" /></div>
                  <div className="mt-3 max-h-[430px] space-y-1 overflow-y-auto pr-1">
                    {filteredPeople.map((persona) => {
                      const checked = selectedPeople.includes(persona.id);
                      return <label key={persona.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 ${checked ? "border-slate-400 bg-white" : "border-transparent hover:bg-white"}`}>
                        <input type="checkbox" checked={checked} onChange={() => setSelectedPeople((current) => checked ? current.filter((id) => id !== persona.id) : [...current, persona.id])} className="mt-1" />
                        <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-900">{persona.nombres} {persona.apellidos}</span><span className="block truncate text-[11px] text-slate-500">{persona.numeroDocumento} · {persona.perfiles.join(", ")} · {persona.estado}</span></span>
                      </label>;
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Crear borrador</Button>
            </div>
          </form>
        </div>
      )}

      {detalle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto max-w-6xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-slate-500">{detalle.consecutivo}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(detalle.estado)}`}>{ESTADO_LABELS[detalle.estado]}</span></div><h2 className="mt-1 text-lg font-extrabold text-slate-950">{detalle.nombre}</h2><p className="text-xs text-slate-500">{formatDate(detalle.fechaInicio)} · {detalle.lugar}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {detalle.estado === "borrador" && (isAdmin ? <Button size="sm" onClick={() => changeState("programado")} disabled={busy}><ShieldCheck size={15} /> Aprobar</Button> : <Button size="sm" onClick={() => changeState("pendiente_aprobacion")} disabled={busy}>Enviar a aprobación</Button>)}
                {detalle.estado === "pendiente_aprobacion" && isAdmin && <Button size="sm" onClick={() => changeState("programado")} disabled={busy}><ShieldCheck size={15} /> Aprobar</Button>}
                {detalle.estado === "programado" && <Button size="sm" onClick={() => changeState("en_curso")} disabled={busy}><Play size={15} /> Iniciar</Button>}
                {detalle.estado === "en_curso" && <Button size="sm" onClick={() => changeState("pendiente_revision")} disabled={busy}><Square size={14} /> Finalizar toma</Button>}
                {detalle.estado === "pendiente_revision" && isAdmin && <Button size="sm" variant="success" onClick={() => changeState("cerrado")} disabled={busy}><CheckCircle2 size={15} /> Cerrar evento</Button>}
                {detalle.estado === "cerrado" && isAdmin && <Button size="sm" variant="secondary" onClick={() => changeState("pendiente_revision")} disabled={busy}>Reabrir</Button>}
                <Button size="sm" variant="secondary" onClick={() => generateEventoAsistenciaPDF(detalle)} disabled={busy}><Download size={15} /> PDF</Button>
                <button onClick={() => { setDetalle(null); setSelectedId(null); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Tipo" value={TIPO_LABELS[detalle.tipo] || detalle.tipo} />
                <Info label="Responsable" value={detalle.responsableNombre} />
                <Info label="Facilitador" value={detalle.facilitadorNombre} />
                <Info label="Modalidad" value={detalle.modalidad} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objetivo</p><p className="mt-1 text-sm text-slate-800">{detalle.objetivo}</p></div>

              <div className="flex flex-wrap gap-2">
                {detalle.documentos.map((documento) => <span key={documento.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700"><FileText size={14} />{documento.codigo} v{documento.version}</span>)}
              </div>

              <div>
                <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-sm font-extrabold text-slate-950">Convocatoria y asistencia</h3><p className="text-xs text-slate-500">{detalle.participantes.length} participantes registrados</p></div><div className="flex gap-2">{["programado", "en_curso"].includes(detalle.estado) && <Button size="sm" variant="secondary" onClick={addExternal} disabled={busy}><UserPlus size={14} /> Agregar externo</Button>}{detalle.estado === "pendiente_revision" && isAdmin && <Button size="sm" variant="secondary" onClick={reconcileObvious} disabled={busy}><CheckCircle2 size={14} /> Confirmar presentes</Button>}</div></div>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[920px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Participante</th><th className="p-3">Convocatoria</th><th className="p-3">Condición</th><th className="p-3">Entrada</th><th className="p-3">Resultado</th><th className="p-3 text-right">Acción</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {detalle.participantes.map((p) => {
                        const result = p.resultadoDefinitivo || p.resultadoPreliminar;
                        return <tr key={p.id} className="align-top"><td className="p-3"><p className="font-bold text-slate-900">{p.personaNombre}</p><p className="mt-0.5 text-[11px] text-slate-500">{p.personaDocumento || "Sin documento"} · {p.tipoPersona}</p></td><td className="p-3 text-slate-700">{p.tipoConvocatoria}</td><td className="p-3 text-slate-700">{p.condicionLaboral}</td><td className="p-3 text-slate-700">{p.horaEntrada ? formatDate(p.horaEntrada) : "—"}</td><td className="p-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${result === "pendiente" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{RESULTADO_LABELS[result] || result}</span>{p.observaciones && <p className="mt-1 max-w-xs text-[10px] text-slate-500">{p.observaciones}</p>}</td><td className="p-3"><div className="flex justify-end gap-1.5">{detalle.estado === "en_curso" && !p.horaEntrada && <Button size="sm" onClick={() => updateParticipant(p.id, "entrada")} disabled={busy}><Clock3 size={13} /> Entrada</Button>}{detalle.estado === "en_curso" && detalle.requiereSalida && p.horaEntrada && !p.horaSalida && <Button size="sm" variant="secondary" onClick={() => updateParticipant(p.id, "salida")} disabled={busy}>Salida</Button>}{detalle.estado === "pendiente_revision" && isAdmin && <select value={p.resultadoDefinitivo || ""} onChange={(e) => e.target.value && updateParticipant(p.id, "conciliar", e.target.value)} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="">Conciliar...</option>{Object.entries(RESULTADO_LABELS).filter(([value]) => value !== "pendiente").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</div></td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`.input{width:100%;border:1px solid rgb(226 232 240);border-radius:.75rem;background:white;padding:.55rem .7rem;font-size:.8rem;color:rgb(15 23 42);outline:none}.input:focus{border-color:rgb(100 116 139);box-shadow:0 0 0 3px rgb(226 232 240 / .7)}`}</style>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-3 text-sm font-extrabold text-slate-950">{title}</h3><div className="grid gap-3 sm:grid-cols-2">{children}</div></section>;
}
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}
function Check({ name, label, defaultChecked = false }: { name: string; label: string; defaultChecked?: boolean }) {
  return <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700"><input type="checkbox" name={name} defaultChecked={defaultChecked} />{label}</label>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div>;
}
