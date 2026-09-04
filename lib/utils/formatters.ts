/**
 * TRANS SERVICES A&B — Formateadores Deterministas
 * Garantizan 100% consistencia entre SSR (Node/Linux) y Client Hydration (V8/Browser)
 * Eliminando los errores React #418 y #441 por desfase de locale o timezone.
 */

export function formatFecha(iso?: string | Date | null): string {
  if (!iso) return "—";
  try {
    const str = typeof iso === "string" ? iso : iso.toISOString();
    // Extraer YYYY-MM-DD
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
}

export function formatFechaHora(iso?: string | Date | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return "—";
  }
}

export function formatHora(iso?: string | Date | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${mins}`;
  } catch {
    return "—";
  }
}
