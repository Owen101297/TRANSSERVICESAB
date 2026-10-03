import type { Metadata } from "next";
import { PublicDocumentLayout } from "@/components/public/PublicDocumentLayout";

export const metadata: Metadata = {
  title: "Términos de Google Drive | TRANS SERVICES A&B",
  description:
    "Términos aplicables al uso de Google Drive desde el ERP de TRANS SERVICES A&B.",
};

export default function GoogleDriveTermsPage() {
  return (
    <PublicDocumentLayout
      eyebrow="Términos de uso"
      title="Condiciones de la integración con Google Drive"
      description="Estas condiciones regulan el uso empresarial de la integración entre el ERP de TRANS SERVICES A&B y Google Drive. Vigentes desde el 3 de octubre de 2026."
    >
      <section aria-labelledby="servicio">
        <h2 id="servicio">1. Servicio y aceptación</h2>
        <p className="mt-3">
          La integración permite almacenar y organizar en Google Drive evidencias relacionadas con procesos del
          ERP. Al autorizar o utilizar esta función, la persona confirma que cuenta con permiso para actuar en
          nombre de la empresa y acepta estas condiciones y la política de privacidad asociada.
        </p>
      </section>

      <section aria-labelledby="uso-autorizado">
        <h2 id="uso-autorizado">2. Uso autorizado</h2>
        <ul className="mt-4">
          <li>Utilizar la integración únicamente para actividades y documentos empresariales legítimos.</li>
          <li>Aportar información y evidencias auténticas, pertinentes y obtenidas de forma autorizada.</li>
          <li>Proteger las credenciales de acceso y reportar cualquier uso no autorizado.</li>
          <li>Respetar las reglas internas de seguridad, privacidad, archivo y retención documental.</li>
        </ul>
      </section>

      <section aria-labelledby="restricciones">
        <h2 id="restricciones">3. Restricciones</h2>
        <p className="mt-3">
          No está permitido intentar acceder a información ajena, eludir controles de seguridad, cargar contenido
          ilícito o malicioso, alterar evidencias, suplantar identidades ni utilizar la integración para fines
          distintos de los procesos autorizados de TRANS SERVICES A&amp;B S.A.S.
        </p>
      </section>

      <section aria-labelledby="terceros">
        <h2 id="terceros">4. Servicios de terceros</h2>
        <p className="mt-3">
          La función depende de servicios proporcionados por Google y de la infraestructura de Railway. La
          disponibilidad, los cambios y las condiciones propias de esos proveedores también pueden afectar el
          funcionamiento. TRANS SERVICES A&amp;B S.A.S. aplicará medidas razonables para conservar la trazabilidad
          y atender incidentes dentro de su ámbito de control.
        </p>
      </section>

      <section aria-labelledby="suspension">
        <h2 id="suspension">5. Suspensión y revocación</h2>
        <p className="mt-3">
          La empresa puede limitar o suspender el acceso cuando exista riesgo de seguridad, uso indebido,
          terminación de la relación autorizada o incumplimiento de estas condiciones. La autorización de Google
          también puede revocarse desde la cuenta que concedió el acceso.
        </p>
      </section>

      <section aria-labelledby="cambios">
        <h2 id="cambios">6. Cambios y contacto</h2>
        <p className="mt-3">
          Estas condiciones pueden actualizarse para reflejar cambios técnicos, operativos o legales. La versión
          vigente se publicará en esta dirección. Las consultas sobre la integración pueden enviarse a{" "}
          <a href="mailto:transserviceshseq.ab@gmail.com">transserviceshseq.ab@gmail.com</a>.
        </p>
      </section>
    </PublicDocumentLayout>
  );
}
