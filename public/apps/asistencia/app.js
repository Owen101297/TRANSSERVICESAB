import { createAsistencia, getConductorByDocumento, fechaLocal, horaLocal } from './supabase-client.js';

// --- ESTADO LOCAL ---
let currentEventType = 'Charla 5 Minutos (PESV/HSEQ)';
let fotoEvidenciaBase64 = null;
let isDrawing = false;
let hasDrawn = false;

// --- ELEMENTOS DOM ---
const $ = (id) => document.getElementById(id);
const canvas = $('signaturePad');
const ctx = canvas ? canvas.getContext('2d') : null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initCanvas();
    initUrlParams();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// --- LEER PARÁMETROS DE URL (Si el supervisor envía enlace personalizado) ---
function initUrlParams() {
    try {
        const params = new URLSearchParams(window.location.search);
        const doc = params.get('doc') || params.get('cedula') || params.get('documento');
        const tema = params.get('tema') || params.get('actividad');
        const lugar = params.get('lugar') || params.get('municipio');

        if (doc && $('inpCedula')) {
            $('inpCedula').value = doc;
            window.buscarConductorPorCedula(doc);
        }
        if (tema && $('inpTema')) {
            $('inpTema').value = decodeURIComponent(tema);
        }
        if (lugar && $('inpLugar')) {
            $('inpLugar').value = decodeURIComponent(lugar);
        }
    } catch (e) {
        console.warn('Lectura de parámetros URL:', e);
    }
}

// --- RELOJ LOCAL (UTC-5 COLOMBIA) ---
function initClock() {
    function tick() {
        const now = new Date();
        if ($('clockTime')) $('clockTime').textContent = horaLocal(now);
        if ($('clockDate')) {
            $('clockDate').textContent = now.toLocaleDateString('es-CO', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
    }
    tick();
    setInterval(tick, 1000);
}

// --- CANVAS DE FIRMA DIGITAL ---
function initCanvas() {
    if (!canvas || !ctx) return;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0) return;
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.4;
    }

    resizeCanvas();
    window.addEventListener('resize', () => {
        if (!hasDrawn) resizeCanvas();
    });

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDraw(e) {
        isDrawing = true;
        hasDrawn = true;
        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        if (e.touches) e.preventDefault();
    }

    function moveDraw(e) {
        if (!isDrawing) return;
        const p = getPos(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (e.touches) e.preventDefault();
    }

    function endDraw() {
        if (!isDrawing) return;
        isDrawing = false;
        ctx.closePath();
    }

    canvas.addEventListener('mousedown', startDraw);
    window.addEventListener('mousemove', moveDraw);
    window.addEventListener('mouseup', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', moveDraw, { passive: false });
    canvas.addEventListener('touchend', endDraw);
}

window.clearSignature = function () {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
};

// --- SELECTOR DE ACTIVIDAD / PILLS ---
window.selectEventType = function (el) {
    document.querySelectorAll('.event-pill').forEach(pill => pill.classList.remove('active'));
    el.classList.add('active');
    currentEventType = el.getAttribute('data-type');
    
    // Asignar sugerencia de tema por defecto según el pill
    if ($('inpTema') && (!$('inpTema').value || $('inpTema').value === 'CHARLA DE SEGURIDAD VIAL Y PESV')) {
        $('inpTema').value = currentEventType.toUpperCase();
    }
};

// --- BÚSQUEDA AUTOMÁTICA POR CÉDULA ---
let searchDebounce = null;
window.onCedulaInput = function (val) {
    clearTimeout(searchDebounce);
    if (!val || val.trim().length < 5) return;
    searchDebounce = setTimeout(() => {
        window.buscarConductorPorCedula(val);
    }, 280);
};

window.buscarConductorPorCedula = async function (cedula) {
    if (!cedula || cedula.trim().length < 5) return;
    const status = $('cedulaSearchStatus');
    if (status) status.innerHTML = '<span class="text-[#1E40AF] font-bold text-[11px] animate-pulse">Buscando...</span>';

    try {
        const persona = await getConductorByDocumento(cedula.trim());
        if (persona) {
            const nombreCompleto = persona.nombreCompleto || `${persona.nombres || ''} ${persona.apellidos || ''}`.trim();
            if ($('inpNombre') && nombreCompleto) $('inpNombre').value = nombreCompleto;
            if ($('selCargo') && persona.cargo) {
                const c = persona.cargo.toUpperCase();
                const opt = Array.from($('selCargo').options).find(o => o.value === c || c.includes(o.value));
                if (opt) $('selCargo').value = opt.value;
            }
            if ($('selProyecto') && persona.proyecto) {
                const p = (persona.proyecto || '').toUpperCase();
                if (p.includes('GT') || p.includes('TIERRA')) $('selProyecto').value = 'GRAN TIERRA (GT)';
                else if (p.includes('ICBF')) $('selProyecto').value = 'ICBF';
                else if (p.includes('HOSPITAL')) $('selProyecto').value = 'HOSPITAL';
                else if (p.includes('CONSORCIO')) $('selProyecto').value = 'CONSORCIO';
                else $('selProyecto').value = 'TRANS SERVICES A&B';
            }
            showToast(`Bienvenido, ${nombreCompleto}`, 'info');
        }
    } catch (e) {
        console.warn('Búsqueda por cédula:', e);
    } finally {
        if (status) status.innerHTML = '';
    }
};

// --- PROCESAMIENTO DE FOTO / EVIDENCIA ---
window.previewFotoEvidencia = function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
        showToast('La imagen es muy pesada. Máximo 8MB', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Comprimir imagen a resolución móvil óptima (máx 900px)
            const maxDim = 900;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const cx = c.getContext('2d');
            cx.drawImage(img, 0, 0, w, h);
            fotoEvidenciaBase64 = c.toDataURL('image/jpeg', 0.82);

            if ($('fotoPreviewImg')) $('fotoPreviewImg').src = fotoEvidenciaBase64;
            if ($('fotoUploadBox')) $('fotoUploadBox').classList.add('hidden');
            if ($('fotoPreviewBox')) $('fotoPreviewBox').classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
            showToast('✓ Evidencia fotográfica cargada', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.removeFotoEvidencia = function () {
    fotoEvidenciaBase64 = null;
    if ($('fotoFile')) $('fotoFile').value = '';
    if ($('fotoPreviewImg')) $('fotoPreviewImg').src = '';
    if ($('fotoPreviewBox')) $('fotoPreviewBox').classList.add('hidden');
    if ($('fotoUploadBox')) $('fotoUploadBox').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// --- REGISTRAR ASISTENCIA INDIVIDUAL ---
window.handleRegistrarAsistenciaIndividual = async function (e) {
    e.preventDefault();

    const tema = $('inpTema')?.value?.trim();
    const cedula = $('inpCedula')?.value?.trim();
    const nombre = $('inpNombre')?.value?.trim();
    const cargo = $('selCargo')?.value;
    const proyecto = $('selProyecto')?.value;
    const lugar = $('inpLugar')?.value?.trim() || 'VILLAGARZÓN';

    if (!tema) return showToast('Por favor escribe el tema de la charla', 'error');
    if (!cedula) return showToast('Por favor ingresa tu número de cédula', 'error');
    if (!nombre) return showToast('Por favor escribe tu nombre completo', 'error');
    if (!hasDrawn) return showToast('La firma digital en pantalla es obligatoria', 'error');

    const signatureData = canvas.toDataURL('image/png');
    const submitBtn = $('btnSubmitAsistencia');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-flex items-center gap-2 font-bold animate-pulse">Guardando asistencia...</span>';
    }

    const payload = {
        fecha: fechaLocal(),
        hora_llegada: horaLocal(),
        conductor_documento: cedula,
        conductor_nombre: nombre,
        cargo: cargo,
        proyecto: proyecto,
        evento: `${currentEventType}: ${tema}`,
        tipo_evento: currentEventType,
        facilitador: 'COORDINACIÓN HSEQ & PESV',
        lugar: lugar,
        estado: 'presente',
        firma_url: signatureData,
        firma_base64: signatureData,
        foto_url: fotoEvidenciaBase64,
        foto_base64: fotoEvidenciaBase64
    };

    try {
        await createAsistencia(payload);

        // Llenar datos de la constancia de éxito
        if ($('recNombre')) $('recNombre').textContent = nombre;
        if ($('recCedula')) $('recCedula').textContent = `C.C. ${cedula}`;
        if ($('recEvento')) $('recEvento').textContent = tema;
        if ($('recFechaHora')) $('recFechaHora').textContent = `${fechaLocal()} · ${horaLocal().slice(0, 5)}`;
        if ($('recLugar')) $('recLugar').textContent = lugar;

        // Mostrar pantalla de éxito
        if ($('asistenciaForm')) $('asistenciaForm').classList.add('hidden');
        if ($('successScreen')) $('successScreen').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        showToast('¡Asistencia firmada y registrada!', 'success');
    } catch (err) {
        console.error('Error al registrar asistencia:', err);
        showToast('Error al guardar: ' + (err.message || 'Intenta de nuevo'), 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="check-circle-2" class="w-5 h-5 mr-2"></i> Firmar y Registrar mi Asistencia';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
};

window.reiniciarFormulario = function () {
    if ($('asistenciaForm')) {
        $('asistenciaForm').reset();
        $('asistenciaForm').classList.remove('hidden');
    }
    if ($('successScreen')) $('successScreen').classList.add('hidden');
    window.clearSignature();
    window.removeFotoEvidencia();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- SISTEMA TOAST ---
window.showToast = function (msg, type = 'info', duration = 3500) {
    const container = $('toasts');
    if (!container) return;

    const colors = {
        success: 'bg-slate-900 border-emerald-500 text-white',
        error: 'bg-red-950 border-red-500 text-white',
        warning: 'bg-amber-950 border-amber-500 text-white',
        info: 'bg-slate-900 border-blue-500 text-white'
    };

    const toast = document.createElement('div');
    toast.className = `toast p-3.5 rounded-2xl border shadow-xl flex items-center gap-2.5 text-xs font-bold ${colors[type] || colors.info}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, duration);
};
