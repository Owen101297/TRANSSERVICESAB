"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Download,
  FolderOpen,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { Documento, CATEGORIA_LABELS, TIPO_DOCUMENTO_LABELS, CategoriaDocumento } from "@/lib/types/documento";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createDocumentoDigitalAction } from "@/lib/services/documentos.service";

interface Props {
  initialDocumentos: Documento[];
}

function getEstadoDocumentoSafe(fechaIso?: string): {
  estado: "vigente" | "proximo" | "vencido" | "sin_vencimiento";
  label: string;
  badgeStatus: "activo" | "pendiente" | "critico" | "cerrado";
  diasRestantes?: number;
} {
  if (!fechaIso) {
    return { estado: "sin_vencimiento", label: "Permanente", badgeStatus: "cerrado" };
  }

  const venc = new Date(fechaIso);
  if (isNaN(venc.getTime())) {
    return { estado: "sin_vencimiento", label: "Sin fecha", badgeStatus: "cerrado" };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  venc.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      estado: "vencido",
      label: `Vencido (${Math.abs(diffDays)}d)`,
      badgeStatus: "critico",
      diasRestantes: diffDays,
    };
  }
  if (diffDays <= 30) {
    return {
      estado: "proximo",
      label: `Vence en ${diffDays}d`,
      badgeStatus: "pendiente",
      diasRestantes: diffDays,
    };
  }
  return {
    estado: "vigente",
    label: "Vigente",
    badgeStatus: "activo",
    diasRestantes: diffDays,
  };
}

export function DocumentosClientView({ initialDocumentos }: Props) {
  const [documentos, setDocumentos] = useState<Documento[]>(initialDocumentos);
  const [search, setSearch] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<"todas" | CategoriaDocumento>("todas");
  const [selectedEstado, setSelectedEstado] = useState<"todos" | "vigente" | "proximo" | "vencido">("todos");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Estadísticas
  const stats = useMemo(() => {
    let vigentes = 0;
    let proximos = 0;
    let vencidos = 0;

    documentos.forEach((d) => {
      const { estado } = getEstadoDocumentoSafe(d.fechaVencimiento);
      if (estado === "vigente") vigentes++;
      if (estado === "proximo") proximos++;
      if (estado === "vencido") vencidos++;
    });

    return { total: documentos.length, vigentes, proximos, vencidos };
  }, [documentos]);

  // Filtrado dinámico
  const filtered = useMemo(() => {
    return documentos.filter((d) => {
      const matchSearch =
        d.nombre.toLowerCase().includes(search.toLowerCase()) ||
        d.entidadNombre.toLowerCase().includes(search.toLowerCase()) ||
        (d.tipo && d.tipo.toLowerCase().includes(search.toLowerCase()));

      const matchCategoria = selectedCategoria === "todas" || d.categoria === selectedCategoria;

      const { estado } = getEstadoDocumentoSafe(d.fechaVencimiento);
      const matchEstado = selectedEstado === "todos" || estado === selectedEstado;

      return matchSearch && matchCategoria && matchEstado;
    });
  }, [documentos, search, selectedCategoria, selectedEstado]);

  const handleCreateDocumento = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadLoading(true);
    setUploadError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await createDocumentoDigitalAction(formData);
      if (res.success) {
        setIsUploadModalOpen(false);
        // Agregar al estado local optimista
        const nuevoDoc: Documento = {
          id: `doc_${Date.now()}`,
          nombre: (formData.get("nombre") as string) || "Nuevo Documento",
          categoria: (formData.get("categoria") as CategoriaDocumento) || "empresa",
          tipo: (formData.get("tipoDocumento") as any) || "otro",
          entidadNombre: (formData.get("entidadNombre") as string) || "Corporativo",
          fechaVencimiento: (formData.get("fechaVencimiento") as string) || undefined,
          notas: (formData.get("notas") as string) || undefined,
        };
        setDocumentos((prev) => [nuevoDoc, ...prev]);
      } else {
        setUploadError(res.error || "No se pudo guardar el documento");
      }
    } catch (err: any) {
      setUploadError(err.message || "Error al procesar formulario");
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── ENCABEZADO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-bold uppercase tracking-wider mb-2">
            <FolderOpen size={13} />
            <span>EXPEDIENTE DIGITAL & AUDITORÍA</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Bóveda Documental Centralizada
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitoreo en vivo de vencimientos, expedientes de vehículos, conductores, pólizas y archivos corporativos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 shadow-apple-sm"
          >
            <Plus size={16} />
            <span>Registrar Documento</span>
          </Button>
        </div>
      </div>

      {/* ── TARJETAS DE MÉTRICAS (APPLE STYLE) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Expedientes"
          value={stats.total}
          subtitle="Documentos registrados"
          icon={<FileText size={18} />}
          accent="cyan"
        />
        <StatCard
          label="Vigentes / Al Día"
          value={stats.vigentes}
          subtitle="Cumplimiento reglamentario"
          icon={<CheckCircle2 size={18} />}
          accent="green"
        />
        <StatCard
          label="Por Vencer (30 Días)"
          value={stats.proximos}
          subtitle="Acción de renovación"
          icon={<Clock size={18} />}
          accent="amber"
        />
        <StatCard
          label="Vencidos / Críticos"
          value={stats.vencidos}
          subtitle="Bloqueo preventivo"
          icon={<AlertCircle size={18} />}
          accent="red"
        />
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS INTERACTIVOS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200/80 bg-white shadow-apple-sm">
        {/* Input de Búsqueda */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa, conductor, tipo de documento o entidad..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
        </div>

        {/* Filtro por Categoría */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="todas">Todas las categorías</option>
            <option value="vehiculo">Vehículos (Flota)</option>
            <option value="persona">Conductores (Talento)</option>
            <option value="contratista">Contratistas</option>
            <option value="empresa">Corporativo / Empresa</option>
            <option value="hseq_pesv">HSEQ / PESV</option>
          </select>

          {/* Filtro por Semáforo de Vencimiento */}
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="todos">Todos los estados</option>
            <option value="vigente">Solo Vigentes</option>
            <option value="proximo">Próximos a vencer</option>
            <option value="vencido">Vencidos (Alerta)</option>
          </select>
        </div>
      </div>

      {/* ── TABLA DE DOCUMENTOS ── */}
      <Card className="p-0 overflow-hidden shadow-apple-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Documento / Tipo</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Relacionado Con</th>
                <th className="py-3 px-4">Fecha Vencimiento</th>
                <th className="py-3 px-4">Estado Vigencia</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No se encontraron documentos</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Intenta con otros términos de búsqueda o registra un nuevo documento.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => {
                  const estadoInfo = getEstadoDocumentoSafe(doc.fechaVencimiento);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shrink-0">
                            <FileText size={15} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-snug">{doc.nombre}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {TIPO_DOCUMENTO_LABELS[doc.tipo] || doc.tipo}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {CATEGORIA_LABELS[doc.categoria] || doc.categoria}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {doc.entidadHref ? (
                          <Link
                            href={doc.entidadHref}
                            className="text-sky-600 hover:text-sky-800 font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>{doc.entidadNombre}</span>
                            <ExternalLink size={11} />
                          </Link>
                        ) : (
                          <span className="text-slate-700 font-medium">{doc.entidadNombre}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {doc.fechaVencimiento ? doc.fechaVencimiento : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={estadoInfo.badgeStatus}>{estadoInfo.label}</StatusBadge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {doc.entidadHref ? (
                          <Link href={doc.entidadHref}>
                            <Button variant="ghost" size="sm" className="text-xs text-sky-600">
                              Ver Ficha
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">Digital</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── MODAL PARA REGISTRAR NUEVO DOCUMENTO DIGITAL ── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Plus size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Registrar Documento Digital</h3>
                  <p className="text-xs text-slate-500">Agrega un documento a la bóveda centralizada</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDocumento} className="p-6 space-y-4 text-xs sm:text-sm">
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Documento</label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Póliza Todo Riesgo 2026 o RUT Actualizado"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    name="categoria"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="vehiculo">Vehículo (Flota)</option>
                    <option value="persona">Conductor</option>
                    <option value="contratista">Contratista</option>
                    <option value="empresa">Empresa / Corporativo</option>
                    <option value="hseq_pesv">HSEQ / PESV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo Documental</label>
                  <select
                    name="tipoDocumento"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="poliza">Póliza</option>
                    <option value="soat">SOAT</option>
                    <option value="rtm">RTM</option>
                    <option value="tarjeta_operacion">Tarjeta Operación</option>
                    <option value="licencia_conduccion">Licencia</option>
                    <option value="certificado_medico">Examen Médico</option>
                    <option value="rut">RUT</option>
                    <option value="camara_comercio">Cámara Comercio</option>
                    <option value="otro">Otro Documento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Entidad / Placa / Nombre</label>
                  <input
                    type="text"
                    name="entidadNombre"
                    placeholder="Ej. ABC-123 o Razón Social"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha Vencimiento (Opcional)</label>
                  <input
                    type="date"
                    name="fechaVencimiento"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas / Observaciones</label>
                <textarea
                  name="notas"
                  rows={2}
                  placeholder="Detalles sobre coberturas, aseguradora o número de póliza..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={uploadLoading}>
                  {uploadLoading ? "Guardando..." : "Guardar en Bóveda"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
