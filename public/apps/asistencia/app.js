import { createAsistencia, getConductorByDocumento, fechaLocal, horaLocal } from './supabase-client.js';

// --- ESTADO DE LA SESIÓN ---
let currentEventType = 'Charla 5 Minutos (PESV/HSEQ)';
let sessionAssistants = [];
let fotoEvidenciaBase64 = null;
let isDrawing = false;
let hasDrawn = false;

// --- ELEMENTOS DOM ---
const $ = (id) => document.getElementById(id);
const canvas = $('signaturePad');
const ctx = canvas.getContext('2d');

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initCanvas();
    initSessionStorage();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// --- RELOJ LOCAL (UTC-5) ---
function initClock() {
    function tick() {
        const now = new Date();
        if ($('clockTime')) $('clockTime').textContent = horaLocal(now);
        if ($('clockDate')) {
            $('clockDate').textContent = now.toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
    }
    tick();
    setInterval(tick, 1000);
}

// --- CANVAS DE FIRMA ---
function initCanvas() {
    if (!canvas) return;

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.2;
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
    if (!canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
};

// --- SELECTOR DE TIPO DE EVENTO ---
window.selectEventType = function (el) {
    document.querySelectorAll('.event-pill').forEach(pill => pill.classList.remove('active'));
    el.classList.add('active');
    currentEventType = el.getAttribute('data-type');
};

// --- TOGGLE DETALLES DEL EVENTO ---
window.toggleEventDetails = function () {
    const block = $('eventDetailsBlock');
    const text = $('toggleText');
    const icon = $('toggleIcon');
    if (!block) return;

    if (block.classList.contains('hidden')) {
        block.classList.remove('hidden');
        text.textContent = 'Ocultar detalles';
        if (icon) icon.setAttribute('data-lucide', 'chevron-up');
    } else {
        block.classList.add('hidden');
        text.textContent = 'Editar datos del evento';
        if (icon) icon.setAttribute('data-lucide', 'chevron-down');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// --- AUTOCOMPLETADO DE CONDUCTOR POR CÉDULA ---
let cedulaSearchTimer = null;
window.onCedulaInput = function (val) {
    clearTimeout(cedulaSearchTimer);
    if (!val || val.trim().length < 5) return;
    cedulaSearchTimer = setTimeout(() => {
        window.buscarConductorPorCedula(val);
    }, 250);
};

window.buscarConductorPorCedula = async function (cedula) {
    if (!cedula || cedula.trim().length < 5) return;
    const status = $('cedulaSearchStatus');
    if (status) status.innerHTML = '<i class="animate-spin fas fa-spinner text-blue-600"></i>';

    try {
        const conductor = await getConductorByDocumento(cedula.trim());
        if (conductor) {
            const nombreCompleto = conductor.nombreCompleto || `${conductor.nombres || ''} ${conductor.apellidos || ''}`.trim();
            if ($('inpNombre') && nombreCompleto) $('inpNombre').value = nombreCompleto;
            if ($('selCargo') && conductor.cargo) $('selCargo').value = conductor.cargo;
            if ($('selProyecto') && conductor.proyecto) {
                const p = (conductor.proyecto || '').toUpperCase();
                if (p.includes('ICBF')) $('selProyecto').value = 'ICBF';
                else if (p.includes('GT') || p.includes('TIERRA')) $('selProyecto').value = 'GT';
                else if (p.includes('HOSPITAL')) $('selProyecto').value = 'HOSPITAL';
                else $('selProyecto').value = 'OTRO';
            }
            showToast(`Conductor: ${nombreCompleto}`, 'info');
        }
    } catch (e) {
        console.warn('Búsqueda por cédula:', e);
    } finally {
        if (status) status.innerHTML = '';
    }
};

// --- REGISTRAR ASISTENTE INDIVIDUAL ---
window.handleRegistrarAsistente = async function (e) {
    e.preventDefault();

    const tema = $('inpTema')?.value?.trim();
    const facilitador = $('inpFacilitador')?.value?.trim();
    const lugar = $('inpLugar')?.value?.trim();
    const cedula = $('inpCedula')?.value?.trim();
    const nombre = $('inpNombre')?.value?.trim();
    const cargo = $('selCargo')?.value;
    const proyecto = $('selProyecto')?.value;

    if (!tema) return showToast('Por favor ingresa el tema u objetivo de la sesión', 'error');
    if (!facilitador) return showToast('Por favor ingresa el nombre del facilitador', 'error');
    if (!cedula) return showToast('Por favor ingresa el número de cédula', 'error');
    if (!nombre) return showToast('Por favor ingresa el nombre completo', 'error');
    if (!hasDrawn) return showToast('La firma del asistente es obligatoria', 'error');

    const signatureData = canvas.toDataURL('image/png');
    const submitBtn = $('btnRegistrarAsistente');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Guardando registro...';
    }

    const nuevoRegistro = {
        fecha: fechaLocal(),
        hora_llegada: horaLocal(),
        conductor_documento: cedula,
        conductor_nombre: nombre,
        cargo: cargo,
        proyecto: proyecto,
        evento: `${currentEventType}: ${tema}`,
        tipo_evento: currentEventType,
        facilitador: facilitador,
        lugar: lugar,
        estado: 'presente',
        firma_url: signatureData,
        firma_base64: signatureData
    };

    try {
        await createAsistencia(nuevoRegistro);

        // Agregar a la lista de asistentes en sesión
        sessionAssistants.unshift({
            id: Date.now(),
            cedula,
            nombre,
            cargo,
            proyecto,
            hora: horaLocal().slice(0, 5),
            firma: signatureData
        });

        saveSessionStorage();
        renderAssistantsList();

        // Mostrar modal de éxito
        if ($('modalAsistenteNombre')) $('modalAsistenteNombre').textContent = nombre;
        if ($('successModal')) $('successModal').classList.remove('hidden');

        // Limpiar formulario de asistente
        $('inpCedula').value = '';
        $('inpNombre').value = '';
        window.clearSignature();

        showToast(`Asistencia de ${nombre} registrada con éxito`, 'success');
    } catch (err) {
        console.error('Error al registrar asistencia:', err);
        showToast('Ocurrió un error al guardar la asistencia. Intenta de nuevo.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i data-lucide="user-check" class="w-5 h-5 mr-2"></i> Firmar y Registrar Asistencia';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
};

// --- CERRAR MODAL DE ÉXITO ---
window.closeSuccessModal = function (focusNext) {
    if ($('successModal')) $('successModal').classList.add('hidden');
    if (focusNext && $('inpCedula')) {
        $('inpCedula').focus();
    }
};

// --- RENDERIZAR LISTA DE ASISTENTES ---
function renderAssistantsList() {
    const count = sessionAssistants.length;
    if ($('asistentesCount')) $('asistentesCount').textContent = count;
    if ($('asistentesListCount')) $('asistentesListCount').textContent = count;

    const emptyBox = $('asistentesListEmpty');
    const container = $('asistentesListContainer');

    if (!container || !emptyBox) return;

    if (count === 0) {
        emptyBox.classList.remove('hidden');
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    emptyBox.classList.add('hidden');
    container.classList.remove('hidden');

    container.innerHTML = sessionAssistants.map((asistente, idx) => `
        <div class="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm flex items-center justify-between gap-3 transition-all hover:border-slate-300">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-[#EFF6FF] text-[#1E40AF] font-black text-xs flex items-center justify-center border border-[#BFDBFE]">
                    ${count - idx}
                </div>
                <div>
                    <h4 class="text-sm font-extrabold text-slate-900 leading-tight uppercase">${asistente.nombre}</h4>
                    <p class="text-xs font-semibold text-slate-500 font-mono">CC: ${asistente.cedula} · ${asistente.cargo}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[11px] font-bold text-slate-500">${asistente.hora}</span>
                <img src="${asistente.firma}" alt="Firma" class="h-8 w-16 object-contain bg-slate-50 rounded border border-slate-200 p-0.5">
            </div>
        </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- LIMPIAR LISTA DE SESIÓN ---
window.limpiarListaSesion = function () {
    if (confirm('¿Deseas reiniciar la lista de asistentes para una nueva sesión?')) {
        sessionAssistants = [];
        saveSessionStorage();
        renderAssistantsList();
        showToast('Lista de asistentes reiniciada para una nueva sesión', 'info');
    }
};

// --- EVIDENCIA FOTOGRÁFICA ---
window.previewFotoEvidencia = function (e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        return showToast('La imagen supera el tamaño máximo permitido de 5MB', 'error');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        fotoEvidenciaBase64 = event.target.result;
        if ($('fotoPreviewImg')) $('fotoPreviewImg').src = fotoEvidenciaBase64;
        if ($('fotoPreviewBox')) $('fotoPreviewBox').classList.remove('hidden');
        showToast('Foto de evidencia cargada correctamente', 'success');
    };
    reader.readAsDataURL(file);
};

window.removeFotoEvidencia = function () {
    fotoEvidenciaBase64 = null;
    if ($('fotoFile')) $('fotoFile').value = '';
    if ($('fotoPreviewBox')) $('fotoPreviewBox').classList.add('hidden');
    if ($('fotoPreviewImg')) $('fotoPreviewImg').src = '';
};

// --- FINALIZAR SESIÓN COMPLETA ---
window.finalizarSesionCompleta = function () {
    if (sessionAssistants.length === 0) {
        return showToast('Debes registrar al menos un asistente antes de finalizar la sesión', 'error');
    }

    const tema = $('inpTema')?.value?.trim() || 'Actividad';
    const total = sessionAssistants.length;

    if (confirm(`¿Confirmas el cierre del evento "${tema}" con ${total} asistentes registrados?`)) {
        showToast(`Sesión completada con ${total} firmas. Registros guardados en TH-FOR-03.`, 'success');
        setTimeout(() => {
            sessionAssistants = [];
            saveSessionStorage();
            renderAssistantsList();
            window.removeFotoEvidencia();
            if ($('inpTema')) $('inpTema').value = '';
        }, 1500);
    }
};

// --- LOCAL STORAGE ---
function saveSessionStorage() {
    try {
        localStorage.setItem('trans_asistencia_sesion', JSON.stringify({
            eventType: currentEventType,
            tema: $('inpTema')?.value || '',
            facilitador: $('inpFacilitador')?.value || '',
            lugar: $('inpLugar')?.value || '',
            assistants: sessionAssistants
        }));
    } catch (e) {}
}

function initSessionStorage() {
    try {
        const data = JSON.parse(localStorage.getItem('trans_asistencia_sesion') || '{}');
        if (data.assistants && Array.isArray(data.assistants)) {
            sessionAssistants = data.assistants;
            renderAssistantsList();
        }
        if (data.facilitador && $('inpFacilitador')) $('inpFacilitador').value = data.facilitador;
        if (data.lugar && $('inpLugar')) $('inpLugar').value = data.lugar;
    } catch (e) {}
}

// --- SISTEMA TOAST ---
function showToast(msg, type = 'success') {
    const container = $('toasts');
    if (!container) return;

    const el = document.createElement('div');
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const bg = isSuccess ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : isError ? 'bg-red-50 border-red-300 text-red-900' : 'bg-blue-50 border-blue-300 text-blue-900';
    const icon = isSuccess ? 'check-circle text-emerald-600' : isError ? 'alert-triangle text-red-600' : 'info text-blue-600';

    el.className = `toast flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 ${bg} shadow-xl text-xs font-extrabold`;
    el.innerHTML = `<i class="fas fa-${icon}"></i> <span>${msg}</span>`;

    container.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s ease';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}
