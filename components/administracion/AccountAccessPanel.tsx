"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import type { AccountAction } from "@/lib/account-lifecycle";

type PersonAccount = {
  id: string;
  nombre: string;
  documento: string;
  email: string;
  perfiles: string[];
  rolAcceso: "administrativo" | "conductor";
  estadoLaboral: string;
  esUsuarioActual: boolean;
  cuenta: {
    estado: string;
    ultimoAccesoAt: string | null;
    intentosFallidos: number;
    bloqueadaHasta: string | null;
    motivoBloqueo: string | null;
  };
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

type PendingAction = { person: PersonAccount; action: AccountAction };

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente de activación",
  activa: "Activa",
  bloqueada: "Bloqueada",
  suspendida: "Suspendida",
  generado: "Enlace generado",
  entregado: "Entregado",
  abierto: "Abierto",
  activado: "Activado",
  vencido: "Vencido",
  revocado: "Revocado",
};

const STATUS_STYLES: Record<string, string> = {
  activa: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  pendiente: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  bloqueada: "border-red-500/30 bg-red-500/10 text-red-300",
  suspendida: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

const ACTION_COPY: Record<AccountAction, { title: string; description: string; confirm: string }> = {
  block: {
    title: "Bloquear cuenta",
    description: "Cierra las sesiones activas, revoca enlaces pendientes e impide nuevos ingresos hasta que un administrador la desbloquee.",
    confirm: "Bloquear cuenta",
  },
  unlock: {
    title: "Desbloquear cuenta",
    description: "Limpia los intentos fallidos. Si la persona conserva una credencial, podrá volver a ingresar.",
    confirm: "Desbloquear",
  },
  suspend: {
    title: "Suspender cuenta",
    description: "Cierra las sesiones y deshabilita el acceso de forma administrativa hasta una reactivación expresa.",
    confirm: "Suspender cuenta",
  },
  reactivate: {
    title: "Reactivar cuenta",
    description: "Habilita nuevamente la cuenta. Si no existe una credencial, quedará pendiente de activación.",
    confirm: "Reactivar",
  },
  revoke_sessions: {
    title: "Cerrar todas las sesiones",
    description: "La clave actual seguirá siendo válida, pero todos los dispositivos deberán iniciar sesión nuevamente.",
    confirm: "Cerrar sesiones",
  },
};

function canReset(person: PersonAccount) {
  return (
    !person.esUsuarioActual &&
    !["inactivo", "retirado"].includes(person.estadoLaboral) &&
    ["pendiente", "activa"].includes(person.cuenta.estado)
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("es-CO") : "Sin registro";
}

export default function AccountAccessPanel() {
  const [people, setPeople] = useState<PersonAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generated, setGenerated] = useState<Generated[]>([]);
  const [copied, setCopied] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cuentas/activaciones", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No fue posible cargar las cuentas.");
      setPeople(body.personas || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cargar las cuentas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) =>
      `${person.nombre} ${person.documento} ${person.email} ${person.cuenta.estado}`
        .toLowerCase()
        .includes(term),
    );
  }, [people, query]);

  const selectable = useMemo(() => filtered.filter(canReset), [filtered]);

  async function generateFor(personaIds: string[]) {
    if (!personaIds.length) return;
    const targets = people.filter((person) => personaIds.includes(person.id));
    const activeCount = targets.filter((person) => person.cuenta.estado === "activa").length;
    if (
      activeCount > 0 &&
      !window.confirm(
        `Esta acción cerrará las sesiones y eliminará la credencial actual de ${activeCount} cuenta${activeCount === 1 ? "" : "s"} activa${activeCount === 1 ? "" : "s"}. ¿Continuar?`,
      )
    ) {
      return;
    }

    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/cuentas/activaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaIds, expirationHours: 72 }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No fue posible generar los enlaces.");
      setGenerated(body.activaciones || []);
      setSelected(new Set());
      setNotice("El acceso anterior quedó revocado y los nuevos enlaces están listos para entregar.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible generar los enlaces.");
    } finally {
      setGenerating(false);
    }
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function markDelivered(item: Generated, medium: string) {
    const response = await fetch("/api/admin/cuentas/activaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, action: "delivered", medium }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "No fue posible registrar la entrega.");
      return;
    }
    await load();
  }

  async function revoke(id: string) {
    if (!window.confirm("¿Revocar este enlace? La persona ya no podrá utilizarlo.")) return;
    const response = await fetch("/api/admin/cuentas/activaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "revoke" }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "No fue posible revocar el enlace.");
      return;
    }
    setGenerated((items) => items.filter((item) => item.id !== id));
    setNotice("El enlace quedó revocado.");
    await load();
  }

  function openAction(person: PersonAccount, action: AccountAction) {
    setReason("");
    setError("");
    setPendingAction({ person, action });
  }

  async function applyAction() {
    if (!pendingAction) return;
    if (["block", "suspend"].includes(pendingAction.action) && reason.trim().length < 5) {
      setError("Registra un motivo claro de al menos 5 caracteres.");
      return;
    }

    setActionBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/cuentas/estado", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: pendingAction.person.id,
          action: pendingAction.action,
          reason: reason.trim(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No fue posible actualizar la cuenta.");
      setNotice(`${ACTION_COPY[pendingAction.action].title}: operación completada para ${pendingAction.person.nombre}.`);
      setPendingAction(null);
      setReason("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible actualizar la cuenta.");
    } finally {
      setActionBusy(false);
    }
  }

  function printReceipt(item: Generated) {
    const popup = window.open("", "_blank", "width=720,height=900");
    if (!popup) {
      setError("El navegador bloqueó la ventana del comprobante.");
      return;
    }
    popup.opener = null;
    const escapeHtml = (value: string) =>
      value.replace(/[&<>'"]/g, (char) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!,
      );
    popup.document.write(`<!doctype html><html><head><title>Activación - ${escapeHtml(item.nombre)}</title><style>body{font-family:Arial,sans-serif;color:#0f172a;padding:48px;max-width:680px;margin:auto}.brand{font-size:22px;font-weight:800}.card{border:1px solid #cbd5e1;border-radius:20px;padding:28px;margin-top:28px}img{display:block;width:220px;height:220px;margin:24px auto}.muted{color:#64748b;font-size:13px}.link{word-break:break-all;font-size:12px;background:#f1f5f9;padding:12px;border-radius:10px}@media print{button{display:none}}</style></head><body><div class="brand">TRANS SERVICES A&amp;B</div><p class="muted">Comprobante de entrega de acceso</p><div class="card"><h1>${escapeHtml(item.nombre)}</h1><p>Acceso: ${item.tipoAcceso === "erp" ? "ERP Administrativo" : "Portal del Conductor"}</p><img src="${item.qrDataUrl}" alt="Código QR"><p class="link">${escapeHtml(item.link)}</p><p class="muted">Enlace individual, de un solo uso. Vence: ${escapeHtml(new Date(item.expiraAt).toLocaleString("es-CO"))}</p><p>Firma de recibido: ______________________________</p><p>Fecha: __________________</p></div><button onclick="window.print()">Imprimir / Guardar PDF</button></body></html>`);
    popup.document.close();
  }

  if (loading) {
    return (
      <div className="flex min-h-52 items-center justify-center">
        <Loader2 className="animate-spin text-radar-cyan" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, documento, correo o estado"
              className="h-11 w-full rounded-xl border border-line-600 bg-asphalt-900 pl-10 pr-3 text-sm text-paper-50 outline-none focus:border-radar-cyan"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void load()}
              className="grid size-11 place-items-center rounded-xl border border-line-600 text-fog-400 hover:text-paper-50"
              aria-label="Actualizar cuentas"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => void generateFor([...selected])}
              disabled={!selected.size || generating}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-signal-amber px-4 text-sm font-bold text-asphalt-950 disabled:opacity-50"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              Crear/restablecer acceso {selected.size ? `(${selected.size})` : ""}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-radar-cyan/20 bg-radar-cyan/5 p-3 text-xs leading-5 text-mist-200">
          Restablecer acceso elimina la credencial anterior y cierra todas las sesiones. Cerrar sesiones conserva la clave actual.
        </div>
        {notice && (
          <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-xl border border-alert-red/40 bg-alert-red/10 p-3 text-sm text-alert-red">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-line-600">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-asphalt-800 text-xs uppercase text-fog-400">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar cuentas visibles habilitadas"
                    checked={selectable.length > 0 && selectable.every((person) => selected.has(person.id))}
                    onChange={(event) =>
                      setSelected(event.target.checked ? new Set(selectable.map((person) => person.id)) : new Set())
                    }
                  />
                </th>
                <th className="p-3">Persona</th>
                <th className="p-3">Estado de cuenta</th>
                <th className="p-3">Actividad</th>
                <th className="p-3">Último enlace</th>
                <th className="p-3">Acciones administrativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-600">
              {filtered.map((person) => (
                <tr key={person.id} className="bg-asphalt-900 align-top">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar a ${person.nombre}`}
                      checked={selected.has(person.id)}
                      disabled={!canReset(person)}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(person.id);
                          else next.delete(person.id);
                          return next;
                        })
                      }
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-paper-50">{person.nombre}</p>
                      {person.esUsuarioActual && (
                        <span className="rounded-full bg-radar-cyan/10 px-2 py-0.5 text-[10px] font-bold text-radar-cyan">Tú</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-fog-400">{person.documento}</p>
                    <p className="mt-1 text-xs text-fog-400">{person.rolAcceso === "administrativo" ? "Administrador" : "Conductor"}</p>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[person.cuenta.estado] || "border-line-600 text-mist-200"}`}>
                      {STATUS_LABELS[person.cuenta.estado] || person.cuenta.estado}
                    </span>
                    {person.cuenta.motivoBloqueo && (
                      <p className="mt-2 max-w-56 text-xs leading-5 text-fog-400">{person.cuenta.motivoBloqueo}</p>
                    )}
                    {person.cuenta.bloqueadaHasta && (
                      <p className="mt-1 text-[11px] text-fog-400">Hasta {formatDate(person.cuenta.bloqueadaHasta)}</p>
                    )}
                  </td>
                  <td className="p-3 text-xs text-fog-400">
                    <p>Último ingreso</p>
                    <p className="mt-1 text-mist-200">{formatDate(person.cuenta.ultimoAccesoAt)}</p>
                    {person.cuenta.intentosFallidos > 0 && (
                      <p className="mt-2 text-amber-300">{person.cuenta.intentosFallidos} intento(s) fallido(s)</p>
                    )}
                  </td>
                  <td className="p-3 text-xs text-fog-400">
                    {person.ultimoEnlace ? (
                      <>
                        <p className="text-mist-200">{STATUS_LABELS[person.ultimoEnlace.estado] || person.ultimoEnlace.estado}</p>
                        <p className="mt-1">Vence {formatDate(person.ultimoEnlace.expiraAt)}</p>
                        {!['activado', 'vencido', 'revocado'].includes(person.ultimoEnlace.estado) && (
                          <button
                            onClick={() => void revoke(person.ultimoEnlace!.id)}
                            className="mt-2 flex items-center gap-1 font-semibold text-alert-red"
                          >
                            <ShieldOff size={14} /> Revocar enlace
                          </button>
                        )}
                      </>
                    ) : (
                      "Sin enlace"
                    )}
                  </td>
                  <td className="p-3">
                    {person.esUsuarioActual ? (
                      <p className="max-w-60 text-xs leading-5 text-fog-400">Protegida para evitar que cierres o bloquees tu propia sesión.</p>
                    ) : (
                      <div className="flex max-w-80 flex-wrap gap-2">
                        {canReset(person) && (
                          <button onClick={() => void generateFor([person.id])} disabled={generating} className="rounded-lg border border-line-600 px-2.5 py-1.5 text-xs font-semibold text-mist-200 hover:border-signal-amber hover:text-signal-amber">
                            {person.cuenta.estado === "activa" ? "Restablecer" : "Generar enlace"}
                          </button>
                        )}
                        {["pendiente", "activa"].includes(person.cuenta.estado) && (
                          <button onClick={() => openAction(person, "block")} className="flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-300">
                            <LockKeyhole size={13} /> Bloquear
                          </button>
                        )}
                        {person.cuenta.estado === "bloqueada" && (
                          <button onClick={() => openAction(person, "unlock")} className="flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-300">
                            <ShieldCheck size={13} /> Desbloquear
                          </button>
                        )}
                        {["pendiente", "activa", "bloqueada"].includes(person.cuenta.estado) && (
                          <button onClick={() => openAction(person, "suspend")} className="flex items-center gap-1 rounded-lg border border-line-600 px-2.5 py-1.5 text-xs font-semibold text-fog-400">
                            <Ban size={13} /> Suspender
                          </button>
                        )}
                        {person.cuenta.estado === "suspendida" && (
                          <button onClick={() => openAction(person, "reactivate")} className="flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-300">
                            <RotateCcw size={13} /> Reactivar
                          </button>
                        )}
                        {person.cuenta.estado === "activa" && (
                          <button onClick={() => openAction(person, "revoke_sessions")} className="flex items-center gap-1 rounded-lg border border-line-600 px-2.5 py-1.5 text-xs font-semibold text-fog-400">
                            <ShieldOff size={13} /> Cerrar sesiones
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <p className="py-10 text-center text-sm text-fog-400">No hay usuarios que coincidan con la búsqueda.</p>}
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="account-action-title" className="w-full max-w-lg rounded-3xl bg-white p-6 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Control administrativo</p>
                <h2 id="account-action-title" className="mt-2 text-xl font-extrabold">{ACTION_COPY[pendingAction.action].title}</h2>
                <p className="mt-1 font-semibold text-slate-700">{pendingAction.person.nombre}</p>
              </div>
              <button onClick={() => setPendingAction(null)} className="grid size-10 place-items-center rounded-xl bg-slate-100" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{ACTION_COPY[pendingAction.action].description}</p>
            {["block", "suspend"].includes(pendingAction.action) && (
              <label className="mt-5 block text-sm font-bold text-slate-800">
                Motivo obligatorio
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={300}
                  rows={4}
                  placeholder="Describe la razón administrativa y el soporte de la decisión."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <span className="mt-1 block text-right text-xs font-normal text-slate-500">{reason.length}/300</span>
              </label>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPendingAction(null)} disabled={actionBusy} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700">Cancelar</button>
              <button onClick={() => void applyAction()} disabled={actionBusy} className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-60">
                {actionBusy && <Loader2 size={16} className="animate-spin" />}
                {ACTION_COPY[pendingAction.action].confirm}
              </button>
            </div>
          </section>
        </div>
      )}

      {generated.length > 0 && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-5 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-extrabold">Enlaces listos para entregar</h2>
                <p className="mt-1 text-sm text-slate-600">Se muestran una sola vez. Copia el mensaje o descarga el comprobante.</p>
              </div>
              <button onClick={() => setGenerated([])} className="grid size-10 place-items-center rounded-xl bg-slate-100" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {generated.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* El QR se genera localmente para este enlace efímero y no tiene una URL optimizable. */}
                    <img src={item.qrDataUrl} alt={`QR de activación de ${item.nombre}`} className="size-32 rounded-xl border border-slate-200" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold">{item.nombre}</h3>
                      <p className="text-xs text-slate-500">{item.tipoAcceso === "erp" ? "ERP Administrativo" : "Portal del Conductor"} · vence {new Date(item.expiraAt).toLocaleString("es-CO")}</p>
                      <p className="mt-3 break-all rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-600">{item.link}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => void copy(item.link, `link-${item.id}`)} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold">
                          {copied === `link-${item.id}` ? <Check size={15} /> : <Copy size={15} />} Copiar enlace
                        </button>
                        <button onClick={() => void copy(item.message, `message-${item.id}`)} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold">
                          {copied === `message-${item.id}` ? <Check size={15} /> : <Copy size={15} />} Copiar mensaje
                        </button>
                        <a onClick={() => void markDelivered(item, "whatsapp")} href={`https://wa.me/?text=${encodeURIComponent(item.message)}`} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white">
                          <MessageCircle size={15} /> WhatsApp <ExternalLink size={12} />
                        </a>
                        <button onClick={() => printReceipt(item)} className="flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white">
                          <Printer size={15} /> Comprobante
                        </button>
                        <button onClick={() => void revoke(item.id)} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold text-red-700">
                          <ShieldOff size={15} /> Revocar
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
