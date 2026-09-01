"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  UploadCloud,
  Download,
  Building2,
  Truck,
  Users2,
  Trash2,
  RotateCcw,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  Contratista,
  ESTADO_CONTRATISTA_LABELS,
  EstadoContratista,
  TIPO_OPERACION_LABELS,
  TipoOperacion,
} from "@/lib/types/contratista";
import { Vehiculo } from "@/lib/types/vehiculo";
import { Persona } from "@/lib/types/persona";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { IconButton } from "@/components/ui/IconButton";
import { AlertasContratosPanel } from "@/components/contratistas/AlertasContratosPanel";
import { BulkUploadContratistasModal } from "@/components/contratistas/BulkUploadContratistasModal";
import { exportContratistasToExcel } from "@/lib/data/contratistas-excel-export";
import { evaluarAlertaContrato } from "@/lib/utils/alertas-contratos";
import { deleteContratistaDb } from "@/lib/services/contratistas.service";

const ESTADO_TO_STATUS: Record<EstadoContratista, "activo" | "cerrado"> = {
  activo: "activo",
  inactivo: "cerrado",
};

interface ContratistasClientViewProps {
  initialContratistas: Contratista[];
  vehiculos: Vehiculo[];
  personas: Persona[];
}

export function ContratistasClientView({
  initialContratistas,
  vehiculos,
  personas,
}: ContratistasClientViewProps) {
  const [contratistas, setContratistas] = useState<Contratista[]>(initialContratistas);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [onlyWithAlerts, setOnlyWithAlerts] = useState(false);
  const [currentTab, setCurrentTab] = useState<"todos" | "fija" | "rotativa" | "inactivos">("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const contarVehiculos = (contratistaId: string) => {
    return vehiculos.filter((v) => v.contratistaId === contratistaId).length;
  };

  const contarConductores = (contratistaId: string) => {
    return personas.filter((p) => p.contratistaId === contratistaId).length;
  };

  const handleDeleteContratista = async (id: string, nombre: string) => {
    const cantV = contarVehiculos(id);
    const cantC = contarConductores(id);

    if (cantV > 0 || cantC > 0) {
      alert(`No se puede eliminar la empresa "${nombre}" porque tiene ${cantV} vehículo(s) y ${cantC} conductor(es) vinculados. Reasigna o desvincula sus recursos primero.`);
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar permanentemente a "${nombre}" de la base de datos?`)) {
      return;
    }

    setIsDeleting(id);
    try {
      const res = await deleteContratistaDb(id);
      if (res.success && res.refreshedList) {
        setContratistas(res.refreshedList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(null);
    }
  };

  // Filtrado de contratistas
  const filteredContratistas = contratistas.filter((c) => {
    if (onlyWithAlerts) {
      const alerta = evaluarAlertaContrato(c);
      if (alerta.nivel === "optimo" || alerta.nivel === "indefinido") return false;
    }

    if (currentTab === "fija" && c.tipoOperacion !== "fija") return false;
    if (currentTab === "rotativa" && c.tipoOperacion !== "rotativa") return false;
    if (currentTab === "inactivos" && c.estado !== "inactivo") return false;
    if (currentTab !== "inactivos" && c.estado === "inactivo" && currentTab !== "todos") return false;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      const matchNombre = c.nombre.toLowerCase().includes(query);
      const matchNit = c.nit.toLowerCase().includes(query);
      const matchContacto = c.contactoNombre?.toLowerCase().includes(query);
      return matchNombre || matchNit || matchContacto;
    }

    return true;
  });

  const total = contratistas.length;
  const activos = contratistas.filter((c) => c.estado === "activo").length;
  const rotativos = contratistas.filter((c) => c.tipoOperacion === "rotativa" && c.estado === "activo").length;
  const inactivos = contratistas.filter((c) => c.estado === "inactivo").length;

  const columns: Column<Contratista>[] = [
    {
      header: "Contratista / Razón Social",
      accessor: "nombre",
      render: (v, row) => (
        <div>
          <Link
            href={`/contratistas/${row.id}`}
            className="font-semibold text-paper-50 hover:text-radar-cyan transition-colors"
          >
            {v as string}
          </Link>
          <p className="text-[11px] text-fog-400 font-mono">
            {row.contactoNombre} {row.contactoTelefono ? `· ${row.contactoTelefono}` : ""}
          </p>
        </div>
      ),
    },
    {
      header: "NIT",
      accessor: "nit",
      className: "font-mono text-xs text-mist-200",
    },
    {
      header: "Operación",
      accessor: "tipoOperacion",
      render: (v) => (
        <span className="inline-flex items-center rounded border border-line-600 bg-asphalt-800 px-2 py-0.5 text-xs text-mist-200">
          {TIPO_OPERACION_LABELS[v as TipoOperacion]}
        </span>
      ),
    },
    {
      header: "Vigencia Contrato",
      accessor: "fechaFinContrato",
      render: (_v, row) => {
        const diag = evaluarAlertaContrato(row);
        return (
          <div>
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono border ${diag.badgeClass}`}
            >
              <Calendar size={12} /> {diag.label}
            </span>
            {row.fechaFinContrato && (
              <p className="text-[10px] font-mono text-fog-400 mt-0.5">
                Hasta {row.fechaFinContrato}
              </p>
            )}
          </div>
        );
      },
    },
    {
      header: "Flota",
      accessor: "id",
      render: (v) => {
        const count = contarVehiculos(v as string);
        return (
          <span className="font-mono text-xs font-semibold text-radar-cyan">
            {count} veh.
          </span>
        );
      },
    },
    {
      header: "Personal",
      accessor: "id",
      render: (v) => {
        const count = contarConductores(v as string);
        return (
          <span className="font-mono text-xs font-semibold text-signal-amber">
            {count} cond.
          </span>
        );
      },
    },
    {
      header: "Estado",
      accessor: "estado",
      render: (v) => (
        <StatusBadge status={ESTADO_TO_STATUS[v as EstadoContratista]}>
          {ESTADO_CONTRATISTA_LABELS[v as EstadoContratista]}
        </StatusBadge>
      ),
    },
    {
      header: "Acciones",
      accessor: "id",
      render: (_v, row) => (
        <div className="flex items-center gap-1.5">
          <IconButton
            size="sm"
            variant="ghost"
            icon={<Trash2 size={15} />}
            tooltip="Eliminar permanentemente de la BD"
            className="text-fog-400 hover:text-alert-red hover:bg-alert-red-dim"
            disabled={isDeleting === row.id}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteContratista(row.id, row.nombre);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Contratistas &amp; Aliados Vinculados
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Empresas y propietarios de flota con control documental, vencimiento de contratos y cumplimiento HSEQ.
          </p>
        </div>

        {/* Barra de Acciones Compactas con Tooltips */}
        <div className="flex items-center gap-2.5">
          <IconButton
            icon={<Download size={18} />}
            tooltip={`Exportar matriz oficial Excel CON-FOR-01 (${filteredContratistas.length} empresas)`}
            variant="secondary"
            onClick={() => exportContratistasToExcel(filteredContratistas, vehiculos, personas)}
            disabled={filteredContratistas.length === 0}
          />
          <IconButton
            icon={<UploadCloud size={18} />}
            tooltip="Carga masiva desde archivo Excel / CSV"
            variant="secondary"
            onClick={() => setIsBulkOpen(true)}
          />
          <Link href="/contratistas/nuevo">
            <IconButton
              icon={<Plus size={20} />}
              tooltip="Registrar nuevo contratista o empresa aliada"
              variant="primary"
            />
          </Link>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
        <StatCard label="Total Empresas" value={total} accent="cyan" trend="Aliados registrados" />
        <StatCard label="Empresas Activas" value={activos} accent="green" trend="Operando en ruta" />
        <StatCard label="Operación Rotativa" value={rotativos} accent="amber" trend="Turnos móviles" />
        <StatCard label="Inactivas / Historial" value={inactivos} accent="cyan" trend="Sin contratos vigentes" />
      </div>

      {/* Panel de Alertas Preventivas de Fin de Contrato */}
      <AlertasContratosPanel
        contratistas={contratistas}
        onlyWithAlerts={onlyWithAlerts}
        onToggleOnlyWithAlerts={() => setOnlyWithAlerts(!onlyWithAlerts)}
      />

      {/* Pestañas de Filtrado y Búsqueda */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentTab("todos")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              currentTab === "todos"
                ? "bg-asphalt-700 text-paper-50 border border-line-500 shadow-xs"
                : "text-mist-200 hover:text-paper-50 hover:bg-asphalt-800"
            }`}
          >
            Todos ({contratistas.length})
          </button>
          <button
            onClick={() => setCurrentTab("fija")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              currentTab === "fija"
                ? "bg-radar-cyan-dim text-radar-cyan border border-radar-cyan/30 shadow-xs"
                : "text-mist-200 hover:text-paper-50 hover:bg-asphalt-800"
            }`}
          >
            Asignación Fija
          </button>
          <button
            onClick={() => setCurrentTab("rotativa")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              currentTab === "rotativa"
                ? "bg-signal-amber-dim text-signal-amber border border-signal-amber/30 shadow-xs"
                : "text-mist-200 hover:text-paper-50 hover:bg-asphalt-800"
            }`}
          >
            Rotación por Turnos ({rotativos})
          </button>
          <button
            onClick={() => setCurrentTab("inactivos")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              currentTab === "inactivos"
                ? "bg-asphalt-800 text-fog-400 border border-line-600 shadow-xs"
                : "text-mist-200 hover:text-paper-50 hover:bg-asphalt-800"
            }`}
          >
            Inactivos ({inactivos})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar por nombre, NIT o contacto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-line-600 bg-asphalt-900 px-3 py-1.5 text-xs text-paper-50 placeholder:text-fog-400 focus:border-signal-amber focus:outline-none"
          />
        </div>
      </div>

      {/* Tabla de Contratistas */}
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={filteredContratistas} />
      </Card>

      {/* Modal de Carga Masiva */}
      <BulkUploadContratistasModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        existingContratistas={contratistas}
        onUploadSuccess={(refreshed) => setContratistas(refreshed)}
      />
    </div>
  );
}
