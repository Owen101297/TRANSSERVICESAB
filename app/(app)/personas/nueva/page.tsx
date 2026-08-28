"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";

const PERFIL_OPTIONS = [
  { value: "conductor", label: "Conductor" },
  { value: "empleado", label: "Empleado" },
  { value: "supervisor", label: "Supervisor" },
  { value: "hseq", label: "HSEQ" },
  { value: "administrativo", label: "Administrativo" },
];

const TIPO_DOC_OPTIONS = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PA", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de identidad" },
];

const RH_OPTIONS = [
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
];

const CATEGORIA_LIC_OPTIONS = [
  { value: "C1", label: "C1 — Automóviles, camperos, camionetas públicas" },
  { value: "C2", label: "C2 — Camiones rígidos, busetas y buses públicos" },
  { value: "C3", label: "C3 — Vehículos articulados y tractocamiones" },
  { value: "B1", label: "B1 — Automóviles particulares" },
];

const CONCEPTO_MEDICO_OPTIONS = [
  { value: "apto", label: "Apto sin restricciones" },
  { value: "apto_con_restricciones", label: "Apto con restricciones" },
  { value: "no_apto", label: "No apto temporalmente" },
  { value: "pendiente", label: "Evaluación pendiente" },
];

export default function NuevaPersonaPage() {
  const [submitted, setSubmitted] = useState(false);
  const [perfil, setPerfil] = useState("conductor");

  const esConductor = perfil === "conductor";

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/personas"
        className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper-50"
      >
        <ArrowLeft size={15} /> Volver a Personas
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-paper-50">
          Nueva persona
        </h1>
        <p className="mt-1 text-sm text-fog-400">
          El registro es único. Los perfiles (conductor, HSEQ, etc.) se pueden
          agregar o quitar después sin duplicar la persona.
        </p>
      </div>

      <Card>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <FormSection
            title="Información básica"
            description="Datos personales de identificación."
          >
            <TextField label="Nombres" name="nombres" required placeholder="Carlos Andrés" />
            <TextField label="Apellidos" name="apellidos" required placeholder="Ramírez Ortiz" />
            <SelectField
              label="Tipo de documento"
              name="tipoDocumento"
              required
              options={TIPO_DOC_OPTIONS}
            />
            <TextField
              label="Número de documento"
              name="numeroDocumento"
              required
              placeholder="1084567123"
            />
          </FormSection>

          <FormSection title="Contacto">
            <TextField
              label="Teléfono personal"
              name="telefono"
              required
              placeholder="300 123 4567"
            />
            <TextField
              label="Correo electrónico"
              name="email"
              type="email"
              placeholder="nombre@ejemplo.com"
            />
          </FormSection>

          <FormSection
            title="Perfil y Rol"
            description="Selecciona el rol principal del colaborador."
          >
            <SelectField
              label="Perfil principal"
              name="perfil"
              required
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              options={PERFIL_OPTIONS}
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          <FormSection
            title="Salud & Seguridad Social"
            description="Información médica básica para respuesta a emergencias y afiliaciones legales."
          >
            <SelectField
              label="Grupo Sanguíneo y RH"
              name="grupoSanguineoRH"
              required
              options={RH_OPTIONS}
            />
            <TextField label="EPS Afiliada" name="eps" placeholder="Sura EPS, Sanitas, etc." />
            <TextField label="ARL" name="arl" placeholder="Sura ARL, Seguros Bolívar, etc." />
            <TextField label="Alergias conocidas" name="alergias" placeholder="Penicilina, AINEs, etc. (Opcional)" />
          </FormSection>

          <FormSection
            title="Contacto de Emergencia"
            description="Persona de contacto en caso de incidentes o novedades en ruta."
          >
            <TextField
              label="Nombre completo del contacto"
              name="contactoEmergenciaNombre"
              placeholder="María Pérez"
            />
            <TextField
              label="Parentesco"
              name="contactoEmergenciaParentesco"
              placeholder="Esposa, Madre, Hermano..."
            />
            <TextField
              label="Teléfono de emergencia"
              name="contactoEmergenciaTelefono"
              placeholder="310 000 0000"
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          {esConductor && (
            <>
              <FormSection
                title="Expediente de Conducción"
                description="Requerimiento del Plan Estratégico de Seguridad Vial (PESV - Paso 8)."
              >
                <TextField
                  label="Número de Licencia"
                  name="licenciaNumero"
                  required
                  placeholder="Número de cédula o folio RUNT"
                />
                <SelectField
                  label="Categoría principal"
                  name="licenciaCategoria"
                  required
                  options={CATEGORIA_LIC_OPTIONS}
                />
                <TextField
                  label="Fecha de Vencimiento de Licencia"
                  name="licenciaVencimiento"
                  type="date"
                  required
                />
                <TextField
                  label="Organismo de Tránsito"
                  name="licenciaOrganismo"
                  placeholder="Ej. Secretaría de Movilidad de Medellín"
                />
              </FormSection>

              <FormSection
                title="Examen Médico Ocupacional (EMO)"
                description="Evaluación de aptitud médica para conductores de servicio especial."
              >
                <SelectField
                  label="Concepto Médico"
                  name="conceptoMedico"
                  required
                  options={CONCEPTO_MEDICO_OPTIONS}
                />
                <TextField
                  label="Fecha de Vigencia del Examen"
                  name="emoVigencia"
                  type="date"
                  required
                />
                <TextField
                  label="Restricciones médicas"
                  name="emoRestricciones"
                  placeholder="Ej. Uso obligatorio de lentes formulados (Opcional)"
                  wrapperClassName="sm:col-span-2"
                />
              </FormSection>
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary">
              Guardar persona
            </Button>
            <Link href="/personas">
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
          </div>

          {submitted && (
            <p className="text-sm text-radar-cyan">
              Formulario validado. Falta conectar el backend (Supabase/API)
              para persistir el registro — por ahora esto queda solo en el
              frontend.
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}

