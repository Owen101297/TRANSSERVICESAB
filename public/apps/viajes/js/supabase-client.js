/**
 * api-client.js (reemplaza supabase-client.js)
 * Cliente Oficial de Datos - App Viajes (STE-F-010)
 * Proyecto: Trans Services A&B S.A.S.
 * 100% Integrado con PostgreSQL en Railway a través de las APIs de Next.js (Prisma).
 * CERO dependencias de Supabase.
 */

// ============================================================
// HABILITACIÓN OPERATIVA Y PREOPERACIONAL EN TIEMPO REAL
// ============================================================

/**
 * Consulta si el vehículo cuenta con inspección preoperacional del día aprobada
 */
export async function checkPreoperacionalDia(placa) {
    if (!placa) return { aprobado: false, encontrado: false, mensaje: 'Placa requerida' };
    try {
        const clean = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const res = await fetch(`/api/apps/viajes/preoperacional?placa=${encodeURIComponent(clean)}`);
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.warn('Aviso verificando preoperacional en Railway:', e);
    }
    return { aprobado: false, encontrado: false, mensaje: 'No se pudo verificar el preoperacional.' };
}

let cachedRecursos = null;

async function fetchRecursos() {
    if (cachedRecursos) return cachedRecursos;
    try {
        const res = await fetch('/api/apps/viajes/recursos');
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                cachedRecursos = data;
                return cachedRecursos;
            }
        }
    } catch (e) {
        console.warn('Aviso cargando /api/apps/viajes/recursos:', e);
    }
    return { conductores: [], vehiculos: [] };
}

export async function getConductores() {
    try {
        const rec = await fetchRecursos();
        if (rec.conductores && rec.conductores.length > 0) {
            return rec.conductores;
        }
        const res = await fetch('/api/personas');
        if (res.ok) {
            const data = await res.json();
            return (data || []).map(p => ({
                id: p.id,
                nombre: p.nombreCompleto || p.nombre,
                cedula: p.numeroDocumento || p.documento,
                licencia: p.numeroLicencia || p.licencia,
                categoria: p.categoriaLicencia || p.categoria,
                vencimiento: p.fechaVencimientoLicencia || p.vencimiento,
                telefono: p.telefono,
                email: p.email,
                activo: p.activo !== false
            }));
        }
    } catch (e) {
        console.warn('Aviso en getConductores Railway:', e);
    }
    return [];
}

export async function getVehiculos() {
    try {
        const rec = await fetchRecursos();
        if (rec.vehiculos && rec.vehiculos.length > 0) {
            return rec.vehiculos;
        }
        const res = await fetch('/api/flota');
        if (res.ok) {
            const data = await res.json();
            return (data || []).map(v => ({
                id: v.id,
                placa: v.placa,
                tipo: v.tipoVehiculo || v.tipo,
                modelo: v.modelo,
                color: v.color,
                empresa: v.empresa || 'TRANS SERVICES A&B',
                soatVencimiento: v.soatVencimiento,
                rtmVencimiento: v.rtmVencimiento,
                polizaVencimiento: v.polizaVencimiento,
                activo: v.activo !== false
            }));
        }
    } catch (e) {
        console.warn('Aviso en getVehiculos Railway:', e);
    }
    return [];
}

export async function getConductorById(id) {
    const conductores = await getConductores();
    return conductores.find(c => c.id === id || c.cedula === id) || null;
}

export async function getVehiculoByPlaca(placa) {
    const vehiculos = await getVehiculos();
    const clean = (placa || '').toUpperCase().trim();
    return vehiculos.find(v => (v.placa || '').toUpperCase() === clean) || null;
}

export async function getConductorByEmail(email) {
    const conductores = await getConductores();
    return conductores.find(c => (c.email || '').toLowerCase() === (email || '').toLowerCase()) || null;
}

// ============================================================
// AUTENTICACIÓN Y ROLES
// ============================================================
export async function getCurrentUser() {
    const sso = window.TransServices?.getSession?.();
    if (sso) return sso;
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            return data.user || null;
        }
    } catch (e) { }
    return null;
}

export async function getCurrentProfile() {
    const user = await getCurrentUser();
    if (!user) return null;
    return {
        id: user.id,
        nombre: user.nombre || user.nombreCompleto || 'Usuario',
        rol: user.rol || 'conductor',
        documento: user.documento || user.numeroDocumento || ''
    };
}

export async function isAdmin() {
    const prof = await getCurrentProfile();
    return prof?.rol === 'admin' || prof?.rol === 'superadmin' || prof?.rol === 'gerente' || prof?.rol === 'hseq';
}

export async function requireAuth() {
    const user = await getCurrentUser();
    return user;
}

export async function signOut() {
    if (window.TransServices?.logout) {
        window.TransServices.logout();
    }
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { }
    window.location.href = '/portal-conductor';
}

export async function verifyPinAdmin(pin) {
    const p = String(pin || '').trim();
    // Validación de PIN institucional para HSE y Gerencia
    return p === '1234' || p === '2026' || p === '901621579' || p === '900778421';
}

// ============================================================
// VIAJES (STE-F-010) - 100% POSTGRESQL EN RAILWAY
// ============================================================
export async function getViajes() {
    try {
        const res = await fetch('/api/apps/viajes');
        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.warn('Aviso en getViajes Railway:', e);
    }
    return [];
}

export async function getViajesByConductor(conductorId) {
    try {
        const sso = window.TransServices?.getSession?.();
        const doc = sso ? sso.documento : '';
        const url = `/api/apps/viajes?conductorId=${encodeURIComponent(conductorId || '')}&doc=${encodeURIComponent(doc || '')}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.warn('Aviso en getViajesByConductor Railway:', e);
    }
    return [];
}

export async function getViajesByFecha(fecha) {
    const all = await getViajes();
    return all.filter(v => (v.fecha_salida || v.fecha || '').startsWith(fecha));
}

export async function getViajesByPlaca(placa) {
    try {
        const res = await fetch(`/api/apps/viajes?placa=${encodeURIComponent(placa || '')}`);
        if (res.ok) {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.warn('Aviso en getViajesByPlaca Railway:', e);
    }
    return [];
}

export async function getViajesHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    return await getViajesByFecha(hoy);
}

export async function getViajeById(id) {
    try {
        const res = await fetch(`/api/apps/viajes?id=${encodeURIComponent(id)}`);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                return data.find(v => v.id === id) || data[0] || null;
            }
            return data;
        }
    } catch (e) {
        console.warn('Aviso en getViajeById Railway:', e);
    }
    return null;
}

export async function createViaje(viaje) {
    try {
        const res = await fetch('/api/apps/viajes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conductorId: viaje.conductor_id || viaje.conductorId,
                conductorNombre: viaje.conductor_nombre || viaje.conductorNombre,
                conductorDocumento: viaje.conductor_documento || viaje.conductorDocumento || viaje.cLicencia,
                conductorLicencia: viaje.conductor_licencia || viaje.cLicencia,
                conductorCategoria: viaje.conductor_categoria || viaje.cCat,
                conductorVencimiento: viaje.conductor_vencimiento || viaje.cVence,
                conductorTelefono: viaje.conductor_telefono || viaje.cTelefono,
                placa: viaje.vehiculo_placa || viaje.vPlaca || viaje.placa,
                vehiculoTipo: viaje.vehiculo_tipo || viaje.vTipo,
                vehiculoModelo: viaje.vehiculo_modelo || viaje.vModelo,
                vehiculoColor: viaje.vehiculo_color || viaje.vColor,
                vehiculoEmpresa: viaje.vehiculo_empresa || viaje.vEmpresa,
                origen: viaje.origen,
                origenDivipola: viaje.origen_divipola || viaje.origenDivipola,
                destino: viaje.destino,
                destinoDivipola: viaje.destino_divipola || viaje.destinoDivipola,
                fechaSalida: viaje.fecha_salida || viaje.fecha,
                horaSalida: viaje.hora_salida || viaje.horaSalida,
                distanciaKm: viaje.distancia_km || viaje.distanciaEstimada,
                duracionEstimadaHoras: viaje.duracion_estimada_horas || 2.0,
                kmSalida: viaje.km_salida || viaje.kmSalida,
                kmLlegada: viaje.km_llegada || viaje.kmLlegada,
                gpsSalida: viaje.gps_salida || viaje.gpsSalida,
                gpsLlegada: viaje.gps_llegada || viaje.gpsLlegada,
                medio: viaje.medio || 'Celular',
                rutograma: viaje.rutograma,
                puntosControl: viaje.puntos_control || viaje.puntosControl || [],
                previaje: viaje.previaje || {},
                fatiga: viaje.fatiga || {},
                control: viaje.control || {},
                riskScore: viaje.risk_score || viaje.risk?.score,
                riskLevel: viaje.risk_level || viaje.risk?.level,
                riskInputs: viaje.risk_inputs || viaje.risk || {},
                signatures: viaje.signatures || {},
                estado: viaje.estado || 'en_curso',
                observaciones: viaje.observaciones
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Error del servidor HTTP ${res.status}`);
        }
        const data = await res.json();
        // Garantizar que data contenga la propiedad `id` plana
        return {
            id: data.id || data.viaje?.id,
            ...(data.viaje || data)
        };
    } catch (error) {
        console.error('Error creando viaje en Railway:', error);
        throw error;
    }
}

export async function updateViaje(id, updates) {
    try {
        const res = await fetch(`/api/apps/viajes?id=${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Error actualizando viaje HTTP ${res.status}`);
        }
        const data = await res.json();
        return {
            id: data.id || data.viaje?.id || id,
            ...(data.viaje || data)
        };
    } catch (error) {
        console.error('Error actualizando viaje en Railway:', error);
        throw error;
    }
}

export async function firmarViajeConductor(id, firmaDataUrl) {
    return await updateViaje(id, {
        signatures: {
            conductor: firmaDataUrl,
            conductor_fecha: new Date().toISOString()
        }
    });
}

export async function firmarViajeHSE(id, firmaDataUrl, pin) {
    const valid = await verifyPinAdmin(pin);
    if (!valid) throw new Error('PIN de autorización HSE incorrecto.');
    return await updateViaje(id, {
        estado: 'Autorizado',
        signatures: {
            hse: firmaDataUrl || 'Firma Autorizada HSE',
            hse_fecha: new Date().toISOString()
        }
    });
}

export async function firmarViajeGerencia(id, firmaDataUrl, pin) {
    const valid = await verifyPinAdmin(pin);
    if (!valid) throw new Error('PIN de autorización de Gerencia incorrecto.');
    return await updateViaje(id, {
        estado: 'Autorizado',
        signatures: {
            gerencia: firmaDataUrl || 'Firma Aprobada Gerencia',
            gerencia_fecha: new Date().toISOString()
        }
    });
}

export async function deleteViaje(id) {
    try {
        const res = await fetch(`/api/apps/viajes?id=${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Error eliminando viaje HTTP ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error('Error eliminando viaje en Railway:', error);
        throw error;
    }
}

// Adaptador de compatibilidad para evitar caídas en scripts legados
export const supabase = {
    auth: {
        getUser: async () => {
            const user = await getCurrentUser();
            return { data: { user }, error: null };
        },
        getSession: async () => {
            const user = await getCurrentUser();
            return { data: { session: user ? { user } : null }, error: null };
        },
        onAuthStateChange: (cb) => {
            getCurrentUser().then(user => {
                if (user) cb('SIGNED_IN', { user });
            });
            return { data: { subscription: { unsubscribe: () => {} } } };
        }
    },
    from: (table) => {
        return {
            select: (cols = '*') => ({
                eq: (col, val) => ({
                    single: async () => {
                        if (table.includes('viajes')) {
                            const v = await getViajeById(val);
                            return { data: v, error: null };
                        }
                        return { data: null, error: null };
                    },
                    order: async () => {
                        const v = await getViajes();
                        return { data: v, error: null };
                    }
                }),
                order: async () => {
                    const v = await getViajes();
                    return { data: v, error: null };
                }
            })
        };
    }
};
