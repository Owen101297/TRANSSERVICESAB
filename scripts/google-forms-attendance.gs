/**
 * TRANS SERVICES A&B · Sincronización mínima Google Forms -> ERP
 * Integración heredada. Para nuevas actividades usa google-forms-central-connector.gs,
 * que se instala una sola vez y administra todos los formularios desde el ERP.
 * Las respuestas y archivos permanecen en Google; el ERP recibe solo la trazabilidad.
 */
function enviarRespuestaAlErp(e) {
  const props = PropertiesService.getScriptProperties();
  const endpoint = props.getProperty('ERP_WEBHOOK_URL');
  const secret = props.getProperty('ERP_WEBHOOK_SECRET');
  const codigoActividad = props.getProperty('CODIGO_ACTIVIDAD');
  const campoDocumento = props.getProperty('CAMPO_DOCUMENTO') || 'Número de documento';
  const puntajeMaximo = Number(props.getProperty('PUNTAJE_MAXIMO') || 0);

  if (!endpoint || !secret || !codigoActividad) {
    throw new Error('Configura ERP_WEBHOOK_URL, ERP_WEBHOOK_SECRET y CODIGO_ACTIVIDAD en Propiedades del script.');
  }

  const response = e.response;
  const documentItem = response.getItemResponses().find(function (itemResponse) {
    return itemResponse.getItem().getTitle().trim().toLowerCase() === campoDocumento.trim().toLowerCase();
  });
  if (!documentItem) throw new Error('No se encontró la pregunta de documento: ' + campoDocumento);

  const scoredItems = response.getGradableItemResponses ? response.getGradableItemResponses() : [];
  const score = scoredItems.reduce(function (total, itemResponse) {
    const value = itemResponse.getScore();
    return total + (typeof value === 'number' ? value : 0);
  }, 0);

  const payload = {
    codigoActividad: codigoActividad,
    personaDocumento: String(documentItem.getResponse()),
    responseId: response.getId(),
    submittedAt: response.getTimestamp().toISOString(),
    calificacion: scoredItems.length ? score : null,
    puntajeMaximo: puntajeMaximo > 0 ? puntajeMaximo : null
  };

  const result = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  if (result.getResponseCode() < 200 || result.getResponseCode() >= 300) {
    throw new Error('El ERP rechazó la sincronización: ' + result.getContentText());
  }
}
