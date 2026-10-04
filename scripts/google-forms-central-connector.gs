/**
 * TRANS SERVICES A&B · Conector central Google Forms -> ERP
 *
 * Se despliega UNA sola vez como aplicación web bajo la cuenta documental.
 * Después el ERP registra y consulta cada formulario desde un único proyecto.
 * No crea activadores por formulario: evita el límite de 20 activadores por script.
 *
 * Propiedad del script obligatoria:
 *   CONNECTOR_SECRET: igual a GOOGLE_FORMS_CONNECTOR_SECRET en Railway.
 */

var CONFIG_PREFIX = 'FORM_CONFIG_';
var MAX_SYNC_RESPONSES = 300;

/** Concede una sola vez los alcances declarados sin crear ni modificar archivos. */
function authorizeConnector() {
  FormApp.getActiveForm();
  UrlFetchApp.getRequest('https://erp.transservicesab.com/api/health');
  return { authorized: true };
}

function doGet() {
  var configuredSecret = String(
    PropertiesService.getScriptProperties().getProperty('CONNECTOR_SECRET') || ''
  ).trim();
  return jsonResponse_({
    success: true,
    service: 'TRANS SERVICES A&B · Google Forms Connector',
    version: 2,
    connectorConfigured: configuredSecret.length >= 32
  });
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    assertAuthorized_(body.secret);
    var action = String(body.action || '');
    if (action === 'register') return jsonResponse_(registerForm_(body));
    if (action === 'sync') return jsonResponse_(syncForm_(body));
    if (action === 'status') return jsonResponse_(formStatus_(body));
    throw new Error('La operación solicitada no existe.');
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse_({ success: false, error: safeError_(error) });
  }
}

function registerForm_(body) {
  requireText_(body.formUrl, 'El enlace de edición del formulario');
  requireText_(body.codigoActividad, 'El código de actividad');
  requireHttps_(body.webhookUrl, 'El webhook del ERP');
  requireText_(body.webhookSecret, 'El secreto del webhook');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var form = FormApp.openByUrl(String(body.formUrl));
    var formId = form.getId();
    var previousRaw = PropertiesService.getScriptProperties().getProperty(CONFIG_PREFIX + formId);
    var previous = previousRaw ? JSON.parse(previousRaw) : null;
    if (previous && previous.codigoActividad !== String(body.codigoActividad).trim()) {
      throw new Error('Este formulario ya está conectado a la actividad ' + previous.codigoActividad + '. Duplica el formulario para conservar una trazabilidad independiente.');
    }
    var config = {
      formId: formId,
      formUrl: form.getEditUrl(),
      codigoActividad: String(body.codigoActividad).trim(),
      documentQuestion: String(body.documentQuestion || 'Número de documento').trim(),
      webhookUrl: String(body.webhookUrl).trim(),
      webhookSecret: String(body.webhookSecret),
      updatedAt: new Date().toISOString(),
      lastSyncAt: previous ? previous.lastSyncAt || null : null
    };
    PropertiesService.getScriptProperties().setProperty(CONFIG_PREFIX + formId, JSON.stringify(config));
    var sync = syncResponses_(form, config, true);
    return {
      success: true,
      action: 'register',
      connected: true,
      formId: formId,
      formTitle: form.getTitle(),
      publishedUrl: form.getPublishedUrl(),
      synced: sync.synced,
      failed: sync.failed,
      totalResponses: sync.totalResponses,
      truncated: sync.truncated
    };
  } finally {
    lock.releaseLock();
  }
}

function syncForm_(body) {
  var formId = requireText_(body.formId, 'El identificador del formulario');
  var config = getFormConfig_(formId);
  if (body.codigoActividad && String(body.codigoActividad) !== config.codigoActividad) {
    throw new Error('El formulario no corresponde a la actividad indicada.');
  }
  var form = FormApp.openById(formId);
  var sync = syncResponses_(form, config, body.full === true);
  return {
    success: true,
    action: 'sync',
    connected: true,
    formId: formId,
    synced: sync.synced,
    failed: sync.failed,
    totalResponses: sync.totalResponses,
    truncated: sync.truncated
  };
}

function formStatus_(body) {
  var formId = requireText_(body.formId, 'El identificador del formulario');
  var config = getFormConfig_(formId);
  if (body.codigoActividad && String(body.codigoActividad) !== config.codigoActividad) {
    throw new Error('El formulario no corresponde a la actividad indicada.');
  }
  FormApp.openById(formId);
  return {
    success: true,
    action: 'status',
    connected: true,
    formId: formId
  };
}

function syncResponses_(form, config, full) {
  var since = !full && config.lastSyncAt
    ? new Date(new Date(config.lastSyncAt).getTime() - 15 * 60 * 1000)
    : null;
  var all = since ? form.getResponses(since) : form.getResponses();
  var truncated = all.length > MAX_SYNC_RESPONSES;
  var responses = truncated ? all.slice(all.length - MAX_SYNC_RESPONSES) : all;
  var synced = 0;
  var failed = 0;
  responses.forEach(function(response) {
    try {
      sendResponse_(form, response, config, 1);
      synced += 1;
    } catch (error) {
      failed += 1;
      console.error('No se sincronizó la respuesta ' + response.getId() + ': ' + safeError_(error));
    }
  });
  if (failed === 0) {
    config.lastSyncAt = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty(CONFIG_PREFIX + form.getId(), JSON.stringify(config));
  }
  return { synced: synced, failed: failed, totalResponses: all.length, truncated: truncated };
}

function sendResponse_(form, response, config, attempts) {
  var itemResponses = response.getItemResponses();
  var wanted = normalizeText_(config.documentQuestion);
  var documentResponse = itemResponses.find(function(itemResponse) {
    return normalizeText_(itemResponse.getItem().getTitle()) === wanted;
  });
  if (!documentResponse) {
    throw new Error('No se encontró la pregunta de documento: ' + config.documentQuestion);
  }
  var personaDocumento = String(documentResponse.getResponse() || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (personaDocumento.length < 4) throw new Error('La respuesta no contiene un documento válido.');

  var score = null;
  var maximumScore = null;
  if (form.isQuiz()) {
    var gradable = response.getGradableItemResponses();
    score = gradable.reduce(function(total, itemResponse) {
      var value = itemResponse.getScore();
      return total + (typeof value === 'number' ? value : 0);
    }, 0);
    maximumScore = maximumQuizScore_(form);
  }
  var responseId = response.getId() || fallbackResponseId_(config.codigoActividad, personaDocumento, response.getTimestamp());
  var payload = {
    codigoActividad: config.codigoActividad,
    formId: config.formId,
    personaDocumento: personaDocumento,
    responseId: responseId,
    submittedAt: response.getTimestamp().toISOString(),
    calificacion: score,
    puntajeMaximo: maximumScore
  };

  var lastError = null;
  for (var attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      var result = UrlFetchApp.fetch(config.webhookUrl, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'x-webhook-secret': config.webhookSecret },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      var status = result.getResponseCode();
      if (status >= 200 && status < 300) return;
      lastError = new Error('El ERP respondió ' + status + ': ' + result.getContentText().slice(0, 300));
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) Utilities.sleep(attempt * 750);
  }
  throw lastError || new Error('No fue posible entregar la respuesta al ERP.');
}

function maximumQuizScore_(form) {
  return form.getItems().reduce(function(total, item) {
    try {
      var type = item.getType();
      if (type === FormApp.ItemType.CHECKBOX) return total + item.asCheckboxItem().getPoints();
      if (type === FormApp.ItemType.MULTIPLE_CHOICE) return total + item.asMultipleChoiceItem().getPoints();
      if (type === FormApp.ItemType.LIST) return total + item.asListItem().getPoints();
      if (type === FormApp.ItemType.SCALE) return total + item.asScaleItem().getPoints();
      if (type === FormApp.ItemType.TEXT) return total + item.asTextItem().getPoints();
      if (type === FormApp.ItemType.PARAGRAPH_TEXT) return total + item.asParagraphTextItem().getPoints();
      if (type === FormApp.ItemType.GRID) return total + item.asGridItem().getPoints();
      if (type === FormApp.ItemType.CHECKBOX_GRID) return total + item.asCheckboxGridItem().getPoints();
    } catch (error) {
      console.warn('No se pudo leer el puntaje de una pregunta: ' + safeError_(error));
    }
    return total;
  }, 0) || null;
}

function getFormConfig_(formId) {
  var raw = PropertiesService.getScriptProperties().getProperty(CONFIG_PREFIX + formId);
  if (!raw) throw new Error('El formulario no está registrado en el conector.');
  return JSON.parse(raw);
}

function assertAuthorized_(provided) {
  var expected = String(
    PropertiesService.getScriptProperties().getProperty('CONNECTOR_SECRET') || ''
  ).trim();
  var normalizedProvided = String(provided || '').trim();
  if (!expected || !normalizedProvided || normalizedProvided !== expected) throw new Error('Solicitud no autorizada.');
}

function requireText_(value, label) {
  var normalized = String(value || '').trim();
  if (!normalized) throw new Error(label + ' es obligatorio.');
  return normalized;
}

function requireHttps_(value, label) {
  var normalized = requireText_(value, label);
  if (normalized.indexOf('https://') !== 0) throw new Error(label + ' debe usar HTTPS.');
  return normalized;
}

function normalizeText_(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function fallbackResponseId_(code, documentNumber, timestamp) {
  var raw = [code, documentNumber, timestamp.toISOString()].join(':');
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw)).replace(/=+$/, '');
}

function safeError_(error) {
  var message = error && error.message ? error.message : String(error || 'Error desconocido');
  return message.slice(0, 500);
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
