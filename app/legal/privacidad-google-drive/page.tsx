import type { Metadata } from "next";
import { PublicDocumentLayout } from "@/components/public/PublicDocumentLayout";

export const metadata: Metadata = {
  title: "Privacidad de Google Drive | TRANS SERVICES A&B",
  description:
    "Política de privacidad aplicable a la integración entre el ERP de TRANS SERVICES A&B y Google Drive.",
};

export default function GoogleDrivePrivacyPage() {
  return (
    <PublicDocumentLayout
      eyebrow="Política de privacidad"
      title="Tratamiento de datos en la integración con Google Drive"
      description="Esta política explica qué información usa el ERP, para qué se utiliza, dónde se conserva y cómo puede revocarse el acceso. Vigente desde el 3 de octubre de 2026."
    >
      <section aria-labelledby="responsable">
        <h2 id="responsable">1. Responsable y finalidad</h2>
        <p className="mt-3">
          TRANS SERVICES A&amp;B S.A.S. es responsable de esta integración. Google Drive se utiliza para
          organizar y conservar soportes de actividades empresariales, entre ellos evidencias consolidadas de
          asistencia, formación, divulgación y seguimiento HSEQ o PESV. El ERP mantiene las referencias que
          permiten relacionar cada archivo con su actividad, fecha y participante.
        </p>
      </section>

      <section aria-labelledby="datos-tratados">
        <h2 id="datos-tratados">2. Información tratada</h2>
        <ul className="mt-4">
          <li>Identificadores y metadatos técnicos necesarios para autorizar Google Drive.</li>
          <li>Identificador, enlace, nombre, tamaño, tipo, fecha y huella de integridad del archivo.</li>
          <li>Relación del soporte con la actividad y el registro de asistencia correspondiente.</li>
          <li>
            Evidencia consolidada de actividades remotas, que puede contener la fotografía aportada por la
            persona, el material divulgado y la constancia de registro.
          </li>
        </ul>
        <p className="mt-4">
          El ERP <strong>no solicita ni almacena la contraseña de Google</strong>. La fotografía original usada
          para componer una evidencia remota no se carga como un archivo independiente; se procesa para formar
          la evidencia consolidada que se envía a Drive.
        </p>
      </section>

      <section aria-labelledby="alcance">
        <h2 id="alcance">3. Alcance y uso de Google Drive</h2>
        <p className="mt-3">
          La aplicación solicita el alcance <strong>https://www.googleapis.com/auth/drive.file</strong>. Se usa
          exclusivamente para crear, organizar, consultar, actualizar o eliminar archivos generados por la
          aplicación, o archivos que una persona autorice expresamente para usarlos con ella. La información no
          se utiliza para publicidad, elaboración de perfiles comerciales ni venta a terceros.
        </p>
      </section>

      <section aria-labelledby="conservacion">
        <h2 id="conservacion">4. Conservación y ubicación</h2>
        <p className="mt-3">
          Los archivos se conservan en la cuenta de Google Drive autorizada por la empresa. La base de datos del
          ERP conserva referencias y metadatos de trazabilidad, no una segunda copia de la evidencia almacenada
          en Drive. Las credenciales técnicas se mantienen como secretos del entorno de ejecución y no se
          incluyen en el código ni se muestran a las personas usuarias.
        </p>
        <p className="mt-3">
          La conservación responde a las necesidades operativas, contractuales, legales y de auditoría de la
          empresa. La eliminación se realiza por personal autorizado de acuerdo con esas obligaciones y con las
          reglas documentales aplicables.
        </p>
      </section>

      <section aria-labelledby="terceros">
        <h2 id="terceros">5. Proveedores y divulgación</h2>
        <p className="mt-3">
          Para prestar esta función se utilizan Google Drive como almacenamiento autorizado y Railway como
          infraestructura de alojamiento del ERP. El acceso interno se limita a personas administradoras o
          autorizadas según sus funciones. La información puede comunicarse cuando exista una obligación legal
          o una solicitud válida de una autoridad competente.
        </p>
      </section>

      <section aria-labelledby="seguridad">
        <h2 id="seguridad">6. Seguridad y control</h2>
        <ul className="mt-4">
          <li>Conexiones cifradas mediante HTTPS.</li>
          <li>Permisos mínimos y separación entre archivos y metadatos del ERP.</li>
          <li>Acceso administrativo autenticado y trazabilidad de las evidencias.</li>
          <li>Secretos de Google configurados fuera del repositorio y de la interfaz pública.</li>
        </ul>
      </section>

      <section aria-labelledby="revocacion">
        <h2 id="revocacion">7. Revocación, solicitudes y contacto</h2>
        <p className="mt-3">
          La autorización de Google puede revocarse desde la sección de conexiones de la cuenta de Google. Para
          solicitar información, corrección, eliminación cuando proceda, o soporte sobre esta integración,
          escribe a <a href="mailto:transserviceshseq.ab@gmail.com">transserviceshseq.ab@gmail.com</a>.
        </p>
      </section>

      <section aria-labelledby="google-policy">
        <h2 id="google-policy">8. Política de datos de Google</h2>
        <p className="mt-3">
          El uso y la transferencia a otras aplicaciones de la información recibida de las API de Google se
          ajustan a la{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer noopener"
          >
            Política de datos de usuario de los servicios API de Google
          </a>
          , incluidos sus requisitos de uso limitado.
        </p>
      </section>
    </PublicDocumentLayout>
  );
}
