import { createClient } from '@supabase/supabase-js'

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

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
