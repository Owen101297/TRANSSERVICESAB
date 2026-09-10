/**
 * app.js - Lógica Integral y Robusta de Gerenciamiento de Viajes (STE-F-010)
 * Cooperativa de Transportes y Servicios A&B S.A.S.
 * 100% PostgreSQL en Railway · Cumplimiento Resolución 40595 de 2022 & SISI-PESV
 */

import {
    getViajes,
    getViajesByPlaca,
    createViaje,
    updateViaje,
    getViajeById,
    getConductores,
    getVehiculos,
    getConductorById,
    getVehiculoByPlaca,
    getConductorByEmail,
    getCurrentUser,
    getCurrentProfile,
    isAdmin,
    requireAuth,
    signOut,
    verifyPinAdmin,
    checkPreoperacionalDia
} from './api-client.js';

import {
    DIVIPOLA_COLOMBIA,
    searchDivipola,
    getDivipolaByCode,
    formatDivipolaLabel
} from './divipola-data.js';

import {
    RUTAS_FRECUENTES,
    findRuta
} from './rutas-data.js';

import { generatePDF } from './pdf-generator.js?v=2.0.1';

// --- ESTADO GLOBAL DE LA APLICACIÓN ---
let currentUser = null;
let currentProfile = null;
let currentConductor = null;
let currentTripId = null;
let currentStep = 0;
let isAnimating = false;
let historyDataMap = {};
let currentHistoryData = [];
let gpsData = { salida: null, llegada: null };
let hseModalActive = false;
let pinAuthCallback = null;

const steps = document.getElementsByClassName("form-step");
const totalSteps = steps.length;

// Wrapper de base de datos para compatibilidad
const db = {
    getTrips: getViajes,
    getTripsByPlaca: getViajesByPlaca,
    saveTrip: async (trip) => {
        if (trip.id) {
            return await updateViaje(trip.id, trip);
        } else {
            return await createViaje(trip);
        }
    }
};

// ============================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================================
async function initAuth() {
    try {
        const user = await getCurrentUser();
        const prof = await getCurrentProfile();
        currentUser = user;
        currentProfile = prof;
        
        if (user) {
            const isAdm = await isAdmin();
            console.log(`[Viajes A&B] Sesión activa: ${user.nombre || user.email || 'Conductor'} (${isAdm ? 'ADMIN' : 'CONDUCTOR'})`);

            // Si hay datos de conductor precargados
            if (user.nombre && document.getElementById('cNombre') && !document.getElementById('cNombre').value) {
                document.getElementById('cNombre').value = user.nombre;
            }
            if (user.documento && document.getElementById('cLicencia') && !document.getElementById('cLicencia').value) {
                document.getElementById('cLicencia').value = user.documento;
            }
            if (user.placa && document.getElementById('vPlaca') && !document.getElementById('vPlaca').value) {
                document.getElementById('vPlaca').value = user.placa;
            }

            // Buscar datos detallados en base de datos PostgreSQL
            if (user.documento) {
                const cond = await getConductorById(user.documento);
                if (cond) {
                    currentConductor = cond;
                    if (cond.nombre && document.getElementById('cNombre')) document.getElementById('cNombre').value = cond.nombre;
                    if (cond.cedula && document.getElementById('cLicencia')) document.getElementById('cLicencia').value = cond.cedula;
                    if (cond.categoria && document.getElementById('cCat')) document.getElementById('cCat').value = cond.categoria;
                    if (cond.vencimiento && document.getElementById('cVence')) {
                        document.getElementById('cVence').value = cond.vencimiento.split('T')[0];
                        if (typeof window.checkLicenciaVencimiento === 'function') {
                            window.checkLicenciaVencimiento();
                        }
                    }
                    if (cond.telefono && document.getElementById('cTelefono')) document.getElementById('cTelefono').value = cond.telefono;
                }
            }
        }
    } catch (e) {
        console.warn("[Viajes A&B] Aviso en initAuth:", e);
    }
}

window.onload = async () => {
    try {
        initDivipolaList();
        initConductoresList();
        showStep(currentStep);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        getGPS('salida');

        setupCanvas('signatureCanvasConductor');
        setupCanvas('signatureCanvasGerencia');
        setupCanvas('signatureCanvasHSE_Modal');
        updateRisk();

        // Cargar fecha actual por defecto
        const fechaInput = document.getElementById('fecha');
        if (fechaInput && !fechaInput.value) {
            fechaInput.value = new Date().toISOString().split('T')[0];
        }

        // Cargar hora de salida por defecto
        const horaSalidaInput = document.getElementById('horaSalida');
        if (horaSalidaInput && !horaSalidaInput.value) {
            const now = new Date();
            horaSalidaInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }

        // Cargar perfil o sesión en segundo plano
        initAuth().catch(console.warn);
    } catch (e) {
        console.error("Error en inicialización:", e);
    }
};

// ============================================================
// CATÁLOGO DIVIPOLA & AUTOCOMPLETADO
// ============================================================
function initDivipolaList() {
    const list = document.getElementById('divipolaList');
    if (!list) return;
    list.innerHTML = DIVIPOLA_COLOMBIA.map(d => 
        `<option value="${d.codigo} - ${d.municipio} (${d.departamento})"></option>`
    ).join('');
}

let cachedConductoresList = [];

async function initConductoresList() {
    const list = document.getElementById('conductoresList');
    if (!list) return;
    cachedConductoresList = await getConductores();
    list.innerHTML = cachedConductoresList.map(c => 
        `<option value="${c.nombre}">${c.cedula ? `C.C. ${c.cedula}` : ''}</option>`
    ).join('');

    const cNombreInput = document.getElementById('cNombre');
    if (cNombreInput) {
        cNombreInput.addEventListener('change', (e) => onConductorSelected(e.target.value));
        cNombreInput.addEventListener('input', (e) => onConductorSelected(e.target.value));
    }
}

function onConductorSelected(val) {
    if (!val || !cachedConductoresList.length) return;
    const clean = val.trim().toLowerCase();
    const cond = cachedConductoresList.find(c => (c.nombre || '').toLowerCase() === clean);
    if (cond) {
        if (cond.cedula && document.getElementById('cLicencia')) document.getElementById('cLicencia').value = cond.cedula;
        if (cond.categoria && document.getElementById('cCat')) document.getElementById('cCat').value = cond.categoria;
        if (cond.vencimiento && document.getElementById('cVence')) {
            document.getElementById('cVence').value = cond.vencimiento.split('T')[0];
            checkLicenciaVencimiento();
        }
        if (cond.telefono && document.getElementById('cTelefono')) document.getElementById('cTelefono').value = cond.telefono;
    }
}

window.checkLicenciaVencimiento = function() {
    const venceInput = document.getElementById('cVence');
    const badge = document.getElementById('badgeLicencia');
    if (!venceInput || !badge || !venceInput.value) return;

    const fechaVence = new Date(venceInput.value);
    const hoy = new Date();
    const diffDays = Math.ceil((fechaVence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    badge.classList.remove('hidden');
    if (diffDays < 0) {
        badge.className = 'mt-1 p-2 rounded-lg text-xs font-bold font-mono bg-red-100 text-red-800 border border-red-300';
        badge.innerText = `🚨 LICENCIA VENCIDA (Hace ${Math.abs(diffDays)} días)`;
    } else if (diffDays <= 30) {
        badge.className = 'mt-1 p-2 rounded-lg text-xs font-bold font-mono bg-amber-100 text-amber-800 border border-amber-300';
        badge.innerText = `⚠️ Por vencer en ${diffDays} días`;
    } else {
        badge.className = 'mt-1 p-2 rounded-lg text-xs font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300';
        badge.innerText = `✔ Vigente (${diffDays} días restantes)`;
    }
};

window.onRutaFrecuenteSelected = function(rutaId) {
    if (!rutaId) return;
    const ruta = RUTAS_FRECUENTES.find(r => r.id === rutaId);
    if (!ruta) return;

    const origenInput = document.getElementById('origen');
    const origenDivipolaInput = document.getElementById('origenDivipola');
    const destinoInput = document.getElementById('destino');
    const destinoDivipolaInput = document.getElementById('destinoDivipola');
    const distInput = document.getElementById('distanciaEstimada');

    if (origenInput) origenInput.value = `${ruta.origenDivipola} - ${ruta.origen}`;
    if (origenDivipolaInput) origenDivipolaInput.value = ruta.origenDivipola;
    if (destinoInput) destinoInput.value = `${ruta.destinoDivipola} - ${ruta.destino}`;
    if (destinoDivipolaInput) destinoDivipolaInput.value = ruta.destinoDivipola;
    if (distInput) distInput.value = ruta.distanciaKm;

    // Set suggested route type
    const viaRadios = document.querySelectorAll('input[name="rVia"]');
    viaRadios.forEach(r => {
        if (Number(r.value) === ruta.tipoVia) r.checked = true;
    });

    // Auto set distance risk radio
    const distRadios = document.querySelectorAll('input[name="rDistancia"]');
    distRadios.forEach(r => {
        const val = Number(r.value);
        if (ruta.distanciaKm < 50 && val === 1) r.checked = true;
        else if (ruta.distanciaKm >= 50 && ruta.distanciaKm < 100 && val === 2) r.checked = true;
        else if (ruta.distanciaKm >= 100 && ruta.distanciaKm < 200 && val === 5) r.checked = true;
        else if (ruta.distanciaKm >= 200 && val === 8) r.checked = true;
    });

    // Auto populate control points
    if (ruta.puntosControl && ruta.puntosControl.length > 0) {
        populatePuntosControlFromRuta(ruta);
    }

    updateRisk();
    if (typeof TS !== 'undefined' && TS.toastSuccess) {
        TS.toastSuccess(`Ruta aplicada: ${ruta.distanciaKm} km (~${ruta.duracionHoras}h)`);
    }
};

window.checkHorarioNocturno = function() {
    const horaSalida = document.getElementById('horaSalida')?.value || '';
    const alertBox = document.getElementById('nocturnoAlert');
    if (!horaSalida) return;

    const [h] = horaSalida.split(':').map(Number);
    const isNocturno = (h >= 18 || h < 6);

    if (alertBox) {
        if (isNocturno) alertBox.classList.remove('hidden');
        else alertBox.classList.add('hidden');
    }

    const horaRadios = document.querySelectorAll('input[name="rHora"]');
    horaRadios.forEach(r => {
        if (isNocturno && Number(r.value) === 8) r.checked = true;
        else if (!isNocturno && Number(r.value) === 1) r.checked = true;
    });

    updateRisk();
};

window.sugerirPuntosDescanso = function() {
    const o = document.getElementById('origen')?.value || '';
    const d = document.getElementById('destino')?.value || '';
    const ruta = findRuta(o, d);
    if (ruta && ruta.puntosControl && ruta.puntosControl.length > 0) {
        populatePuntosControlFromRuta(ruta);
        if (typeof TS !== 'undefined' && TS.toastSuccess) {
            TS.toastSuccess(`Se agregaron ${ruta.puntosControl.length} puntos de descanso sugeridos.`);
        }
    } else {
        const cont = document.getElementById('puntosControlContainer');
        if (cont && cont.children.length === 0) {
            addControlPoint();
            const firstInput = cont.querySelector('input[name="pc_lugar[]"]');
            if (firstInput) firstInput.value = 'Punto de Control Intermedio / Pausa Activa';
        }
        if (typeof TS !== 'undefined' && TS.toastInfo) {
            TS.toastInfo('Punto de pausa activa agregado.');
        }
    }
};

function populatePuntosControlFromRuta(ruta) {
    const cont = document.getElementById('puntosControlContainer');
    if (!cont) return;
    cont.innerHTML = '';
    const horaSalidaStr = document.getElementById('horaSalida')?.value || '06:00';
    const [hBase, mBase] = horaSalidaStr.split(':').map(Number);

    ruta.puntosControl.forEach((p, idx) => {
        const offsetMin = Math.round((p.horaOffset || 1) * 60);
        const dateObj = new Date();
        dateObj.setHours((hBase || 6), (mBase || 0) + offsetMin, 0);
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const mm = String(dateObj.getMinutes()).padStart(2, '0');

        const div = document.createElement('div');
        div.className = "p-3 bg-white rounded-xl flex items-center gap-3 border-2 border-slate-300 shadow-sm transition-all";
        div.innerHTML = `
            <span class="font-black text-slate-900 w-6 text-center index-number">${idx + 1}</span>
            <input type="text" name="pc_lugar[]" list="divipolaList" value="${p.lugar}" placeholder="Lugar, peaje o punto DIVIPOLA" class="input-moderno flex-1 text-xs">
            <input type="time" name="pc_hora[]" value="${hh}:${mm}" class="input-moderno !w-auto !px-2 text-xs">
            <button type="button" onclick="removeControlPoint(this)" class="text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        `;
        cont.appendChild(div);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.onOrigenChange = function(val) {
    const origenDivipolaInput = document.getElementById('origenDivipola');
    if (!origenDivipolaInput) return;
    const match = val.match(/^(\d{5})/);
    if (match) {
        origenDivipolaInput.value = match[1];
    } else {
        const found = searchDivipola(val);
        if (found.length > 0) origenDivipolaInput.value = found[0].codigo;
    }
};

window.onDestinoChange = function(val) {
    const destinoDivipolaInput = document.getElementById('destinoDivipola');
    if (!destinoDivipolaInput) return;
    const match = val.match(/^(\d{5})/);
    if (match) {
        destinoDivipolaInput.value = match[1];
    } else {
        const found = searchDivipola(val);
        if (found.length > 0) destinoDivipolaInput.value = found[0].codigo;
    }
};

// ============================================================
// NAVEGACIÓN ENTRE PASOS Y VALIDACIÓN PASO A PASO
// ============================================================
function showStep(n) {
    for (let i = 0; i < totalSteps; i++) {
        if (steps[i]) steps[i].style.display = "none";
    }
    if (steps[n]) {
        steps[n].style.display = "block";
        steps[n].classList.add('animate-enter');
    }

    updateNavigation(n);
    updateProgressBar(n);
    window.scrollTo(0, 0);

    // Redimensionar canvas cuando se entra al paso de firmas
    if (n === totalSteps - 1) {
        setTimeout(() => {
            ['signatureCanvasConductor', 'signatureCanvasGerencia', 'signatureCanvasHSE_Modal'].forEach(id => {
                if (document.getElementById(id)) resizeCanvas(id);
            });
        }, 120);
    }
}

async function nextPrev(n) {
    if (isAnimating) return;

    // Si el usuario quiere avanzar hacia adelante, validamos el paso actual
    if (n > 0) {
        const isValid = validateStep(currentStep);
        if (!isValid) return;
    }

    // Si estamos en el último paso (firmas) y pulsa Siguiente / Guardar
    if (currentStep === totalSteps - 1 && n > 0) {
        await handleSubmit();
        return;
    }

    const nxt = currentStep + n;
    if (nxt >= 0 && nxt < totalSteps) {
        isAnimating = true;
        const currentEl = steps[currentStep];
        const nextEl = steps[nxt];

        if (currentEl) {
            currentEl.classList.remove('animate-enter');
            currentEl.classList.add('animate-exit');
            await new Promise(resolve => setTimeout(resolve, 200));
            currentEl.style.display = "none";
            currentEl.classList.remove('animate-exit');
        }

        currentStep = nxt;
        if (nextEl) {
            nextEl.style.display = "block";
            nextEl.classList.add('animate-enter');
        }

        updateNavigation(currentStep);
        updateProgressBar(currentStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        isAnimating = false;
    }
}

/**
 * Validador robusto paso a paso (Resolución 40595 de 2022)
 */
function validateStep(stepIndex) {
    const getVal = (id) => (document.getElementById(id)?.value || '').trim();

    if (stepIndex === 0) {
        // Paso 1: Ruta y Odómetro inicial
        if (!getVal('fecha')) {
            TS.toastWarning("Por favor ingresa la fecha del viaje.");
            document.getElementById('fecha')?.focus();
            return false;
        }
        if (!getVal('horaSalida')) {
            TS.toastWarning("Por favor ingresa la hora de salida.");
            document.getElementById('horaSalida')?.focus();
            return false;
        }
        if (!getVal('origen')) {
            TS.toastWarning("Por favor indica el municipio de origen (DIVIPOLA).");
            document.getElementById('origen')?.focus();
            return false;
        }
        if (!getVal('destino')) {
            TS.toastWarning("Por favor indica el municipio de destino (DIVIPOLA).");
            document.getElementById('destino')?.focus();
            return false;
        }
        const kmSal = parseFloat(getVal('kmSalida'));
        if (isNaN(kmSal) || kmSal <= 0) {
            TS.toastWarning("Por favor ingresa un kilometraje inicial válido.");
            document.getElementById('kmSalida')?.focus();
            return false;
        }
        const kmLleg = parseFloat(getVal('kmLlegada'));
        if (!isNaN(kmLleg) && kmLleg > 0 && kmLleg < kmSal) {
            TS.toastWarning("El kilometraje final no puede ser menor al inicial.");
            return false;
        }
        return true;
    }

    if (stepIndex === 1) {
        // Paso 2: Vehículo y Conductor
        if (!getVal('vPlaca')) {
            TS.toastWarning("Por favor ingresa la placa del vehículo.");
            document.getElementById('vPlaca')?.focus();
            return false;
        }
        if (!getVal('cNombre')) {
            TS.toastWarning("Por favor ingresa el nombre del conductor.");
            document.getElementById('cNombre')?.focus();
            return false;
        }
        if (!getVal('cLicencia')) {
            TS.toastWarning("Por favor ingresa la cédula o licencia de conducción.");
            document.getElementById('cLicencia')?.focus();
            return false;
        }
        return true;
    }

    if (stepIndex === 4) {
        // Paso 5: Matriz de Riesgo STE-F-010
        const rsk = updateRisk();
        if (rsk.score <= 0) {
            TS.toastWarning("Por favor completa las opciones de la matriz de riesgo.");
            return false;
        }
        return true;
    }

    if (stepIndex === 5) {
        // Paso 6: Verificaciones Pre-Viaje y Test de Fatiga
        const noAlcohol = document.getElementById('tf_sustancias')?.checked;
        const descanso = document.getElementById('tf_descanso')?.checked;
        if (!noAlcohol) {
            TS.toastWarning("Es obligatorio certificar la ausencia de alcohol o sustancias que alteren la conducción.");
            return false;
        }
        if (!descanso) {
            TS.toastWarning("El conductor debe haber descansado al menos 8 horas antes del viaje según la norma PESV.");
            return false;
        }
        return true;
    }

    return true;
}

function updateNavigation(n) {
    const nextBtn = document.getElementById("nextBtn");
    const prevBtn = document.getElementById("prevBtn");
    if (!nextBtn || !prevBtn) return;

    if (n === 0) {
        prevBtn.style.display = "none";
        nextBtn.className = "btn btn-primary w-full shadow-xl font-black text-white bg-[#1E40AF] border-2 border-[#1E3A8A] text-base py-3.5";
    } else {
        prevBtn.style.display = "inline-flex";
        prevBtn.className = "btn btn-secondary w-1/3 shadow-sm font-extrabold text-slate-900 border-2 border-slate-400 text-sm py-3.5";
        nextBtn.className = "btn btn-primary flex-1 shadow-xl font-black text-white bg-[#1E40AF] border-2 border-[#1E3A8A] text-base py-3.5";
    }

    if (n === totalSteps - 1) {
        const condSig = document.getElementById('signatureCanvasConductor');
        const isSigned = condSig ? condSig.getAttribute('data-signed') === 'true' : false;
        const rsk = updateRisk();

        if (isSigned) {
            if (rsk.score > 15) {
                nextBtn.innerHTML = 'Guardar y Proceder a Autorización HSE <i class="ml-2 w-4 h-4 inline-block" data-lucide="shield-check"></i>';
            } else {
                nextBtn.innerHTML = 'Registrar y Finalizar Despacho <i class="ml-2 w-4 h-4 inline-block" data-lucide="save"></i>';
            }
        } else {
            nextBtn.innerHTML = 'Firma Requerida para Despachar <i class="ml-2 w-4 h-4 inline-block" data-lucide="pen-tool"></i>';
        }
    } else if (n === 0 && currentTripId && parseFloat(document.getElementById('kmLlegada')?.value) > 0) {
        nextBtn.innerHTML = 'Cerrar Viaje con KM Final <i class="ml-2 w-4 h-4 inline-block" data-lucide="check-circle"></i>';
        nextBtn.classList.add('!bg-emerald-600', '!border-emerald-700');
    } else {
        nextBtn.innerHTML = 'Siguiente <i class="ml-2 w-4 h-4 inline-block" data-lucide="arrow-right"></i>';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateProgressBar(n) {
    const progress = ((n + 1) / totalSteps) * 100;
    const bar = document.getElementById("progressBar");
    const txt = document.getElementById("progressText");
    const pct = document.getElementById("progressPercent");
    if (bar) bar.style.width = progress + "%";
    if (txt) txt.innerText = `Paso ${n + 1} de ${totalSteps}`;
    if (pct) pct.innerText = Math.round(progress);
}

// ============================================================
// VERIFICACIÓN DE PREOPERACIONAL & BÚSQUEDA DE VEHÍCULO
// ============================================================
window.searchVehicle = async function() {
    const placaInput = document.getElementById('vPlaca');
    if (!placaInput) return;
    const placa = placaInput.value.trim().toUpperCase();
    placaInput.value = placa;
    if (placa.length < 3) return;

    const bannerText = document.getElementById('preoperacionalText');
    const banner = document.getElementById('preoperacionalBanner');
    const vigenciasCont = document.getElementById('vehiculoVigencias');
    const badgeSoat = document.getElementById('badgeSoat');
    const badgeRtm = document.getElementById('badgeRtm');

    try {
        if (bannerText) bannerText.innerText = "Consultando preoperacional y flota en Railway...";
        
        // 1. Consultar preoperacional del día en tiempo real
        const prep = await checkPreoperacionalDia(placa);
        if (banner && bannerText) {
            if (prep.encontrado && prep.aprobado) {
                banner.className = "p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-900";
                bannerText.innerText = `✔ ${prep.mensaje}`;
            } else if (prep.encontrado && !prep.aprobado) {
                banner.className = "p-3 bg-red-50 border border-red-300 rounded-xl flex items-center gap-2 text-xs font-bold text-red-900";
                bannerText.innerText = `⚠ ${prep.mensaje}`;
            } else {
                banner.className = "p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-900";
                bannerText.innerText = `ℹ Sin preoperacional registrado hoy para ${placa}. Se registrará con verificación en ruta.`;
            }
        }

        // 2. Autocompletar datos del vehículo desde Railway y mostrar vigencias
        const vehiculo = await getVehiculoByPlaca(placa);
        if (vehiculo) {
            if (vehiculo.modelo && document.getElementById('vModelo')) document.getElementById('vModelo').value = vehiculo.modelo;
            if (vehiculo.color && document.getElementById('vColor')) document.getElementById('vColor').value = vehiculo.color;
            if (vehiculo.tipo && document.getElementById('vTipo')) document.getElementById('vTipo').value = vehiculo.tipo;
            if (vehiculo.empresa && document.getElementById('vEmpresa')) document.getElementById('vEmpresa').value = vehiculo.empresa;

            if (vigenciasCont && badgeSoat && badgeRtm) {
                vigenciasCont.classList.remove('hidden');
                const hoy = new Date();

                // SOAT
                if (vehiculo.soatVencimiento) {
                    const diffS = Math.ceil((new Date(vehiculo.soatVencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffS < 0) {
                        badgeSoat.className = "font-mono px-2 py-0.5 rounded text-[11px] bg-red-100 text-red-800 border border-red-300";
                        badgeSoat.innerText = `🚨 Vencido (${vehiculo.soatVencimiento})`;
                    } else if (diffS <= 30) {
                        badgeSoat.className = "font-mono px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-800 border border-amber-300";
                        badgeSoat.innerText = `⚠️ Vence en ${diffS}d (${vehiculo.soatVencimiento})`;
                    } else {
                        badgeSoat.className = "font-mono px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300";
                        badgeSoat.innerText = `✔ Vigente (${vehiculo.soatVencimiento})`;
                    }
                } else {
                    badgeSoat.className = "font-mono px-2 py-0.5 rounded text-[11px] bg-slate-200 text-slate-700";
                    badgeSoat.innerText = "Registrado";
                }

                // RTM
                if (vehiculo.rtmVencimiento) {
                    const diffR = Math.ceil((new Date(vehiculo.rtmVencimiento).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffR < 0) {
                        badgeRtm.className = "font-mono px-2 py-0.5 rounded text-[11px] bg-red-100 text-red-800 border border-red-300";
                        badgeRtm.innerText = `🚨 Vencida (${vehiculo.rtmVencimiento})`;
                    } else if (diffR <= 30) {
                        badgeRtm.className = "font-mono px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-800 border border-amber-300";
                        badgeRtm.innerText = `⚠️ Vence en ${diffR}d (${vehiculo.rtmVencimiento})`;
                    } else {
                        badgeRtm.className = "font-mono px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300";
                        badgeRtm.innerText = `✔ Vigente (${vehiculo.rtmVencimiento})`;
                    }
                } else {
                    badgeRtm.className = "font-mono px-2 py-0.5 rounded text-[11px] bg-slate-200 text-slate-700";
                    badgeRtm.innerText = "Registrado";
                }
            }
        }
    } catch (e) {
        console.warn("Aviso buscando vehículo:", e);
    }
};

// ============================================================
// GPS Y CÁLCULO DE ODÓMETRO
// ============================================================
function getGPS(type) {
    if (!navigator.geolocation) return;
    const statusEl = document.getElementById(type === 'salida' ? 'gpsSalidaStatus' : 'gpsLlegadaStatus');
    if (statusEl) statusEl.innerHTML = '<span class="flex items-center gap-1 text-slate-500"><i class="w-3 h-3 animate-spin" data-lucide="loader-2"></i> Capturando GPS...</span>';
    if (typeof lucide !== 'undefined') lucide.createIcons();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const coords = `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
            gpsData[type] = coords;
            if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600 flex items-center gap-1 font-bold"><i class="w-3 h-3" data-lucide="map-pin"></i> GPS ${type === 'salida' ? 'Inicio' : 'Fin'} OK</span>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        },
        () => {
            if (statusEl) statusEl.innerHTML = '<span class="text-amber-600 text-xs">GPS manual</span>';
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

function calcKm() {
    const salida = parseFloat(document.getElementById('kmSalida')?.value) || 0;
    const llegada = parseFloat(document.getElementById('kmLlegada')?.value) || 0;
    const errorEl = document.getElementById('kmError');

    if (llegada > 0 && llegada < salida) {
        if (errorEl) errorEl.classList.remove('hidden');
    } else {
        if (errorEl) errorEl.classList.add('hidden');
    }

    if (llegada > salida && document.getElementById('distanciaEstimada')) {
        document.getElementById('distanciaEstimada').value = llegada - salida;
        const horaLlegadaInput = document.getElementById('horaLlegada');
        if (horaLlegadaInput && !horaLlegadaInput.value) {
            const now = new Date();
            horaLlegadaInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
    }
    updateNavigation(currentStep);
}

// ============================================================
// MATRIZ DE RIESGO PESV STE-F-010
// ============================================================
function updateRisk() {
    const val = (name) => {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? parseInt(el.value) : 0;
    };
    const score = val('rDistancia') + val('rClima') + val('rVehiculos') + val('rVia') + val('rCom') + val('rFatiga') + val('rHora');

    const pointsEl = document.getElementById('totalPoints');
    const levelEl = document.getElementById('riskLevel');
    const cardEl = document.getElementById('riskScoreCard');
    const warningEl = document.getElementById('riskWarning');

    if (pointsEl) pointsEl.innerText = score;

    let levelText = "RIESGO BAJO (AUTORIZACIÓN NORMAL)";
    let levelClass = "bg-emerald-50 text-emerald-700 border-emerald-300";

    if (score > 23) {
        levelText = "RIESGO ALTO (AUTORIZACIÓN GERENCIA REQUERIDA)";
        levelClass = "bg-red-50 text-red-700 border-red-300";
        if (warningEl) warningEl.classList.remove('hidden');
    } else if (score > 15) {
        levelText = "RIESGO MEDIO (VISTO BUENO HSEQ OBLIGATORIO)";
        levelClass = "bg-amber-50 text-amber-700 border-amber-300";
        if (warningEl) warningEl.classList.add('hidden');
    } else {
        if (warningEl) warningEl.classList.add('hidden');
    }

    if (levelEl) {
        levelEl.innerText = levelText;
        levelEl.className = `text-base font-black tracking-tight mt-1 ${score > 23 ? 'text-red-700' : score > 15 ? 'text-amber-700' : 'text-emerald-700'}`;
    }
    if (cardEl) {
        cardEl.className = `mt-6 p-5 rounded-2xl border-2 text-center transition-all duration-300 shadow-sm ${levelClass}`;
    }

    return { score, level: levelText };
}

// ============================================================
// PUNTOS DE CONTROL Y RUTOGRAMA
// ============================================================
function addControlPoint() {
    const container = document.getElementById('puntosControlContainer');
    if (!container) return;
    const index = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "p-3 bg-white rounded-xl flex items-center gap-3 border-2 border-slate-300 shadow-sm transition-all";
    div.innerHTML = `
        <span class="font-black text-slate-900 w-6 text-center index-number">${index}</span>
        <input type="text" name="pc_lugar[]" list="divipolaList" placeholder="Lugar, peaje o punto DIVIPOLA" class="input-moderno flex-1 text-xs">
        <input type="time" name="pc_hora[]" class="input-moderno !w-auto !px-2 text-xs">
        <button type="button" onclick="removeControlPoint(this)" class="text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    `;
    container.appendChild(div);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function removeControlPoint(btn) {
    const row = btn.closest('div');
    const container = document.getElementById('puntosControlContainer');
    if (container && row) {
        row.remove();
        Array.from(container.children).forEach((child, idx) => {
            const num = child.querySelector('.index-number');
            if (num) num.innerText = idx + 1;
        });
    }
}

function previewRutograma(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgEl = document.getElementById('rutogramaImg');
            if (imgEl) imgEl.src = e.target.result;
            document.getElementById('rutogramaPreview')?.classList.remove('hidden');
            document.querySelector('label[for="rutogramaFile"]')?.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function removeRutograma() {
    const f = document.getElementById('rutogramaFile');
    if (f) f.value = "";
    const img = document.getElementById('rutogramaImg');
    if (img) img.src = "";
    document.getElementById('rutogramaPreview')?.classList.add('hidden');
    document.querySelector('label[for="rutogramaFile"]')?.classList.remove('hidden');
}

// ============================================================
// CANVAS DE FIRMAS DIGITALES
// ============================================================
function resizeCanvas(id) {
    const c = document.getElementById(id);
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
        // Guardar dibujo previo si existe
        const isSigned = c.getAttribute('data-signed') === 'true';
        let prevData = null;
        if (isSigned) {
            try { prevData = c.toDataURL(); } catch (e) { }
        }
        c.width = r.width;
        c.height = r.height;
        if (prevData) {
            const img = new Image();
            img.onload = () => c.getContext('2d').drawImage(img, 0, 0);
            img.src = prevData;
        }
    }
}

function setupCanvas(id) {
    const c = document.getElementById(id);
    if (!c || c.getAttribute('data-setup') === 'true') return;
    c.setAttribute('data-setup', 'true');

    const ctx = c.getContext('2d');
    let drawing = false;

    const startDrawing = (e) => {
        drawing = true;
        draw(e);
    };

    const stopDrawing = () => {
        if (drawing) {
            drawing = false;
            ctx.beginPath();
            c.setAttribute('data-signed', 'true');

            // Actualizar fecha de firma
            const nowStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            if (id === 'signatureCanvasConductor') {
                const f1 = document.getElementById('firma1Fecha');
                if (f1) f1.innerText = `Firmado hoy ${nowStr}`;
                updateNavigation(currentStep);
            } else if (id === 'signatureCanvasGerencia') {
                const f3 = document.getElementById('firma3Fecha');
                if (f3) f3.innerText = `Firmado hoy ${nowStr}`;
            } else if (id === 'signatureCanvasHSE_Modal') {
                const btn = document.getElementById('btnHSEAuth');
                if (btn) btn.disabled = false;
            }
        }
    };

    const draw = (e) => {
        if (!drawing) return;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = "#0F172A";
        e.preventDefault();
        const r = c.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = clientX - r.left;
        const y = clientY - r.top;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    c.addEventListener('mousedown', startDrawing);
    c.addEventListener('mouseup', stopDrawing);
    c.addEventListener('mouseout', stopDrawing);
    c.addEventListener('mousemove', draw);

    c.addEventListener('touchstart', startDrawing, { passive: false });
    c.addEventListener('touchend', stopDrawing, { passive: false });
    c.addEventListener('touchcancel', stopDrawing, { passive: false });
    c.addEventListener('touchmove', draw, { passive: false });
}

function clearSignature(id) {
    const c = document.getElementById(id);
    if (c) {
        c.getContext('2d').clearRect(0, 0, c.width, c.height);
        c.removeAttribute('data-signed');
        if (id === 'signatureCanvasConductor') {
            const f1 = document.getElementById('firma1Fecha');
            if (f1) f1.innerText = 'Pendiente';
        }
    }
    if (currentStep === totalSteps - 1) updateNavigation(currentStep);
}

// ============================================================
// ENVÍO, GUARDADO Y AUTORIZACIÓN (100% POSTGRESQL / RAILWAY)
// ============================================================
async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const getVal = (id) => (document.getElementById(id)?.value || '').trim();
    const getCheck = (id) => document.getElementById(id)?.checked || false;
    const getNum = (id) => {
        const v = document.getElementById(id)?.value;
        return (v === '' || v == null) ? null : parseFloat(v);
    };
    const riskData = updateRisk();

    const checkSig = (id) => {
        const el = document.getElementById(id);
        return el ? el.getAttribute('data-signed') === 'true' : false;
    };

    // Validar firma del conductor en viajes nuevos
    if (!currentTripId && !checkSig('signatureCanvasConductor')) {
        TS.toastWarning("La firma digital del conductor es obligatoria para despachar el viaje.");
        return;
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.innerHTML = 'Guardando en Railway... <i class="animate-spin w-4 h-4 ml-2 inline-block" data-lucide="loader-2"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    const signaturesObj = {};
    if (checkSig('signatureCanvasConductor')) {
        signaturesObj.conductor = document.getElementById('signatureCanvasConductor').toDataURL();
        signaturesObj.conductor_fecha = new Date().toISOString();
    }
    if (checkSig('signatureCanvasGerencia')) {
        signaturesObj.gerencia = document.getElementById('signatureCanvasGerencia').toDataURL();
        signaturesObj.gerencia_fecha = new Date().toISOString();
    }

    const formData = {
        id: currentTripId || undefined,
        conductorId: currentConductor?.id || null,
        conductorNombre: getVal('cNombre'),
        conductorDocumento: getVal('cLicencia'),
        conductorLicencia: getVal('cLicencia'),
        conductorCategoria: getVal('cCat'),
        conductorVencimiento: getVal('cVence') || null,
        conductorTelefono: getVal('cTelefono'),
        placa: getVal('vPlaca'),
        vehiculoTipo: getVal('vTipo'),
        vehiculoModelo: getVal('vModelo'),
        vehiculoColor: getVal('vColor'),
        vehiculoEmpresa: getVal('vEmpresa'),
        origen: getVal('origen'),
        origenDivipola: getVal('origenDivipola') || (getVal('origen').match(/^(\d{5})/) ? getVal('origen').match(/^(\d{5})/)[1] : null),
        destino: getVal('destino'),
        destinoDivipola: getVal('destinoDivipola') || (getVal('destino').match(/^(\d{5})/) ? getVal('destino').match(/^(\d{5})/)[1] : null),
        fechaSalida: getVal('fecha'),
        horaSalida: getVal('horaSalida'),
        distanciaKm: getNum('distanciaEstimada'),
        kmSalida: getNum('kmSalida'),
        kmLlegada: getNum('kmLlegada'),
        gpsSalida: gpsData.salida,
        gpsLlegada: gpsData.llegada,
        medio: document.querySelector('input[name="medio"]:checked')?.value || 'Celular',
        rutograma: document.getElementById('rutogramaImg')?.getAttribute('src') || null,
        puntosControl: Array.from(document.querySelectorAll('#puntosControlContainer > div')).map(row => ({
            lugar: row.querySelector('input[name="pc_lugar[]"]')?.value || '',
            hora: row.querySelector('input[name="pc_hora[]"]')?.value || ''
        })).filter(p => p.lugar !== ''),
        previaje: {
            riesgos: getCheck('cp_riesgos'),
            personal: getCheck('cp_personal'),
            inspeccion: getCheck('cp_inspeccion'),
            cinturon: getCheck('cp_cinturon')
        },
        fatiga: {
            sustancias: getCheck('tf_sustancias'),
            descanso: getCheck('tf_descanso'),
            condiciones: getCheck('tf_condiciones'),
            celular: getCheck('tf_celular'),
            alcoholimetria: getVal('alcoholimetriaValor') || null
        },
        control: {
            dias: document.querySelector('input[name="diasTrabajados"]:checked')?.value || 'dia1',
            fechaRHA: getVal('fechaRHA')
        },
        riskScore: riskData.score,
        riskLevel: riskData.level,
        riskInputs: {
            rDistancia: parseInt(document.querySelector('input[name="rDistancia"]:checked')?.value) || 1,
            rClima: parseInt(document.querySelector('input[name="rClima"]:checked')?.value) || 2,
            rVehiculos: parseInt(document.querySelector('input[name="rVehiculos"]:checked')?.value) || 1,
            rVia: parseInt(document.querySelector('input[name="rVia"]:checked')?.value) || 1,
            rCom: parseInt(document.querySelector('input[name="rCom"]:checked')?.value) || 0,
            rFatiga: parseInt(document.querySelector('input[name="rFatiga"]:checked')?.value) || 1,
            rHora: parseInt(document.querySelector('input[name="rHora"]:checked')?.value) || 1
        },
        signatures: signaturesObj
    };

    // Determinar estado según progreso y riesgo
    if (formData.kmLlegada && parseFloat(formData.kmLlegada) > 0) {
        formData.estado = "Finalizado";
    } else if (riskData.score > 15) {
        formData.estado = "Pendiente HSE";
    } else {
        formData.estado = "Autorizado";
    }

    try {
        const savedTrip = await db.saveTrip(formData);
        const tripId = savedTrip.id || savedTrip.viaje?.id;

        if (!tripId) {
            throw new Error("No se recibió el identificador del viaje guardado.");
        }

        currentTripId = tripId;
        TS.toastSuccess(`Viaje ${formData.origen} → ${formData.destino} registrado con éxito en Railway.`);

        // Alerta de Alto Riesgo / Nocturno
        if (savedTrip.alerta?.requiereAlerta && savedTrip.alerta?.whatsappUrl) {
            setTimeout(() => {
                if (confirm(`🚨 ALERTA PESV: ${savedTrip.alerta.titulo}\n\n¿Deseas enviar el reporte formal de despacho a Gerencia y HSEQ vía WhatsApp ahora?`)) {
                    window.open(savedTrip.alerta.whatsappUrl, '_blank');
                }
            }, 500);
        }

        // Si el riesgo es Medio o Alto y es un viaje nuevo, abrir modal de autorización HSE
        if (riskData.score > 15 && !formData.kmLlegada) {
            openHSEModal();
        } else {
            // Riesgo bajo o viaje finalizado: generar PDF automáticamente
            try {
                await generatePDF({ ...formData, id: tripId });
            } catch (pdfErr) {
                console.warn("Aviso generando PDF:", pdfErr);
            }
            resetFormAndExit();
        }
    } catch (error) {
        console.error("Error al guardar viaje:", error);
        TS.toastError("Error al guardar el viaje: " + error.message);
    } finally {
        if (nextBtn) {
            nextBtn.disabled = false;
            updateNavigation(currentStep);
        }
    }
}

// ============================================================
// MODAL AUTORIZACIÓN HSE & GERENCIA CON PIN
// ============================================================
function openHSEModal() {
    const modal = document.getElementById('hseSignModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        setupCanvas('signatureCanvasHSE_Modal');
        setTimeout(() => resizeCanvas('signatureCanvasHSE_Modal'), 100);
    }
}

window.closeHSEModal = function() {
    const modal = document.getElementById('hseSignModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

window.submitHSEAuth = function() {
    const canvasModal = document.getElementById('signatureCanvasHSE_Modal');
    if (canvasModal?.getAttribute('data-signed') !== 'true') {
        TS.toastWarning("Por favor estampe la firma del profesional HSEQ.");
        return;
    }
    openPinAuthModal(async () => {
        await executeHSEAuth();
    });
};

async function executeHSEAuth() {
    if (!currentTripId) return;
    try {
        const hseSig = document.getElementById('signatureCanvasHSE_Modal').toDataURL();
        const trip = await getViajeById(currentTripId);
        const existingSignatures = trip?.signatures || {};

        const updated = await updateViaje(currentTripId, {
            estado: "Autorizado",
            signatures: {
                ...existingSignatures,
                hse: hseSig,
                hse_fecha: new Date().toISOString()
            }
        });

        closeHSEModal();
        TS.toastSuccess("¡Viaje autorizado por HSEQ exitosamente!");
        
        // Generar PDF oficial firmado
        try {
            await generatePDF(updated);
        } catch (e) { }

        resetFormAndExit();
    } catch (e) {
        console.error("Error en autorización HSE:", e);
        TS.toastError("Error en autorización: " + e.message);
    }
}

// ============================================================
// PIN INSTITUCIONAL
// ============================================================
function openPinAuthModal(callback) {
    pinAuthCallback = callback;
    const modal = document.getElementById('pinAuthModal');
    const input = document.getElementById('pinAuthInput');
    const err = document.getElementById('pinAuthError');
    if (modal) modal.classList.remove('hidden');
    if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
    }
    if (err) err.classList.add('hidden');
}

window.closePinAuthModal = function() {
    document.getElementById('pinAuthModal')?.classList.add('hidden');
    pinAuthCallback = null;
};

window.submitPinAuth = async function() {
    const input = document.getElementById('pinAuthInput');
    const err = document.getElementById('pinAuthError');
    const pin = input?.value?.trim();

    const valid = await verifyPinAdmin(pin);
    if (!valid) {
        if (err) err.classList.remove('hidden');
        return;
    }

    closePinAuthModal();
    if (pinAuthCallback) {
        const cb = pinAuthCallback;
        pinAuthCallback = null;
        await cb();
    }
};

// ============================================================
// REINICIAR FORMULARIO
// ============================================================
function resetFormAndExit() {
    document.getElementById("travelForm")?.reset();
    currentTripId = null;
    currentStep = 0;
    ['signatureCanvasConductor', 'signatureCanvasGerencia', 'signatureCanvasHSE_Modal'].forEach(clearSignature);
    showStep(0);
    updateRisk();
}

// ============================================================
// HISTORIAL DE VIAJES (100% POSTGRESQL / RAILWAY)
// ============================================================
window.toggleHistory = async function() {
    const modal = document.getElementById('historyModal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        await loadHistory();
    } else {
        modal.classList.add('hidden');
    }
};

async function loadHistory() {
    const list = document.getElementById('historyList');
    if (list) list.innerHTML = `<div class="text-center py-8 text-blue-600 font-bold"><i class="animate-spin w-6 h-6 mx-auto mb-2" data-lucide="loader-2"></i> Cargando viajes desde Railway...</div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        currentHistoryData = await getViajes();
        historyDataMap = currentHistoryData.reduce((acc, curr) => { acc[curr.id] = curr; return acc; }, {});
        renderHistoryList();
    } catch (e) {
        console.error("Error cargando historial:", e);
        if (list) list.innerHTML = `<div class="text-center py-8 text-red-500 font-bold">Error al consultar viajes de Railway.</div>`;
    }
}

function renderHistoryList() {
    const list = document.getElementById('historyList');
    if (!list) return;

    if (currentHistoryData.length === 0) {
        list.innerHTML = `<div class="p-8 text-center text-slate-500 font-bold">No hay viajes registrados aún en la base de datos.</div>`;
        return;
    }

    list.innerHTML = currentHistoryData.map(t => {
        const isFinal = t.estado === 'Finalizado' || (t.km_llegada && parseFloat(t.km_llegada) > 0);
        return `
        <div class="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
            <div onclick="editTrip('${t.id}')" class="cursor-pointer flex-1">
                <p class="font-black text-slate-900 text-sm">${t.origen || 'Origen'} → ${t.destino || 'Destino'}</p>
                <p class="text-xs text-slate-500 font-medium">Placa: <strong class="text-slate-800">${t.vehiculo_placa || 'N/A'}</strong> · ${t.conductor_nombre || 'Conductor'}</p>
                <span class="inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-black ${isFinal ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${t.estado || 'En curso'}</span>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="exportTripPDF('${t.id}')" class="p-2 text-red-600 hover:bg-red-50 rounded-xl" title="Descargar PDF STE-F-010">
                    <i data-lucide="file-text" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.filterHistorySearch = function() {
    const q = (document.getElementById('historySearch')?.value || '').toLowerCase().trim();
    if (!q) {
        currentHistoryData = Object.values(historyDataMap);
    } else {
        currentHistoryData = Object.values(historyDataMap).filter(t => 
            (t.origen || '').toLowerCase().includes(q) ||
            (t.destino || '').toLowerCase().includes(q) ||
            (t.vehiculo_placa || '').toLowerCase().includes(q) ||
            (t.conductor_nombre || '').toLowerCase().includes(q)
        );
    }
    renderHistoryList();
};

window.editTrip = async function(id) {
    toggleHistory();
    try {
        const trip = await getViajeById(id);
        if (!trip) return TS.toastError("Viaje no encontrado en Railway.");

        currentTripId = id;
        const setVal = (fid, val) => { if (document.getElementById(fid)) document.getElementById(fid).value = val ?? ''; };

        setVal('fecha', trip.fecha_salida ? trip.fecha_salida.split('T')[0] : '');
        setVal('horaSalida', trip.hora_salida);
        setVal('origen', trip.origen);
        setVal('origenDivipola', trip.origen_divipola);
        setVal('destino', trip.destino);
        setVal('destinoDivipola', trip.destino_divipola);
        setVal('kmSalida', trip.km_salida);
        setVal('kmLlegada', trip.km_llegada);
        setVal('vPlaca', trip.vehiculo_placa);
        setVal('vModelo', trip.vehiculo_modelo);
        setVal('vColor', trip.vehiculo_color);
        setVal('vTipo', trip.vehiculo_tipo);
        setVal('vEmpresa', trip.vehiculo_empresa);
        setVal('cNombre', trip.conductor_nombre);
        setVal('cLicencia', trip.conductor_licencia);
        setVal('cCat', trip.conductor_categoria);
        setVal('cVence', trip.conductor_vencimiento);
        setVal('cTelefono', trip.conductor_telefono);

        showStep(0);
        updateRisk();
        TS.toastInfo(`Viaje ${trip.origen} cargado para edición o cierre de odómetro.`);
    } catch (e) {
        console.error("Error al cargar viaje:", e);
        TS.toastError("Error al cargar viaje: " + e.message);
    }
};

window.exportTripPDF = async function(id) {
    try {
        const trip = await getViajeById(id);
        if (trip) {
            await generatePDF(trip);
        } else {
            TS.toastError("No se encontró el viaje.");
        }
    } catch (e) {
        console.error("Error generando PDF:", e);
        TS.toastError("Error al generar PDF: " + e.message);
    }
};

window.exportHistoryExcel = function() {
    if (!currentHistoryData || currentHistoryData.length === 0) {
        TS.toastWarning("No hay datos en el historial para exportar.");
        return;
    }
    const rows = currentHistoryData.map(t => ({
        Fecha: t.fecha_salida ? t.fecha_salida.split('T')[0] : '',
        Hora_Salida: t.hora_salida || '',
        Origen: t.origen || '',
        DIVIPOLA_Origen: t.origen_divipola || '',
        Destino: t.destino || '',
        DIVIPOLA_Destino: t.destino_divipola || '',
        Placa: t.vehiculo_placa || '',
        Conductor: t.conductor_nombre || '',
        Licencia: t.conductor_licencia || '',
        KM_Salida: t.km_salida || 0,
        KM_Llegada: t.km_llegada || 0,
        Riesgo: t.risk_level || 'BAJO',
        Estado: t.estado || 'Registrado'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Viajes_PESV");
    XLSX.writeFile(wb, `Gerenciamiento_Viajes_STE-F-010_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ============================================================
// REPORTES & PERFIL DE USUARIO
// ============================================================

window.openUserPanel = async function() {
    const modal = document.getElementById('userPanel');
    const content = document.getElementById('userPanelContent');
    if (!modal || !content) return;
    modal.classList.remove('hidden');

    const prof = await getCurrentProfile();
    const user = await getCurrentUser();

    content.innerHTML = `
        <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <p class="font-black text-slate-900 text-sm">${prof?.nombre || 'Usuario Conductor'}</p>
            <p class="text-xs text-slate-500 font-medium">${user?.email || 'portal@transservices.com'}</p>
            <span class="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                Rol: ${prof?.rol?.toUpperCase() || 'CONDUCTOR'}
            </span>
        </div>
        <button type="button" onclick="signOut()" class="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl border border-red-200 hover:bg-red-100 transition-colors text-xs flex items-center justify-center gap-1">
            <i data-lucide="log-out" class="w-4 h-4"></i> Cerrar Sesión
        </button>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeUserPanel = function() {
    document.getElementById('userPanel')?.classList.add('hidden');
};

window.openReportsPanel = async function() {
    const modal = document.getElementById('reportsModal');
    if (modal) modal.classList.remove('hidden');
    await loadReport('all');
};

window.closeReportsPanel = function() {
    document.getElementById('reportsModal')?.classList.add('hidden');
};

window.loadReport = async function(period) {
    const content = document.getElementById('reportsContent');
    if (!content) return;

    content.innerHTML = `<div class="text-center py-8 text-blue-600"><i class="animate-spin w-6 h-6 mx-auto mb-2" data-lucide="loader-2"></i> Calculando métricas...</div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const trips = await getViajes();
    const total = trips.length;
    const finalizados = trips.filter(t => t.estado === 'Finalizado' || t.km_llegada).length;
    const enCurso = total - finalizados;

    content.innerHTML = `
        <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-center">
                <p class="text-[10px] font-bold text-blue-700 uppercase">Total Viajes</p>
                <p class="text-2xl font-black text-blue-900">${total}</p>
            </div>
            <div class="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <p class="text-[10px] font-bold text-emerald-700 uppercase">Finalizados</p>
                <p class="text-2xl font-black text-emerald-900">${finalizados}</p>
            </div>
            <div class="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                <p class="text-[10px] font-bold text-amber-700 uppercase">En Ruta</p>
                <p class="text-2xl font-black text-amber-900">${enCurso}</p>
            </div>
        </div>
        <p class="text-xs text-slate-500 font-bold text-center">Conectado a PostgreSQL en Railway (Prisma)</p>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.openEmergencyPanel = function() {
    document.getElementById('emergencyModal')?.classList.remove('hidden');
};

window.closeEmergencyPanel = function() {
    document.getElementById('emergencyModal')?.classList.add('hidden');
};

// Exportar funciones globales
window.showStep = showStep;
window.nextPrev = nextPrev;
window.calcKm = calcKm;
window.updateRisk = updateRisk;
window.previewRutograma = previewRutograma;
window.removeRutograma = removeRutograma;
window.addControlPoint = addControlPoint;
window.removeControlPoint = removeControlPoint;
window.clearSignature = clearSignature;
window.resizeCanvas = resizeCanvas;
window.setupCanvas = setupCanvas;
window.handleSubmit = handleSubmit;
window.signOut = signOut;