"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Truck,
  Users2,
  FileCheck,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Contratista } from "@/lib/types/contratista";
import { Vehiculo, getEstadoDocumento, TIPO_LABELS } from "@/lib/types/vehiculo";
import { Persona } from "@/lib/types/persona";
import { Card } from "@/components/ui/Card";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { ProfileTag } from "@/components/ui/ProfileTag";
import { Avatar } from "@/components/ui/Avatar";
import { DocExpiryBadge } from "@/components/ui/DocExpiryBadge";
import { ExpedienteContratistaDigital } from "@/components/contratistas/ExpedienteContratistaDigital";
import { ContratistaDocumentoAdjunto } from "@/lib/services/contratistas.service";

interface ContratistaDetailTabsProps {
  contratista: Contratista;
  vehiculos: Vehiculo[];
  conductores: Persona[];
  documentos: ContratistaDocumentoAdjunto[];
}

type TabType = "expediente" | "flota" | "conductores" | "contrato";

export function ContratistaDetailTabs({
  contratista,
  vehiculos,
  conductores,
  documentos,
}: ContratistaDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("expediente");

  // Columnas para la tabla de Flota Vinculada
  const vehiculoColumns: Column<Vehiculo>[] = [
    {
      header: "Placa",
      accessor: "placa",
      render: (v, row) => (
        <Link href={`/flota/${row.id}`} className="hover:opacity-80 transition-opacity">
          <PlateTag plate={v as string} />
        </Link>
      ),
    },
    {
      header: "Vehículo",
      accessor: "marca",
      render: (_v, row) => (
        <div>
          <p className="font-semibold text-paper-50">
            {row.marca} {row.modelo}
          </p>
          <p className="text-xs text-fog-400 font-mono">
            {TIPO_LABELS[row.tipo]} · {row.anio} · {row.capacidad} pasajeros
          </p>
        </div>
      ),
    },
    {
      header: "SOAT",
      accessor: "documentos",
      render: (_v, row) => (
        <DocExpiryBadge
          label="SOAT"
          vencimientoISO={row.documentos.soatVencimiento}
        />
      ),
    },
    {
      header: "RTM",
      accessor: "documentos",
      render: (_v, row) => (
        <DocExpiryBadge
          label="RTM"
          vencimientoISO={row.documentos.rtmVencimiento}
        />
      ),
    },
    {
      header: "Póliza",
      accessor: "documentos",
      render: (_v, row) => (
        <DocExpiryBadge
          label="Póliza"
          vencimientoISO={row.documentos.polizaVencimiento}
        />
      ),
    },
    {
      header: "Estado",
      accessor: "estado",
      render: (v) => (
        <StatusBadge status={v === "activo" ? "activo" : v === "mantenimiento" ? "pendiente" : "cerrado"}>
          {v === "activo" ? "Operativo" : v === "mantenimiento" ? "Mantenimiento" : "Inactivo"}
        </StatusBadge>
      ),
    },
  ];

  // Columnas para la tabla de Conductores Vinculados
  const conductorColumns: Column<Persona>[] = [
    {
      header: "Conductor / Expediente",
      accessor: "nombres",
      render: (_v, row) => (
        <div className="flex items-center gap-3">
          <Avatar initials={row.fotoIniciales} />
          <div>
            <Link
              href={`/personas/${row.id}`}
              className="font-semibold text-paper-50 hover:text-radar-cyan transition-colors"
            >
              {row.nombres} {row.apellidos}
            </Link>
            <p className="text-xs font-mono text-fog-400">
              {row.tipoDocumento} {row.numeroDocumento} · {row.telefono}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Perfiles",
      accessor: "perfiles",
      render: (v) => (
        <div className="flex flex-wrap gap-1">
          {(v as string[]).map((p) => (
            <ProfileTag key={p} perfil={p as any} />
          ))}
        </div>
      ),
    },
    {
      header: "Licencia de Conducción",
      accessor: "licenciaConduccion",
      render: (v, row) => {
        if (!row.licenciaConduccion) {
          return <span className="text-xs text-fog-400 font-mono">Sin licencia</span>;
        }
        return (
          <div>
            <p className="text-xs font-mono font-semibold text-paper-50">
              {row.licenciaConduccion.numero} ({row.licenciaConduccion.categorias.join(", ")})
            </p>
            <p className="text-[10px] font-mono text-fog-400">
              Vence: {row.licenciaConduccion.fechaVencimiento}
            </p>
          </div>
        );
      },
    },
    {
      header: "Concepto Médico (EMO)",
      accessor: "examenMedico",
      render: (_v, row) => {
        if (!row.examenMedico) {
          return <span className="text-xs text-fog-400 font-mono">Sin examen</span>;
        }
        const apto = row.examenMedico.concepto === "apto";
        return (
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono border ${
              apto
                ? "bg-ok-green-dim text-ok-green border-ok-green/30"
                : "bg-signal-amber-dim text-signal-amber border-signal-amber/30"
            }`}
          >
            {row.examenMedico.concepto.toUpperCase()}
          </span>
        );
      },
    },
    {
      header: "Estado",
      accessor: "estado",
      render: (v) => (
        <StatusBadge status={v === "activo" ? "activo" : v === "descanso" ? "pendiente" : "cerrado"}>
          {v === "activo" ? "Activo" : v === "descanso" ? "En descanso" : v === "vacaciones" ? "Vacaciones" : "Retirado"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Pestañas de Navegación */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line-600 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("expediente")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "expediente"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <FileCheck size={16} className={activeTab === "expediente" ? "text-signal-amber" : ""} />
          <span>Expediente Digital Legal</span>
          <span className="ml-1 rounded-full bg-asphalt-950 px-2 py-0.2 text-xs font-mono text-fog-400 border border-line-600">
            {documentos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("flota")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "flota"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Truck size={16} className={activeTab === "flota" ? "text-radar-cyan" : ""} />
          <span>Flota Vinculada</span>
          <span className="ml-1 rounded-full bg-asphalt-950 px-2 py-0.2 text-xs font-mono text-radar-cyan border border-line-600">
            {vehiculos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conductores")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "conductores"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Users2 size={16} className={activeTab === "conductores" ? "text-signal-amber" : ""} />
          <span>Conductores &amp; Personal</span>
          <span className="ml-1 rounded-full bg-asphalt-950 px-2 py-0.2 text-xs font-mono text-signal-amber border border-line-600">
            {conductores.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contrato")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "contrato"
              ? "bg-asphalt-800 text-paper-50 border border-line-500 shadow-sm"
              : "text-fog-400 hover:text-paper-50 hover:bg-asphalt-900"
          }`}
        >
          <Calendar size={16} className={activeTab === "contrato" ? "text-mist-200" : ""} />
          <span>Condiciones Contractuales</span>
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div className="pt-2">
        {activeTab === "expediente" && (
          <ExpedienteContratistaDigital
            contratista={contratista}
            initialDocumentos={documentos}
          />
        )}

        {activeTab === "flota" && (
          <Card className="p-0 overflow-hidden space-y-4">
            <div className="p-4 border-b border-line-600 flex items-center justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  Parque Automotor Asignado ({vehiculos.length} vehículos)
                </h3>
                <p className="text-xs text-fog-400">
                  Semaforización de documentos legales obligatorios (SOAT, RTM, Pólizas)
                </p>
              </div>
              <Link
                href="/flota/nuevo"
                className="text-xs text-signal-amber hover:underline font-semibold"
              >
                + Vincular nuevo vehículo
              </Link>
            </div>
            {vehiculos.length === 0 ? (
              <div className="p-8 text-center text-fog-400 text-sm">
                No hay vehículos asociados a este contratista actualmente.
              </div>
            ) : (
              <DataTable columns={vehiculoColumns} data={vehiculos} />
            )}
          </Card>
        )}

        {activeTab === "conductores" && (
          <Card className="p-0 overflow-hidden space-y-4">
            <div className="p-4 border-b border-line-600 flex items-center justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  Personal y Conductores ({conductores.length} asignados)
                </h3>
                <p className="text-xs text-fog-400">
                  Trazabilidad de licencias de conducción, exámenes médicos y estado de turno
                </p>
              </div>
              <Link
                href="/personas/nueva"
                className="text-xs text-signal-amber hover:underline font-semibold"
              >
                + Registrar nuevo conductor
              </Link>
            </div>
            {conductores.length === 0 ? (
              <div className="p-8 text-center text-fog-400 text-sm">
                No hay conductores asociados a este contratista actualmente.
              </div>
            ) : (
              <DataTable columns={conductorColumns} data={conductores} />
            )}
          </Card>
        )}

        {activeTab === "contrato" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="space-y-4">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 flex items-center gap-2">
                <Calendar size={18} className="text-signal-amber" /> Términos del Contrato
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-line-600/70 pb-2">
                  <span className="text-fog-400">Modalidad de Operación:</span>
                  <span className="font-semibold text-paper-50">
                    {contratista.tipoOperacion === "fija" ? "Asignación Fija" : "Rotación por Turnos"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-line-600/70 pb-2">
                  <span className="text-fog-400">Fecha de Vinculación:</span>
                  <span className="font-mono text-paper-50">{contratista.fechaVinculacion}</span>
                </div>
                <div className="flex justify-between border-b border-line-600/70 pb-2">
                  <span className="text-fog-400">Fecha Fin de Contrato:</span>
                  <span className="font-mono text-paper-50">
                    {contratista.fechaFinContrato || "Indefinido / Vigente"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-line-600/70 pb-2">
                  <span className="text-fog-400">Estado Contractual:</span>
                  <StatusBadge status={contratista.estado === "activo" ? "activo" : "cerrado"}>
                    {contratista.estado === "activo" ? "Vigente / Habilitado" : "Inactivo / Suspendido"}
                  </StatusBadge>
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 flex items-center gap-2">
                <FileText size={18} className="text-radar-cyan" /> Observaciones y Acuerdos Especiales
              </h3>
              <p className="text-sm text-mist-200 leading-relaxed bg-asphalt-950/60 p-4 rounded-lg border border-line-600 min-h-[140px]">
                {contratista.notas || "No se han registrado acuerdos o notas especiales para este contratista."}
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
