"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Calendar,
  Search,
  RefreshCw,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Video,
  FileText,
  Camera,
  PenTool,
  X,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Award,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Capacitacion,
  TIPO_CAPACITACION_LABELS,
  CATEGORIA_CAPACITACION_LABELS,
} from "@/lib/types/capacitacion";

export default function CapacitacionesPage() {
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"todas" | "pesv" | "sg-sst">("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    totalCount: 0,
    totalPesv: 0,
    totalSgsst: 0,
    totalCharlas: 0,
    totalAsistenciasAcumuladas: 0,
  });

  // Modal para ver asistencias y selfies
  const [selectedCapacitacion, setSelectedCapacitacion] = useState<Capacitacion | null>(null);

  // Modal para imprimir formato físico
  const [printCapacitacion, setPrintCapacitacion] = useState<Capacitacion | null>(null);

  const loadCapacitaciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/capacitaciones");
      if (res.ok) {
        const data = await res.json();
        setCapacitaciones(data.capacitaciones || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Error al cargar capacitaciones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCapacitaciones();
  }, [loadCapacitaciones]);

  const filteredCapacitaciones = useMemo(() => {
    return capacitaciones.filter((c) => {
      const matchTab = activeTab === "todas" ? true : c.tipo === activeTab;
      const matchSearch =
        !searchQuery ||
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.facilitador?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [capacitaciones, activeTab, searchQuery]);

  const handlePrint = (cap: Capacitacion) => {
    setPrintCapacitacion(cap);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── HEADER (Oculto en Impresión) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-signal-amber bg-signal-amber-dim px-2 py-0.5 rounded border border-signal-amber/30">
              SG-SST & PESV
            </span>
            <span className="text-xs text-fog-400 font-mono">TH-FOR-04</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-paper-50 uppercase mt-1">
            Capacitaciones & Charlas de Seguridad
          </h1>
          <p className="text-sm text-mist-200">
            Control de formación continua, charlas semanales PESV, evidencias biométricas y planillas de auditoría.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCapacitaciones}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </Button>

          <Link href="/capacitaciones/nueva">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs font-bold">
              <Plus size={15} />
              <span>Programar Charla / Capacitación</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── STAT CARDS (Oculto en Impresión) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <StatCard
          label="TOTAL PROGRAMAS"
          value={stats.totalCount}
          subtitle="Formaciones registradas"
          icon={GraduationCap}
          status="normal"
        />
        <StatCard
          label="PLAN PESV (SEG. VIAL)"
          value={stats.totalPesv}
          subtitle={`${stats.totalCharlas} charlas semanales`}
          icon={ShieldCheck}
          status="normal"
        />
        <StatCard
          label="PLAN SG-SST"
          value={stats.totalSgsst}
          subtitle="Seguridad y salud laboral"
          icon={Award}
          status="normal"
        />
        <StatCard
          label="ASISTENCIAS CON FIRMA/SELFIE"
          value={stats.totalAsistenciasAcumuladas}
          subtitle="Registros con evidencia digital"
          icon={Users}
          status="normal"
        />
      </div>

      {/* ── BARRA DE PESTAÑAS Y BÚSQUEDA (Oculto en Impresión) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-600 pb-3 print:hidden">
        <div className="flex items-center gap-1 bg-asphalt-900 border border-line-600 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("todas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "todas"
                ? "bg-paper-50 text-asphalt-950 shadow-sm"
                : "text-fog-400 hover:text-paper-50"
            }`}
          >
            Todas ({stats.totalCount})
          </button>
          <button
            onClick={() => setActiveTab("pesv")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "pesv"
                ? "bg-signal-amber text-asphalt-950 shadow-sm"
                : "text-fog-400 hover:text-paper-50"
            }`}
          >
            <span>🚦 Plan PESV</span>
            <span className="text-[10px] bg-asphalt-950/20 px-1.5 py-0.2 rounded-full font-mono">
              {stats.totalPesv}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("sg-sst")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "sg-sst"
                ? "bg-radar-cyan text-asphalt-950 shadow-sm"
                : "text-fog-400 hover:text-paper-50"
            }`}
          >
            <span>🛡️ Plan SG-SST</span>
            <span className="text-[10px] bg-asphalt-950/20 px-1.5 py-0.2 rounded-full font-mono">
              {stats.totalSgsst}
            </span>
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog-400" />
          <input
            type="text"
            placeholder="Buscar por tema o facilitador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-asphalt-900 border border-line-600 rounded-xl pl-9 pr-3 py-1.5 text-xs text-paper-50 focus:border-signal-amber focus:outline-none"
          />
        </div>
      </div>

      {/* ── LISTADO DE CAPACITACIONES (Oculto en Impresión) ── */}
      <div className="grid grid-cols-1 gap-4 print:hidden">
        {filteredCapacitaciones.length === 0 ? (
          <Card className="p-12 text-center border-line-600 bg-asphalt-900/50">
            <GraduationCap size={40} className="mx-auto text-fog-400 mb-3 opacity-40" />
            <h3 className="font-bold text-paper-50 text-base">No hay capacitaciones programadas</h3>
            <p className="text-xs text-fog-400 mt-1 max-w-sm mx-auto">
              Comienza programando una charla semanal de seguridad vial o una capacitación formal para tus conductores.
            </p>
            <Link href="/capacitaciones/nueva" className="mt-4 inline-block">
              <Button variant="primary" size="sm">
                <Plus size={14} /> Programar la Primera Charla
              </Button>
            </Link>
          </Card>
        ) : (
          filteredCapacitaciones.map((cap) => {
            const asistentes = cap.asistencias?.length || cap.asistentesReales || 0;
            const porcentaje = cap.asistentesEsperados > 0 ? Math.min(100, Math.round((asistentes / cap.asistentesEsperados) * 100)) : 100;

            return (
              <Card
                key={cap.id}
                className="p-5 border-line-600 bg-asphalt-900/90 hover:border-line-500 transition-all shadow-md group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                          cap.tipo === "pesv"
                            ? "bg-signal-amber-dim text-signal-amber border-signal-amber/30"
                            : "bg-radar-cyan/10 text-radar-cyan border-radar-cyan/30"
                        }`}
                      >
                        {TIPO_CAPACITACION_LABELS[cap.tipo] || cap.tipo}
                      </span>
                      <span className="text-[10px] font-mono text-fog-400 bg-asphalt-950 px-2 py-0.5 rounded border border-line-600">
                        {CATEGORIA_CAPACITACION_LABELS[cap.categoria] || cap.categoria}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          cap.estado === "realizada"
                            ? "bg-ok-green/10 text-ok-green border border-ok-green/30"
                            : "bg-signal-amber/10 text-signal-amber border border-signal-amber/30"
                        }`}
                      >
                        {cap.estado.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-bold text-paper-50 text-base group-hover:text-signal-amber transition-colors">
                      {cap.nombre}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fog-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-fog-400" />
                        <span className="font-mono">
                          {new Date(cap.fecha).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="text-fog-400" />
                        <span>{cap.duracionHoras}h ({Math.round(cap.duracionHoras * 60)} min)</span>
                      </div>
                      {cap.facilitador && (
                        <div className="flex items-center gap-1">
                          <Users size={13} className="text-fog-400" />
                          <span>Facilitador: <strong className="text-mist-200">{cap.facilitador}</strong></span>
                        </div>
                      )}
                      {cap.materialTipo === "video" && (
                        <span className="text-[11px] text-radar-cyan flex items-center gap-1">
                          <Video size={12} /> Video adjunto
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 border-t lg:border-t-0 border-line-600 pt-3 lg:pt-0">
                    {/* Barra de progreso de asistencia */}
                    <div className="text-right min-w-[120px]">
                      <div className="text-xs font-bold text-paper-50">
                        {asistentes} / {cap.asistentesEsperados} Asistentes
                      </div>
                      <div className="w-full bg-asphalt-950 h-1.5 rounded-full overflow-hidden mt-1 border border-line-600">
                        <div
                          className={`h-full rounded-full ${
                            porcentaje >= 80 ? "bg-ok-green" : "bg-signal-amber"
                          }`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-fog-400 mt-0.5">
                        {porcentaje}% de cobertura
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCapacitacion(cap)}
                      className="text-xs flex items-center gap-1.5 hover:bg-asphalt-800"
                    >
                      <Camera size={13} className="text-radar-cyan" />
                      <span>Ver Asistencias ({asistentes})</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(cap)}
                      className="text-xs flex items-center gap-1.5 text-radar-cyan hover:bg-radar-cyan/10 border-radar-cyan/30"
                      title="Imprimir Planilla Oficial TH-FOR-04"
                    >
                      <Printer size={13} />
                      <span>Planilla PDF</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ── MODAL: VER ASISTENCIAS & EVIDENCIAS FOTOGRÁFICAS (Oculto en Impresión) ── */}
      {selectedCapacitacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn print:hidden">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-line-600 bg-asphalt-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-line-600 p-5 bg-asphalt-950/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-signal-amber/10 text-signal-amber border border-signal-amber/30">
                    TH-FOR-04 • EVIDENCIAS
                  </span>
                  <span className="text-xs text-fog-400 font-mono">
                    {new Date(selectedCapacitacion.fecha).toLocaleDateString("es-CO")}
                  </span>
                </div>
                <h3 className="font-bold text-paper-50 text-base mt-1">
                  {selectedCapacitacion.nombre}
                </h3>
                <p className="text-xs text-fog-400">
                  {selectedCapacitacion.asistencias?.length || 0} conductores registrados con selfie y firma digital.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCapacitacion(null)}
                className="text-fog-400 hover:text-paper-50 p-2 rounded-lg hover:bg-asphalt-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Resumen del Material */}
              {selectedCapacitacion.materialContenido && (
                <div className="p-3.5 rounded-xl border border-line-600 bg-asphalt-950/80 text-xs space-y-1">
                  <span className="font-mono font-bold text-fog-400 uppercase">
                    Puntos Clave Dictados:
                  </span>
                  <p className="text-mist-200 whitespace-pre-line leading-relaxed">
                    {selectedCapacitacion.materialContenido}
                  </p>
                </div>
              )}

              {/* Tabla de Asistentes */}
              <div className="border border-line-600 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-asphalt-950 text-fog-400 uppercase font-mono text-[11px] border-b border-line-600">
                    <tr>
                      <th className="p-3">Conductor</th>
                      <th className="p-3">Fecha / Hora</th>
                      <th className="p-3 text-center">Selfie Facial</th>
                      <th className="p-3 text-center">Firma Digital</th>
                      <th className="p-3 text-center">Nota / Test</th>
                      <th className="p-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-600 bg-asphalt-900/60">
                    {!selectedCapacitacion.asistencias || selectedCapacitacion.asistencias.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-fog-400">
                          Ningún conductor ha registrado su asistencia a esta charla todavía.
                        </td>
                      </tr>
                    ) : (
                      selectedCapacitacion.asistencias.map((asist, idx) => (
                        <tr key={asist.id || idx} className="hover:bg-asphalt-800/50 transition-colors">
                          <td className="p-3 font-semibold text-paper-50">
                            <div>{asist.personaNombre}</div>
                            {asist.personaDocumento && (
                              <div className="text-[10px] font-mono text-fog-400">
                                CC: {asist.personaDocumento}
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-mist-200 text-[11px]">
                            {new Date(asist.fecha).toLocaleString("es-CO", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-3 text-center">
                            {asist.fotoUrl ? (
                              <img
                                src={asist.fotoUrl}
                                alt="Selfie"
                                className="w-10 h-10 rounded-full object-cover border border-line-500 mx-auto shadow-sm"
                              />
                            ) : (
                              <span className="text-[10px] text-fog-400">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {asist.firmaUrl ? (
                              <img
                                src={asist.firmaUrl}
                                alt="Firma"
                                className="h-8 max-w-[80px] object-contain bg-white/90 p-1 rounded border border-line-600 mx-auto"
                              />
                            ) : (
                              <span className="text-[10px] text-fog-400">Sin firma</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-ok-green">
                            {asist.calificacion ? `${asist.calificacion}%` : "100%"}
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-ok-green/10 text-ok-green border border-ok-green/30">
                              PRESENTE
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-line-600 bg-asphalt-950/60 flex items-center justify-between">
              <span className="text-xs text-fog-400 font-mono">
                Registros respaldados en PostgreSQL (Railway)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrint(selectedCapacitacion)}
                  className="text-xs flex items-center gap-1.5 text-radar-cyan border-radar-cyan/30"
                >
                  <Printer size={13} />
                  <span>Imprimir Planilla Oficial</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCapacitacion(null)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* ── PLANILLA OFICIAL IMPRIMIBLE TH-FOR-04 (SOLO EN IMPRESIÓN) ── */}
      {/* ════════════════════════════════════════════════════════════ */}
      {printCapacitacion && (
        <div className="hidden print:block text-black bg-white p-2 text-xs">
          {/* Encabezado Físico Oficial */}
          <div className="border-2 border-black mb-4">
            <div className="grid grid-cols-12 border-b border-black">
              <div className="col-span-3 border-r border-black p-2 flex flex-col items-center justify-center text-center">
                <div className="font-bold text-base tracking-tighter">TRANS SERVICES A&B</div>
                <div className="text-[9px] font-bold">NIT: 900778421-1</div>
                <div className="text-[8px] text-gray-700">COOPERATIVA DE TRANSPORTE</div>
              </div>
              <div className="col-span-6 border-r border-black p-2 flex flex-col items-center justify-center text-center">
                <div className="font-bold text-xs uppercase tracking-wide">
                  SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO & PESV
                </div>
                <div className="font-black text-sm uppercase mt-1">
                  PLANILLA DE ASISTENCIA Y REGISTRO DE CAPACITACIÓN
                </div>
              </div>
              <div className="col-span-3 p-2 text-[9px] space-y-1">
                <div><strong>CÓDIGO:</strong> TH-FOR-04</div>
                <div><strong>VERSIÓN:</strong> 02</div>
                <div><strong>FECHA:</strong> {new Date().toLocaleDateString("es-CO")}</div>
              </div>
            </div>

            {/* Datos de la Charla */}
            <div className="grid grid-cols-2 p-2 gap-2 text-[10px] bg-gray-50 border-b border-black">
              <div>
                <div><strong>TEMA / ACTIVIDAD:</strong> {printCapacitacion.nombre}</div>
                <div><strong>PROGRAMA:</strong> {printCapacitacion.programa}</div>
                <div><strong>OBJETIVO:</strong> {printCapacitacion.objetivo || "Socialización y refuerzo de estándares"}</div>
              </div>
              <div>
                <div><strong>FACILITADOR:</strong> {printCapacitacion.facilitador}</div>
                <div><strong>FECHA / HORA:</strong> {new Date(printCapacitacion.fecha).toLocaleString("es-CO")}</div>
                <div><strong>DURACIÓN:</strong> {printCapacitacion.duracionHoras} Horas</div>
              </div>
            </div>
          </div>

          {/* Tabla de Asistentes Imprimible */}
          <table className="w-full border-collapse border border-black text-[9px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black p-1 text-center w-8">N°</th>
                <th className="border border-black p-1 text-left">NOMBRE COMPLETO</th>
                <th className="border border-black p-1 text-center w-24">N° DOCUMENTO</th>
                <th className="border border-black p-1 text-center w-20">CARGO</th>
                <th className="border border-black p-1 text-center w-24">EVIDENCIA FOTO</th>
                <th className="border border-black p-1 text-center w-28">FIRMA DIGITAL</th>
              </tr>
            </thead>
            <tbody>
              {!printCapacitacion.asistencias || printCapacitacion.asistencias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-black p-4 text-center">
                    Sin registros de asistencia.
                  </td>
                </tr>
              ) : (
                printCapacitacion.asistencias.map((asist, i) => (
                  <tr key={asist.id || i} className="h-10">
                    <td className="border border-black p-1 text-center font-bold">{i + 1}</td>
                    <td className="border border-black p-1 font-bold">{asist.personaNombre}</td>
                    <td className="border border-black p-1 text-center font-mono">
                      {asist.personaDocumento || "—"}
                    </td>
                    <td className="border border-black p-1 text-center">{asist.cargo || "Conductor"}</td>
                    <td className="border border-black p-1 text-center">
                      {asist.fotoUrl ? (
                        <img
                          src={asist.fotoUrl}
                          alt="Selfie"
                          className="w-8 h-8 rounded-full object-cover mx-auto border border-black"
                        />
                      ) : (
                        <span className="text-[8px] text-gray-500">Selfie Digital</span>
                      )}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {asist.firmaUrl ? (
                        <img
                          src={asist.firmaUrl}
                          alt="Firma"
                          className="h-7 max-w-[90px] object-contain mx-auto"
                        />
                      ) : (
                        <span className="text-[8px] text-gray-500">Firmado Digital</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Firmas de Cierre */}
          <div className="grid grid-cols-2 gap-8 mt-12 text-[10px]">
            <div className="border-t border-black pt-2 text-center">
              <div className="font-bold">{printCapacitacion.facilitador}</div>
              <div>Firma del Facilitador / Instructor HSEQ</div>
            </div>
            <div className="border-t border-black pt-2 text-center">
              <div className="font-bold">COORDINACIÓN HSEQ & PESV</div>
              <div>TRANS SERVICES A&B</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
