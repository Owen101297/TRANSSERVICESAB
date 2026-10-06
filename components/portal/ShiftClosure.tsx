"use client";
import { useState } from "react";
export function ShiftClosure({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [odometer, setOdometer] = useState("");
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/portal-conductor/turno", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, odometroFinal: Number(odometer), fotoOdometroFinalUrl: photo }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se guardó el cierre.");
      setOpen(false); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se guardó el cierre."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-4">
    <button onClick={() => setOpen(!open)} className="min-h-11 text-sm font-semibold text-blue-700">Cerrar esta jornada</button>
    {open && <div className="space-y-3"><p className="text-sm text-slate-600">Finaliza tus viajes y registra el odómetro de llegada. El cierre quedará en tu historial.</p>
      <label className="block text-sm">Odómetro final<input type="number" min="1" value={odometer} onChange={event => setOdometer(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border p-2" /></label>
      <label className="block text-sm">Fotografía del odómetro<input type="file" accept="image/*" capture="environment" className="mt-1 block w-full" onChange={event => {
        const file = event.target.files?.[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setError("Usa una fotografía de menos de 5 MB."); return; }
        const reader = new FileReader(); reader.onload = () => setPhoto(String(reader.result)); reader.readAsDataURL(file);
      }} /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button onClick={save} disabled={busy || !photo || !odometer} className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Guardando…" : "Guardar cierre"}</button>
    </div>}
  </section>;
}
