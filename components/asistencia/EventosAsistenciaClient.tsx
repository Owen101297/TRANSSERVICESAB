"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  Download,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Square,
  UserPlus,
  Upload,
  Users,
  Trash2,
  X,
} from "lucide-react";
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
  firmaAt?: string | null;
  registroCodigo?: string | null;
  firmaUrl?: string | null;
};
type Evidencia = {
  id: string;
  categoria: string;
  nombre: string;
  descripcion?: string | null;
  archivoUrl: string;
  mimeType?: string | null;
  origen: string;
  validada: boolean;
  createdAt: string;
};
type EventoDetalle = EventoLista & {
  objetivo: string;
  descripcion?: string | null;
  caracter: string;
  modalidad: string;
  proyecto?: string | null;
  contenido?: string | null;
  facilitadorEmpresa?: string | null;
  toleranciaMinutos: number;
  permanenciaMinima: number;
  requiereSalida: boolean;
  requiereFirma: boolean;
  requiereFoto: boolean;
  requiereEvaluacion: boolean;
  tokenRegistro?: string | null;
  registroAbierto: boolean;
  permiteExternos: boolean;
  materialUrl?: string | null;
  instruccionesRegistro?: string | null;
  revision?: number;
  participantes: Participante[];
  documentos: Documento[];
  evidencias: Evidencia[];
  cerradoPorNombre?: string | null;
  cerradoAt?: string | null;
  cerradoExcepcional?: boolean;
  motivoCierreExcepcional?: string | null;
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

function nextQuarterHourInput() {
  const date = new Date();
  date.setMinutes(Math.ceil((date.getMinutes() + 1) / 15) * 15, 0, 0);
  return toLocalInput(date);
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

export function EventosAsistenciaClient({ sessionRole, initialEventId }: { sessionRole: string; initialEventId?: string }) {
  const [eventos, setEventos] = useState<EventoLista[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialEventId || null);
  const [detalle, setDetalle] = useState<EventoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateDetails, setShowCreateDetails] = useState(false);
  const [showCreateInvitees, setShowCreateInvitees] = useState(false);
  const [createModality, setCreateModality] = useState("presencial");
  const [createStart, setCreateStart] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [selectedForPdf, setSelectedForPdf] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
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

  function closeCreateModal() {
    setShowCreate(false);
    setShowCreateDetails(false);
    setShowCreateInvitees(false);
    setCreateModality("presencial");
    setCreateStart("");
    setPeopleSearch("");
    setSelectedPeople([]);
  }

  async function createEvento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const tipo = String(form.get("tipo"));
    const formativos = ["charla_formativa", "capacitacion", "induccion", "reinduccion", "entrenamiento_practico"];
    const nombre = String(form.get("nombre") || "").trim();
    const fechaInicio = new Date(String(form.get("fechaInicio") || ""));
    const duracionMinutos = Math.max(15, Number(form.get("duracionMinutos")) || 60);
    const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60_000);
    const objetivoSugerido = formativos.includes(tipo)
      ? `Fortalecer conocimientos sobre «${nombre}» y dejar evidencia verificable de la participación.`
      : `Socializar «${nombre}» y dejar evidencia verificable de la participación.`;
    const body = {
      nombre,
      tipo,
      caracter: formativos.includes(tipo) ? "formativo" : "informativo",
      proceso: form.get("proceso"),
      objetivo: form.get("objetivo") || objetivoSugerido,
      descripcion: form.get("descripcion"),
      fechaInicio: Number.isNaN(fechaInicio.getTime()) ? null : fechaInicio.toISOString(),
      fechaFin: Number.isNaN(fechaFin.getTime()) ? null : fechaFin.toISOString(),
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
      permiteExternos: form.has("permiteExternos") ? form.get("permiteExternos") === "on" : true,
      instruccionesRegistro: form.get("instruccionesRegistro"),
      personaIds: selectedPeople,
      aprobarAlCrear: isAdmin,
    };
    try {
      const res = await fetch("/api/eventos-asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible crear el evento.");
      if (data.evento.tokenRegistro && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/asistir/${data.evento.tokenRegistro}`);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2200);
        } catch {
          setCopied(false);
        }
      }
      closeCreateModal();
      await loadEventos();
      setSelectedId(data.evento.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el evento.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRegistration(abierto: boolean) {
    if (!detalle) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/eventos-asistencia/${detalle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registro", abierto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible actualizar el enlace.");
      await Promise.all([loadEventos(), loadDetalle(detalle.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar el enlace.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAttendanceLink() {
    if (!detalle?.tokenRegistro) return;
    const link = `${window.location.origin}/asistir/${detalle.tokenRegistro}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  async function uploadEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detalle) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/eventos-asistencia/${detalle.id}/evidencias`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible guardar la evidencia.");
      form.reset();
      await loadDetalle(detalle.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar la evidencia.");
    } finally {
      setBusy(false);
    }
  }

  async function updateEvento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detalle) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/eventos-asistencia/${detalle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "actualizar",
          nombre: form.get("nombre"),
          objetivo: form.get("objetivo"),
          descripcion: form.get("descripcion"),
          fechaInicio: form.get("fechaInicio"),
          fechaFin: form.get("fechaFin"),
          modalidad: form.get("modalidad"),
          lugar: form.get("lugar"),
          proyecto: form.get("proyecto"),
          responsableNombre: form.get("responsableNombre"),
          facilitadorNombre: form.get("facilitadorNombre"),
          facilitadorEmpresa: form.get("facilitadorEmpresa"),
          materialUrl: form.get("materialUrl"),
          contenido: form.get("contenido"),
          instruccionesRegistro: form.get("instruccionesRegistro"),
          permiteExternos: form.get("permiteExternos") === "on",
          toleranciaMinutos: Number(form.get("toleranciaMinutos")),
          permanenciaMinima: Number(form.get("permanenciaMinima")),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible actualizar el expediente.");
      setShowEdit(false);
      await Promise.all([loadEventos(), loadDetalle(detalle.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar el expediente.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvidence(evidenciaId: string) {
    if (!detalle || !window.confirm("¿Retirar esta evidencia del expediente? La acción quedará auditada.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/eventos-asistencia/${detalle.id}/evidencias?evidenciaId=${encodeURIComponent(evidenciaId)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No fue posible retirar la evidencia.");
      await loadDetalle(detalle.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible retirar la evidencia.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSelectedPdfs() {
    if (selectedForPdf.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const id of selectedForPdf) {
        const res = await fetch(`/api/eventos-asistencia/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No fue posible preparar una de las actas.");
        await generateEventoAsistenciaPDF(data.evento);
        await new Promise((resolve) => window.setTimeout(resolve, 180));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible descargar las actas seleccionadas.");
    } finally {
      setBusy(false);
    }
  }

  async function startAndOpenRegistration() {
    if (!detalle) return;
    setBusy(true);
    setError(null);
    try {
      const startResponse = await fetch(`/api/eventos-asistencia/${detalle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "en_curso" }),
      });
      const startData = await startResponse.json();
      if (!startResponse.ok) throw new Error(startData.error || "No fue posible iniciar la actividad.");

      const registrationResponse = await fetch(`/api/eventos-asistencia/${detalle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registro", abierto: true }),
      });
      const registrationData = await registrationResponse.json();
      if (!registrationResponse.ok) {
        throw new Error(registrationData.error || "La actividad inició, pero no fue posible abrir el registro.");
      }
      await Promise.all([loadEventos(), loadDetalle(detalle.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar la actividad.");
      await Promise.all([loadEventos(), loadDetalle(detalle.id)]);
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
      let res = await fetch(`/api/eventos-asistencia/${detalle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado, ...extra }),
      });
      let data = await res.json();
      if (!res.ok && estado === "cerrado" && res.status === 409) {
        const motivo = window.prompt(`${data.error}\n\nSi debe cerrar de forma excepcional, registre el motivo. Cancelar mantiene el expediente abierto.`);
        if (!motivo) return;
        res = await fetch(`/api/eventos-asistencia/${detalle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado, cerradoExcepcional: true, motivoCierreExcepcional: motivo }),
        });
        data = await res.json();
      }
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

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-600">Sistema de Gestión · PESV</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Eventos y asistencia</h1>
          <p className="mt-1 text-sm text-slate-500">Convocatoria, registro, conciliación y expediente documental.</p>
        </div>
        <Button onClick={() => { setCreateStart(nextQuarterHourInput()); setShowCreate(true); }}><Plus size={16} /> Nueva actividad</Button>
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
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600"><input type="checkbox" checked={filtered.length > 0 && filtered.every((item) => selectedForPdf.includes(item.id))} onChange={(event) => setSelectedForPdf(event.target.checked ? filtered.map((item) => item.id) : [])} /> Seleccionar visibles</label>
            {selectedForPdf.length > 0 && <Button size="sm" variant="secondary" onClick={downloadSelectedPdfs} disabled={busy}><Download size={14} /> Descargar {selectedForPdf.length} PDF individuales</Button>}
            <span className="text-xs font-medium text-slate-500">{filtered.length} expedientes</span>
          </div>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No hay eventos que coincidan con la búsqueda.</div>
          ) : filtered.map((evento) => (
            <div key={evento.id} className="grid w-full grid-cols-[auto_1fr] items-center gap-3 py-3 transition hover:bg-slate-50 sm:px-2">
              <input type="checkbox" aria-label={`Seleccionar acta ${evento.consecutivo}`} checked={selectedForPdf.includes(evento.id)} onChange={(event) => setSelectedForPdf((current) => event.target.checked ? [...current, evento.id] : current.filter((id) => id !== evento.id))} className="size-4" />
              <button type="button" onClick={() => setSelectedId(evento.id)} className="grid w-full gap-3 text-left sm:grid-cols-[1fr_auto_auto] sm:items-center">
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
            </div>
          ))}
        </div>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <form onSubmit={createEvento} role="dialog" aria-modal="true" aria-labelledby="create-event-title" className="mx-auto max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div><h2 id="create-event-title" className="text-lg font-extrabold text-slate-950">Crear actividad</h2><p className="text-xs text-slate-500">Completa lo esencial. El sistema configura el expediente.</p></div>
              <button type="button" onClick={closeCreateModal} className="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tipo de actividad"><select name="tipo" required defaultValue="charla_informativa" className="input"><option value="">Seleccionar</option>{Object.entries(TIPO_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                <Field label="Proceso"><select name="proceso" defaultValue="hseq" className="input"><option value="hseq">HSEQ</option><option value="pesv">PESV</option><option value="sg-sst">SG-SST</option><option value="otro">Otro</option></select></Field>
                <Field label="Tema o nombre" wide><input name="nombre" required maxLength={180} placeholder="Ej. Manejo seguro de sustancias químicas" className="input" /></Field>
                <Field label="Fecha y hora"><input name="fechaInicio" type="datetime-local" required value={createStart} onChange={(event) => setCreateStart(event.target.value)} className="input" /></Field>
                <Field label="Duración"><select name="duracionMinutos" defaultValue="60" className="input"><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">1 hora</option><option value="90">1 hora 30 min</option><option value="120">2 horas</option><option value="180">3 horas</option><option value="240">4 horas</option><option value="480">8 horas</option></select></Field>
                <Field label="Modalidad"><select name="modalidad" value={createModality} onChange={(event) => setCreateModality(event.target.value)} className="input"><option value="presencial">Presencial</option><option value="virtual">Virtual</option><option value="mixta">Mixta</option></select></Field>
                <Field label={createModality === "virtual" ? "Enlace de acceso" : "Lugar o enlace"}><input name="lugar" required placeholder={createModality === "virtual" ? "https://meet.google.com/..." : "Ej. Sede principal · Sala de juntas"} className="input" /></Field>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-sky-700"><ShieldCheck size={16} /></span>
                <p><strong>Configuración inteligente:</strong> asignaremos responsable y facilitador, objetivo, formato documental, firma manuscrita y reglas estándar. {isAdmin ? "La actividad quedará programada y su enlace se copiará." : "La actividad quedará como borrador para aprobación."}</p>
              </div>

              <section className="overflow-hidden rounded-2xl border border-slate-200">
                <button type="button" onClick={() => setShowCreateDetails((value) => !value)} aria-expanded={showCreateDetails} aria-controls="create-event-details" className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <span><span className="block text-sm font-bold text-slate-900">Agregar detalles opcionales</span><span className="block text-xs text-slate-500">Contenido, material, facilitador y reglas especiales</span></span>
                  <ChevronRight size={18} className={`shrink-0 text-slate-400 transition-transform ${showCreateDetails ? "rotate-90" : ""}`} />
                </button>
                <div id="create-event-details" aria-hidden={!showCreateDetails} className={`${showCreateDetails ? "grid" : "hidden"} gap-3 border-t border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2`}>
                  <Field label="Objetivo sugerido" wide><textarea name="objetivo" rows={2} className="input" placeholder="Déjalo vacío para generarlo automáticamente." /></Field>
                  <Field label="Descripción" wide><textarea name="descripcion" rows={2} className="input" /></Field>
                  <Field label="Proyecto / sede"><input name="proyecto" className="input" /></Field>
                  <Field label="Responsable interno"><input name="responsableNombre" className="input" placeholder="Usuario actual" /></Field>
                  <Field label="Facilitador"><input name="facilitadorNombre" className="input" placeholder="Usuario actual" /></Field>
                  <Field label="Tipo de facilitador"><select name="facilitadorTipo" defaultValue="interno" className="input"><option value="interno">Interno</option><option value="externo">Externo</option></select></Field>
                  <Field label="Empresa del facilitador"><input name="facilitadorEmpresa" className="input" /></Field>
                  <Field label="Material en Drive, Forms u otro"><input name="materialUrl" type="url" placeholder="https://..." className="input" /></Field>
                  <Field label="Contenido / temas" wide><textarea name="contenido" rows={3} className="input" /></Field>
                  <Field label="Tolerancia (min)"><input name="toleranciaMinutos" type="number" min="0" max="180" defaultValue="15" className="input" /></Field>
                  <Field label="Permanencia mínima (%)"><input name="permanenciaMinima" type="number" min="0" max="100" defaultValue="80" className="input" /></Field>
                  <div className="col-span-full grid gap-2 sm:grid-cols-3">
                    <Check name="requiereSalida" label="Registrar salida" />
                    <Check name="permiteExternos" label="Permitir externos" defaultChecked />
                    <Check name="requiereEvaluacion" label="Requiere evaluación" />
                  </div>
                  <Field label="Nota mínima"><input name="notaMinima" type="number" min="0" max="100" defaultValue="80" className="input" /></Field>
                  <Field label="Instrucción para el participante"><textarea name="instruccionesRegistro" rows={2} className="input" placeholder="Ej. Revisa el material antes de firmar." /></Field>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200">
                <button type="button" onClick={() => setShowCreateInvitees((value) => !value)} aria-expanded={showCreateInvitees} aria-controls="create-event-invitees" className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <span><span className="flex items-center gap-2 text-sm font-bold text-slate-900">Convocar personal ahora {selectedPeople.length > 0 && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-white">{selectedPeople.length}</span>}</span><span className="block text-xs text-slate-500">Opcional: también puedes compartir el enlace con internos y externos</span></span>
                  <ChevronRight size={18} className={`shrink-0 text-slate-400 transition-transform ${showCreateInvitees ? "rotate-90" : ""}`} />
                </button>
                {showCreateInvitees && <div id="create-event-invitees" className="border-t border-slate-200 bg-slate-50/60 p-4">
                  <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={peopleSearch} onChange={(event) => setPeopleSearch(event.target.value)} placeholder="Buscar por nombre, documento o perfil" className="input pl-9" /></div>
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
                    {filteredPeople.length === 0 && <p className="py-6 text-center text-xs text-slate-500">No hay personas que coincidan con la búsqueda.</p>}
                    {filteredPeople.map((persona) => {
                      const checked = selectedPeople.includes(persona.id);
                      return <label key={persona.id} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-2.5 ${checked ? "border-slate-400 bg-white" : "border-transparent hover:bg-white"}`}>
                        <input type="checkbox" checked={checked} onChange={() => setSelectedPeople((current) => checked ? current.filter((id) => id !== persona.id) : [...current, persona.id])} className="mt-1" />
                        <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-900">{persona.nombres} {persona.apellidos}</span><span className="block truncate text-[11px] text-slate-500">{persona.numeroDocumento} · {persona.perfiles.join(", ")} · {persona.estado}</span></span>
                      </label>;
                    })}
                  </div>
                </div>}
              </section>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 rounded-b-2xl border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <Button type="button" variant="secondary" onClick={closeCreateModal}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : isAdmin ? <Copy size={16} /> : <Plus size={16} />} {isAdmin ? "Crear y copiar enlace" : "Crear borrador"}</Button>
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
                {detalle.estado === "programado" && <Button size="sm" onClick={startAndOpenRegistration} disabled={busy}><Play size={15} /> Iniciar y abrir registro</Button>}
                {detalle.estado === "en_curso" && <Button size="sm" onClick={() => changeState("pendiente_revision")} disabled={busy}><Square size={14} /> Finalizar toma</Button>}
                {detalle.estado === "pendiente_revision" && isAdmin && <Button size="sm" variant="success" onClick={() => changeState("cerrado")} disabled={busy}><CheckCircle2 size={15} /> Cerrar evento</Button>}
                {detalle.estado === "cerrado" && isAdmin && <Button size="sm" variant="secondary" onClick={() => changeState("pendiente_revision")} disabled={busy}>Reabrir</Button>}
                {isAdmin && !["cerrado", "cancelado"].includes(detalle.estado) && <Button size="sm" variant="secondary" onClick={() => setShowEdit((value) => !value)} disabled={busy}>{showEdit ? "Ocultar edición" : "Editar datos"}</Button>}
                {isAdmin && detalle.estado === "en_curso" && (detalle.registroAbierto ? <Button size="sm" variant="secondary" onClick={() => toggleRegistration(false)} disabled={busy}><Square size={14} /> Cerrar registro</Button> : <Button size="sm" variant="success" onClick={() => toggleRegistration(true)} disabled={busy}><Play size={14} /> Abrir registro</Button>)}
                {detalle.tokenRegistro && <Button size="sm" variant="secondary" onClick={copyAttendanceLink} disabled={busy}><Copy size={14} /> {copied ? "Enlace copiado" : "Copiar enlace"}</Button>}
                <Button size="sm" variant="secondary" onClick={() => generateEventoAsistenciaPDF(detalle)} disabled={busy}><Download size={15} /> PDF</Button>
                <button onClick={() => { setDetalle(null); setSelectedId(null); setShowEdit(false); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X size={18} /></button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {showEdit && (
                <form onSubmit={updateEvento} className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-extrabold text-slate-950">Editar datos del expediente</h3><p className="mt-1 text-xs text-slate-600">Los cambios se sincronizan con capacitación y quedan registrados en auditoría.</p></div><button type="button" onClick={() => setShowEdit(false)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Cerrar edición"><X size={16} /></button></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Nombre" wide><input name="nombre" required defaultValue={detalle.nombre} className="input" /></Field>
                    <Field label="Objetivo" wide><textarea name="objetivo" required rows={2} defaultValue={detalle.objetivo} className="input" /></Field>
                    <Field label="Descripción" wide><textarea name="descripcion" rows={2} defaultValue={detalle.descripcion || ""} className="input" /></Field>
                    <Field label="Inicio"><input name="fechaInicio" type="datetime-local" required defaultValue={toLocalInput(new Date(detalle.fechaInicio))} className="input" /></Field>
                    <Field label="Fin"><input name="fechaFin" type="datetime-local" required defaultValue={toLocalInput(new Date(detalle.fechaFin))} className="input" /></Field>
                    <Field label="Modalidad"><select name="modalidad" defaultValue={detalle.modalidad} className="input"><option value="presencial">Presencial</option><option value="virtual">Virtual</option><option value="mixta">Mixta</option></select></Field>
                    <Field label="Lugar"><input name="lugar" required defaultValue={detalle.lugar} className="input" /></Field>
                    <Field label="Proyecto / sede"><input name="proyecto" defaultValue={detalle.proyecto || ""} className="input" /></Field>
                    <Field label="Responsable"><input name="responsableNombre" required defaultValue={detalle.responsableNombre} className="input" /></Field>
                    <Field label="Facilitador"><input name="facilitadorNombre" required defaultValue={detalle.facilitadorNombre} className="input" /></Field>
                    <Field label="Empresa del facilitador"><input name="facilitadorEmpresa" defaultValue={detalle.facilitadorEmpresa || ""} className="input" /></Field>
                    <Field label="Tolerancia (min)"><input name="toleranciaMinutos" type="number" min="0" max="180" defaultValue={detalle.toleranciaMinutos} className="input" /></Field>
                    <Field label="Permanencia mínima (%)"><input name="permanenciaMinima" type="number" min="0" max="100" defaultValue={detalle.permanenciaMinima} className="input" /></Field>
                    <Field label="Material externo" wide><input name="materialUrl" type="url" defaultValue={detalle.materialUrl || ""} className="input" /></Field>
                    <Field label="Contenido" wide><textarea name="contenido" rows={2} defaultValue={detalle.contenido || ""} className="input" /></Field>
                    <Field label="Instrucciones del enlace" wide><textarea name="instruccionesRegistro" rows={2} defaultValue={detalle.instruccionesRegistro || ""} className="input" /></Field>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-700"><input type="checkbox" name="permiteExternos" defaultChecked={detalle.permiteExternos} /> Permitir registros externos</label>
                  </div>
                  <div className="mt-4 flex justify-end gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button><Button type="submit" size="sm" disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Guardar cambios</Button></div>
                </form>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Tipo" value={TIPO_LABELS[detalle.tipo] || detalle.tipo} />
                <Info label="Responsable" value={detalle.responsableNombre} />
                <Info label="Facilitador" value={detalle.facilitadorNombre} />
                <Info label="Modalidad" value={detalle.modalidad} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objetivo</p><p className="mt-1 text-sm text-slate-800">{detalle.objetivo}</p></div>

              {detalle.tokenRegistro && <div className={`rounded-xl border p-3 ${detalle.registroAbierto ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Enlace individual de asistencia</p><p className="mt-1 text-xs font-semibold text-slate-700">{detalle.registroAbierto ? "Abierto para recibir firmas" : "Cerrado; puede compartirse y abrirse cuando inicie la actividad"}</p></div><a href={`/asistir/${detalle.tokenRegistro}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><ExternalLink size={14} /> Vista del participante</a></div></div>}

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

              <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
                <form onSubmit={uploadEvidence} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm">{detalle.modalidad === "virtual" ? <FileText size={19} /> : <Camera size={19} />}</span><div><h3 className="text-sm font-extrabold text-slate-950">Agregar evidencia</h3><p className="mt-0.5 text-xs leading-5 text-slate-500">{detalle.modalidad === "virtual" ? "Carga una captura o reporte de la plataforma." : "Toma o carga una fotografía de la actividad ejecutándose."}</p></div></div>
                  <div className="mt-4 space-y-3">
                    <select name="categoria" defaultValue={detalle.modalidad === "virtual" ? "captura_virtual" : "foto_presencial"} className="input"><option value="foto_presencial">Fotografía presencial</option><option value="captura_virtual">Captura de sesión virtual</option><option value="reporte_virtual">Reporte de participantes</option><option value="practica">Evidencia práctica</option><option value="material">Material utilizado</option><option value="otro">Otra evidencia</option></select>
                    <input name="nombre" required className="input" placeholder="Nombre breve de la evidencia" />
                    <textarea name="descripcion" rows={2} className="input" placeholder="Qué demuestra esta evidencia" />
                    <input name="archivo" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" capture={detalle.modalidad === "virtual" ? undefined : "environment"} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-bold file:text-slate-700" />
                    <input type="hidden" name="origen" value={detalle.modalidad === "virtual" ? "carga" : "captura"} />
                    <Button type="submit" size="sm" disabled={busy}><Upload size={14} /> Guardar evidencia</Button>
                  </div>
                </form>
                <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-extrabold text-slate-950">Materiales y evidencias</h3><p className="text-xs text-slate-500">{detalle.evidencias.length} archivos en el expediente</p></div></div>{detalle.evidencias.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Todavía no se han agregado evidencias.</div> : <div className="mt-3 space-y-2">{detalle.evidencias.map((evidencia) => <div key={evidencia.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">{evidencia.mimeType?.startsWith("image/") ? <Camera size={16} /> : <FileText size={16} />}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-900">{evidencia.nombre}</p><p className="mt-0.5 text-[10px] text-slate-500">{evidencia.categoria.replaceAll("_", " ")} · {formatDate(evidencia.createdAt)}</p></div><a href={evidencia.archivoUrl} target="_blank" rel="noreferrer" aria-label={`Abrir ${evidencia.nombre}`} className="rounded-lg p-2 text-sky-700 hover:bg-sky-50"><ExternalLink size={15} /></a>{isAdmin && <button type="button" onClick={() => deleteEvidence(evidencia.id)} disabled={busy} aria-label={`Retirar ${evidencia.nombre}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={15} /></button>}</div>)}</div>}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`.input{width:100%;min-height:2.75rem;border:1px solid rgb(226 232 240);border-radius:.75rem;background:white;padding:.55rem .7rem;font-size:.8rem;color:rgb(15 23 42);outline:none}.input:focus{border-color:rgb(100 116 139);box-shadow:0 0 0 3px rgb(226 232 240 / .7)}`}</style>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-3 text-sm font-extrabold text-slate-950">{title}</h3><div className="grid gap-3 sm:grid-cols-2">{children}</div></section>;
}
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>{children}</label>;
}
function Check({ name, label, defaultChecked = false }: { name: string; label: string; defaultChecked?: boolean }) {
  return <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700"><input type="checkbox" name={name} defaultChecked={defaultChecked} />{label}</label>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div>;
}
