import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getIndicadoresPesvDb } from "@/lib/services/pesv.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getEstadoDocumento } from "@/lib/types/vehiculo";
import { PeriodicidadIndicador } from "@/lib/types/pesv";
import { Card } from "@/components/ui/Card";

const PERIODICIDADES: PeriodicidadIndicador[] = ["mensual", "trimestral", "anual"];

const PERIODICIDAD_LABELS: Record<PeriodicidadIndicador, string> = {
  mensual: "Mensuales",
  trimestral: "Trimestrales",
  anual: "Anuales",
};

export const dynamic = "force-dynamic";

export default async function IndicadoresPESVPage() {
  const vehiculos = await getVehiculosDb();
  const indicadores = await getIndicadoresPesvDb();

  const total = vehiculos.length;
  const alDia = vehiculos.filter((v) => {
    const estados = Object.values(v.documentos).map(getEstadoDocumento);
    return estados.every((e) => e === "vigente");
  }).length;
  const documentacionAlDia = total > 0 ? Math.round((alDia / total) * 100) : 100;

  return (
    <div className="space-y-6">
      <Link
        href="/pesv"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a PESV
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Indicadores PESV
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Corresponde al Formulario 2 de VIGIA2 — reporte periódico, plazo
            hasta el décimo día hábil del mes siguiente al periodo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pesv/conductores"
            className="inline-flex items-center gap-2 rounded-md border border-line-600 bg-asphalt-800 px-3 py-1.5 text-xs text-paper-50 hover:bg-asphalt-700 transition-colors"
          >
            Scorecard Conductores
          </Link>
          <a
            href="/api/reportes/sisi-pesv?format=csv"
            download
            className="inline-flex items-center gap-2 rounded-md border border-radar-cyan/30 bg-radar-cyan-dim px-3 py-1.5 text-xs text-radar-cyan hover:bg-radar-cyan/20 transition-colors"
          >
            Descargar SISI-PESV (CSV)
          </a>
        </div>
      </div>

      {PERIODICIDADES.map((periodo) => {
        const indicadoresPeriodo = indicadores.filter((i) => i.periodicidad === periodo);
        return (
          <div key={periodo}>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-fog-400">
              {PERIODICIDAD_LABELS[periodo]}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {indicadoresPeriodo.map((ind) => {
                const esDocumentacion = ind.id === "ind7";
                const valor = esDocumentacion ? documentacionAlDia : ind.valorActual;
                return (
                  <Card key={ind.id}>
                    <div className="flex items-start justify-between">
                      <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-paper-50">
                        {ind.nombre}
                      </h3>
                      <span
                        className={`font-[family-name:var(--font-display)] text-2xl font-bold ${
                          valor !== undefined ? "text-radar-cyan" : "text-fog-400"
                        }`}
                      >
                        {valor !== undefined ? `${valor}${ind.unidad === "%" ? "%" : ""}` : "—"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-fog-400">{ind.descripcion}</p>
                    {esDocumentacion && (
                      <p className="mt-2 text-xs text-radar-cyan">
                        Calculado en vivo desde el módulo Flota ({alDia} de {total} vehículos con documentos al día).
                      </p>
                    )}
                    {!esDocumentacion && (
                      <p className="mt-2 text-xs text-fog-400">
                        Unidad: {ind.unidad} — Autogestión VIGIA2.
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

