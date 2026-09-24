"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, KeyRound, Loader2, MessageCircle, Printer, RefreshCw, Search, ShieldOff, X } from "lucide-react";

type PersonAccount = {
  id: string;
  nombre: string;
  documento: string;
  email: string;
  perfiles: string[];
  estadoLaboral: string;
  cuenta: { estado: string; ultimoAccesoAt: string | null };
  ultimoEnlace: null | { id: string; estado: string; expiraAt: string };
};
type Generated = {
  id: string;
  personaId: string;
  nombre: string;
  tipoAcceso: string;
  expiraAt: string;
  link: string;
  message: string;
  qrDataUrl: string;
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente de activación", activa: "Activa", bloqueada: "Bloqueada", suspendida: "Suspendida",
  generado: "Enlace generado", entregado: "Entregado", abierto: "Abierto", activado: "Activado", vencido: "Vencido", revocado: "Revocado",
};

export default function AccountAccessPanel() {
  const [people, setPeople] = useState<PersonAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<Generated[]>([]);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/cuentas/activaciones", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No fue posible cargar las cuentas.");
      setPeople(body.personas || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No fue posible cargar las cuentas.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) => `${person.nombre} ${person.documento} ${person.email}`.toLowerCase().includes(term));
  }, [people, query]);

  async function generate() {
    if (!selected.size) return;
    setGenerating(true); setError("");
    try {
      const response = await fetch("/api/admin/cuentas/activaciones", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaIds: [...selected], expirationHours: 72 }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No fue posible generar los enlaces.");
      setGenerated(body.activaciones || []); setSelected(new Set()); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No fue posible generar los enlaces."); }
    finally { setGenerating(false); }
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(""), 1800);
  }

  async function markDelivered(item: Generated, medium: string) {
    await fetch("/api/admin/cuentas/activaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, action: "delivered", medium }) });
    await load();
  }

  async function revoke(id: string) {
    if (!window.confirm("¿Revocar este enlace? La persona ya no podrá utilizarlo.")) return;
    const response = await fetch("/api/admin/cuentas/activaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "revoke" }) });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.error || "No fue posible revocar el enlace."); return; }
    setGenerated((items) => items.filter((item) => item.id !== id)); await load();
  }

  function printReceipt(item: Generated) {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!popup) return setError("El navegador bloqueó la ventana del comprobante.");
    const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
    popup.document.write(`<!doctype html><html><head><title>Activación - ${escapeHtml(item.nombre)}</title><style>body{font-family:Arial,sans-serif;color:#0f172a;padding:48px;max-width:680px;margin:auto}.brand{font-size:22px;font-weight:800}.card{border:1px solid #cbd5e1;border-radius:20px;padding:28px;margin-top:28px}img{display:block;width:220px;height:220px;margin:24px auto}.muted{color:#64748b;font-size:13px}.link{word-break:break-all;font-size:12px;background:#f1f5f9;padding:12px;border-radius:10px}@media print{button{display:none}}</style></head><body><div class="brand">TRANS SERVICES A&amp;B</div><p class="muted">Comprobante de entrega de acceso</p><div class="card"><h1>${escapeHtml(item.nombre)}</h1><p>Acceso: ${item.tipoAcceso === "erp" ? "ERP Administrativo" : "Portal del Conductor"}</p><img src="${item.qrDataUrl}" alt="Código QR"><p class="link">${escapeHtml(item.link)}</p><p class="muted">Enlace individual, de un solo uso. Vence: ${escapeHtml(new Date(item.expiraAt).toLocaleString("es-CO"))}</p><p>Firma de recibido: ______________________________</p><p>Fecha: __________________</p></div><button onclick="window.print()">Imprimir / Guardar PDF</button></body></html>`);
    popup.document.close();
  }

  if (loading) return <div className="flex min-h-52 items-center justify-center"><Loader2 className="animate-spin text-radar-cyan" /></div>;
  return <>
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, documento o correo" className="h-11 w-full rounded-xl border border-line-600 bg-asphalt-900 pl-10 pr-3 text-sm text-paper-50 outline-none focus:border-radar-cyan"/></div>
        <div className="flex gap-2"><button onClick={() => void load()} className="grid size-11 place-items-center rounded-xl border border-line-600 text-fog-400 hover:text-paper-50" aria-label="Actualizar"><RefreshCw size={16}/></button><button onClick={generate} disabled={!selected.size || generating} className="flex min-h-11 items-center gap-2 rounded-xl bg-signal-amber px-4 text-sm font-bold text-asphalt-950 disabled:opacity-50">{generating ? <Loader2 size={16} className="animate-spin"/> : <KeyRound size={16}/>}Generar acceso {selected.size ? `(${selected.size})` : ""}</button></div>
      </div>
      {error && <div role="alert" className="rounded-xl border border-alert-red/40 bg-alert-red/10 p-3 text-sm text-alert-red">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-line-600">
        <table className="w-full text-left text-sm"><thead className="bg-asphalt-800 text-xs uppercase text-fog-400"><tr><th className="p-3"><input type="checkbox" aria-label="Seleccionar visibles" checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))} onChange={(event) => setSelected(event.target.checked ? new Set(filtered.map((p) => p.id)) : new Set())}/></th><th className="p-3">Persona</th><th className="p-3">Cuenta</th><th className="p-3">Último enlace</th><th className="p-3">Acción</th></tr></thead>
          <tbody className="divide-y divide-line-600">{filtered.map((person) => <tr key={person.id} className="bg-asphalt-900"><td className="p-3"><input type="checkbox" checked={selected.has(person.id)} disabled={["inactivo","retirado"].includes(person.estadoLaboral)} onChange={(event) => setSelected((current) => { const next=new Set(current); event.target.checked ? next.add(person.id) : next.delete(person.id); return next; })}/></td><td className="p-3"><p className="font-semibold text-paper-50">{person.nombre}</p><p className="font-mono text-xs text-fog-400">{person.documento} · {person.perfiles.join(", ")}</p></td><td className="p-3"><span className="rounded-full border border-line-600 px-2 py-1 text-xs text-mist-200">{STATUS_LABELS[person.cuenta.estado] || person.cuenta.estado}</span></td><td className="p-3 text-xs text-fog-400">{person.ultimoEnlace ? <><p className="text-mist-200">{STATUS_LABELS[person.ultimoEnlace.estado] || person.ultimoEnlace.estado}</p><p>{new Date(person.ultimoEnlace.expiraAt).toLocaleString("es-CO")}</p></> : "Sin enlace"}</td><td className="p-3">{person.ultimoEnlace && !["activado","vencido","revocado"].includes(person.ultimoEnlace.estado) && <button onClick={() => void revoke(person.ultimoEnlace!.id)} className="flex items-center gap-1 text-xs font-semibold text-alert-red"><ShieldOff size={14}/> Revocar</button>}</td></tr>)}</tbody></table>
      </div>
      {!filtered.length && <p className="py-10 text-center text-sm text-fog-400">No hay usuarios que coincidan con la búsqueda.</p>}
    </div>
    {generated.length > 0 && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"><div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-5 text-slate-950 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-extrabold">Enlaces listos para entregar</h2><p className="mt-1 text-sm text-slate-600">Se muestran una sola vez. Copia el mensaje o descarga el comprobante.</p></div><button onClick={() => setGenerated([])} className="grid size-10 place-items-center rounded-xl bg-slate-100" aria-label="Cerrar"><X size={18}/></button></div><div className="mt-5 space-y-4">{generated.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-4 sm:flex-row"><img src={item.qrDataUrl} alt={`QR de activación de ${item.nombre}`} className="size-32 rounded-xl border border-slate-200"/><div className="min-w-0 flex-1"><h3 className="font-extrabold">{item.nombre}</h3><p className="text-xs text-slate-500">{item.tipoAcceso === "erp" ? "ERP Administrativo" : "Portal del Conductor"} · vence {new Date(item.expiraAt).toLocaleString("es-CO")}</p><p className="mt-3 break-all rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-600">{item.link}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void copy(item.link, `link-${item.id}`)} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold">{copied === `link-${item.id}` ? <Check size={15}/> : <Copy size={15}/>} Copiar enlace</button><button onClick={() => void copy(item.message, `message-${item.id}`)} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold">{copied === `message-${item.id}` ? <Check size={15}/> : <Copy size={15}/>} Copiar mensaje</button><a onClick={() => void markDelivered(item,"whatsapp")} href={`https://wa.me/?text=${encodeURIComponent(item.message)}`} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white"><MessageCircle size={15}/> WhatsApp <ExternalLink size={12}/></a><button onClick={() => printReceipt(item)} className="flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white"><Printer size={15}/> Comprobante</button><button onClick={() => void revoke(item.id)} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-red-700"><ShieldOff size={15}/> Revocar</button></div></div></div></article>)}</div></div></div>}
  </>;
}
