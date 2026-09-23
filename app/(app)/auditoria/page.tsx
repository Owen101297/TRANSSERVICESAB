import Link from "next/link";
import { requireStaffSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Creación",
  UPDATE: "Actualización",
  DELETE: "Eliminación",
  STATUS_CHANGE: "Cambio de estado",
  APPROVE: "Aprobación",
  LOGIN: "Inicio de sesión",
  PASSWORD_CHANGE: "Cambio de clave",
};

function safePage(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; entity?: string }>;
}) {
  await requireStaffSession(["administrativo"]);

  const params = await searchParams;
  const page = safePage(params.page);
  const action = params.action?.trim().toUpperCase() || undefined;
  const entity = params.entity?.trim() || undefined;
  const where = {
    ...(action ? { action } : {}),
    ...(entity ? { entityType: { contains: entity, mode: "insensitive" as const } } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    query.set("page", String(target));
    if (action) query.set("action", action);
    if (entity) query.set("entity", entity);
    return `/auditoria?${query.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-slate-900">
          Auditoría del sistema
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Trazabilidad de operaciones críticas, actor, origen y momento de ejecución.
        </p>
      </div>

      <Card>
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" action="/auditoria">
          <label className="text-xs font-semibold text-slate-600">
            Acción
            <select name="action" defaultValue={action || ""} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="">Todas</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Entidad
            <input name="entity" defaultValue={entity || ""} placeholder="Viaje, EventoGPS…" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900" />
          </label>
          <button type="submit" className="self-end rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Filtrar
          </button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Acción</th><th className="px-4 py-3">Entidad</th><th className="px-4 py-3">Origen</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="text-slate-700">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{record.createdAt.toLocaleString("es-CO", { timeZone: "America/Bogota" })}</td>
                  <td className="px-4 py-3"><span className="font-semibold text-slate-900">{record.actorName}</span><span className="block text-xs text-slate-500">{record.actorRole}</span></td>
                  <td className="px-4 py-3">{ACTION_LABELS[record.action] || record.action}</td>
                  <td className="px-4 py-3"><span className="font-semibold">{record.entityType}</span>{record.entityId && <span className="block max-w-48 truncate font-mono text-xs text-slate-500" title={record.entityId}>{record.entityId}</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{record.ipAddress || "—"}</td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No hay registros para los filtros seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          <span>{total} registros · Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700">Anterior</Link>}
            {page < totalPages && <Link href={pageHref(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700">Siguiente</Link>}
          </div>
        </div>
      </Card>
    </div>
  );
}
