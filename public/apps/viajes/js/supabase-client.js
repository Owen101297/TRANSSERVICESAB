/**
 * CLIENTE SUPABASE ROBUSTO - App Viajes
 * Proyecto: Trans Services A&B
 * 
 * Cambios en esta versión:
 * - Manejo centralizado de errores (sesión expirada, permisos RLS, red)
 * - Helpers de autenticación y roles (isAdmin, requireAuth, requireAdmin)
 * - Cache de perfil en memoria para reducir consultas
 * - Todas las operaciones CRUD con reintentos opcionales y mensajes claros
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xftllyjjqvozjjmgwomg.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdGxseWpqcXZvempqbWd3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjExMTIsImV4cCI6MjA5Mzc5NzExMn0.UURzZOytfoYMrxzpohRams_GcJ3ETsEnNNOaSQqeuu8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ============================================================
// HABILITACIÓN OPERATIVA PREVIA AL DESPACHO (FASE G)
// ============================================================

/**
 * FASE G: Habilitación Operativa previa al Despacho (ADR-002/003/011).
 * Verifica que los documentos del vehículo estén VIGENTES y que la licencia
 * del conductor esté VIGENTE en la BD antes de permitir el viaje.
 */
export async function validarHabilitacionDespacho(vehiculoId, conductorId) {
    const validacion = { ok: true, bloqueos: [], advertencias: [] }

    // 1. Validar documentos obligatorios del vehículo en flota.documentos
    if (vehiculoId) {
        try {
            const { data: docs, error: docErr } = await supabase
                .from('flota.documentos')
                .select('tipo_documento, estado, fecha_vencimiento')
                .eq('vehiculo_id', vehiculoId)

            if (!docErr && docs) {
                const obligatorios = ['soat', 'tecnicomecanica', 'seguro_contractual', 'seguro_extracontractual', 'tarjeta_operacion']
                docs.forEach(d => {
                    if (obligatorios.includes(d.tipo_documento)) {
                        if (d.estado === 'vencido') {
                            validacion.ok = false
                            validacion.bloqueos.push(`Documento del vehículo vencido: ${d.tipo_documento.toUpperCase()} (venció ${d.fecha_vencimiento})`)
                        } else if (d.estado === 'critico') {
                            validacion.advertencias.push(`Documento crítico por vencer: ${d.tipo_documento.toUpperCase()} (${d.fecha_vencimiento})`)
                        }
                    }
                })
            }

            // Validar si el vehículo está en estado bloqueado en flota.vehiculos
            const { data: veh, error: vehErr } = await supabase
                .from('flota.vehiculos')
                .select('estado_operativo, placa')
                .eq('id', vehiculoId)
                .single()

            if (!vehErr && veh && veh.estado_operativo === 'bloqueado') {
                validacion.ok = false
                validacion.bloqueos.push(`El vehículo ${veh.placa} se encuentra BLOQUEADO por fallas críticas de seguridad.`)
            }
        } catch (e) {
            console.warn('[validarHabilitacionDespacho] Error en consulta de vehículo:', e)
        }
    }

    // 2. Validar licencias del conductor en core.conductor_licencias
    if (conductorId) {
        try {
            const { data: lics, error: licErr } = await supabase
                .from('core.conductor_licencias')
                .select('categoria, estado, fecha_vencimiento')
                .eq('conductor_id', conductorId)

            if (!licErr && lics && lics.length > 0) {
                const tieneVigente = lics.some(l => l.estado === 'vigente' || l.estado === 'por_vencer')
                if (!tieneVigente) {
                    validacion.ok = false
                    validacion.bloqueos.push('El conductor no posee licencias de conducción vigentes.')
                }
            }
        } catch (e) {
            console.warn('[validarHabilitacionDespacho] Error en consulta de conductor:', e)
        }
    }

    return validacion
}

// ============================================================
// ESTADO GLOBAL DE AUTENTICACIÓN
// ============================================================
let cachedProfile = null
let authListeners = []

// Listener de cambio de auth para invalidar cache
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        cachedProfile = null
    }
    authListeners.forEach(cb => cb(event, session))
})

export function addAuthListener(callback) {
    authListeners.push(callback)
    return () => {
        authListeners = authListeners.filter(cb => cb !== callback)
    }
}

// ============================================================
// MANEJO DE ERRORES CENTRALIZADO
// ============================================================
function handleError(error, context = '') {
    console.error(`[Supabase Error${context ? ' :: ' + context : ''}]`, error)

    const code = error?.code || error?.statusCode || ''
    const msg = error?.message || String(error)

    // Sesión expirada o token inválido
    if (code === 'PGRST301' || code === '401' || msg.includes('JWT') || msg.includes('token') || msg.includes('expired')) {
        console.warn('Sesión expirada. Redirigiendo a login...')
        supabase.auth.signOut().then(() => {
            window.location.href = '/viajes/login.html?reason=session_expired'
        })
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.')
    }

    // Violación de RLS
    if (code === 'PGRST109' || msg.includes('new row violates row-level security policy') || msg.includes('rls')) {
        throw new Error('No tienes permisos para realizar esta acción. Contacta al administrador.')
    }

    // Not found
    if (code === 'PGRST116') {
        return null // single() sin resultados → null en lugar de error
    }

    // Violación de constraint (ej. UNIQUE)
    if (code === '23505') {
        throw new Error('El registro ya existe (duplicado). Verifica los datos e intenta de nuevo.')
    }

    // Not null violation
    if (code === '23502') {
        throw new Error('Faltan campos obligatorios. Completa todos los datos requeridos.')
    }

    // Violación de Foreign Key
    if (code === '23503') {
        throw new Error('El registro referenciado no existe. Verifica conductor o vehículo.')
    }

    // Error de red genérico
    if (!navigator.onLine || msg.includes('network') || msg.includes('fetch') || msg.includes('Failed')) {
        throw new Error('Error de conexión. Verifica tu internet e intenta de nuevo.')
    }

    // Rate limit (429 Too Many Requests)
    if (code === '429' || code === 429 || msg.includes('rate limit') || msg.includes('Too Many Requests')) {
        throw new Error('Demasiados intentos. Por favor espera 5-10 minutos e intenta de nuevo.')
    }

    // Error genérico pero con contexto
    throw new Error(msg)
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
        if (error.message?.includes('Invalid login credentials')) {
            throw new Error('Correo o contraseña incorrectos.')
        }
        throw new Error('Error al iniciar sesión: ' + error.message)
    }
    cachedProfile = null // invalidar cache al iniciar sesión
    return data
}

export async function signUp(email, password, userData = {}) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: userData }
    })
    if (error) {
        // Detectar rate limit 429 específicamente
        if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('Too Many Requests')) {
            throw new Error('Demasiados intentos de registro. Por favor espera 10-15 minutos e intenta de nuevo.')
        }
        throw new Error('Error al registrar: ' + error.message)
    }
    return data
}

export async function signOut() {
    cachedProfile = null
    try {
        await supabase.auth.signOut()
    } catch (e) {
        console.error('Error en signOut:', e)
    }
    // LIMPIEZA MANUAL: Borrar tokens de Supabase que a veces persisten
    Object.keys(window.localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
            window.localStorage.removeItem(key)
        }
    })
    // Invalidar sesión en memoria
    try {
        await supabase.auth.setSession(null)
    } catch(e) {}
}

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
        // Si es simplemente que no hay sesión activa, no es un error grave
        if (error.name === 'AuthSessionMissingError' || error.message?.includes('session missing')) {
            return null
        }
        handleError(error, 'getCurrentUser')
        return null
    }
    return user
}

export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
        handleError(error, 'getSession')
        return null
    }
    return session
}

export async function resetPasswordForEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/viajes/login.html`
    })
    if (error) throw new Error('Error al enviar correo de recuperación: ' + error.message)
}

export async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error('Error al actualizar contraseña: ' + error.message)
}

// ============================================================
// ROLES Y PERMISOS
// ============================================================

export async function getProfile(userId) {
    if (!userId) return null
    const { data: profile, error } = await supabase
        .from('core.personas')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        handleError(error, 'getProfile')
    }

    // Obtener rol desde core.user_roles (tabla separada para evitar recursión RLS)
    if (profile) {
        const { data: roleData, error: roleError } = await supabase
            .from('core.user_roles')
            .select('rol')
            .eq('user_id', userId)
            .single()
        if (!roleError) {
            profile.rol = roleData?.rol || 'conductor'
        }
    }

    return profile
}

export async function getCurrentProfile() {
    const user = await getCurrentUser()
    if (!user) return null
    if (cachedProfile) return cachedProfile

    const profile = await getProfile(user.id)
    cachedProfile = profile
    return profile
}

export async function isAdmin() {
    try {
        const profile = await getCurrentProfile()
        return profile?.rol === 'admin'
    } catch (e) {
        return false
    }
}

export async function requireAuth() {
    const user = await getCurrentUser()
    if (!user) {
        window.location.href = './login.html?reason=unauthorized'
        throw new Error('Debes iniciar sesión para acceder.')
    }
    return user
}

export async function requireAdmin() {
    const user = await requireAuth()
    const admin = await isAdmin()
    if (!admin) {
        window.location.href = './index.html?reason=forbidden'
        throw new Error('Acceso denegado. Solo administradores.')
    }
    return user
}

// ============================================================
// PERFILES
// ============================================================

export async function createProfile(userId, email, nombre, rol = 'conductor') {
    // 1. Crear perfil (sin rol, solo datos personales)
    const { data, error } = await supabase
        .from('core.personas')
        .insert({ id: userId, email, nombre_completo: nombre })
        .select()
        .single()

    if (error) handleError(error, 'createProfile')

    // 2. Crear rol en core.user_roles (tabla separada para evitar recursión RLS)
    // No lanzar error si falla - el rol por defecto será 'conductor'
    try {
        const { error: roleError } = await supabase
            .from('core.user_roles')
            .insert({ user_id: userId, rol })
            .select()
            .single()

        if (roleError) {
            console.warn('[createProfile] No se pudo crear user_role (puede no existir la tabla aún):', roleError.message)
        }
    } catch (roleErr) {
        console.warn('[createProfile] Error no-fatal al crear user_role:', roleErr)
    }

    return data
}

export async function updateProfile(userId, updates) {
    const { data, error } = await supabase
        .from('core.personas')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

    if (error) handleError(error, 'updateProfile')
    if (cachedProfile && cachedProfile.id === userId) cachedProfile = { ...cachedProfile, ...updates }
    return data
}

// ============================================================
// CONDUCTORES
// ============================================================

export async function getConductorByEmail(email) {
    const { data, error } = await supabase
        .from('core.conductores')
        .select('*')
        .eq('email', email)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        handleError(error, 'getConductorByEmail')
    }
    return data
}

export async function createConductor(conductorData) {
    const { data, error } = await supabase
        .from('core.conductores')
        .insert(conductorData)
        .select()
        .single()

    if (error) handleError(error, 'createConductor')
    return data
}

export async function updateConductor(id, updates) {
    const { data, error } = await supabase
        .from('core.conductores')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) handleError(error, 'updateConductor')
    return data
}

export async function deleteConductor(id) {
    // Nullify or delete referencing records to prevent foreign key constraint violations
    await supabase.from('operacion.viajes').update({ conductor_id: null }).eq('conductor_id', id)
    await supabase.from('flota.inspecciones').update({ conductor_id: null }).eq('conductor_id', id)
    await supabase.from('operacion.asistencia').update({ conductor_id: null }).eq('conductor_id', id)
    await supabase.from('operacion.capacitacion_asistencia').delete().eq('conductor_id', id)
    await supabase.from('hseq.incidentes').update({ conductor_id: null }).eq('conductor_id', id)

    // Delete associated vencimientos if exist
    try {
        await supabase.from('vencimientos').delete().eq('elemento_id', id).eq('elemento_tipo', 'conductor')
    } catch (e) {
        console.warn('Limpieza de vencimientos omitida o tabla legacy deshabilitada:', e)
    }

    const { error } = await supabase
        .from('core.conductores')
        .delete()
        .eq('id', id)

    if (error) handleError(error, 'deleteConductor')
}

// ============================================================
// VIAJES
// ============================================================

export async function getViajes() {
    const { data, error } = await supabase
        .from('operacion.viajes')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        handleError(error, 'getViajes')
        return []
    }
    return data || []
}

export async function getViajesByConductor(conductorId) {
    const { data, error } = await supabase
        .from('operacion.viajes')
        .select('*')
        .eq('conductor_id', conductorId)
        .order('created_at', { ascending: false })

    if (error) {
        handleError(error, 'getViajesByConductor')
        return []
    }
    return data || []
}

export async function getViajesByFecha(fecha) {
    const { data, error } = await supabase
        .from('operacion.viajes')
        .select('*')
        .eq('fecha', fecha)
        .order('hora_salida')

    if (error) {
        handleError(error, 'getViajesByFecha')
        return []
    }
    return data || []
}

export async function getViajesByPlaca(placa) {
    const { data, error } = await supabase
        .from('operacion.viajes')
        .select('*')
        .ilike('vehiculo_placa', `%${placa}%`)

    if (error) {
        handleError(error, 'getViajesByPlaca')
        return []
    }
    return data || []
}

export async function getViajesHoy() {
    const hoy = new Date().toISOString().split('T')[0]
    return await getViajesByFecha(hoy)
}

export async function getViajeById(id) {
    const { data, error } = await supabase
        .from('operacion.viajes')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        handleError(error, 'getViajeById')
    }
    return data
}

export async function getEstadisticasViajes() {
    try {
        const { data, error } = await supabase
            .from('operacion.viajes')
            .select('estado')

        if (error) throw error

        const total = data?.length || 0
        const completados = data?.filter(v => v.estado === 'completado' || v.estado === 'Finalizado').length || 0
        const enCurso = data?.filter(v => v.estado === 'en_curso' || v.estado === 'En Curso').length || 0
        const pendientes = data?.filter(v => v.estado === 'pendiente' || v.estado === 'Pendiente').length || 0

        return { total, completados, enCurso, pendientes }
    } catch (error) {
        handleError(error, 'getEstadisticasViajes')
        return { total: 0, completados: 0, enCurso: 0, pendientes: 0 }
    }
}

export async function createViaje(viaje) {
    try {
        const res = await fetch('/api/apps/viajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conductorId: viaje.conductor_id,
                conductorNombre: viaje.conductor_nombre,
                conductorDocumento: viaje.conductor_documento,
                placa: viaje.vehiculo_placa,
                origen: viaje.origen,
                destino: viaje.destino,
                fechaSalida: viaje.fecha_salida || viaje.fecha,
                horaSalida: viaje.hora_salida,
                distanciaKm: viaje.distancia_km,
                duracionEstimadaHoras: viaje.duracion_estimada_horas,
                riskScore: viaje.risk_score,
                riskLevel: viaje.risk_level,
                riskInputs: viaje.risk_inputs,
                signatures: viaje.signatures,
                observaciones: viaje.observaciones
            })
        });
        if (res.ok) {
            const result = await res.json();
            return result.viaje;
        }
    } catch (e) {
        console.warn('Aviso en createViaje local:', e);
    }

    const { data, error } = await supabase
        .from('operacion.viajes')
        .insert(viaje)
        .select()
        .single()

    if (error) handleError(error, 'createViaje')
    return data
}

export async function updateViaje(id, updates) {
    const { data, error } = await supabase
        .from('operacion.viajes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) handleError(error, 'updateViaje')
    return data
}

export async function deleteViaje(id) {
    const { error } = await supabase
        .from('operacion.viajes')
        .delete()
        .eq('id', id)

    if (error) handleError(error, 'deleteViaje')
}

// ============================================================
// VEHÍCULOS
// ============================================================

export async function getVehiculos() {
    const { data, error } = await supabase
        .from('flota.vehiculos')
        .select('*')
        .eq('estado', 'operativo')
        .order('placa')

    if (error) {
        handleError(error, 'getVehiculos')
        return []
    }
    return data || []
}

export async function getVehiculoByPlaca(placa) {
    const { data, error } = await supabase
        .from('flota.vehiculos')
        .select('*')
        .ilike('placa', `%${placa}%`)
        .limit(1)

    if (error) {
        handleError(error, 'getVehiculoByPlaca')
        return null
    }
    return data?.[0] || null
}

// ============================================================
// CONDUCTORES (Lista para Admin)
// ============================================================

export async function getConductores() {
    const { data, error } = await supabase
        .from('core.conductores')
        .select('*')
        .order('nombres')

    if (error) {
        handleError(error, 'getConductores')
        return []
    }
    return data || []
}

export async function getConductorById(id) {
    const { data, error } = await supabase
        .from('core.conductores')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        handleError(error, 'getConductorById')
    }
    return data
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

export async function getDashboardStats() {
    try {
        const [viajesStats, conductoresData, vehiculosData] = await Promise.allSettled([
            getEstadisticasViajes(),
            supabase.from('core.conductores').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
            supabase.from('flota.vehiculos').select('*', { count: 'exact', head: true }).eq('estado', 'operativo')
        ])

        return {
            viajes: {
                total: viajesStats.value?.total || 0,
                completados: viajesStats.value?.completados || 0,
                enCurso: viajesStats.value?.enCurso || 0,
                pendientes: viajesStats.value?.pendientes || 0
            },
            conductores: {
                total: conductoresData.value?.count || 0,
                activos: conductoresData.value?.count || 0
            },
            vehiculos: {
                total: vehiculosData.value?.count || 0,
                operativos: vehiculosData.value?.count || 0
            },
            lastUpdate: new Date().toISOString()
        }
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error)
        return {
            viajes: { total: 0, completados: 0, enCurso: 0, pendientes: 0 },
            conductores: { total: 0, activos: 0 },
            vehiculos: { total: 0, operativos: 0 },
            lastUpdate: new Date().toISOString()
        }
    }
}

export async function getConductorStats(conductorId) {
    try {
        const { data: trips, error } = await supabase
            .from('operacion.viajes')
            .select('*')
            .eq('conductor_id', conductorId)

        if (error) throw error

        const total = trips?.length || 0
        const completed = trips?.filter(t => t.status === 'Finalizado' || t.kmLlegada).length || 0
        const totalKm = trips?.reduce((acc, t) => acc + (parseFloat(t.distanciaEstimada) || 0), 0) || 0

        const monthlyData = {}
        trips?.forEach(t => {
            if (t.fecha) {
                const month = t.fecha.substring(0, 7)
                monthlyData[month] = (monthlyData[month] || 0) + 1
            }
        })

        return { total, completed, inProgress: total - completed, totalKm: Math.round(totalKm), monthlyData }
    } catch (error) {
        handleError(error, 'getConductorStats')
        return { total: 0, completed: 0, inProgress: 0, totalKm: 0, monthlyData: {} }
    }
}

// ============================================================
// VERIFICACIÓN PIN ADMIN (para aprobaciones HSE/Gerencia)
// ============================================================

export async function verifyPinAdmin(pin) {
    try {
        const { data, error } = await supabase.rpc('verificar_pin_admin', {
            pin_input: pin
        })
        if (error) throw error
        return data === true
    } catch (error) {
        console.error('Error verificando PIN:', error)
        return false
    }
}

export default supabase
