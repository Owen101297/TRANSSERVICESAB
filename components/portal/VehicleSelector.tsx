"use client";
import { useState } from "react";
import { Loader2, Truck, X } from "lucide-react";

type Vehicle = { id: string; placa: string; marca: string; modelo: string; disponible: boolean };
export function VehicleSelector({ plate, onSaved }: { plate?: string | null; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function show() {
    setOpen(true); setBusy(true); setError("");
    try {
      const response = await fetch("/api/portal-conductor/cambiar-vehiculo", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible consultar vehículos.");
      setVehicles(data.vehiculos); setChoice(plate || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No fue posible consultar vehículos."); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/portal-conductor/cambiar-vehiculo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placa: choice }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "No se guardó el vehículo.");
      localStorage.removeItem("transservices_conductor"); setOpen(false); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se guardó el vehículo."); }
    finally { setBusy(false); }
  }
  return <>
    <button onClick={show} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"><Truck size={17} />{plate ? "Cambiar vehículo" : "Seleccionar vehículo"}</button>
    {open && <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="vehicle-selection" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl">
      <div className="flex items-center justify-between"><h2 id="vehicle-selection" className="text-lg font-semibold">Tu vehículo actual</h2><button onClick={() => setOpen(false)} aria-label="Cerrar selección" className="p-2"><X size={20} /></button></div>
      <p className="text-sm text-slate-500">Selecciona el vehículo que vas a utilizar. Si aparece ocupado, coordinación debe liberar la asignación.</p>
      <select aria-label="Vehículo actual" value={choice} onChange={event => setChoice(event.target.value)} disabled={busy} className="min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm">
        <option value="">Seleccionar placa…</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.placa} disabled={!vehicle.disponible}>{vehicle.placa} · {vehicle.marca} {vehicle.modelo}{vehicle.disponible ? "" : " · Ocupado"}</option>)}
      </select>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button onClick={save} disabled={busy || !choice} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="animate-spin" size={18} />}Usar este vehículo</button>
    </section></div>}
  </>;
}
