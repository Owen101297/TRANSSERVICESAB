"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  UploadCloud,
  Download,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Truck,
  CheckSquare,
  Square,
  Search,
  Filter,
  Zap,
} from "lucide-react";
import {
  Vehiculo,
  TipoVehiculo,
  TIPO_LABELS,
  SERVICIO_LABELS,
  ESTADO_VEHICULO_LABELS,
  EstadoVehiculo,
} from "@/lib/types/vehiculo";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { PlateTag } from "@/components/ui/PlateTag";
import { IconButton } from "@/components/ui/IconButton";
import { AlertasFlotaPanel } from "@/components/flota/AlertasFlotaPanel";
import { BulkUploadFlotaModal } from "@/components/flota/BulkUploadFlotaModal";
import { QuickAsignacionModal } from "@/components/asignaciones/QuickAsignacionModal";
import { VehiculoStatusDropdown } from "@/components/flota/VehiculoStatusDropdown";
import { exportarFlotaAExcel } from "@/lib/data/flota-excel-export";
import { calcularAlertaFecha, analizarAlertasVehiculo } from "@/lib/utils/alertas-flota";
import { deleteMultipleVehiculosDb } from "@/lib/services/vehiculos.service";

interface FlotaClientViewProps {
  initialVehiculos: Vehiculo[];
  asignacionesMap: Record<string, string>;
  conductores?: { id: string; nombres: string; apellidos: string; numeroDocumento?: string; contratistaNombre?: string }[];
}

export function FlotaClientView({
  initialVehiculos,
  asignacionesMap,
  conductores = [],
}: FlotaClientViewProps) {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(initialVehiculos);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroServicio, setFiltroServicio] = useState<string>("todos");
  const [filtroSoloAlertas, setFiltroSoloAlertas] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [quickAssignModalOpen, setQuickAssignModalOpen] = useState(false);
  const [quickAssignPlaca, setQuickAssignPlaca] = useState("");

  // Filtrado de Vehículos
  const filteredVehiculos = vehiculos.filter((v) => {
    if (filtroTipo !== "todos" && v.tipo !== filtroTipo) return false;
    if (filtroServicio !== "todos" && v.servicio !== filtroServicio) return false;

    if (filtroSoloAlertas) {
      const semaforo = analizarAlertasVehiculo(v);
      if (!semaforo.tieneAlertasCriticas && !semaforo.tieneAlertasPreventivas) return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchPlaca = v.placa.toLowerCase().includes(q);
      const matchMarca = v.marca.toLowerCase().includes(q);
      const matchModelo = v.modelo.toLowerCase().includes(q);
      const matchContratista = v.contratistaNombre?.toLowerCase().includes(q);
      const matchConductor = asignacionesMap[v.placa]?.toLowerCase().includes(q);
      return matchPlaca || matchMarca || matchModelo || matchContratista || matchConductor;
    }

    return true;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredVehiculos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVehiculos.map((v) => v.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`¿Estás seguro de eliminar los ${selectedIds.length} vehículos seleccionados?`)) return;
    setIsDeletingMultiple(true);
    try {
      const res = await deleteMultipleVehiculosDb(selectedIds);
      if (res.success) {
        setVehiculos((prev) => prev.filter((v) => !selectedIds.includes(v.id)));
        setSelectedIds([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  // Métricas
  const total = vehiculos.length;
  const activos = vehiculos.filter((v) => v.estado === "activo").length;
  const enMantenimiento = vehiculos.filter((v) => v.estado === "mantenimiento").length;
  const contratistasCount = new Set(vehiculos.map((v) => v.contratistaNombre)).size;

  const columns: Column<Vehiculo>[] = [
    {
      header: (
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-fog-400 hover:text-paper-50 transition-colors"
          title="Seleccionar todos"
        >
          {selectedIds.length > 0 && selectedIds.length === filteredVehiculos.length ? (
            <CheckSquare size={16} className="text-signal-amber" />
          ) : (
            <Square size={16} />
          )}
        </button>
      ),
      accessor: "id",
      render: (v) => {
        const id = v as string;
        const isChecked = selectedIds.includes(id);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelectRow(id);
            }}
            className="text-fog-400 hover:text-paper-50 transition-colors"
          >
            {isChecked ? (
              <CheckSquare size={16} className="text-signal-amber" />
            ) : (
              <Square size={16} />
            )}
          </button>
        );
      },
    },
    {
      header: "Placa",
      accessor: "placa",
      render: (v, row) => (
        <Link href={`/flota/${row.id}`} className="hover:opacity-85 transition-opacity">
          <PlateTag plate={v as string} />
        </Link>
      ),
    },
    {
      header: "Vehículo",
      accessor: "marca",
      render: (_v, row) => (
        <div>
          <Link
            href={`/flota/${row.id}`}
            className="font-semibold text-paper-50 text-xs hover:text-radar-cyan transition-colors"
          >
            {row.marca} {row.modelo}
          </Link>
          <p className="text-[11px] text-fog-400">
            {TIPO_LABELS[row.tipo]} · {row.anio} · {row.capacidad} pas.
          </p>
        </div>
      ),
    },
    {
      header: "Servicio",
      accessor: "servicio",
      render: (v) => <span className="text-xs text-fog-400 font-mono">{SERVICIO_LABELS[v as Vehiculo["servicio"]]}</span>,
    },
    {
      header: "Contratista / Propietario",
      accessor: "contratistaNombre",
      render: (v) => <span className="text-xs text-paper-50 font-medium">{v as string || "Propio / Cooperativa"}</span>,
    },
    {
      header: "Conductor Titular",
      accessor: "placa",
      render: (v, row) => {
        const conductor = asignacionesMap[v as string] || asignacionesMap[(v as string).replace(/[^A-Z0-9]/g, "")];
        if (!conductor) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-fog-400 font-mono">Sin asignar</span>
              <button
                type="button"
                onClick={() => {
                  setQuickAssignPlaca(row.placa);
                  setQuickAssignModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-signal-amber/15 hover:bg-signal-amber text-signal-amber hover:text-asphalt-950 border border-signal-amber/30 transition-all active:scale-95"
                title="Asignar conductor a este vehículo"
              >
                <Zap size={11} />
                <span>Asignar</span>
              </button>
            </div>
          );
        }
        return (
          <span className="text-xs font-semibold text-paper-50">
            {conductor}
          </span>
        );
      },
    },
    {
      header: "Semáforo Documental",
      accessor: "documentos",
      render: (_v, row) => {
        const alertaSoat = calcularAlertaFecha(row.documentos?.soatVencimiento, "SOAT");
        const alertaRtm = calcularAlertaFecha(row.documentos?.rtmVencimiento, "RTM");

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-fog-400 uppercase w-9">SOAT:</span>
              <span className={`rounded px-1.5 py-0.2 border ${alertaSoat.badgeClass}`}>
                {alertaSoat.etiqueta}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-fog-400 uppercase w-9">RTM:</span>
              <span className={`rounded px-1.5 py-0.2 border ${alertaRtm.badgeClass}`}>
                {alertaRtm.etiqueta}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Estado",
      accessor: "estado",
      render: (v) => {
        const est = v as EstadoVehiculo;
        let badgeStyle = "bg-ok-green-dim text-ok-green border-ok-green/30";
        if (est === "mantenimiento") badgeStyle = "bg-signal-amber-dim text-signal-amber border-signal-amber/30";
        if (est === "inactivo") badgeStyle = "bg-asphalt-800 text-fog-400 border-line-600";

        return (
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-mono font-semibold border ${badgeStyle}`}>
            {ESTADO_VEHICULO_LABELS[est]}
          </span>
        );
      },
    },
    {
      header: "Acción",
      accessor: "id",
      render: (v, row) => (
        <VehiculoStatusDropdown
          vehiculoId={v as string}
          placa={row.placa}
          estadoActual={row.estado}
          onStatusChanged={(nuevoEstado) => {
            setVehiculos((prev) =>
              prev.map((item) =>
                item.id === v ? { ...item, estado: nuevoEstado } : item
              )
            );
          }}
          onDeleted={() => {
            setVehiculos((prev) => prev.filter((item) => item.id !== v));
          }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cabecera del Módulo con Métricas Compactas y Botones de Acción */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600/70 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-signal-amber font-semibold uppercase tracking-wider">
            <Truck size={15} className="text-signal-amber" />
            <span>Gestión del Parque Automotor · FL-FOR-01</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-paper-50 mt-0.5">
            Flota de Vehículos
          </h1>
        </div>

        {/* Métricas Compactas y Acciones en 1 Línea */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-600 bg-asphalt-900 px-2.5 py-1 text-xs font-mono text-fog-400">
            Total: <strong className="text-paper-50 font-bold">{total}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-ok-green/30 bg-ok-green-dim/20 px-2.5 py-1 text-xs font-mono text-ok-green">
            Activos: <strong>{activos}</strong>
          </span>
          {enMantenimiento > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-signal-amber/30 bg-signal-amber-dim/20 px-2.5 py-1 text-xs font-mono text-signal-amber">
              Taller: <strong>{enMantenimiento}</strong>
            </span>
          )}

          <div className="h-4 w-px bg-line-600 mx-1 hidden sm:block" />

          {selectedIds.length > 0 && (
            <IconButton
              icon={<Trash2 size={15} />}
              tooltip={`Eliminar ${selectedIds.length} seleccionados`}
              variant="danger"
              onClick={handleDeleteSelected}
              disabled={isDeletingMultiple}
            />
          )}

          <IconButton
            icon={<UploadCloud size={15} />}
            tooltip="Carga Masiva de Flota (Excel / CSV)"
            variant="secondary"
            onClick={() => setIsBulkModalOpen(true)}
          />

          <IconButton
            icon={<Download size={15} />}
            tooltip="Exportar Matriz Oficial en Excel (FL-FOR-01)"
            variant="secondary"
            onClick={() => exportarFlotaAExcel(vehiculos, asignacionesMap)}
          />

          <Link href="/flota/nuevo">
            <IconButton
              icon={<Plus size={15} />}
              tooltip="Registrar Nuevo Vehículo"
              variant="primary"
            />
          </Link>
        </div>
      </div>

      {/* Barra de Control y Filtros Unificada en 1 Sola Línea */}
      <div className="bg-asphalt-900 border border-line-600 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
        {/* Buscador Universal */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" />
          <input
            type="text"
            placeholder="Buscar por placa, marca, conductor o contratista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-line-600 bg-asphalt-950 pl-8 pr-3 py-1.5 text-xs text-paper-50 placeholder:text-fog-400 focus:border-signal-amber focus:outline-none"
          />
        </div>

        {/* Filtros Dropdown Compactos y Toggle de Alertas */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltroSoloAlertas(!filtroSoloAlertas)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
              filtroSoloAlertas
                ? "bg-alert-red text-white font-bold shadow-sm"
                : "bg-asphalt-950 text-fog-400 hover:text-paper-50 border border-line-600"
            }`}
          >
            <AlertTriangle size={13} className={filtroSoloAlertas ? "text-white" : "text-signal-amber"} />
            <span>Solo con Alertas</span>
          </button>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-signal-amber focus:outline-none"
          >
            <option value="todos">Todos los Tipos</option>
            <option value="bus">Buses</option>
            <option value="buseta">Busetas</option>
            <option value="microbus">Microbuses</option>
            <option value="van">Vans</option>
            <option value="camioneta">Camionetas</option>
            <option value="automovil">Automóviles</option>
          </select>

          <select
            value={filtroServicio}
            onChange={(e) => setFiltroServicio(e.target.value)}
            className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-signal-amber focus:outline-none"
          >
            <option value="todos">Todas Modalidades</option>
            <option value="especial">Transporte Especial</option>
            <option value="escolar">Escolar</option>
            <option value="turismo">Turismo</option>
          </select>
        </div>
      </div>

      {/* Tabla Principal Inmediata */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <DataTable columns={columns} data={filteredVehiculos} />
      </Card>

      {/* Modal de Carga Masiva con Diagnóstico */}
      <BulkUploadFlotaModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          // Recargar datos
          window.location.reload();
        }}
      />

      {/* Modal de Asignación Rápida 1-Click */}
      <QuickAsignacionModal
        isOpen={quickAssignModalOpen}
        initialPlaca={quickAssignPlaca}
        conductores={conductores}
        vehiculos={vehiculos.map((v) => ({
          id: v.id,
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
          contratistaNombre: v.contratistaNombre,
        }))}
        onClose={() => {
          setQuickAssignModalOpen(false);
          setQuickAssignPlaca("");
        }}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
