import type { Metadata } from "next";
import { Cloud, FileCheck2, FolderLock, ShieldCheck } from "lucide-react";
import { PublicDocumentLayout } from "@/components/public/PublicDocumentLayout";

export const metadata: Metadata = {
  title: "Integración con Google Drive | TRANS SERVICES A&B",
  description:
    "Información pública sobre el uso de Google Drive en el ERP de TRANS SERVICES A&B.",
};

const features = [
  {
    icon: FileCheck2,
    title: "Evidencias auditables",
    description: "Archiva los soportes generados por actividades, formaciones y registros de asistencia.",
  },
  {
    icon: FolderLock,
    title: "Acceso limitado",
    description: "Solicita el alcance drive.file para trabajar solamente con archivos usados por la aplicación.",
  },
  {
    icon: ShieldCheck,
    title: "Control empresarial",
    description: "El acceso se administra desde la cuenta autorizada de TRANS SERVICES A&B y puede revocarse.",
  },
];

export default function GoogleDriveIntegrationPage() {
  return (
    <PublicDocumentLayout
      eyebrow="Integración autorizada"
      title="Google Drive en el ERP de TRANS SERVICES A&B"
      description="Esta integración permite organizar fuera del ERP las evidencias digitales de asistencia y formación, manteniendo en el sistema la trazabilidad necesaria para consultar cada actividad."
    >
      <section aria-labelledby="proposito">
        <h2 id="proposito">Propósito de la aplicación</h2>
        <p className="mt-3">
          El ERP apoya la gestión HSEQ y PESV de TRANS SERVICES A&amp;B S.A.S. La conexión con Google Drive
          se usa para crear carpetas y almacenar evidencias generadas durante actividades como capacitaciones,
          charlas, divulgaciones y otros eventos empresariales.
        </p>
      </section>

      <section aria-labelledby="funcionamiento">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-sky-800" aria-hidden="true">
            <Cloud size={22} strokeWidth={2.2} />
          </span>
          <h2 id="funcionamiento">Cómo funciona</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="text-sky-700" size={24} aria-hidden="true" />
              <h3 className="mt-4">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="datos">
        <h2 id="datos">Datos y alcance solicitado</h2>
        <p className="mt-3">
          La aplicación solicita únicamente el alcance <strong>Google Drive drive.file</strong>. Este permiso
          permite crear y gestionar los archivos que la aplicación crea o que la persona usuaria selecciona
          expresamente para utilizar con ella. No se utiliza para explorar de manera general archivos ajenos
          al proceso del ERP.
        </p>
        <ul className="mt-4">
          <li>El ERP no solicita ni almacena la contraseña de Google.</li>
          <li>Los datos no se venden ni se utilizan para publicidad.</li>
          <li>La autorización puede revocarse desde la cuenta de Google o solicitándolo al responsable.</li>
        </ul>
      </section>

      <aside className="rounded-2xl border border-sky-200 bg-sky-50 p-5 sm:p-6" aria-labelledby="contacto">
        <h2 id="contacto" className="!text-xl">Contacto y responsable</h2>
        <p className="mt-2">
          TRANS SERVICES A&amp;B S.A.S. · Coordinación HSEQ ·{" "}
          <a href="mailto:transserviceshseq.ab@gmail.com">transserviceshseq.ab@gmail.com</a>
        </p>
      </aside>
    </PublicDocumentLayout>
  );
}
