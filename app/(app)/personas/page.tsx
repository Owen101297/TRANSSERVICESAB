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
  Archive,
  RotateCcw,
  Users,
  ShieldCheck,
  Search,
} from "lucide-react";
import {
  getPersonasDb,
  deletePersonaDb,
  deleteMultiplePersonasDb,
  retirarPersonaDb,
  reactivarPersonaDb,
  retirarMultiplePersonasDb,
} from "@/lib/services/personas.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import { Asignacion } from "@/lib/types/asignacion";
import { ESTADO_LABELS, EstadoPersona, Persona } from "@/lib/types/persona";
import { exportPersonasToExcel } from "@/lib/data/personas-excel-export";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { Card, StatCard } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileTag } from "@/components/ui/ProfileTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { BulkUploadModal } from "@/components/personas/BulkUploadModal";
import { RetirarPersonaModal } from "@/components/personas/RetirarPersonaModal";
import { StatusDropdownMenu } from "@/components/personas/StatusDropdownMenu";
import { AlertasVencimientoPanel } from "@/components/personas/AlertasVencimientoPanel";
import { evaluarAlertasPersona } from "@/lib/utils/alertas-vencimiento";

const ESTADO_TO_STATUS: Record<EstadoPersona, "activo" | "pendiente" | "cerrado"> = {
  activo: "activo",
  descanso: "pendiente",
  vacaciones: "pendiente",
  inactivo: "cerrado",
  retirado: "cerrado",
};

type FilterTab = "activos" | "descanso" | "retirados" | "todos";

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState<FilterTab>("activos");
  const [onlyWithAlerts, setOnlyWithAlerts] = useState(false);
  
  // Modales
  const [personaToRetire, setPersonaToRetire] = useState<Persona | null>(null);
  const [personToDeletePermanent, setPersonToDeletePermanent] = useState<Persona | null>(null);
  const [isBulkRetireOpen, setIsBulkRetireOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  // Estados de carga
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPersonas = () => {
    getPersonasDb().then((data) => {
      setPersonas(data || []);
      setSelectedIds([]);
    });
    getAsignacionesDb().then((asigs) => {
      setAsignaciones(asigs || []);
    });
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState<string>("todos");

  // Métricas
  const total = personas.length;
  const activos = personas.filter((p) => p.estado === "activo").length;
  const enDescanso = personas.filter((p) => p.estado === "descanso" || p.estado === "vacaciones").length;
  const retirados = personas.filter((p) => p.estado === "retirado" || p.estado === "inactivo").length;
  const conductores = personas.filter((p) => p.estado === "activo" && p.perfiles.includes("conductor")).length;

  // Filtrado según pestaña seleccionada, búsqueda y filtro de alertas
  const filteredPersonas = personas.filter((p) => {
    if (onlyWithAlerts) {
      const diag = evaluarAlertasPersona(p);
      if (!diag.tieneAlertas) return false;
    }
    if (currentTab === "activos" && p.estado !== "activo") return false;
    if (currentTab === "descanso" && p.estado !== "descanso" && p.estado !== "vacaciones") return false;
    if (currentTab === "retirados" && p.estado !== "retirado" && p.estado !== "inactivo") return false;

    if (filtroPerfil !== "todos" && !p.perfiles.includes(filtroPerfil as any)) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNombre = `${p.nombres} ${p.apellidos}`.toLowerCase().includes(q);
      const matchDoc = p.numeroDocumento?.toLowerCase().includes(q);
      const matchPerfiles = p.perfiles?.join(" ").toLowerCase().includes(q);
      const matchContratista = p.contratistaNombre?.toLowerCase().includes(q);
      return matchNombre || matchDoc || matchPerfiles || matchContratista;
    }

    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPersonas.length && filteredPersonas.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPersonas.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleReactivar = async (persona: Persona) => {
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await reactivarPersonaDb(persona.id);
      if (res.success && res.refreshedList) {
        setPersonas(res.refreshedList);
      } else {
        setErrorMessage(res.error || "No se pudo reactivar.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePermanentDeleteSingle = async () => {
    if (!personToDeletePermanent) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await deletePersonaDb(personToDeletePermanent.id);
      if (res.success && res.refreshedList) {
        setPersonas(res.refreshedList);
        setSelectedIds((prev) => prev.filter((id) => id !== personToDeletePermanent.id));
        setPersonToDeletePermanent(null);
      } else {
        setErrorMessage(res.error || "No se pudo eliminar.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkRetire = async () => {
    if (selectedIds.length === 0) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await retirarMultiplePersonasDb(selectedIds, "Retiro masivo operativo");
      if (res.success && res.refreshedList) {
        setPersonas(res.refreshedList);
        setSelectedIds([]);
        setIsBulkRetireOpen(false);
      } else {
        setErrorMessage(res.error || "No se pudo completar el retiro por lote.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await deleteMultiplePersonasDb(selectedIds);
      if (res.success && res.refreshedList) {
        setPersonas(res.refreshedList);
        setSelectedIds([]);
        setIsBulkDeleteOpen(false);
      } else {
        setErrorMessage(res.error || "No se pudo eliminar el lote.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns: Column<Persona>[] = [
    {
      header: (
        <button
          onClick={toggleSelectAll}
          className="text-fog-400 hover:text-paper-50 transition-colors p-1"
          title={selectedIds.length === filteredPersonas.length && filteredPersonas.length > 0 ? "Deseleccionar todos" : "Seleccionar todos"}
        >
          {selectedIds.length > 0 && selectedIds.length === filteredPersonas.length ? (
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
      header: "Nombre / Expediente",
      accessor: "nombres",
      render: (_v, row) => {
        const diag = evaluarAlertasPersona(row);
        return (
          <div className="flex items-center gap-3">
            <Avatar initials={row.fotoIniciales} size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/personas/${row.id}`}
                  className="font-medium text-paper-50 hover:text-radar-cyan transition-colors"
                >
                  {row.nombres} {row.apellidos}
                </Link>
                {row.estado === "activo" && diag.tieneAlertas && (
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-bold border ${
                      diag.nivelMaximo === "critico"
                        ? "bg-alert-red-dim border-alert-red/40 text-alert-red"
                        : diag.nivelMaximo === "urgente"
                        ? "bg-signal-amber/10 border-signal-amber/40 text-signal-amber"
                        : "bg-radar-cyan/10 border-radar-cyan/40 text-radar-cyan"
                    }`}
                    title={diag.alertas.map((a) => a.mensaje).join(" | ")}
                  >
                    {diag.nivelMaximo === "critico"
                      ? "Vencido"
                      : diag.nivelMaximo === "urgente"
                      ? "Urgente"
                      : "Alerta"}
                  </span>
                )}
              </div>
              <p className="font-[family-name:var(--font-mono)] text-xs text-fog-400">
                {row.tipoDocumento} {row.numeroDocumento}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Perfiles",
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
      header: "Contratista / Empresa",
      accessor: "contratistaNombre",
      render: (v) => <span className="text-xs text-mist-200">{(v as string) || "Transservices A&B"}</span>,
    },
    {
      header: "Vehículo Activo",
      accessor: "id",
      render: (v, row) => {
        if (row.estado === "retirado" || row.estado === "inactivo") {
          return <span className="text-fog-400 text-xs">—</span>;
        }
        const asignacion = asignaciones.find((a) => a.conductorId === (v as string) && a.estado === "activa");
        return asignacion ? (
          <PlateTag plate={asignacion.placa} />
        ) : (
          <span className="text-fog-400 text-xs">Sin asignar</span>
        );
      },
    },
    {
      header: "Estado",
      accessor: "estado",
      render: (v, row) => (
        <div>
          <StatusBadge status={ESTADO_TO_STATUS[v as EstadoPersona]}>
            {ESTADO_LABELS[v as EstadoPersona]}
          </StatusBadge>
          {row.estado === "retirado" && row.motivoRetiro && (
            <p className="text-[10px] text-fog-400 mt-1 truncate max-w-[140px]" title={row.motivoRetiro}>
              {row.motivoRetiro}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Acciones",
      accessor: "id",
      render: (_v, row) => (
        <div className="flex items-center gap-1.5">
          <StatusDropdownMenu
            persona={row}
            onOpenRetirarModal={setPersonaToRetire}
            onStatusChanged={setPersonas}
          />

          <IconButton
            size="sm"
            variant="ghost"
            icon={<Trash2 size={15} />}
            tooltip="Eliminar permanentemente de la base de datos"
            className="text-fog-400 hover:text-alert-red hover:bg-alert-red-dim"
            onClick={(e) => {
              e.stopPropagation();
              setPersonToDeletePermanent(row);
            }}
            disabled={isActionLoading}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cabecera del Módulo con Métricas Compactas y Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600/70 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-radar-cyan font-semibold uppercase tracking-wider">
            <Users size={15} className="text-radar-cyan" />
            <span>Talento Humano &amp; Conductores · TH-FOR-01</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-paper-50 mt-0.5">
            Personal &amp; Expedientes
          </h1>
        </div>

        {/* Métricas Compactas en Píldoras y Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-600 bg-asphalt-900 px-2.5 py-1 text-xs font-mono text-fog-400">
            Total: <strong className="text-paper-50 font-bold">{total}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-ok-green/30 bg-ok-green-dim/20 px-2.5 py-1 text-xs font-mono text-ok-green">
            Activos: <strong>{activos}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-signal-amber/30 bg-signal-amber-dim/20 px-2.5 py-1 text-xs font-mono text-signal-amber">
            Conductores: <strong>{conductores}</strong>
          </span>

          <div className="h-4 w-px bg-line-600 mx-1 hidden sm:block" />

          <IconButton
            icon={<Download size={15} />}
            tooltip={`Exportar matriz Excel (${filteredPersonas.length} registros)`}
            variant="secondary"
            onClick={() => exportPersonasToExcel(filteredPersonas)}
            disabled={filteredPersonas.length === 0}
          />
          <IconButton
            icon={<UploadCloud size={15} />}
            tooltip="Carga masiva desde archivo Excel / CSV"
            variant="secondary"
            onClick={() => setIsBulkOpen(true)}
          />
          <Link href="/personas/nueva">
            <IconButton
              icon={<Plus size={15} />}
              tooltip="Registrar nueva persona / conductor"
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
            placeholder="Buscar por nombre, cédula, cargo o contratista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-line-600 bg-asphalt-950 pl-8 pr-3 py-1.5 text-xs text-paper-50 placeholder:text-fog-400 focus:border-radar-cyan focus:outline-none"
          />
        </div>

        {/* Píldoras de Estado y Filtros Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Estado / Tab */}
          <div className="flex items-center gap-1 bg-asphalt-950 p-0.5 rounded-lg border border-line-600">
            <button
              type="button"
              onClick={() => setCurrentTab("activos")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-all ${
                currentTab === "activos"
                  ? "bg-ok-green text-asphalt-950 font-bold"
                  : "text-fog-400 hover:text-paper-50"
              }`}
            >
              ● Activos ({activos})
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab("descanso")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-all ${
                currentTab === "descanso"
                  ? "bg-radar-cyan text-asphalt-950 font-bold"
                  : "text-fog-400 hover:text-paper-50"
              }`}
            >
              Descanso ({enDescanso})
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab("retirados")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-all ${
                currentTab === "retirados"
                  ? "bg-signal-amber text-asphalt-950 font-bold"
                  : "text-fog-400 hover:text-paper-50"
              }`}
            >
              Histórico ({retirados})
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab("todos")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-all ${
                currentTab === "todos"
                  ? "bg-paper-50 text-asphalt-950 font-bold"
                  : "text-fog-400 hover:text-paper-50"
              }`}
            >
              Todos ({total})
            </button>
          </div>

          {/* Toggle de Alertas */}
          <button
            type="button"
            onClick={() => setOnlyWithAlerts(!onlyWithAlerts)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
              onlyWithAlerts
                ? "bg-alert-red text-white font-bold shadow-sm"
                : "bg-asphalt-950 text-fog-400 hover:text-paper-50 border border-line-600"
            }`}
          >
            <AlertTriangle size={13} className={onlyWithAlerts ? "text-white" : "text-signal-amber"} />
            <span>Alertas</span>
          </button>

          {/* Selector de Perfil / Rol */}
          <select
            value={filtroPerfil}
            onChange={(e) => setFiltroPerfil(e.target.value)}
            className="rounded-lg border border-line-600 bg-asphalt-950 px-2.5 py-1.5 text-xs text-paper-50 font-mono focus:border-radar-cyan focus:outline-none"
          >
            <option value="todos">Todos los Roles</option>
            <option value="conductor">Conductores</option>
            <option value="administrativo">Administrativos</option>
            <option value="mecanico">Mecánicos</option>
            <option value="hseq">HSEQ / Seguridad</option>
            <option value="operaciones">Operaciones</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded border border-alert-red/40 bg-alert-red-dim p-3 text-xs text-alert-red flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Barra de Acciones por Lote (cuando hay seleccionados) */}
      {selectedIds.length > 0 && (
        <div className="rounded-lg border border-line-500 bg-asphalt-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-signal-amber" />
            <span className="text-xs font-semibold text-paper-50">
              {selectedIds.length} {selectedIds.length === 1 ? "persona seleccionada" : "personas seleccionadas"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-fog-400 hover:text-paper-50 px-2 py-1 transition-colors"
            >
              Deseleccionar
            </button>
            
            {currentTab !== "retirados" && (
              <Button
                variant="secondary"
                onClick={() => setIsBulkRetireOpen(true)}
                className="text-xs h-8 border-signal-amber/40 text-signal-amber hover:bg-signal-amber/10"
              >
                <Archive size={13} /> Retirar a Historial ({selectedIds.length})
              </Button>
            )}

            <Button
              variant="primary"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="bg-alert-red hover:bg-red-700 text-white border-transparent text-xs h-8"
            >
              <Trash2 size={13} /> Eliminar permanentemente ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Tabla de Personas */}
      <Card className="p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredPersonas}
          emptyMessage={
            currentTab === "retirados"
              ? "No hay personal en el archivo histórico de retirados."
              : currentTab === "descanso"
                ? "No hay personal en descanso o vacaciones en este momento."
                : "No hay registros para mostrar en esta pestaña."
          }
        />
      </Card>

      <div className="flex items-center justify-between text-xs text-fog-400">
        <p>Sistema Integrado HSEQ / PESV · Trans Services A&amp;B</p>
        <p className="font-mono">Documento Control: TH-FOR-01</p>
      </div>

      {/* Modal de Carga Masiva */}
      <BulkUploadModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        currentPersons={personas}
        onSuccess={(updatedList) => setPersonas(updatedList)}
      />

      {/* Modal de Retiro a Historial Individual */}
      <RetirarPersonaModal
        isOpen={!!personaToRetire}
        persona={personaToRetire}
        onClose={() => setPersonaToRetire(null)}
        onSuccess={(refreshedList) => setPersonas(refreshedList)}
      />

      {/* Modal de Retiro Masivo a Historial */}
      {isBulkRetireOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-lg border border-line-600 bg-asphalt-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-signal-amber/10 p-2.5 text-signal-amber border border-signal-amber/30">
                <Archive size={22} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  Retirar {selectedIds.length} personas a Historial
                </h3>
                <p className="text-xs text-fog-400 font-mono">
                  Preservación de registros para auditoría
                </p>
              </div>
            </div>

            <p className="text-xs text-mist-200 leading-relaxed">
              Las personas seleccionadas pasarán al archivo histórico de retirados. Se finalizarán sus asignaciones de vehículos y sus expedientes quedarán protegidos para futuras auditorías.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsBulkRetireOpen(false)}
                disabled={isActionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkRetire}
                disabled={isActionLoading}
                className="bg-signal-amber text-asphalt-950 hover:bg-signal-amber/90 font-semibold"
              >
                {isActionLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <Archive size={15} /> Confirmar Retiro ({selectedIds.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eliminación Permanente Individual */}
      {personToDeletePermanent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-lg border border-line-600 bg-asphalt-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-alert-red-dim p-2.5 text-alert-red border border-alert-red/30">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  ¿Eliminar permanentemente de la Base de Datos?
                </h3>
                <p className="text-xs text-fog-400 font-mono">
                  {personToDeletePermanent.nombres} {personToDeletePermanent.apellidos}
                </p>
              </div>
            </div>

            <p className="text-xs text-mist-200 leading-relaxed">
              <strong className="text-alert-red">Advertencia:</strong> Esta acción borrará de forma irreversible el registro de PostgreSQL. Si solo deseas desvincular a la persona manteniendo el historial para auditorías, usa la opción <span className="text-signal-amber font-semibold">"Retirar a Historial"</span>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setPersonToDeletePermanent(null)}
                disabled={isActionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handlePermanentDeleteSingle}
                disabled={isActionLoading}
                className="bg-alert-red hover:bg-red-700 text-white border-transparent"
              >
                {isActionLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} /> Eliminar definitivamente
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eliminación Permanente Masiva */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-lg border border-line-600 bg-asphalt-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-alert-red-dim p-2.5 text-alert-red border border-alert-red/30">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  ¿Eliminar {selectedIds.length} registros definitivamente?
                </h3>
                <p className="text-xs text-fog-400 font-mono">
                  Borrado físico irrecuperable
                </p>
              </div>
            </div>

            <p className="text-xs text-mist-200 leading-relaxed">
              Se eliminarán físicamente {selectedIds.length} personas y sus expedientes de la base de datos PostgreSQL. Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsBulkDeleteOpen(false)}
                disabled={isActionLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkPermanentDelete}
                disabled={isActionLoading}
                className="bg-alert-red hover:bg-red-700 text-white border-transparent"
              >
                {isActionLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Eliminando {selectedIds.length}...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} /> Confirmar eliminación permanente
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
