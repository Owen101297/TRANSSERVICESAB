/**
 * CLIENTE SUPABASE - App Asistencia
 * Proyecto: Trans Services A&B
 */

const getSupabaseConfig = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (url && key) return { url, key }
  }
  
  return {
    url: 'https://xftllyjjqvozjjmgwomg.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdGxseWpqcXZvempqbWd3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjExMTIsImV4cCI6MjA5Mzc5NzExMn0.UURzZOytfoYMrxzpohRams_GcJ3ETsEnNNOaSQqeuu8'
  }
}

const { url: SUPABASE_URL, key: SUPABASE_KEY } = getSupabaseConfig()

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const ASISTENCIA_TARGETS = [
  () => supabase.schema('operacion').from('asistencia'),
  () => supabase.from('asistencia'),
]

let resolvedTarget = null

export async function asistenciaTable() {
  if (resolvedTarget) return resolvedTarget()
  for (const make of ASISTENCIA_TARGETS) {
    try {
      const { error } = await make().select('id', { count: 'exact', head: true })
      if (!error) {
        resolvedTarget = make
        return make()
      }
    } catch (e) {}
  }
  throw new Error('No se pudo acceder a la tabla de asistencia')
}

export function fechaLocal(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

export function horaLocal(d = new Date()) {
  return d.toTimeString().slice(0, 8)
}

export async function getAsistencia() {
  const table = await asistenciaTable()
  const { data, error } = await table
    .select('*')
    .order('fecha', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAsistenciaByFecha(fecha) {
  const table = await asistenciaTable()
  const { data, error } = await table
    .select('*')
    .eq('fecha', fecha)
    .order('hora_llegada')

  if (error) throw error
  return data || []
}

export async function getAsistenciaHoy() {
  return await getAsistenciaByFecha(fechaLocal())
}

export async function createAsistencia(registro) {
  try {
    const res = await fetch('/api/apps/asistencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conductorNombre: registro.conductor_nombre || registro.personaNombre,
        conductorDocumento: registro.conductor_documento || registro.numero_documento,
        evento: registro.evento || registro.tipo_evento,
        tipoEvento: registro.tipo_evento,
        estado: registro.estado || 'presente',
        observaciones: registro.observaciones,
        signature: registro.firma_url || registro.firma_base64
      })
    });
    if (res.ok) {
      const json = await res.json();
      return json.asistencia;
    }
  } catch (e) {
    console.warn('Aviso en createAsistencia local:', e);
  }

  const table = await asistenciaTable()
  const { data, error } = await table
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAsistencia(id, updates) {
  const table = await asistenciaTable()
  const { data, error } = await table
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getConductores() {
  const { data, error } = await supabase
    .from('conductores')
    .select('*')
    .eq('estado', 'activo')
    .order('nombres')
  
  if (error) throw error
  return data || []
}

export async function getConductorByDocumento(numero_documento) {
  const { data, error } = await supabase
    .from('conductores')
    .select('*')
    .eq('numero_documento', numero_documento)
    .single()
  
  if (error) return null
  return data
}

export default supabase