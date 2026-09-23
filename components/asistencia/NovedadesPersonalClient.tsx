"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarOff, CheckCircle2, Clock3, Loader2, Plus, Search, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";

type Persona = { id: string; nombres: string; apellidos: string; numeroDocumento: string; perfiles: string[] };
type Novedad = {
  id: string; tipo: string; fechaInicio: string; fechaFin: string; motivo?: string | null; soporteUrl?: string | null;
  estado: string; registradoPorNombre: string; aprobadoPorNombre?: string | null;
  persona: Omit<Persona, "id">;
};

const TIPOS: Record<string, string> = {
  descanso: "Descanso", vacaciones: "Vacaciones", incapacidad: "Incapacidad", licencia_remunerada: "Licencia remunerada",
  licencia_no_remunerada: "Licencia no remunerada", permiso: "Permiso", comision: "Comisión o actividad externa",
  suspension: "Suspensión", retiro: "Retiro",
};

function localInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function format(value: string) {
  return new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
}

export function NovedadesPersonalClient({ sessionRole }: { sessionRole: string }) {
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const isAdmin = sessionRole === "administrativo" || sessionRole === "hseq";

  const load = useCallback(async () => {
    const [novRes, perRes] = await Promise.all([
      fetch("/api/novedades-personal", { cache: "no-store" }),
      fetch("/api/eventos-asistencia/recursos", { cache: "no-store" }),
    ]);
    const [novData, perData] = await Promise.all([novRes.json(), perRes.json()]);
    if (!novRes.ok) throw new Error(novData.error || "No fue posible cargar las novedades.");
    setNovedades(novData.novedades || []);
    setPersonas(perData.personas || []);
  }, []);

  useEffect(() => { load().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return novedades.filter((n) => !q || `${n.persona.nombres} ${n.persona.apellidos} ${n.persona.numeroDocumento} ${n.tipo} ${n.estado}`.toLowerCase().includes(q));
  }, [novedades, search]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/novedades-personal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, aprobar: form.get("aprobar") === "on" }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "No fue posible registrar la novedad.");
      setShowCreate(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible registrar la novedad."); }
    finally { setBusy(false); }
  }

  async function decide(id: string, estado: string) {
    const observaciones = estado === "rechazada" ? window.prompt("Motivo del rechazo:") : null;
    if (estado === "rechazada" && !observaciones) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/novedades-personal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, estado, observaciones }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "No fue posible decidir la novedad."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible decidir la novedad."); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-slate-500" /></div>;
  const pending = novedades.filter((n) => n.estado === "pendiente").length;

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4"><div><p className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-600">Disponibilidad del personal</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950">Novedades laborales</h1><p className="mt-1 text-sm text-slate-500">Periodos que afectan la elegibilidad y la asistencia.</p></div><Button onClick={() => setShowCreate(true)}><Plus size={16}/> Registrar novedad</Button></div>
    {error && <div role="alert" className="flex justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><span className="flex gap-2"><AlertTriangle size={17}/>{error}</span><button onClick={() => setError(null)}><X size={16}/></button></div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard compact label="Novedades" value={novedades.length} icon={CalendarOff}/><StatCard compact label="Pendientes" value={pending} icon={Clock3} accent={pending ? "amber" : "green"}/><StatCard compact label="Aprobadas" value={novedades.filter((n) => n.estado === "aprobada").length} icon={CheckCircle2} accent="green"/><StatCard compact label="Rechazadas" value={novedades.filter((n) => n.estado === "rechazada").length} icon={XCircle} accent="red"/></div>
    <Card><div className="relative max-w-xl"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar persona, documento, tipo o estado" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none"/></div><div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Persona</th><th className="p-3">Novedad</th><th className="p-3">Periodo</th><th className="p-3">Estado</th><th className="p-3">Registró</th><th className="p-3 text-right">Decisión</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((n) => <tr key={n.id}><td className="p-3"><p className="font-bold text-slate-900">{n.persona.nombres} {n.persona.apellidos}</p><p className="text-[11px] text-slate-500">{n.persona.numeroDocumento}</p></td><td className="p-3"><p className="font-semibold">{TIPOS[n.tipo] || n.tipo}</p><p className="max-w-xs truncate text-[11px] text-slate-500">{n.motivo || "Sin observación"}</p></td><td className="p-3">{format(n.fechaInicio)}<br/>{format(n.fechaFin)}</td><td className="p-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${n.estado === "aprobada" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : n.estado === "pendiente" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{n.estado}</span></td><td className="p-3 text-slate-600">{n.registradoPorNombre}</td><td className="p-3"><div className="flex justify-end gap-1.5">{isAdmin && n.estado === "pendiente" && <><Button size="sm" variant="success" onClick={() => decide(n.id, "aprobada")} disabled={busy}>Aprobar</Button><Button size="sm" variant="danger" onClick={() => decide(n.id, "rechazada")} disabled={busy}>Rechazar</Button></>}</div></td></tr>)}</tbody></table></div></Card>
    {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><form onSubmit={create} className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="font-extrabold text-slate-950">Registrar novedad</h2><p className="text-xs text-slate-500">El periodo se aplicará a futuras convocatorias coincidentes.</p></div><button type="button" onClick={() => setShowCreate(false)}><X size={18}/></button></div><div className="grid gap-3 p-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className="label">Persona</span><select name="personaId" required className="input"><option value="">Seleccionar</option>{personas.map((p) => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} · {p.numeroDocumento}</option>)}</select></label><label><span className="label">Tipo</span><select name="tipo" required className="input"><option value="">Seleccionar</option>{Object.entries(TIPOS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><label><span className="label">Soporte externo</span><input name="soporteUrl" type="url" placeholder="Drive u otra URL" className="input"/></label><label><span className="label">Inicio</span><input name="fechaInicio" type="datetime-local" required defaultValue={localInput(new Date())} className="input"/></label><label><span className="label">Finalización</span><input name="fechaFin" type="datetime-local" required defaultValue={localInput(new Date(Date.now()+86400000))} className="input"/></label><label className="sm:col-span-2"><span className="label">Motivo u observación</span><textarea name="motivo" rows={3} className="input"/></label>{isAdmin && <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-semibold"><input name="aprobar" type="checkbox"/> Aprobar inmediatamente</label>}</div><div className="flex justify-end gap-2 border-t border-slate-200 p-4"><Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 size={15} className="animate-spin"/>} Guardar</Button></div></form></div>}
    <style jsx global>{`.input{width:100%;border:1px solid rgb(226 232 240);border-radius:.75rem;background:white;padding:.55rem .7rem;font-size:.8rem;color:rgb(15 23 42);outline:none}.input:focus{border-color:rgb(100 116 139);box-shadow:0 0 0 3px rgb(226 232 240 / .7)}.label{display:block;margin-bottom:.25rem;font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:rgb(100 116 139)}`}</style>
  </div>;
}
