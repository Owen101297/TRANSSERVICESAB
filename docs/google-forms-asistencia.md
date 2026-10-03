# Google Forms y asistencia

La integración conserva el contenido y las respuestas en Google Forms. El ERP recibe únicamente código de actividad, documento, identificador de respuesta, fecha, estado y puntaje.

1. En el formulario, crea una pregunta obligatoria llamada `Número de documento`.
2. Abre **Extensiones > Apps Script** y pega `scripts/google-forms-attendance.gs`.
3. En **Configuración del proyecto > Propiedades del script**, agrega:
   - `ERP_WEBHOOK_URL`: `https://erp.transservicesab.com/api/asistencia/publica/google-forms/respuesta`
   - `ERP_WEBHOOK_SECRET`: el mismo secreto configurado en Railway.
   - `CODIGO_ACTIVIDAD`: el consecutivo visible en el expediente del ERP.
   - `CAMPO_DOCUMENTO`: nombre exacto de la pregunta; por defecto `Número de documento`.
   - `PUNTAJE_MAXIMO`: solo para cuestionarios evaluables.
4. En **Activadores**, agrega `enviarRespuestaAlErp`, origen **Desde el formulario** y evento **Al enviar el formulario**.

No agregues el secreto como pregunta del formulario ni lo compartas con participantes.
