/**
 * CAPA COMPARTIDA — Trans Services A&B
 * public/apps/shared/base.js
 *
 * Cliente Unificado de Servicios para Aplicaciones Móviles PWA
 * 100% conectado a Railway PostgreSQL vía Next.js REST API.
 * CERO dependencias de Supabase.
 */

export async function getCurrentUser() {
  try {
    const raw = localStorage.getItem("transservices_conductor");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.documento || parsed?.id) {
        return {
          id: parsed.id || parsed.documento,
          email: parsed.email || `${parsed.documento}@transservicesab.com`,
          nombre: parsed.nombre || "Conductor",
          documento: parsed.documento || "",
          rol: "conductor",
        };
      }
    }
  } catch {}

  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      if (data?.authenticated && data?.user) {
        return data.user;
      }
    }
  } catch (e) {
    console.warn("Aviso obteniendo usuario actual:", e);
  }

  return null;
}

export async function getSession() {
  const user = await getCurrentUser();
  return user ? { user } : null;
}

export function onSessionChange(callback) {
  // Listener ligero para PWA
  window.addEventListener("storage", async (e) => {
    if (e.key === "transservices_conductor") {
      const user = await getCurrentUser();
      callback("USER_UPDATED", user ? { user } : null);
    }
  });
  return { unsubscribe: () => {} };
}

export async function getCurrentRole() {
  const user = await getCurrentUser();
  return user?.rol || "conductor";
}

export async function hasRole(role) {
  const current = await getCurrentRole();
  return current === role;
}

export async function isAdmin() {
  const role = await getCurrentRole();
  return role === "admin" || role === "gerencia";
}

export async function isHseq() {
  const role = await getCurrentRole();
  return role === "hseq" || role === "admin";
}

export async function isGerencia() {
  const role = await getCurrentRole();
  return role === "gerencia" || role === "admin";
}

export async function requireAuth(redirect = "/login") {
  const user = await getCurrentUser();
  if (!user && redirect && typeof window !== "undefined") {
    window.location.href = redirect;
    return false;
  }
  return !!user;
}

export async function requireRole(role, { redirectUnauth = "/login", redirectForbidden = "/portal-conductor" } = {}) {
  const user = await getCurrentUser();
  if (!user) {
    if (redirectUnauth && typeof window !== "undefined") window.location.href = redirectUnauth;
    return false;
  }
  const current = await getCurrentRole();
  const allowed = current === role || current === "admin";
  if (!allowed && redirectForbidden && typeof window !== "undefined") {
    window.location.href = redirectForbidden;
  }
  return allowed;
}

export async function signOut() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  localStorage.removeItem("transservices_conductor");
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

// =============================================
// NOTIFICACIONES TOAST
// =============================================
function ts() {
  return typeof window !== "undefined" && window.TS ? window.TS : null;
}

export function notifySuccess(msg) {
  const t = ts();
  if (t && typeof t.toastSuccess === "function") return t.toastSuccess(msg);
  if (typeof alert === "function") alert(msg);
}

export function notifyError(msg) {
  const t = ts();
  if (t && typeof t.toastError === "function") return t.toastError(msg);
  if (typeof alert === "function") alert(msg);
}

export function notifyWarning(msg) {
  const t = ts();
  if (t && typeof t.toastWarning === "function") return t.toastWarning(msg);
  if (typeof alert === "function") alert(msg);
}

export function confirmAction(msg) {
  const t = ts();
  if (t && typeof t.confirm === "function") return t.confirm(msg);
  return Promise.resolve(typeof confirm === "function" ? confirm(msg) : true);
}

export function normalizeError(err, fallback = "Error inesperado. Intente de nuevo.") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return err.message || fallback;
}

export async function logAudit(accion, detalle = {}) {
  console.log(`[AUDIT LOG] ${accion}:`, detalle);
}

// Exportación defensiva por si algún script antiguo intenta llamar a `supabase.from()`
export const supabase = {
  auth: {
    getSession,
    getUser: getCurrentUser,
    signOut,
  },
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
};

export default supabase;
