/**
 * CLIENTE API FERROVIARIA / RAILWAY - App Asistencia TH-FOR-03
 * Proyecto: Trans Services A&B
 * 100% Integrado con PostgreSQL en Railway a través de Next.js API
 */

export function fechaLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function horaLocal(d = new Date()) {
  return d.toTimeString().slice(0, 8);
}

/**
 * Obtiene todos los registros de asistencia o filtrados por fecha desde Railway
 */
export async function getAsistencia(params = {}) {
  try {
    const search = new URLSearchParams(params).toString();
    const res = await fetch(`/api/apps/asistencia?${search}`);
    if (res.ok) {
      const json = await res.json();
      return json.asistencias || [];
    }
  } catch (e) {
    console.warn('Aviso getAsistencia Railway:', e);
  }
  return [];
}

export async function getAsistenciaByFecha(fecha) {
  return await getAsistencia({ fecha });
}

export async function getAsistenciaHoy() {
  return await getAsistenciaByFecha(fechaLocal());
}

/**
 * Crea un registro de asistencia en PostgreSQL (Railway)
 */
export async function createAsistencia(registro) {
  const res = await fetch('/api/apps/asistencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conductorNombre: registro.conductor_nombre || registro.personaNombre,
      conductorDocumento: registro.conductor_documento || registro.numero_documento,
      cargo: registro.cargo,
      proyecto: registro.proyecto,
      facilitador: registro.facilitador,
      lugar: registro.lugar,
      duracionHoras: registro.duracion_horas || 1.0,
      evento: registro.evento || registro.tipo_evento,
      tipoEvento: registro.tipo_evento,
      estado: registro.estado || 'presente',
      observaciones: registro.observaciones,
      signature: registro.firma_url || registro.firma_base64,
      fotoUrl: registro.foto_url || registro.foto_base64
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar en el servidor');
  }

  const json = await res.json();
  return json.asistencia;
}

/**
 * Busca conductor por documento en PostgreSQL (Railway)
 */
export async function getConductorByDocumento(numero_documento) {
  if (!numero_documento) return null;
  try {
    const res = await fetch(`/api/apps/asistencia?cedula=${encodeURIComponent(numero_documento)}`);
    if (res.ok) {
      const json = await res.json();
      return json.persona || null;
    }
  } catch (e) {
    console.warn('Aviso búsqueda conductor Railway:', e);
  }
  return null;
}

export default {
  fechaLocal,
  horaLocal,
  getAsistencia,
  createAsistencia,
  getConductorByDocumento
};