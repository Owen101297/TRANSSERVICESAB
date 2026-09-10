/**
 * TRANS SERVICES A&B — Formateadores Deterministas
 * Garantizan 100% consistencia entre SSR (Node/Linux UTC) y Client Hydration (V8/Browser COT)
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
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Bogota",
    });
  } catch {
    return "—";
  }
}

export function formatFechaLarga(
  iso?: string | Date | null,
  options: Intl.DateTimeFormatOptions = { weekday: "short", day: "2-digit", month: "short", year: "numeric" }
): string {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-CO", {
      ...options,
      timeZone: options.timeZone || "America/Bogota",
    });
  } catch {
    return "—";
  }
}

export function formatFechaHora(iso?: string | Date | null): string {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Bogota",
    });
  } catch {
    return "—";
  }
}

export function formatHora(iso?: string | Date | null): string {
  if (!iso) return "—";
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Bogota",
    });
  } catch {
    return "—";
  }
}

