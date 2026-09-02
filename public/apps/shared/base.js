/**
 * CAPA COMPARTIDA — Trans Services A&B (Fase 0.5)
 * apps/shared/base.js
 *
 * Punto de consolidación para las aplicaciones del ecosistema:
 *   - Cliente Supabase unificado (re-exporta supabase/client.js)
 *   - Sesión y listeners de autenticación
 *   - Roles y guardas de ruta (user_roles + funciones DB is_admin/is_hseq/is_gerencia)
 *   - Notificaciones (usa TS.* de assets/js/trans-services-ui.js si existe)
 *   - Normalización de errores (mensajes amigables + código)
 *   - Auditoría (tabla audit_log, inserta si existe)
 *
 * Uso:
 *   import { supabase, requireRole, logAudit } from '../../apps/shared/base.js'
 *
 * NOTA: ninguna app se migra forzosamente en esta fase; este módulo es la
 * base documentada para la unificación progresiva (ver docs/ESTABILIZACION_FASE_0_5.md).
 */

import { supabase, getCurrentUser } from '../../supabase/client.js'

export { supabase }
export {
  getConductores,
  getConductoresActivos,
  getViajes,
  createViaje,
  updateViaje,
  getPreoperacionales,
  createPreoperacional,
  signIn,
  signUp,
  signOut,
  resetPassword
} from '../../supabase/client.js'

// =============================================
// SESIÓN
// =============================================

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session || null
}

export function onSessionChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return data?.subscription
}

// =============================================
// ROLES (user_roles + funciones de guardia DB)
// =============================================

const ROLE_CACHE = { value: null, ts: 0 }

async function getRoleFromDb() {
  const user = await getCurrentUser()
  if (!user) return null
  try {
    // Función SECURITY DEFINER de la migración 20260805000000
    const { data, error } = await supabase.rpc('get_user_role')
    if (!error && data) return data
  } catch { /* fallback abajo */ }
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('rol')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!error && data) return data.rol || 'conductor'
  } catch { /* sin rol */ }
  return null
}

export async function getCurrentRole(force = false) {
  const now = Date.now()
  if (!force && ROLE_CACHE.value && now - ROLE_CACHE.ts < 60000) {
    return ROLE_CACHE.value
  }
  const role = await getRoleFromDb()
  ROLE_CACHE.value = role
  ROLE_CACHE.ts = now
  return role
}

export async function hasRole(role) {
  const current = await getCurrentRole()
  return current === role
}

export async function isAdmin() {
  return (await getCurrentRole()) === 'admin'
}

export async function isHseq() {
  return (await getCurrentRole()) === 'hseq'
}

export async function isGerencia() {
  return (await getCurrentRole()) === 'gerencia'
}

/**
 * Guarda de ruta por rol. Redirige si no cumple.
 * @returns {Promise<boolean>} true si el usuario cumple, false si no.
 */
export async function requireRole(role, { redirectUnauth = 'login.html?reason=unauthorized', redirectForbidden = 'index.html?reason=forbidden' } = {}) {
  const user = await getCurrentUser()
  if (!user) {
    if (redirectUnauth) window.location.href = redirectUnauth
    return false
  }
  const current = await getCurrentRole(true)
  const allowed = current === role
  if (!allowed && redirectForbidden) window.location.href = redirectForbidden
  return allowed
}

export async function requireAuth(redirect = 'login.html?reason=unauthorized') {
  const user = await getCurrentUser()
  if (!user && redirect) window.location.href = redirect
  return !!user
}

// =============================================
// NOTIFICACIONES (usa TS.* de trans-services-ui.js si está cargado)
// =============================================

function ts() {
  return typeof window !== 'undefined' && window.TS ? window.TS : null
}

export function notifySuccess(msg) {
  const t = ts()
  if (t && typeof t.toastSuccess === 'function') return t.toastSuccess(msg)
  if (typeof alert === 'function') alert(msg)
}

export function notifyError(msg) {
  const t = ts()
  if (t && typeof t.toastError === 'function') return t.toastError(msg)
  if (typeof alert === 'function') alert(msg)
}

export function notifyWarning(msg) {
  const t = ts()
  if (t && typeof t.toastWarning === 'function') return t.toastWarning(msg)
  if (typeof alert === 'function') alert(msg)
}

export function confirmAction(msg) {
  const t = ts()
  if (t && typeof t.confirm === 'function') return t.confirm(msg)
  return Promise.resolve(typeof confirm === 'function' ? confirm(msg) : true)
}

// =============================================
// ERRORES
// =============================================

export function normalizeError(err, fallback = 'Error inesperado. Intente de nuevo.') {
  if (!err) return fallback
  if (typeof err === 'string') return err
  const msg = err.message || fallback
  if (err.code === 'permission-denied') return '⛔ ACCESO DENEGADO: no tiene permisos para esta acción.'
  if (err.code === 'PGRST116') return 'Registro no encontrado.'
  if (err.code === '23505') return 'Registro duplicado. Verifique los datos.'
  if (err.status === 429 || msg.includes('429')) return 'Demasiadas solicitudes. Espere unos minutos e intente de nuevo.'
  return msg
}

// =============================================
// AUDITORÍA (tabla audit_log)
// =============================================

export async function logAudit(accion, detalle = {}) {
  try {
    const user = await getCurrentUser()
    const payload = {
      user_id: user?.id || null,
      email: user?.email || null,
      accion,
      detalle: typeof detalle === 'object' ? detalle : { mensaje: String(detalle) }
    }
    const { error } = await supabase.from('audit_log').insert(payload)
    if (error && error.code === '42P01') {
      console.warn('[shared] tabla audit_log no existe aún (migración 20260805000000 pendiente).')
    } else if (error) {
      console.warn('[shared] no se pudo registrar auditoría:', error.message)
    }
  } catch (e) {
    console.warn('[shared] no se pudo registrar auditoría:', e?.message)
  }
}

export default supabase
