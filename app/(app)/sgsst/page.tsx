import Link from "next/link";
import { ESTANDARES_SGSST } from "@/lib/data/sgsst-estandares";
import { ITEMS_SGSST, getItemsPorEstandar } from "@/lib/data/sgsst-items";
import { CICLO_LABELS, CicloPHVA } from "@/lib/types/sgsst";
import { Card, StatCard } from "@/components/ui/Card";

const CICLOS: CicloPHVA[] = ["planear", "hacer", "verificar", "actuar"];

const CICLO_COLOR: Record<CicloPHVA, string> = {
  planear: "border-radar-cyan/40",
  hacer: "border-signal-amber/40",
  verificar: "border-ok-green/40",
  actuar: "border-alert-red/40",
};

function porcentajeCumplimiento(estandarId: string) {
  const items = getItemsPorEstandar(estandarId);
  if (items.length === 0) return 0;
  const cumplidos = items.filter((i) => i.estado === "cumple").length;
  return Math.round((cumplidos / items.length) * 100);
}

export default function SGSSTPage() {
  const totalItems = ITEMS_SGSST.length;
  const cumplidos = ITEMS_SGSST.filter((i) => i.estado === "cumple").length;
  const pendientes = ITEMS_SGSST.filter((i) => i.estado === "pendiente").length;
  const avanceGlobal = Math.round((cumplidos / totalItems) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          SG-SST
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Matriz general de estándares mínimos (Resolución 0312 de 2019) —
          organiza el ciclo PHVA completo del sistema de gestión.
        </p>
      </div>

      <div className="rounded-lg border border-signal-amber/30 bg-signal-amber-dim p-4 text-sm text-mist-200">
        Este módulo trae la estructura general de los 7 estándares (60 ítems),
        todos marcados como <span className="text-signal-amber">pendientes</span>.
        Entra a cada estándar para subir tus documentos reales (política,
        matriz legal, matriz IPER, planes, actas, etc.) y actualizar el estado
        de cumplimiento.
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <StatCard label="Avance global" value={`${avanceGlobal}%`} accent="cyan" />
        <StatCard label="Ítems cumplidos" value={cumplidos} accent="green" />
        <StatCard label="Pendientes" value={pendientes} accent="amber" />
      </div>

      {CICLOS.map((ciclo) => {
        const estandaresDelCiclo = ESTANDARES_SGSST.filter((e) => e.ciclo === ciclo);
        return (
          <div key={ciclo}>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-fog-400">
              {CICLO_LABELS[ciclo]}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {estandaresDelCiclo.map((estandar) => {
                const items = getItemsPorEstandar(estandar.id);
                const pct = porcentajeCumplimiento(estandar.id);
                return (
                  <Link key={estandar.id} href={`/sgsst/${estandar.id}`}>
                    <Card className={`h-full border-l-4 hover:bg-asphalt-800/50 ${CICLO_COLOR[ciclo]}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-fog-400">
                          Estándar {estandar.numero}
                        </span>
                        <span className="font-mono text-xs text-fog-400">
                          {estandar.pesoPorcentual}%
                        </span>
                      </div>
                      <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                        {estandar.nombre}
                      </h3>
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-asphalt-700">
                          <div
                            className="h-full rounded-full bg-radar-cyan"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-fog-400">
                          {pct}% · {items.length} ítems
                        </p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
