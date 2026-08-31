import Link from "next/link";
import { Download } from "lucide-react";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getViajesDb } from "@/lib/services/operacion.service";
import { getHallazgosDb } from "@/lib/services/hseq.service";
import { getItemsSgsstDb } from "@/lib/services/sgsst.service";
import { getPasosPesvDb } from "@/lib/services/pesv.service";
import { getEstadoDocumento } from "@/lib/types/vehiculo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const [vehiculos, personas, viajes, hallazgos, itemsSgsst, pasosPesv] = await Promise.all([
    getVehiculosDb(),
    getPersonasDb(),
    getViajesDb(),
    getHallazgosDb(),
    getItemsSgsstDb(),
    getPasosPesvDb(),
  ]);

  const vencidosFlota = vehiculos.filter((v) =>
    Object.values(v.documentos).some((f) => getEstadoDocumento(f) === "vencido")
  ).length;

  const viajesEnCurso = viajes.filter((v) => v.estado === "en_curso" || v.estado === "con_novedad").length;

  const criticosHseq = hallazgos.filter(
    (h) => (h.severidad === "critica" || h.severidad === "alta") && h.estado !== "cerrado"
  ).length;

  const sgsstCumplidos = itemsSgsst.filter((i) => i.estado === "cumple").length;
  const sgsstPct = itemsSgsst.length > 0 ? Math.round((sgsstCumplidos / itemsSgsst.length) * 100) : 0;

  const pesvCumplidos = pasosPesv.filter((p) => p.estado === "cumple").length;
  const pesvPct = pasosPesv.length > 0 ? Math.round((pesvCumplidos / pasosPesv.length) * 100) : 0;

  const reportes = [
    {
      id: "flota-documental",
      nombre: "Estado documental de la flota",
      descripcion: "SOAT, RTM y pólizas — vigentes, por vencer y vencidos.",
      href: "/flota",
      valor: `${vencidosFlota} vehículo(s) con documento vencido`,
    },
    {
      id: "personas-perfil",
      nombre: "Expedientes de personal",
      descripcion: "Distribución de conductores, HSEQ, supervisores y administrativos.",
      href: "/personas",
      valor: `${personas.length} personas registradas`,
    },
    {
      id: "operacion-viajes",
      nombre: "Viajes y Despacho",
      descripcion: "Activos, en ruta y con novedades en el periodo.",
      href: "/operacion",
      valor: `${viajesEnCurso} viaje(s) en curso`,
    },
    {
      id: "hseq-hallazgos",
      nombre: "Hallazgos HSEQ abiertos",
      descripcion: "Pendientes de cierre, por severidad.",
      href: "/hseq",
      valor: `${criticosHseq} hallazgo(s) prioritario(s) activos`,
    },
    {
      id: "sgsst-avance",
      nombre: "Avance del SG-SST (Res. 0312)",
      descripcion: "Cumplimiento de la matriz de estándares mínimos.",
      href: "/sgsst",
      valor: `${sgsstPct}% de cumplimiento (${sgsstCumplidos}/${itemsSgsst.length} ítems)`,
    },
    {
      id: "pesv-avance",
      nombre: "Avance del PESV (Res. 40595)",
      descripcion: "Cumplimiento de los 24 pasos e indicadores VIGIA2.",
      href: "/pesv",
      valor: `${pesvPct}% de avance (${pesvCumplidos}/${pasosPesv.length} pasos)`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Centro de Reportes e Indicadores
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Vista consolidada de indicadores clave calculada en vivo desde la base de datos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportes.map((r) => (
          <Card key={r.id} className="flex flex-col justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                {r.nombre}
              </h2>
              <p className="mt-1 text-xs text-fog-400">{r.descripcion}</p>
              <p className="mt-3 text-sm text-radar-cyan font-medium">{r.valor}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Link href={r.href}>
                <Button variant="secondary">Ver módulo</Button>
              </Link>
              <Button variant="ghost" onClick={undefined}>
                <Download size={14} /> Exportar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-fog-400">
        Información lista para auditorías de la Superintendencia de Transporte, Ministerio de Trabajo y ARL.
      </p>
    </div>
  );
}

