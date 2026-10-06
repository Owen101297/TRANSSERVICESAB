"use client";
import { useCallback, useEffect, useState } from "react";
type Person = { id: string; nombre: string; documento: string; rolAcceso: string; estado: string; self: boolean };
type GoogleRequest = { id: string; email: string; nombre: string; estado: string; personaId: string | null };
export default function GoogleAccessPanel() {
  const [data, setData] = useState<{ configured: boolean; people: Person[]; requests: GoogleRequest[] } | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [person, setPerson] = useState(""); const [role, setRole] = useState("conductor");
  const [target, setTarget] = useState(""); const [requestRole, setRequestRole] = useState("conductor");
  const load = useCallback(async () => {
    try { const response = await fetch("/api/admin/cuentas/google", { cache: "no-store" }); if (!response.ok) throw new Error("No se pudo consultar el acceso."); setData(await response.json()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo consultar el acceso."); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (person && data) setRole(data.people.find(item => item.id === person)?.rolAcceso || "conductor"); }, [data, person]);
  async function change(path: string, body: object) {
    setBusy(true); setError("");
    try { const response = await fetch(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se guardó el cambio."); }
    finally { setBusy(false); }
  }
  const selectStyle = "min-h-11 rounded-lg border border-line-600 bg-asphalt-900 p-2 text-sm text-paper-50";
  return <section className="space-y-4">
    <div><h2 className="text-lg font-semibold text-paper-50">Accesos y Google</h2><p className="mt-1 text-sm text-fog-400">Administrador reúne administración, HSEQ, gerencia y logística. Conductor accede únicamente a su portal. Cambiar el rol cierra las sesiones anteriores.</p></div>
    {error && <p role="alert" className="text-sm text-alert-red">{error}</p>}
    {!data ? <p className="text-sm text-fog-400">Cargando…</p> : <>
      <div className="rounded-xl border border-line-600 p-3"><h3 className="text-sm font-semibold text-paper-50">Rol de acceso</h3><div className="mt-3 flex flex-wrap gap-2">
        <select aria-label="Persona para cambiar rol" className={selectStyle} value={person} onChange={event => { setPerson(event.target.value); setRole(data.people.find(item => item.id === event.target.value)?.rolAcceso || "conductor"); }}><option value="">Seleccionar persona…</option>{data.people.map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.documento}</option>)}</select>
        <select aria-label="Rol de acceso" className={selectStyle} value={role} onChange={event => setRole(event.target.value)}><option value="conductor">Conductor</option><option value="administrativo">Administrador</option></select>
        <button disabled={busy || !person} onClick={() => change("/api/admin/cuentas/acceso", { personaId: person, rolAcceso: role })} className="min-h-11 rounded-lg bg-signal-amber px-3 text-sm font-semibold text-asphalt-950 disabled:opacity-50">Guardar rol</button>
      </div></div>
      <div className="rounded-xl border border-line-600 p-3"><h3 className="text-sm font-semibold text-paper-50">Inicio de sesión con Google</h3><p className="mt-1 text-sm text-fog-400">{data.configured ? "Conexión configurada. Toda cuenta nueva requiere tu aprobación." : "Pendiente de configurar el cliente OAuth en Google Cloud. El acceso con clave sigue disponible."}</p><a href="/integraciones/google-acceso" className="mt-2 inline-block text-sm text-radar-cyan">Ver configuración y privacidad</a></div>
      <div className="flex flex-wrap gap-2"><select aria-label="Persona para vincular Google" className={selectStyle} value={target} onChange={event => { setTarget(event.target.value); setRequestRole(data.people.find(item => item.id === event.target.value)?.rolAcceso || "conductor"); }}><option value="">Vincular con persona…</option>{data.people.filter(item => !["inactivo", "retirado"].includes(item.estado)).map(item => <option key={item.id} value={item.id}>{item.nombre} · {item.documento}</option>)}</select><select aria-label="Rol autorizado para Google" className={selectStyle} value={requestRole} onChange={event => setRequestRole(event.target.value)}><option value="conductor">Conductor</option><option value="administrativo">Administrador</option></select></div>
      {data.requests.length === 0 && <p className="text-sm text-fog-400">No hay solicitudes Google.</p>}
      {data.requests.map(item => <article key={item.id} className="space-y-2 rounded-xl border border-line-600 p-3"><p className="text-sm font-semibold text-paper-50">{item.nombre}</p><p className="break-all text-sm text-mist-200">{item.email} · {item.estado}</p><p className="text-xs text-fog-400">{item.personaId ? `Vinculada con ${data.people.find(person => person.id === item.personaId)?.nombre || "persona registrada"} · ${data.people.find(person => person.id === item.personaId)?.rolAcceso === "administrativo" ? "Administrador" : "Conductor"}` : "Sin acceso al ERP"}</p><div className="flex flex-wrap gap-2">
        {item.estado !== "aprobada" && target && <p className="w-full text-xs text-fog-400">Se autorizará esta cuenta para {data.people.find(person => person.id === target)?.nombre} como {requestRole === "administrativo" ? "Administrador" : "Conductor"}.</p>}
        {item.estado !== "aprobada" && <button disabled={busy || !target} onClick={() => change("/api/admin/cuentas/google", { id: item.id, action: "approve", personaId: target, rolAcceso: requestRole })} className="min-h-11 rounded-lg bg-signal-amber px-3 text-sm font-semibold text-asphalt-950 disabled:opacity-50">Autorizar cuenta</button>}
        {item.estado === "pendiente" && <button disabled={busy} onClick={() => change("/api/admin/cuentas/google", { id: item.id, action: "reject" })} className="min-h-11 rounded-lg border border-line-600 px-3 text-sm text-mist-200">Rechazar</button>}
        {item.estado === "aprobada" && <button disabled={busy} onClick={() => change("/api/admin/cuentas/google", { id: item.id, action: "revoke" })} className="min-h-11 rounded-lg border border-line-600 px-3 text-sm text-alert-red">Revocar Google</button>}
      </div></article>)}
    </>}
  </section>;
}
