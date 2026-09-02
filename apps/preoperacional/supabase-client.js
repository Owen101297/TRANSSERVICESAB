/**
 * CLIENTE SUPABASE - App Preoperacional
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

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function getPreoperacionales() {
  const { data, error } = await supabase
    .from('flota.inspecciones')
    .select('*')
    .order('fecha', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getPreoperacionalesByFecha(fecha) {
  const { data, error } = await supabase
    .from('flota.inspecciones')
    .select('*')
    .eq('fecha', fecha)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function getPreoperacionalesByPlaca(placa) {
  const { data, error } = await supabase
    .from('flota.inspecciones')
    .select('*, flota.vehiculos!inner(placa)')
    .ilike('flota.vehiculos.placa', `%${placa}%`)
    .order('fecha', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function getPreoperacionalesByMonthYear(year, month) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('flota.inspecciones')
    .select('*')
    .gte('fecha', startDate)
    .lte('fecha', endDate)
    .order('fecha', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createPreoperacional(registro) {
  const { data, error } = await supabase
    .from('flota.inspecciones')
    .insert(registro)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updatePreoperacional(id, updates) {
  const { data, error } = await supabase
    .from('flota.inspecciones')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deletePreoperacional(id) {
  const { error } = await supabase
    .from('flota.inspecciones')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function getConductores() {
  const { data, error } = await supabase
    .from('core.conductores')
    .select('*, core.personas!inner(*)')
    .eq('estado_laboral', 'activo')
    .order('core.personas.nombres')
  
  if (error) throw error
  return data || []
}

export async function getVehiculos() {
  const { data, error } = await supabase
    .from('flota.vehiculos')
    .select('*')
    .eq('estado_operativo', 'operativo')
    .order('placa')
  
  if (error) throw error
  return data || []
}

export async function getVehiculoByPlaca(placa) {
  const { data, error } = await supabase
    .from('flota.vehiculos')
    .select('*')
    .ilike('placa', `%${placa}%`)
    .limit(1)
    .single()
  
  if (error) return null
  return data
}

export default supabase