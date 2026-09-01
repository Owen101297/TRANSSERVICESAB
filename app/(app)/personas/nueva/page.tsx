"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormSection, TextField, SelectField } from "@/components/ui/FormField";
import { createPersonaAction } from "@/lib/services/personas.service";
import { getContratistasDb } from "@/lib/services/contratistas.service";
import { Contratista } from "@/lib/types/contratista";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [perfil, setPerfil] = useState("conductor");
  const [contratistas, setContratistas] = useState<Contratista[]>([]);

  useEffect(() => {
    getContratistasDb().then((data) => setContratistas(data || []));
  }, []);

  const esConductor = perfil === "conductor";

  const contratistaOptions = [
    { value: "", label: "Flota Propia / Cooperativa A&B" },
    ...contratistas.map((c) => ({
      value: c.id,
      label: c.nombre,
    })),
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createPersonaAction(formData);
      if (res.success && res.personaId) {
        router.push(`/personas/${res.personaId}`);
      } else {
        setErrorMsg(res.error || "Ocurrió un error al guardar el registro.");
      }
    });
  };

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

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-alert-red/30 bg-alert-red-dim/40 p-3 text-sm text-alert-red">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <Card>
        <form className="space-y-6" onSubmit={handleSubmit}>
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
            description="Selecciona el rol principal del colaborador y la empresa contratista vinculada."
          >
            <SelectField
              label="Perfil principal"
              name="perfil"
              required
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              options={PERFIL_OPTIONS}
            />
            <SelectField
              label="Contratista / Empresa Vinculada"
              name="contratistaId"
              options={contratistaOptions}
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
              placeholder="Cónyuge, Madre, Hermano..."
            />
            <TextField
              label="Teléfono de emergencia"
              name="contactoEmergenciaTelefono"
              placeholder="310 987 6543"
              wrapperClassName="sm:col-span-2"
            />
          </FormSection>

          {esConductor && (
            <FormSection
              title="Expediente de Conducción"
              description="Campos requeridos exclusivamente para el perfil conductor (PESV / RUNT)."
            >
              <TextField
                label="Número de Licencia"
                name="licenciaNumero"
                placeholder="1084567123"
              />
              <SelectField
                label="Categoría principal"
                name="licenciaCategoria"
                options={CATEGORIA_LIC_OPTIONS}
              />
              <TextField
                label="Vencimiento de Licencia"
                name="licenciaVencimiento"
                type="date"
              />
              <TextField
                label="Organismo de Tránsito"
                name="licenciaOrganismo"
                placeholder="Stria. Tránsito Cartagena"
              />
              <TextField
                label="Vigencia Examen Médico (EMO)"
                name="emoVigencia"
                type="date"
              />
              <SelectField
                label="Concepto Médico"
                name="conceptoMedico"
                options={CONCEPTO_MEDICO_OPTIONS}
              />
              <TextField
                label="Restricciones médicas"
                name="emoRestricciones"
                placeholder="Uso de lentes formulados, etc. (Opcional)"
                wrapperClassName="sm:col-span-2"
              />
            </FormSection>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/personas">
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" variant="primary" disabled={isPending}>
              <Save size={15} />
              {isPending ? "Guardando..." : "Guardar persona"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
