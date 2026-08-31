import Link from "next/link";
import { ESTANDARES_SGSST } from "@/lib/data/sgsst-estandares";
import { getItemsSgsstDb } from "@/lib/services/sgsst.service";
import { CICLO_LABELS, CicloPHVA } from "@/lib/types/sgsst";
import { Card, StatCard } from "@/components/ui/Card";

const CICLOS: CicloPHVA[] = ["planear", "hacer", "verificar", "actuar"];

const CICLO_COLOR: Record<CicloPHVA, string> = {
  planear: "border-radar-cyan/40",
  hacer: "border-signal-amber/40",
  verificar: "border-ok-green/40",
  actuar: "border-alert-red/40",
};

export default async function SGSSTPage() {
  const allItems = await getItemsSgsstDb();
  const totalItems = allItems.length;
  const cumplidos = allItems.filter((i) => i.estado === "cumple").length;
  const pendientes = allItems.filter((i) => i.estado === "pendiente").length;
  const avanceGlobal = totalItems > 0 ? Math.round((cumplidos / totalItems) * 100) : 0;

  function porcentajeCumplimiento(estandarId: string) {
    const items = allItems.filter((i) => i.estandarId === estandarId);
    if (items.length === 0) return 0;
    const itemsCumplidos = items.filter((i) => i.estado === "cumple").length;
    return Math.round((itemsCumplidos / items.length) * 100);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          SG-SST · Sistema de Gestión de Seguridad y Salud en el Trabajo
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Matriz de estándares mínimos (Resolución 0312 de 2019 / Decreto 1072 de 2015) —
          organiza el ciclo PHVA completo.
        </p>
      </div>

      <div className="rounded-lg border border-signal-amber/30 bg-signal-amber-dim p-4 text-sm text-mist-200">
        Estructura de los 7 estándares (60 ítems). Entra a cada estándar para gestionar tus documentos y evidencias (política, matriz legal, matriz IPER, planes y actas).
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
                const items = allItems.filter((i) => i.estandarId === estandar.id);
                const pct = porcentajeCumplimiento(estandar.id);
                return (
                  <Link key={estandar.id} href={`/sgsst/${estandar.id}`}>
                    <Card className={`h-full border-l-4 hover:bg-asphalt-800/50 transition-colors ${CICLO_COLOR[ciclo]}`}>
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

