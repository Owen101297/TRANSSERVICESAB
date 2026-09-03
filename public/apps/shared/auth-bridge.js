/**
 * Trans Services Cooperativa A&B - SSO & Data Bridge
 * Gestiona la sesión unificada del conductor, la identidad de marca y la comunicación con el ERP
 */
(function () {
  // 1. Obtener sesión desde localStorage o parámetros de URL
  function getSession() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDoc = urlParams.get('documento') || urlParams.get('doc');
      const urlNombre = urlParams.get('nombre');
      const urlPlaca = urlParams.get('placa');
      const urlId = urlParams.get('conductorId') || urlParams.get('id');

      if (urlDoc && urlNombre) {
        const sessionFromUrl = {
          id: urlId || '',
          documento: urlDoc,
          nombre: decodeURIComponent(urlNombre),
          placa: urlPlaca || 'SIN ASIGNAR',
          vehiculoId: urlParams.get('vehiculoId') || ''
        };
        localStorage.setItem('transservices_conductor', JSON.stringify(sessionFromUrl));
        return sessionFromUrl;
      }

      const raw = localStorage.getItem('transservices_conductor');
      if (raw) {
        return JSON.parse(raw);
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

  // 3. Inyectar Barra Superior Unificada con Logo de Trans Services y "Volver al Portal"
  function injectTopBar() {
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0F172A;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    `;

    const nombre = session ? session.nombre : 'Conductor';
    const placa = session && session.placa ? session.placa : 'VEHÍCULO';

    bar.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <a href="/portal-conductor" style="display:inline-flex; align-items:center; gap:6px; background:#F1F5F9; color:#0F172A; padding:6px 12px; border-radius:10px; font-size:12px; font-weight:700; text-decoration:none; border:1px solid #E2E8F0; transition:all 0.15s ease;">
          <span style="font-size:14px; color:#1E40AF; font-weight:bold;">←</span> <span>Portal</span>
        </a>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:13px; font-weight:700; color:#0F172A; line-height:1.2;">${nombre}</span>
          <span style="font-size:10px; color:#64748B; font-family:ui-monospace, monospace;">C.C. ${session ? session.documento : '—'}</span>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="background:#EFF6FF; color:#1E40AF; font-family:ui-monospace, monospace; font-weight:800; font-size:12px; padding:4px 10px; border-radius:8px; letter-spacing:0.5px; border:1px solid #BFDBFE;">
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

    const selectors = {
      conductor: ['conductor', 'conductor_nombre', 'nombre_conductor', 'conductorNombre', 'driver_name', 'nombre'],
      documento: ['documento', 'conductor_documento', 'cedula', 'cedula_conductor', 'conductorDocumento', 'numero_documento'],
      placa: ['placa', 'vehiculo_placa', 'placa_vehiculo', 'vehiculoPlaca', 'plate']
    };

    selectors.conductor.forEach(id => {
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el && !el.value) {
        el.value = session.nombre;
        if (el.tagName === 'INPUT') el.readOnly = true;
      }
    });

    selectors.documento.forEach(id => {
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el && !el.value) {
        el.value = session.documento;
        if (el.tagName === 'INPUT') el.readOnly = true;
      }
    });

    selectors.placa.forEach(id => {
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el && !el.value && session.placa) {
        el.value = session.placa;
        if (el.tagName === 'INPUT') el.readOnly = true;
      }
    });
  }

  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
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
})();
