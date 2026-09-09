/**
 * RE-EXPORT COMPATIBILIDAD A&B OS
 * public/apps/viajes/js/supabase-client.js -> apunta 100% a api-client.js
 * CERO dependencias de Supabase.
 */

export * from './api-client.js';
import apiClient, { supabase as defensiveSupabase } from './api-client.js';

export const supabase = defensiveSupabase;
export default apiClient;
