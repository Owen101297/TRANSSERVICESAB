import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Building2,
  HeartPulse,
  PhoneCall,
  ShieldAlert,
  Award,
  Stethoscope,
  FileCheck,
} from "lucide-react";
import { getPersonaByIdDb } from "@/lib/services/personas.service";
import { getAsignacionesDb } from "@/lib/services/asignaciones.service";
import {
  ESTADO_LABELS,
  EstadoPersona,
  CONCEPTO_MEDICO_LABELS,
  ConceptoMedico,
} from "@/lib/types/persona";
import { ESTADO_ASIGNACION_LABELS, EstadoAsignacion } from "@/lib/types/asignacion";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileTag } from "@/components/ui/ProfileTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PlateTag } from "@/components/ui/PlateTag";
import { TurnoTag } from "@/components/ui/TurnoTag";
import { DocExpiryBadge } from "@/components/ui/DocExpiryBadge";
import { ExpedienteDigital } from "@/components/personas/ExpedienteDigital";
import { EditPersonaTrigger } from "@/components/personas/EditPersonaTrigger";
import { DeletePersonaTrigger } from "@/components/personas/DeletePersonaTrigger";

const ESTADO_TO_STATUS: Record<EstadoPersona, "activo" | "pendiente" | "cerrado"> = {
  activo: "activo",
  descanso: "pendiente",
  vacaciones: "pendiente",
  inactivo: "cerrado",
  retirado: "cerrado",
};

const ESTADO_ASIG_TO_STATUS: Record<EstadoAsignacion, "activo" | "pendiente" | "cerrado"> = {
  activa: "activo",
  programada: "pendiente",
  finalizada: "cerrado",
};

const CONCEPTO_TO_STATUS: Record<ConceptoMedico, "activo" | "pendiente" | "critico"> = {
  apto: "activo",
  apto_con_restricciones: "pendiente",
  no_apto: "critico",
  pendiente: "pendiente",
};

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const persona = await getPersonaByIdDb(id);
  if (!persona) notFound();

  const asignaciones = await getAsignacionesDb();
  const asignacionActiva = asignaciones.find((a) => a.conductorId === id && a.estado === "activa");
  const historial = asignaciones.filter((a) => a.conductorId === id);
  const esConductor = persona.perfiles.includes("conductor");

  return (
    <div className="space-y-6">
      <Link
        href="/personas"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Personas
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Columna izquierda: identidad, salud y contacto de emergencia */}
        <div className="lg:w-80 shrink-0 space-y-4">
          <Card>
            <div className="flex flex-col items-center text-center">
              <Avatar initials={persona.fotoIniciales} size="lg" />
              <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50">
                {persona.nombres} {persona.apellidos}
              </h1>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-fog-400">
                {persona.tipoDocumento} {persona.numeroDocumento}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {persona.perfiles.map((p) => (
                  <ProfileTag key={p} perfil={p} />
                ))}
              </div>
              <div className="mt-3">
                <StatusBadge status={ESTADO_TO_STATUS[persona.estado]}>
                  {ESTADO_LABELS[persona.estado]}
                </StatusBadge>
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-line-600 pt-4 text-sm">
              <InfoRow icon={<Phone size={15} />} label={persona.telefono} />
              <InfoRow icon={<Mail size={15} />} label={persona.email} />
              <InfoRow
                icon={<Calendar size={15} />}
                label={`Ingreso: ${new Date(persona.fechaIngreso).toLocaleDateString("es-CO")}`}
              />
              {persona.contratistaNombre && (
                <InfoRow icon={<Building2 size={15} />} label={persona.contratistaNombre} />
              )}
            </div>

            <EditPersonaTrigger persona={persona} />
            <DeletePersonaTrigger persona={persona} />
          </Card>

          {/* Salud y Seguridad Social */}
          <Card>
            <div className="flex items-center gap-2 text-fog-400">
              <HeartPulse size={16} className="text-signal-amber" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-paper-50">
                Salud &amp; Afiliaciones
              </h2>
            </div>
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-line-600/50 pb-2">
                <span className="text-fog-400">Grupo RH</span>
                <span className="font-mono font-bold text-radar-cyan">
                  {persona.datosSalud?.grupoSanguineoRH || "No registrado"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-line-600/50 pb-2">
                <span className="text-fog-400">EPS</span>
                <span className="text-mist-200">{persona.datosSalud?.eps || "—"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-line-600/50 pb-2">
                <span className="text-fog-400">ARL</span>
                <span className="text-mist-200">{persona.datosSalud?.arl || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fog-400">Pensiones</span>
                <span className="text-mist-200">{persona.datosSalud?.fondoPensiones || "—"}</span>
              </div>
              {persona.datosSalud?.alergias && (
                <div className="mt-2 rounded border border-alert-red/30 bg-alert-red-dim/40 p-2 text-alert-red text-[11px]">
                  <strong>Alergias:</strong> {persona.datosSalud.alergias}
                </div>
              )}
            </div>
          </Card>

          {/* Contacto de Emergencia */}
          <Card>
            <div className="flex items-center gap-2 text-fog-400">
              <PhoneCall size={16} className="text-radar-cyan" />
              <h2 className="font-mono text-xs uppercase tracking-wider text-paper-50">
                Contacto de Emergencia
              </h2>
            </div>
            {persona.contactoEmergencia ? (
              <div className="mt-3 space-y-2 text-xs">
                <p className="font-medium text-paper-50">
                  {persona.contactoEmergencia.nombreCompleto}
                </p>
                <p className="text-fog-400">
                  Parentesco: <span className="text-mist-200">{persona.contactoEmergencia.parentesco}</span>
                </p>
                <div className="pt-2">
                  <a
                    href={`tel:${persona.contactoEmergencia.telefono.replace(/\s+/g, "")}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line-600 bg-asphalt-800 py-2 text-xs font-medium text-radar-cyan hover:bg-asphalt-700 hover:text-paper-50 transition-colors"
                  >
                    <Phone size={13} /> {persona.contactoEmergencia.telefono}
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-fog-400">Sin contacto registrado.</p>
            )}
          </Card>
        </div>

        {/* Columna derecha: asignación, expediente de conducción, documentos, historial */}
        <div className="flex-1 space-y-6">
          {esConductor && (
            <>
              {/* Asignación Actual */}
              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                    Asignación actual
                  </h2>
                  <Link
                    href="/asignaciones"
                    className="text-xs text-radar-cyan hover:underline"
                  >
                    Ver módulo Asignaciones
                  </Link>
                </div>
                {asignacionActiva ? (
                  <div className="mt-3 flex items-center gap-4">
                    <Link href={`/flota/${asignacionActiva.vehiculoId}`}>
                      <PlateTag plate={asignacionActiva.placa} />
                    </Link>
                    {asignacionActiva.tipoAsignacion === "fija" ? (
                      <span className="text-sm text-mist-200">Asignación fija</span>
                    ) : (
                      asignacionActiva.turno && <TurnoTag turno={asignacionActiva.turno} />
                    )}
                    <span className="text-xs text-fog-400">
                      Desde {new Date(asignacionActiva.fechaInicio).toLocaleDateString("es-CO")}
                    </span>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-fog-400">
                    Sin asignación activa actualmente — probablemente en ciclo de descanso.
                  </p>
                )}

                {historial.length > 0 && (
                  <div className="mt-5 border-t border-line-600 pt-4">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fog-400">
                      Historial de asignaciones
                    </p>
                    <ul className="space-y-2">
                      {historial.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between rounded-md border border-line-600 bg-asphalt-800/50 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <PlateTag plate={a.placa} />
                            <span className="text-xs text-fog-400">
                              {new Date(a.fechaInicio).toLocaleDateString("es-CO")}
                              {a.fechaFin && ` → ${new Date(a.fechaFin).toLocaleDateString("es-CO")}`}
                            </span>
                          </div>
                          <StatusBadge status={ESTADO_ASIG_TO_STATUS[a.estado]}>
                            {ESTADO_ASIGNACION_LABELS[a.estado]}
                          </StatusBadge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              {/* Expediente de Licencia de Conducción */}
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award size={17} className="text-signal-amber" />
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                      Licencia de Conducción
                    </h2>
                  </div>
                  {persona.licenciaConduccion && (
                    <span className="font-mono text-xs text-fog-400">
                      N° {persona.licenciaConduccion.numero}
                    </span>
                  )}
                </div>

                {persona.licenciaConduccion ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line-600 bg-asphalt-800/60 p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-fog-400">Categorías autorizadas:</span>
                          <div className="flex gap-1">
                            {persona.licenciaConduccion.categorias.map((cat) => (
                              <span
                                key={cat}
                                className="rounded bg-asphalt-700 px-2 py-0.5 font-mono text-xs font-bold text-signal-amber"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                        {persona.licenciaConduccion.organismoTransito && (
                          <p className="mt-1 text-xs text-fog-400">
                            {persona.licenciaConduccion.organismoTransito}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-mono text-fog-400">Vigencia RUNT</p>
                        <DocExpiryBadge
                          label="Licencia de Conducción"
                          vencimientoISO={persona.licenciaConduccion.fechaVencimiento}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-fog-400">
                    No registra licencia de conducción cargada en su expediente.
                  </p>
                )}
              </Card>

              {/* Expediente Médico Ocupacional */}
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={17} className="text-radar-cyan" />
                    <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                      Examen Médico Ocupacional (EMO)
                    </h2>
                  </div>
                  {persona.examenMedico && (
                    <span className="font-mono text-xs text-fog-400">
                      {persona.examenMedico.centroMedico || "IPS Autorizada"}
                    </span>
                  )}
                </div>

                {persona.examenMedico ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-line-600 bg-asphalt-800/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-600 pb-2">
                        <div>
                          <p className="text-xs text-fog-400">Concepto de aptitud:</p>
                          <span
                            className={`font-semibold text-sm ${
                              persona.examenMedico.concepto === "apto"
                                ? "text-ok-green"
                                : persona.examenMedico.concepto === "apto_con_restricciones"
                                ? "text-signal-amber"
                                : "text-alert-red"
                            }`}
                          >
                            {CONCEPTO_MEDICO_LABELS[persona.examenMedico.concepto as ConceptoMedico]}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-mono text-fog-400">Vencimiento Periódico</p>
                          <DocExpiryBadge
                            label="Examen Médico"
                            vencimientoISO={persona.examenMedico.fechaVigencia}
                          />
                        </div>
                      </div>

                      {persona.examenMedico.enfasis && persona.examenMedico.enfasis.length > 0 && (
                        <div className="mt-2.5">
                          <p className="text-xs text-fog-400 mb-1">Énfasis evaluados:</p>
                          <div className="flex flex-wrap gap-1">
                            {persona.examenMedico.enfasis.map((enf) => (
                              <span
                                key={enf}
                                className="rounded border border-line-600 bg-asphalt-700 px-2 py-0.5 text-xs text-mist-200"
                              >
                                {enf}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {persona.examenMedico.restricciones && (
                        <div className="mt-3 rounded border border-signal-amber/30 bg-signal-amber-dim/30 p-2.5 text-xs text-mist-200">
                          <p className="font-semibold text-signal-amber">
                            Restricciones / Recomendaciones HSEQ:
                          </p>
                          <p className="mt-0.5">{persona.examenMedico.restricciones}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-fog-400">
                    No cuenta con certificado de examen médico ocupacional registrado.
                  </p>
                )}
              </Card>
            </>
          )}

          {/* Expediente Digital con Carga y Visor Integrado de Documentos */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-radar-cyan" />
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
                  Expediente Digital HSEQ
                </h2>
              </div>
              <Link href="/documentos" className="text-xs text-radar-cyan hover:underline">
                Repositorio general
              </Link>
            </div>

            <ExpedienteDigital personaId={persona.id} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-mist-200">
      <span className="text-fog-400">{icon}</span>
      {label}
    </div>
  );
}

