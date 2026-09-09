/**
 * CLIENTE REST PARA ENCUESTAS DE SATISFACCIÓN Y RIESGO VIAL
 * Trans Services A&B
 * 100% conectado a Railway PostgreSQL mediante Next.js REST API (/api/apps/encuesta).
 * CERO dependencias de Supabase.
 */

export const apiClient = {
  getEncuestas: async () => {
    try {
      const res = await fetch('/api/apps/encuesta');
      if (res.ok) {
        const json = await res.json();
        return { data: json.registros || [], error: null };
      }
    } catch (e: any) {
      console.error('Error obteniendo encuestas:', e);
      return { data: [], error: e.message };
    }
    return { data: [], error: 'Error al consultar encuestas' };
  },

  saveEncuesta: async (payload: any) => {
    try {
      const res = await fetch('/api/apps/encuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        return { data: json.data, error: null };
      }
      const err = await res.json().catch(() => ({}));
      return { data: null, error: err.error || 'Error al guardar la encuesta' };
    } catch (e: any) {
      console.error('Error guardando encuesta:', e);
      return { data: null, error: e.message };
    }
  },

  deleteEncuesta: async (id: string) => {
    try {
      const res = await fetch(`/api/apps/encuesta?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        return { error: null };
      }
      const err = await res.json().catch(() => ({}));
      return { error: err.error || 'Error al eliminar la encuesta' };
    } catch (e: any) {
      return { error: e.message };
    }
  },
};

// Objeto de compatibilidad defensiva
export const supabase = {
  from: (table: string) => ({
    select: () => apiClient.getEncuestas(),
    insert: (data: any) => apiClient.saveEncuesta(Array.isArray(data) ? data[0] : data),
    delete: () => ({
      eq: (_col: string, val: string) => apiClient.deleteEncuesta(val),
    }),
  }),
};

export default apiClient;
