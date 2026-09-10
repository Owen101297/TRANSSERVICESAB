/**
 * Trans Services Cooperativa A&B - SSO & Data Bridge
 * Gestiona la sesión unificada del conductor, la identidad de marca y la comunicación con el ERP
 */
(function () {
  // Suprimir advertencias de Tailwind CDN en consola
  const _origWarn = console.warn;
  console.warn = function (...args) {
    if (typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return;
    _origWarn.apply(console, args);
  };

  // 1. Obtener sesión desde localStorage o parámetros de URL
  function getSession() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDoc = urlParams.get('documento') || urlParams.get('doc');
      const urlNombre = urlParams.get('nombre');
      const urlPlaca = urlParams.get('placa');
      const urlId = urlParams.get('conductorId') || urlParams.get('id');
      const urlRol = urlParams.get('rol');

      let sessionObj = null;
      const raw = localStorage.getItem('transservices_conductor');
      if (raw) {
        try { sessionObj = JSON.parse(raw); } catch {}
      }

      if (urlDoc || urlPlaca || urlRol) {
        if (!sessionObj) sessionObj = {};
        if (urlDoc) sessionObj.documento = urlDoc;
        if (urlNombre) sessionObj.nombre = decodeURIComponent(urlNombre);
        if (urlPlaca) sessionObj.placa = urlPlaca;
        if (urlId) sessionObj.id = urlId;
        if (urlRol) sessionObj.rol = urlRol;
        if (!sessionObj.nombre) sessionObj.nombre = 'Usuario ' + (urlRol || 'Conductor');
        localStorage.setItem('transservices_conductor', JSON.stringify(sessionObj));
      }

      if (sessionObj) {
        const r = (sessionObj.rol || '').toLowerCase();
        if (r === 'admin' || r === 'superadmin' || r === 'administrativo') {
          window.ADMIN_AUDIT_MODE = true;
        }
        return sessionObj;
      }
    } catch (e) {
      console.warn('Error al leer sesión del conductor:', e);
    }
    return null;
  }

  const session = getSession();

  // 2. Si no hay sesión iniciada, redirigir al portal
  if (!session) {
    const portalUrl = '/portal-conductor';
    if (!window.location.search.includes('demo=true')) {
      window.location.href = portalUrl;
      return;
    }
  }

  // Función universal para normalizar Viewport, eliminar auto-zoom y proteger Safe Area
  function enforceMobileOptimization() {
    try {
      // 1. Normalizar meta viewport para iOS PWA y Android
      let metaVp = document.querySelector('meta[name="viewport"]');
      if (!metaVp) {
        metaVp = document.createElement('meta');
        metaVp.name = 'viewport';
        document.head.appendChild(metaVp);
      }
      metaVp.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

      // 2. Inyectar regla anti-zoom (16px) y anti-doble tap
      if (!document.getElementById('ts-mobile-anti-zoom')) {
        const style = document.createElement('style');
        style.id = 'ts-mobile-anti-zoom';
        style.textContent = `
          @media screen and (max-width: 768px) {
            input, select, textarea {
              font-size: 16px !important;
            }
          }
          html, body, button, a, label {
            touch-action: manipulation;
          }
          html, body {
            overflow-x: hidden;
            max-width: 100vw;
          }
        `;
        document.head.appendChild(style);
      }
    } catch (e) {
      console.warn('Error al aplicar optimización móvil:', e);
    }
  }

  // 3. Inyectar Barra Superior Unificada con Logo de Trans Services y "Volver al Portal"
  function injectTopBar() {
    // Si la app ya cuenta con su propio header o navbar con enlace al portal, no duplicar
    const existingHeader = document.querySelector('header, nav, .glass-nav, .nav-inner');
    if (existingHeader) {
      if (window.ADMIN_AUDIT_MODE && !document.getElementById('ts-admin-badge')) {
        const badge = document.createElement('span');
        badge.id = 'ts-admin-badge';
        badge.style.cssText = 'background:#FAF5FF; color:#7E22CE; font-weight:800; font-size:10px; padding:3px 8px; border-radius:6px; border:1px solid #E9D5FF; margin-left:8px; display:inline-block; vertical-align:middle; letter-spacing:0.5px;';
        badge.textContent = 'ADMIN AUDITOR';
        const targetContainer = existingHeader.querySelector('.nav-brand, .text-center, div') || existingHeader;
        targetContainer.appendChild(badge);
      }
      return;
    }

    if (document.getElementById('ts-sso-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'ts-sso-bar';
    bar.style.cssText = `
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      z-index: 999999;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid #E2E8F0;
      padding: 10px 16px;
      padding-top: max(10px, env(safe-area-inset-top, 0px));
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0F172A;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      box-sizing: border-box;
      max-width: 100vw;
      overflow-x: hidden;
    `;

    const nombre = session ? session.nombre : 'Conductor';
    const placa = session && session.placa ? session.placa : 'VEHÍCULO';

    bar.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; min-width:0;">
        <a href="/portal-conductor" style="display:inline-flex; align-items:center; gap:5px; background:#F1F5F9; color:#0F172A; padding:6px 10px; border-radius:10px; font-size:12px; font-weight:700; text-decoration:none; border:1px solid #E2E8F0; transition:all 0.15s ease; flex-shrink:0;">
          <span style="font-size:14px; color:#1E40AF; font-weight:bold;">←</span> <span>Portal</span>
        </a>
        <div style="display:flex; flex-direction:column; min-width:0;">
          <span style="font-size:13px; font-weight:700; color:#0F172A; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${nombre}</span>
          <span style="font-size:10px; color:#64748B; font-family:ui-monospace, monospace;">C.C. ${session ? session.documento : '—'}</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
        ${window.ADMIN_AUDIT_MODE ? '<span style="background:#FAF5FF; color:#7E22CE; font-weight:800; font-size:10px; padding:3px 6px; border-radius:6px; border:1px solid #E9D5FF; letter-spacing:0.5px;">ADMIN</span>' : ''}
        <span style="background:#EFF6FF; color:#1E40AF; font-family:ui-monospace, monospace; font-weight:800; font-size:12px; padding:4px 8px; border-radius:8px; letter-spacing:0.5px; border:1px solid #BFDBFE;">
          ${placa}
        </span>
      </div>
    `;

    if (document.body) {
      document.body.prepend(bar);
    } else {
      window.addEventListener('DOMContentLoaded', () => document.body.prepend(bar));
    }
  }

  // 4. Autocompletar campos en los formularios existentes
  function autoFillFields() {
    if (!session) return;
    const isReadOnly = !window.ADMIN_AUDIT_MODE;

    const selectors = {
      conductor: ['conductor', 'conductor_nombre', 'nombre_conductor', 'conductorNombre', 'driver_name', 'nombre'],
      documento: ['documento', 'conductor_documento', 'cedula', 'cedula_conductor', 'conductorDocumento', 'numero_documento'],
      placa: ['placa', 'vehiculo_placa', 'placa_vehiculo', 'vehiculoPlaca', 'plate']
    };

    selectors.conductor.forEach(id => {
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el && !el.value) {
        el.value = session.nombre;
        if (el.tagName === 'INPUT' && isReadOnly) el.readOnly = true;
      }
    });

    selectors.documento.forEach(id => {
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el && !el.value) {
        el.value = session.documento;
        if (el.tagName === 'INPUT' && isReadOnly) el.readOnly = true;
      }
    });

    selectors.placa.forEach(id => {
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el && !el.value && session.placa) {
        el.value = session.placa;
        if (el.tagName === 'INPUT' && isReadOnly) el.readOnly = true;
      }
    });
  }

  // Ejecutar cuando el DOM esté listo
  enforceMobileOptimization();
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      enforceMobileOptimization();
      injectTopBar();
      autoFillFields();
    });
  } else {
    injectTopBar();
    autoFillFields();
  }

  // 5. Exponer objeto global para enviar datos al ERP y regresar al portal
  window.TransServices = {
    getSession: () => session,
    returnToPortal: () => {
      window.location.href = '/portal-conductor';
    },
    submitData: async function (endpoint, data) {
      const payload = {
        ...data,
        conductorId: session ? session.id : undefined,
        conductorNombre: session ? session.nombre : (data.conductorNombre || data.conductor),
        conductorDocumento: session ? session.documento : (data.conductorDocumento || data.documento),
        placa: session && session.placa ? session.placa : (data.placa || data.vehiculo_placa),
        fechaEnvio: new Date().toISOString()
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor (${res.status})`);
      }

      return await res.json();
    }
  };

  // 6. Saneamiento de Service Workers y Centinela de Auto-Actualización en Vivo
  if (typeof window !== "undefined") {
    // A. Desregistrar cualquier Service Worker en apps satélite
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().catch(() => {});
        }
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k));
        });
      }
    }

    // B. Centinela de versión en vivo para apps móviles
    let appBuildId = null;
    const checkAppVersion = async () => {
      try {
        const res = await fetch("/api/version?_t=" + Date.now(), { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!appBuildId) {
            appBuildId = data.buildId;
          } else if (appBuildId !== data.buildId) {
            console.info("[App Satélite] Nueva versión detectada en servidor. Recargando...");
            window.location.reload();
          }
        }
      } catch (err) {}
    };

    checkAppVersion();
    setInterval(checkAppVersion, 25000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkAppVersion();
    });
  }
})();
