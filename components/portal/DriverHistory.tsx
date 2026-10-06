"use client";
import { ShiftClosure } from "@/components/portal/ShiftClosure";
import { useEffect, useState } from "react";
type Entry = { proceso?: string; id: string; fecha?: string; fechaSalida?: string; placa: string; estado?: string; estadoConcepto?: string; origen?: string; destino?: string; odometroInicial?: number; odometroFinal?: number | null };
export function DriverHistory({ refresh }: { refresh: number }) {
  const [data, setData] = useState<Record<string, Entry[]> | null>(null);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/portal-conductor/historial", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("No se pudo consultar tu historial.");
      setData(await response.json()); setError("");
    }).catch(cause => { if (cause.name !== "AbortError") setError(cause.message); });
    return () => controller.abort();
  }, [refresh, reload]);
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Cargando historial…</p>;
  return <section className="space-y-3"><h2 className="text-sm font-semibold">Tu historial · últimos 30 registros por proceso</h2>{[ ["jornadas", "Jornadas"], ["inspecciones", "Preoperacionales"], ["viajes", "Viajes"], ["apps", "Registros de apps"] ].map(([key, title]) => <details key={key} className="rounded-xl border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">{title} · {data[key].length}</summary><div className="mt-3 space-y-3">{data[key].length === 0 && <p className="text-sm text-slate-500">Aún no tienes registros.</p>}{data[key].map(entry => <div key={entry.id} className="border-t border-slate-100 pt-2 text-sm"><p className="font-medium">{entry.proceso ? `${entry.proceso} · ` : ""}{entry.placa} · {(entry.estado || entry.estadoConcepto || "").replaceAll("_", " ")}</p><p className="text-xs text-slate-500">{new Date(entry.fecha || entry.fechaSalida || "").toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>{entry.origen && <p>{entry.origen} → {entry.destino}</p>}{entry.odometroInicial !== undefined && <p>{entry.odometroInicial} km → {entry.odometroFinal == null ? "Cierre pendiente" : `${entry.odometroFinal} km`}</p>}{key === "jornadas" && entry.estado === "activo" && <ShiftClosure id={entry.id} onSaved={() => setReload(value => value + 1)} />}</div>)}</div></details>)}</section>;
}
