"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
export function PendingSubmissions({ document }: { document: string }) {
  const [pending, setPending] = useState<{ label: string; href: string; count: number }[]>([]);
  useEffect(() => {
    const definitions = [
      { key: "transservices_pending_botiquin", label: "Botiquín", href: "/apps/botiquin/index.html" },
      { key: "transservices_pending_encuestas", label: "Encuesta", href: "/apps/encuesta/index.html" },
      { key: "ts_viajes_offline_queue", label: "Viajes", href: "/apps/viajes/index.html" },
    ];
    setPending(definitions.flatMap(item => {
      try {
        const values = JSON.parse(localStorage.getItem(item.key) || "[]");
        const count = Array.isArray(values) ? values.filter(value => (value.payload || value).conductorDocumento === document).length : 0;
        return count ? [{ ...item, count }] : [];
      } catch { return []; }
    }));
  }, [document]);
  if (!pending.length) return null;
  return <aside className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-sm font-semibold text-amber-900">Pendientes en este dispositivo</p><p className="text-xs text-amber-800">Estos borradores todavía no están confirmados en el ERP. Conserva este navegador y revisa el envío desde cada app con conexión.</p>{pending.map(item => <Link key={item.href} href={item.href} className="block min-h-11 py-2 text-sm font-medium text-amber-900">{item.label} · {item.count} pendiente(s)</Link>)}</aside>;
}
