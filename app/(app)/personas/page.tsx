"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  UploadCloud,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { getPersonasDb, deletePersonaDb, deleteMultiplePersonasDb } from "@/lib/services/personas.service";
import { getAsignacionActiva } from "@/lib/data/asignaciones";
import { ESTADO_LABELS, EstadoPersona, Persona } from "@/lib/types/persona";
import { exportPersonasToExcel } from "@/lib/data/personas-excel-export";
import { Button } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileTag } from "@/components/ui/ProfileTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { BulkUploadModal } from "@/components/personas/BulkUploadModal";

const ESTADO_TO_STATUS: Record<EstadoPersona, "activo" | "pendiente" | "cerrado"> = {
  activo: "activo",
  descanso: "pendiente",
  vacaciones: "pendiente",
  inactivo: "cerrado",
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [personToDelete, setPersonToDelete] = useState<Persona | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchPersonas = () => {
    getPersonasDb().then((data) => {
      setPersonas(data || []);
      setSelectedIds([]);
    });
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const total = personas.length;
  const activos = personas.filter((p) => p.estado === "activo").length;
  const conductores = personas.filter((p) => p.perfiles.includes("conductor")).length;

  const toggleSelectAll = () => {
    if (selectedIds.length === personas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(personas.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSingle = async () => {
    if (!personToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deletePersonaDb(personToDelete.id);
      if (res.success && res.refreshedList) {
        setPersonas(res.refreshedList);
        setSelectedIds((prev) => prev.filter((id) => id !== personToDelete.id));
        setPersonToDelete(null);
      } else {
        setDeleteError(res.error || "No se pudo eliminar el registro.");
      }
    } catch (err: any) {
      setDeleteError(err.message || "Error al comunicarse con la base de datos.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteMultiplePersonasDb(selectedIds);
      if (res.success && res.refreshedList) {
        setPersonas(res.refreshedList);
        setSelectedIds([]);
        setIsBulkDeleteOpen(false);
      } else {
        setDeleteError(res.error || "No se pudieron eliminar los registros.");
      }
    } catch (err: any) {
      setDeleteError(err.message || "Error al comunicarse con la base de datos.");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Persona>[] = [
    {
      header: (
        <button
          onClick={toggleSelectAll}
          className="text-fog-400 hover:text-paper-50 transition-colors p-1"
          title={selectedIds.length === personas.length && personas.length > 0 ? "Deseleccionar todos" : "Seleccionar todos"}
        >
          {selectedIds.length > 0 && selectedIds.length === personas.length ? (
            <CheckSquare size={16} className="text-signal-amber" />
          ) : (
            <Square size={16} />
          )}
        </button>
      ) as any,
      accessor: "id",
      render: (v) => {
        const isSelected = selectedIds.includes(v as string);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectOne(v as string);
            }}
            className="text-fog-400 hover:text-paper-50 transition-colors p-1"
          >
            {isSelected ? (
              <CheckSquare size={16} className="text-signal-amber" />
            ) : (
              <Square size={16} />
            )}
          </button>
        );
      },
    },
    {
      header: "Nombre",
      accessor: "nombres",
      render: (_v, row) => (
        <div className="flex items-center gap-3">
          <Avatar initials={row.fotoIniciales} size="sm" />
          <div>
            <Link
              href={`/personas/${row.id}`}
              className="font-medium text-paper-50 hover:text-radar-cyan transition-colors"
            >
              {row.nombres} {row.apellidos}
            </Link>
            <p className="font-[family-name:var(--font-mono)] text-xs text-fog-400">
              {row.tipoDocumento} {row.numeroDocumento}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Perfil",
      accessor: "perfiles",
      render: (v) => (
        <div className="flex flex-wrap gap-1">
          {(v as Persona["perfiles"]).map((p) => (
            <ProfileTag key={p} perfil={p} />
          ))}
        </div>
      ),
    },
    {
      header: "Contratista",
      accessor: "contratistaNombre",
      render: (v) => <span>{(v as string) ?? "—"}</span>,
    },
    {
      header: "Vehículo",
      accessor: "id",
      render: (v) => {
        const asignacion = getAsignacionActiva(v as string);
        return asignacion ? (
          <PlateTag plate={asignacion.placa} />
        ) : (
          <span className="text-fog-400">—</span>
        );
      },
    },
    {
      header: "Estado",
      accessor: "estado",
      render: (v) => (
        <StatusBadge status={ESTADO_TO_STATUS[v as EstadoPersona]}>
          {ESTADO_LABELS[v as EstadoPersona]}
        </StatusBadge>
      ),
    },
    {
      header: "Acciones",
      accessor: "id",
      render: (_v, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPersonToDelete(row);
          }}
          className="p-1.5 rounded text-fog-400 hover:text-alert-red hover:bg-alert-red-dim transition-colors"
          title={`Eliminar a ${row.nombres} ${row.apellidos}`}
        >
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Personas
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Registro único: conductores, empleados, supervisores y HSEQ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => exportPersonasToExcel(personas)}
            disabled={personas.length === 0}
            title={personas.length === 0 ? "No hay registros cargados para exportar" : "Descargar matriz oficial en Excel (TH-FOR-01)"}
          >
            <Download size={16} /> Exportar Excel
          </Button>
          <Button variant="secondary" onClick={() => setIsBulkOpen(true)}>
            <UploadCloud size={16} /> Carga masiva (Excel/CSV)
          </Button>
          <Link href="/personas/nueva">
            <Button variant="primary">
              <Plus size={16} /> Nueva persona
            </Button>
          </Link>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <StatCard label="Total" value={total} accent="cyan" />
        <StatCard label="Activos" value={activos} accent="green" />
        <StatCard label="Conductores" value={conductores} accent="amber" />
      </div>

      {/* Barra de Acciones por Lote (cuando hay seleccionados) */}
      {selectedIds.length > 0 && (
        <div className="rounded-lg border border-alert-red/40 bg-alert-red-dim px-4 py-3 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-alert-red" />
            <span className="text-xs font-semibold text-alert-red">
              {selectedIds.length} {selectedIds.length === 1 ? "persona seleccionada" : "personas seleccionadas"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-fog-400 hover:text-paper-50 px-2 py-1 transition-colors"
            >
              Deseleccionar
            </button>
            <Button
              variant="primary"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="bg-alert-red hover:bg-red-700 text-white border-transparent text-xs h-8"
            >
              <Trash2 size={13} /> Eliminar seleccionados ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Tabla de Personas */}
      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={personas} emptyMessage="No hay registros para mostrar." />
      </Card>

      <p className="text-xs text-fog-400">
        Gestión de personal activo, expedientes laborales y sincronización con PostgreSQL.
      </p>

      {/* Modal de Carga Masiva */}
      <BulkUploadModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        currentPersons={personas}
        onSuccess={(updatedList) => setPersonas(updatedList)}
      />

      {/* Modal de Confirmación de Eliminación Individual */}
      {personToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-lg border border-line-600 bg-asphalt-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-alert-red-dim p-2.5 text-alert-red border border-alert-red/30">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  ¿Eliminar a {personToDelete.nombres} {personToDelete.apellidos}?
                </h3>
                <p className="text-xs text-fog-400 font-mono">
                  {personToDelete.tipoDocumento}: {personToDelete.numeroDocumento}
                </p>
              </div>
            </div>

            <p className="text-xs text-mist-200 leading-relaxed">
              Esta acción eliminará de forma permanente a esta persona de la base de datos PostgreSQL, incluyendo su expediente de salud, licencia y asignaciones de vehículos.
            </p>

            {deleteError && (
              <div className="rounded border border-alert-red/40 bg-alert-red-dim p-3 text-xs text-alert-red">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setPersonToDelete(null)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteSingle}
                disabled={isDeleting}
                className="bg-alert-red hover:bg-red-700 text-white border-transparent"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} /> Confirmar eliminación
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación Múltiple */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-lg border border-line-600 bg-asphalt-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-alert-red-dim p-2.5 text-alert-red border border-alert-red/30">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  ¿Eliminar {selectedIds.length} registros seleccionados?
                </h3>
                <p className="text-xs text-fog-400 font-mono">
                  Se eliminarán permanentemente de la base de datos
                </p>
              </div>
            </div>

            <p className="text-xs text-mist-200 leading-relaxed">
              Esta acción no se puede deshacer. Todos los registros seleccionados y sus expedientes asociados serán eliminados de la base de datos.
            </p>

            {deleteError && (
              <div className="rounded border border-alert-red/40 bg-alert-red-dim p-3 text-xs text-alert-red">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsBulkDeleteOpen(false)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteMultiple}
                disabled={isDeleting}
                className="bg-alert-red hover:bg-red-700 text-white border-transparent"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Eliminando {selectedIds.length}...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} /> Eliminar {selectedIds.length} personas
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
