"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, UploadCloud } from "lucide-react";
import { SEED_PERSONAS } from "@/lib/data/personas";
import { getAsignacionActiva } from "@/lib/data/asignaciones";
import { ESTADO_LABELS, EstadoPersona, Persona } from "@/lib/types/persona";
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
  const [personas, setPersonas] = useState<Persona[]>(SEED_PERSONAS);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const total = personas.length;
  const activos = personas.filter((p) => p.estado === "activo").length;
  const conductores = personas.filter((p) => p.perfiles.includes("conductor")).length;

  const columns: Column<Persona>[] = [
    {
      header: "Nombre",
      accessor: "nombres",
      render: (_v, row) => (
        <div className="flex items-center gap-3">
          <Avatar initials={row.fotoIniciales} size="sm" />
          <div>
            <Link
              href={`/personas/${row.id}`}
              className="font-medium text-paper-50 hover:text-radar-cyan"
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
            Personas
          </h1>
          <p className="mt-1 text-sm text-fog-400">
            Registro único: conductores, empleados, supervisores y HSEQ.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsBulkOpen(true)}>
            <UploadCloud size={16} /> Carga masiva (CSV)
          </Button>
          <Link href="/personas/nueva">
            <Button variant="primary">
              <Plus size={16} /> Nueva persona
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <StatCard label="Total" value={total} accent="cyan" />
        <StatCard label="Activos" value={activos} accent="green" />
        <StatCard label="Conductores" value={conductores} accent="amber" />
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable columns={columns} data={personas} />
      </Card>

      <p className="text-xs text-fog-400">
        Gestión de personal activo y sincronización masiva de registros.
      </p>

      <BulkUploadModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        currentPersons={personas}
        onSuccess={(updatedList) => setPersonas(updatedList)}
      />
    </div>
  );
}
