import Link from "next/link";
import { Download } from "lucide-react";
import { SEED_VEHICULOS } from "@/lib/data/vehiculos";
import { SEED_PERSONAS } from "@/lib/data/personas";
import { SEED_VIAJES } from "@/lib/data/viajes";
import { SEED_HALLAZGOS } from "@/lib/data/hallazgos";
import { getEstadoDocumento } from "@/lib/types/vehiculo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const reportes = [
  {
    id: "flota-documental",
    nombre: "Estado documental de la flota",
    descripcion: "SOAT, RTM y pólizas — vigentes, por vencer y vencidos.",
    href: "/flota",
    valor: () => {
      const vencidos = SEED_VEHICULOS.filter((v) =>
        Object.values(v.documentos).some((f) => getEstadoDocumento(f) === "vencido")
      ).length;
      return `${vencidos} vehículo(s) con documento vencido`;
    },
  },
  {
    id: "personas-perfil",
    nombre: "Personas por perfil",
    descripcion: "Distribución de conductores, HSEQ, supervisores y administrativos.",
    href: "/personas",
    valor: () => `${SEED_PERSONAS.length} personas registradas`,
  },
  {
    id: "operacion-viajes",
    nombre: "Viajes por estado",
    descripcion: "Activos, programados y finalizados en el periodo.",
    href: "/operacion",
    valor: () => `${SEED_VIAJES.filter((v) => v.estado === "en_curso").length} viaje(s) en curso`,
  },
  {
    id: "hseq-hallazgos",
    nombre: "Hallazgos HSEQ abiertos",
    descripcion: "Pendientes de cierre, por severidad.",
    href: "/hseq",
    valor: () => {
      const criticos = SEED_HALLAZGOS.filter((h) => h.severidad === "critica" && h.estado !== "cerrado").length;
      return `${criticos} hallazgo(s) crítico(s) activos`;
    },
  },
  {
    id: "sgsst-avance",
    nombre: "Avance del SG-SST",
    descripcion: "Cumplimiento de la matriz de estándares mínimos.",
    href: "/sgsst",
    valor: () => "Ver matriz completa",
  },
  {
    id: "pesv-avance",
    nombre: "Avance del PESV",
    descripcion: "Cumplimiento de los 24 pasos e indicadores VIGIA2.",
    href: "/pesv",
    valor: () => "Ver matriz completa",
  },
];

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Reportes
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          Vista consolidada de indicadores clave de cada módulo.
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
              <p className="mt-3 text-sm text-radar-cyan">{r.valor()}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Link href={r.href}>
                <Button variant="secondary">Ver módulo</Button>
              </Link>
              <Button variant="ghost">
                <Download size={14} /> Exportar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-fog-400">
        Exportar (PDF/Excel) es solo interfaz por ahora — pendiente conectar
        al backend y a un motor de generación de reportes.
      </p>
    </div>
  );
}
