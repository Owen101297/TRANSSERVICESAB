"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  ClipboardCheck,
  Sparkles,
  ShieldAlert,
  HeartPulse,
  UserCheck,
  FileQuestion,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  Send,
  User,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PlateTag } from "@/components/ui/PlateTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPersonasDb } from "@/lib/services/personas.service";
import { getVehiculosDb } from "@/lib/services/vehiculos.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import { Persona } from "@/lib/types/persona";
import { Vehiculo } from "@/lib/types/vehiculo";

interface ModuleCardProps {
  title: string;
  subtitle: string;
  icon: any;
  accent: "cyan" | "amber" | "green" | "red";
  href: string;
  badgeText?: string;
  onClick?: () => void;
}

function ModuleCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  href,
  badgeText = "Activo",
  onClick,
}: ModuleCardProps) {
  const accentColors = {
    cyan: "border-radar-cyan/30 text-radar-cyan hover:border-radar-cyan bg-radar-cyan/5",
    amber: "border-signal-amber/30 text-signal-amber hover:border-signal-amber bg-signal-amber/5",
    green: "border-ok-green/30 text-ok-green hover:border-ok-green bg-ok-green/5",
    red: "border-alert-red/30 text-alert-red hover:border-alert-red bg-alert-red/5",
  };

  const isExternal = href.startsWith("http");

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-xl border border-line-600 bg-asphalt-800/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${accentColors[accent]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full border border-line-500 bg-asphalt-900 px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[11px] font-medium text-fog-400">
            {badgeText}
          </span>
        </div>

        <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-paper-50 group-hover:text-radar-cyan transition-colors">
          {title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-fog-400">{subtitle}</p>
      </div>

      <div className="mt-5 pt-3 border-t border-line-600/60 flex items-center justify-between text-xs font-medium text-mist-200 group-hover:text-radar-cyan">
        <span>Abrir Formato</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  );
}

export default function PortalConductorPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selectedConductor, setSelectedConductor] = useState<Persona | null>(null);
  const [assignedPlate, setAssignedPlate] = useState<string | null>(null);
  const [quickSearchDoc, setQuickSearchDoc] = useState("");

  useEffect(() => {
    Promise.all([getPersonasDb(), getVehiculosDb(), getAsignacionesDb()]).then(
      ([pList, vList, aList]) => {
        const drivers = (pList || []).filter((p) => p.perfiles.includes("conductor"));
        setPersonas(drivers);
        setVehiculos(vList || []);

        if (drivers.length > 0) {
          const first = drivers[0];
          setSelectedConductor(first);
          const asig = (aList || []).find((a) => a.conductorId === first.id && a.estado === "activa");
          setAssignedPlate(asig ? asig.placa : (vList[0]?.placa || null));
        }
      }
    );
  }, []);

  const persistDriverSession = (p: Persona, placa: string | null) => {
    try {
      const sessionData = {
        id: p.id,
        documento: p.numeroDocumento,
        nombre: `${p.nombres} ${p.apellidos}`.trim(),
        placa: placa || "SIN ASIGNAR",
      };
      localStorage.setItem("transservices_conductor", JSON.stringify(sessionData));
    } catch (e) {
      console.warn("No se pudo guardar la sesión local:", e);
    }
  };

  const handleSelectDriver = (p: Persona) => {
    setSelectedConductor(p);
    getAsignacionesDb().then((aList) => {
      const asig = (aList || []).find((a) => a.conductorId === p.id && a.estado === "activa");
      const placa = asig ? asig.placa : (vehiculos[0]?.placa || null);
      setAssignedPlate(placa);
      persistDriverSession(p, placa);
    });
  };

  const handleSearchDoc = (doc: string) => {
    setQuickSearchDoc(doc);
    const found = personas.find((p) => p.numeroDocumento.includes(doc.trim()));
    if (found) {
      handleSelectDriver(found);
    }
  };

  useEffect(() => {
    Promise.all([getPersonasDb(), getVehiculosDb(), getAsignacionesDb()]).then(
      ([pList, vList, aList]) => {
        const drivers = (pList || []).filter((p) => p.perfiles.includes("conductor"));
        setPersonas(drivers);
        setVehiculos(vList || []);

        if (drivers.length > 0) {
          // Intentar restaurar sesión previa de localStorage o primer conductor
          let current = drivers[0];
          try {
            const raw = localStorage.getItem("transservices_conductor");
            if (raw) {
              const saved = JSON.parse(raw);
              const matched = drivers.find((d) => d.numeroDocumento === saved.documento);
              if (matched) current = matched;
            }
          } catch {}

          setSelectedConductor(current);
          const asig = (aList || []).find((a) => a.conductorId === current.id && a.estado === "activa");
          const placa = asig ? asig.placa : (vList[0]?.placa || null);
          setAssignedPlate(placa);
          persistDriverSession(current, placa);
        }
      }
    );
  }, []);

  const openApp = (appPath: string) => {
    if (selectedConductor) {
      persistDriverSession(selectedConductor, assignedPlate);
    }
    window.location.href = appPath;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-ok-green animate-pulse" />
            <span className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-radar-cyan">
              Módulo Móvil Corporativo
            </span>
          </div>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-paper-50">
            Portal Unificado del Conductor
          </h1>
          <p className="text-sm text-fog-400">
            Hub de aplicaciones, registros en ruta y formatos digitalizados (PESV / SG-SST / Operación).
          </p>
        </div>
      </div>

      {/* Selector de Conductor Activo */}
      <Card className="border-line-600 bg-asphalt-900/90 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-radar-cyan/10 border border-radar-cyan/30 text-radar-cyan font-[family-name:var(--font-display)] text-xl font-bold">
              {selectedConductor ? selectedConductor.fotoIniciales : <User className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-fog-400">Conductor Activo:</span>
                {selectedConductor?.licenciaConduccion && (
                  <span className="font-[family-name:var(--font-mono)] text-[11px] text-ok-green">
                    Licencia: {selectedConductor.licenciaConduccion.categorias.join("/")} (Vigente)
                  </span>
                )}
              </div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                {selectedConductor
                  ? `${selectedConductor.nombres} ${selectedConductor.apellidos}`
                  : "Seleccionar Conductor..."}
              </p>
              <p className="font-[family-name:var(--font-mono)] text-xs text-fog-400">
                C.C. {selectedConductor?.numeroDocumento || "—"} | Tel: {selectedConductor?.telefono || "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-fog-400">Vehículo asignado:</span>
              {assignedPlate ? <PlateTag plate={assignedPlate} /> : <span className="text-xs text-fog-400">Sin asignar</span>}
            </div>

            <div className="w-full sm:w-auto">
              <select
                className="w-full rounded-lg border border-line-500 bg-asphalt-800 px-3 py-2 font-[family-name:var(--font-body)] text-xs text-paper-50 focus:border-radar-cyan focus:outline-none"
                value={selectedConductor?.id || ""}
                onChange={(e) => {
                  const p = personas.find((item) => item.id === e.target.value);
                  if (p) handleSelectDriver(p);
                }}
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombres} {p.apellidos} (CC {p.numeroDocumento})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Grid de las 8 Aplicaciones Digitalizadas con Enlace Directo */}
      <div>
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-paper-50">
          Biblioteca de Formatos y Aplicaciones
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ModuleCard
            title="Plan de Viaje & Riesgo"
            subtitle="Despacho de viaje con matriz de riesgo vial, control de fatiga y firma digital."
            icon={Truck}
            accent="cyan"
            href="/apps/viajes/index.html"
            onClick={() => openApp("/apps/viajes/index.html")}
            badgeText="Operación"
          />

          <ModuleCard
            title="Preoperacional Diario"
            subtitle="Inspección técnico-mecánica obligatoria y reporte de novedades del vehículo."
            icon={ClipboardCheck}
            accent="green"
            href="/apps/preoperacional/index.html"
            onClick={() => openApp("/apps/preoperacional/index.html")}
            badgeText="PESV Paso 14"
          />

          <ModuleCard
            title="Control de Lavado"
            subtitle="Registro fotográfico y control de lavado exterior y chasis de la flota."
            icon={Droplets}
            accent="cyan"
            href="/apps/lavado/index.html"
            onClick={() => openApp("/apps/lavado/index.html")}
            badgeText="Flota"
          />

          <ModuleCard
            title="Aseo y Desinfección"
            subtitle="Control higiénico y planilla de desinfección de cabina de pasajeros."
            icon={Sparkles}
            accent="amber"
            href="/apps/aseo/index.html"
            onClick={() => openApp("/apps/aseo/index.html")}
            badgeText="SG-SST"
          />

          <ModuleCard
            title="Inspección de Extintores"
            subtitle="Control de presión, fecha de vencimiento y precintos de seguridad del extintor."
            icon={ShieldAlert}
            accent="red"
            href="/apps/extintor/index.html"
            onClick={() => openApp("/apps/extintor/index.html")}
            badgeText="HSEQ"
          />

          <ModuleCard
            title="Inspección de Botiquín"
            subtitle="Inventario de insumos de primeros auxilios y elementos de bioseguridad."
            icon={HeartPulse}
            accent="red"
            href="/apps/botiquin/index.html"
            onClick={() => openApp("/apps/botiquin/index.html")}
            badgeText="HSEQ"
          />

          <ModuleCard
            title="Asistencia y Firmas"
            subtitle="Registro y confirmación digital de asistencia a jornadas de capacitación."
            icon={UserCheck}
            accent="green"
            href="/apps/asistencia/index.html"
            onClick={() => openApp("/apps/asistencia/index.html")}
            badgeText="Capacitación"
          />

          <ModuleCard
            title="Encuesta de Riesgo Vial"
            subtitle="Diagnóstico de hábitos de conducción, perfil sociodemográfico y SG-SST."
            icon={FileQuestion}
            accent="amber"
            href="/apps/encuesta/index.html"
            onClick={() => openApp("/apps/encuesta/index.html")}
            badgeText="SG-SST / PESV"
          />
        </div>
      </div>

      {/* Panel Informativo de Sincronización en Tiempo Real */}
      <Card className="border-line-600 bg-asphalt-900/60 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ok-green/10 border border-ok-green/30 text-ok-green">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-paper-50">
                Sincronización Centralizada Activa
              </h4>
              <p className="text-xs text-fog-400">
                Toda la información registrada desde este portal se almacena de forma instantánea en PostgreSQL.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-xs text-mist-200">
            <span className="h-2 w-2 rounded-full bg-ok-green animate-pulse" />
            Base de datos Online
          </div>
        </div>
      </Card>
    </div>
  );
}
