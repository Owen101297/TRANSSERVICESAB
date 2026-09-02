// --- CLIENTE SUPABASE ROBUSTO ---
import {
    supabase,
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
    verifyPinAdmin
} from './supabase-client.js';
import { generatePDF } from './pdf-generator.js';

// Variables globales
let currentUser = null;
let currentProfile = null;
let currentConductor = null;
let skipGerenciaSignature = false;

// Wrapper db para compatibilidad con el resto del código
let db = {
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

// Auth wrapper
const auth = {
    currentUser: null,
    onAuthStateChanged: (callback) => {
        supabase.auth.onAuthStateChange((event, session) => {
            currentUser = session?.user || null;
            callback(currentUser);
        });
    },
    signOut: async () => {
        await signOut();
    }
};

// Firmas base64 de ejemplo (para PDFs)
const FIRMA_HSE_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABACAYAAABidp8zAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAoKADAAQAAAABAAAAQAAAAAClvYvKAAAC9UlEQVR4Ae3XvUoDQRSG4TMTIyZGE8VYEAsRKy0Vf9BeS8X30Uq000p7C7G0U7S0VFC0SBCSGBMTE8XEn88sLITshmSXTfKeB5Z9Z77ZfS87O7Mh8SFAgMBNArfXfI8vCRAg8CVAAX0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArswvAEnX90UvjU8EAAAAABJRU5ErkJggg==";
const FIRMA_GERENCIA_DATA = FIRMA_HSE_DATA;

// --- CONSTANTES GLOBALES ---
// const FIRMA_HSE_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABACAYAAABidp8zAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAoKADAAQAAAABAAAAQAAAAAClvYvKAAAC9UlEQVR4Ae3XvUoDQRSG4TMTIyZGE8VYEAsRKy0Vf9BeS8X30Uq000p7C7G0U7S0VFC0SBCSGBMTE8XEn88sLITshmSXTfKeB5Z9Z77ZfS87O7Mh8SFAgMBNArfXfI8vCRAg8CVAAX0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArsEFHAXny8RIEBANyBAgMAuAQXcxedLBAgQ0A0IECCwS0ABd/H5EgECBHQDAgQI7BJQwF18vkSAAAHdgAABArswvAEnX90UvjU8EAAAAABJRU5ErkJggg==";
// const FIRMA_GERENCIA_DATA = FIRMA_HSE_DATA;

// --- ESTADO DE LA APLICACIÓN ---
let currentStep = 0;
let isAnimating = false;
let currentTripId = null; 
let historyDataMap = {}; 
let historyUnsubscribe = null; 
let currentHistoryData = []; 
let gpsData = { salida: null, llegada: null };
let hseModalActive = false;
const steps = document.getElementsByClassName("form-step");
const totalSteps = steps.length;

// --- NAVEGACIÓN PRINCIPAL ---
function showStep(n) {
    for (let i = 0; i < totalSteps; i++) { steps[i].style.display = "none"; }
    steps[n].style.display = "block";
    steps[n].classList.add('animate-enter');
    
    updateNavigation(n);
    updateProgressBar(n);
    window.scrollTo(0, 0);

    if (n === totalSteps - 1) {
        setTimeout(() => {
             ['signatureCanvasConductor', 'signatureCanvasHSE_Modal', 'signatureCanvasGerencia'].forEach(id => {
                 if(document.getElementById(id)) resizeCanvas(id);
             });
        }, 100);
    }
}

async function nextPrev(n) {
    if (isAnimating) return;

    if (n > 0) {
        if (currentStep === 0) {
            const sal = parseFloat(document.getElementById('kmSalida')?.value) || 0;
            const lleg = parseFloat(document.getElementById('kmLlegada')?.value) || 0;
            if (lleg > 0) {
                if (lleg < sal) return TS.toastWarning("El kilometraje de llegada no puede ser menor al de salida.");
                if (currentTripId) {
                    document.getElementById("travelForm").dispatchEvent(new Event('submit'));
                    return;
                }
            }
        }
    }

    if (currentStep === totalSteps - 1 && n > 0) {
        document.getElementById("travelForm").dispatchEvent(new Event('submit'));
        return;
    }

    const nxt = currentStep + n;
    if (nxt >= 0 && nxt < totalSteps) {
        isAnimating = true;
        const currentEl = steps[currentStep];
        const nextEl = steps[nxt];

        currentEl.classList.remove('animate-enter');
        currentEl.classList.add('animate-exit');
        await new Promise(resolve => setTimeout(resolve, 280)); 
        currentEl.style.display = "none";
        currentEl.classList.remove('animate-exit');

        currentStep = nxt;
        nextEl.style.display = "block";
        nextEl.classList.add('animate-enter');
        
        updateNavigation(currentStep);
        updateProgressBar(currentStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        isAnimating = false;
    }
}

function updateNavigation(n) {
    const nextBtn = document.getElementById("nextBtn");
    const prevBtn = document.getElementById("prevBtn");
    if (!nextBtn || !prevBtn) return;
    
    prevBtn.style.display = n === 0 ? "none" : "flex";
    nextBtn.classList.remove('!bg-emerald-600'); 

    if (n === totalSteps - 1) {
        const condSig = document.getElementById('signatureCanvasConductor');
        const isSigned = condSig ? condSig.getAttribute('data-signed') === 'true' : false;
        const rsk = updateRisk();
        nextBtn.innerHTML = isSigned ? (rsk.score > 15 ? 'Guardar y Proceder a Firma HSE <i class="ml-2" data-lucide="shield-check"></i>' : 'Registrar Viaje <i class="ml-2" data-lucide="save"></i>') : 'Firma Requerida <i class="ml-2" data-lucide="pen-tool"></i>';
    } 
    else if (n === 0 && currentTripId && parseFloat(document.getElementById('kmLlegada')?.value) > 0) {
        nextBtn.innerHTML = 'Finalizar y Cerrar Viaje <i class="ml-2" data-lucide="check-circle"></i>';
        nextBtn.classList.add('!bg-emerald-600');
    } 
    else {
        nextBtn.innerHTML = 'Siguiente <i class="ml-2" data-lucide="arrow-right"></i>';
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateProgressBar(n) {
    const progress = ((n + 1) / totalSteps) * 100;
    if(document.getElementById("progressBar")) document.getElementById("progressBar").style.width = progress + "%";
    if(document.getElementById("progressText")) document.getElementById("progressText").innerText = `Paso ${n + 1} de ${totalSteps}`;
    if(document.getElementById("progressPercent")) document.getElementById("progressPercent").innerText = Math.round(progress);
}

// --- GPS Y CÁLCULOS ---
function getGPS(type) {
    if (!navigator.geolocation) return;
    const statusEl = document.getElementById(type === 'salida' ? 'gpsSalidaStatus' : 'gpsLlegadaStatus');
    if(statusEl) statusEl.innerHTML = '<span class="flex items-center gap-1"><i class="w-3 h-3 animate-spin" data-lucide="loader-2"></i> Obteniendo ubicación...</span>';
    if(typeof lucide !== 'undefined') lucide.createIcons();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const coords = `${position.coords.latitude},${position.coords.longitude}`;
            gpsData[type] = coords;
            if(statusEl) statusEl.innerHTML = `<span class="text-emerald-600 flex items-center gap-1"><i class="w-3 h-3" data-lucide="map-pin"></i> Ubicación ${type === 'salida' ? 'Inicio' : 'Fin'} OK</span>`;
            if(typeof lucide !== 'undefined') lucide.createIcons();
        },
        (error) => {
            if(statusEl) statusEl.innerHTML = '<span class="text-red-500 flex items-center gap-1"><i class="w-3 h-3" data-lucide="alert-circle"></i> Error GPS</span>';
            if(typeof lucide !== 'undefined') lucide.createIcons();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function getGPSAsync(type, timeoutMs = 8000) {
    return new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = `${position.coords.latitude},${position.coords.longitude}`;
                gpsData[type] = coords;
                resolve(coords);
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
        );
    });
}

function calcKm() {
    const salida = parseFloat(document.getElementById('kmSalida')?.value) || 0;
    const llegada = parseFloat(document.getElementById('kmLlegada')?.value) || 0;
    if (llegada > salida && document.getElementById('distanciaEstimada')) {
        document.getElementById('distanciaEstimada').value = llegada - salida;
    } else if (document.getElementById('distanciaEstimada')) {
        document.getElementById('distanciaEstimada').value = '';
    }
    
    // Auto-hora de llegada cuando se ingresa KM final
    if (llegada > salida) {
        const horaLlegadaInput = document.getElementById('horaLlegada');
        if (horaLlegadaInput && !horaLlegadaInput.value) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            horaLlegadaInput.value = `${hours}:${minutes}`;
        }
    }
    
    updateNavigation(currentStep);
}

// --- SEMÁFORO DE RIESGO ---
function updateRisk() {
    const val = (name) => {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? parseInt(el.value) : 0;
    };
    const score = val('rDistancia') + val('rClima') + val('rVehiculos') + val('rVia') + val('rCom') + val('rFatiga') + val('rHora');
    
    const pointsEl = document.getElementById('totalPoints');
    const levelEl = document.getElementById('riskLevel');
    const cardEl = document.getElementById('riskScoreCard');

    if(pointsEl) pointsEl.innerText = score;
    
    let levelText = "BAJO";
    let levelClass = "risk-low";

    if (score > 23) {
        levelText = "ALTO";
        levelClass = "risk-high";
    } else if (score > 15) {
        levelText = "MEDIO";
        levelClass = "risk-medium";
    }
    
    if(levelEl) levelEl.innerText = `RIESGO ${levelText}`;
    if(cardEl) {
        cardEl.classList.remove('risk-low', 'risk-medium', 'risk-high', 'bg-white');
        cardEl.classList.add(levelClass);
    }
    
    checkSignatures(score);
    return { score, level: `RIESGO ${levelText}` };
}

function checkSignatures(currentScore) {
    const gerenciaContainer = document.getElementById('containerFirmaGerencia');
    const score = currentScore !== undefined ? currentScore : (parseInt(document.getElementById('totalPoints')?.innerText) || 0);

    if (gerenciaContainer) {
        // Solo mostrar firma de Gerencia si:
        // 1. El riesgo es ALTO (>23) Y
        // 2. El viaje YA existe (currentTripId !== null) — es decir, estamos editando/aprobando
        // 3. El viaje NO está ya autorizado (skipGerenciaSignature === false)
        if (score > 23 && currentTripId && !skipGerenciaSignature) {
            gerenciaContainer.classList.remove('hidden');
        } else {
            gerenciaContainer.classList.add('hidden');
        }
    }
}

// --- RUTOGRAMA ---
function previewRutograma(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const maxSize = 1200;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                let quality = 0.7;
                let compressed = canvas.toDataURL('image/jpeg', quality);
                while (compressed.length > 900000 && quality > 0.1) {
                    quality -= 0.1;
                    compressed = canvas.toDataURL('image/jpeg', quality);
                }
                
                document.getElementById('rutogramaImg').src = compressed;
                document.getElementById('rutogramaPreview').classList.remove('hidden');
                document.querySelector('label[for="rutogramaFile"]').classList.add('hidden');
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

function removeRutograma() {
    document.getElementById('rutogramaFile').value = "";
    document.getElementById('rutogramaImg').src = "";
    document.getElementById('rutogramaPreview').classList.add('hidden');
    document.querySelector('label[for="rutogramaFile"]').classList.remove('hidden');
}

// --- AUTOCOMPLETADO Y PUNTOS DE CONTROL ---
async function searchVehicle() {
    const placaInput = document.getElementById('vPlaca');
    if(!placaInput) return;
    const placa = placaInput.value.trim().toUpperCase();
    placaInput.value = placa; 
    if (placa.length < 3) return;

    try {
        placaInput.classList.add('opacity-50', 'cursor-wait');
        const trips = await db.getTripsByPlaca(placa);

        if (trips.length > 0) {
            const data = trips[0];
            if (data.vModelo) document.getElementById('vModelo').value = data.vModelo;
            if (data.vColor) document.getElementById('vColor').value = data.vColor;
            if (data.vTipo) document.getElementById('vTipo').value = data.vTipo;
            if (data.vEmpresa) document.getElementById('vEmpresa').value = data.vEmpresa;
        }
    } catch (err) {
        console.log("No se encontraron datos", err);
    } finally {
        placaInput.classList.remove('opacity-50', 'cursor-wait');
    }
}

function addControlPoint() {
    const container = document.getElementById('puntosControlContainer');
    if(!container) return;
    const index = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "p-3 bg-[#F5F7FA] dark:bg-slate-800 rounded-2xl flex items-center gap-3 border border-transparent focus-within:border-blue-200 transition-all group";
    div.innerHTML = `
        <span class="font-semibold text-gray-500 w-6 text-center index-number">${index}</span>
        <input type="text" name="pc_lugar[]" list="ciudades" placeholder="Lugar o peaje" class="input flex-1">
        <input type="time" name="pc_hora[]" class="input !w-auto !px-2">
        <button type="button" onclick="removeControlPoint(this)" class="text-red-500 hover:bg-red-50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
    `;
    container.appendChild(div);
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function removeControlPoint(btn) {
    const row = btn.closest('div');
    const container = document.getElementById('puntosControlContainer');
    if (container && container.children.length > 0) {
        row.remove();
        Array.from(container.children).forEach((child, idx) => {
            child.querySelector('.index-number').innerText = idx + 1;
        });
    }
}

// --- SUBMIT Y GUARDADO ---
async function handleSubmit(e) {
    e.preventDefault();

    // Asegurar que currentConductor esté cargado antes de guardar
    if (!currentConductor?.id) {
        console.warn('currentConductor no cargado. Intentando cargar...');
        await initAuth();
        if (!currentConductor?.id) {
            TS.toastError("No se pudo cargar la información del conductor. Por favor recarga la página e intenta de nuevo. Si el problema persiste, verifica que tu registro se completó correctamente.");
            return;
        }
    }
    
    console.log('Guardando viaje. Conductor:', currentConductor?.id, 'Email:', currentConductor?.email);

    const getVal = (id) => document.getElementById(id)?.value || '';
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

    if (!currentTripId && !checkSig('signatureCanvasConductor')) {
        TS.toastWarning("La firma del conductor es obligatoria para registrar el viaje.");
        return;
    }

    const formData = {
        id: currentTripId || undefined,
        conductor_id: currentConductor?.id || null,
        fecha: getVal('fecha') || null, hora_salida: getVal('horaSalida') || null, hora_llegada: getVal('horaLlegada') || null,
        origen: getVal('origen'), destino: getVal('destino'), km_salida: getNum('kmSalida'),
        distancia_km: getNum('distanciaEstimada'), km_llegada: getNum('kmLlegada'),
        vehiculo_placa: getVal('vPlaca'), vehiculo_modelo: getVal('vModelo'), vehiculo_color: getVal('vColor'),
        vehiculo_tipo: getVal('vTipo'), vehiculo_empresa: getVal('vEmpresa'), 
        conductor_nombre: getVal('cNombre') || currentProfile?.nombre_completo || '',
        conductor_licencia: getVal('cLicencia').trim(), 
        conductor_categoria: getVal('cCat'), 
        conductor_vencimiento: getVal('cVence') || null, 
        conductor_telefono: getVal('cTelefono'),
        rutograma: document.getElementById('rutogramaImg')?.getAttribute('src') || null,
        risk_score: riskData.score,
        risk_level: riskData.level,
        gps_salida: gpsData.salida,
        gps_llegada: gpsData.llegada,
        medio: document.querySelector('input[name="medio"]:checked')?.value || 'Celular',
        
        puntos_control: Array.from(document.querySelectorAll('#puntosControlContainer > div')).map(row => ({
            l: row.querySelector('input[name="pc_lugar[]"]')?.value || '', 
            h: row.querySelector('input[name="pc_hora[]"]')?.value || ''
        })).filter(p => p.l !== ''),
        previaje: {
            riesgos: getCheck('cp_riesgos'), personal: getCheck('cp_personal'),
            inspeccion: getCheck('cp_inspeccion'), cinturon: getCheck('cp_cinturon')
        },
        fatiga: {
            sustancias: getCheck('tf_sustancias'), descanso: getCheck('tf_descanso'),
            condiciones: getCheck('tf_condiciones'), peligros: getCheck('tf_peligros'), celular: getCheck('tf_celular')
        },
        control: {
            dia1: getCheck('dia1'), dia2: getCheck('dia2'), fechaRHA: getVal('fechaRHA')
        },
        risk_inputs: {
            rDistancia: parseInt(document.querySelector('input[name="rDistancia"]:checked')?.value) || 0,
            rClima: parseInt(document.querySelector('input[name="rClima"]:checked')?.value) || 0,
            rVehiculos: parseInt(document.querySelector('input[name="rVehiculos"]:checked')?.value) || 0,
            rVia: parseInt(document.querySelector('input[name="rVia"]:checked')?.value) || 0,
            rCom: parseInt(document.querySelector('input[name="rCom"]:checked')?.value) || 0,
            rFatiga: parseInt(document.querySelector('input[name="rFatiga"]:checked')?.value) || 0,
            rHora: parseInt(document.querySelector('input[name="rHora"]:checked')?.value) || 0
        },
        created_at: new Date().toISOString()
    };

    // Captura GPS de llegada automáticamente al finalizar el viaje
    if (formData.km_llegada && parseFloat(formData.km_llegada) > 0 && !gpsData.llegada) {
        await getGPSAsync('llegada');
        formData.gps_llegada = gpsData.llegada;
    }

    if (checkSig('signatureCanvasConductor')) {
        formData.signatures = { conductor: document.getElementById('signatureCanvasConductor').toDataURL() };
    }

    // Determinar estado según progreso y nivel de riesgo
    if (formData.km_llegada && parseFloat(formData.km_llegada) > 0) {
        formData.estado = "Finalizado";
    } else if (riskData.score > 15) {
        formData.estado = "Pendiente HSE";
    } else {
        formData.estado = "Pendiente";
    }

    // Guardar risk_score para usarlo después
    const savedRiskScore = riskData.score;
    const savedRiskLevel = riskData.level;

    try {
        const btnSubmit = document.getElementById('nextBtn');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = 'Guardando... <i class="animate-spin w-4 h-4 ml-2" data-lucide="loader-2"></i>';
        lucide.createIcons();

        // Detectar si estamos editando un viaje existente ANTES de guardar
        const isEditing = !!currentTripId;

        const savedTrip = await db.saveTrip(formData);

        if (!savedTrip?.id) {
            throw new Error('No se pudo guardar el viaje');
        }

        currentTripId = savedTrip.id;

        if (isEditing) {
            // Editando viaje existente: solo guardar, no WhatsApp
            const esFinalizado = formData.km_llegada && parseFloat(formData.km_llegada) > 0;
            TS.toastSuccess(esFinalizado ? "Viaje finalizado correctamente" : "Viaje actualizado correctamente");
            resetFormAndExit();
        } else if (savedRiskScore > 15) {
            // MEDIO o ALTO (nuevo viaje): mostrar modal HSE para firma inmediata
            hseModalActive = true;
            const hseModal = document.getElementById('hseSignModal');
            hseModal.classList.remove('hidden');
            hseModal.style.display = 'flex';
            TS.toastSuccess(`Viaje registrado con ${savedRiskLevel}. Por favor, estampe la firma HSE.`);
        } else {
            // BAJO (nuevo viaje): enviar WhatsApp y resetear
            const whatsappMessage = `🚛 *VIAJE INICIADO*\n\n` +
                `📍 Ruta: ${formData.origen} → ${formData.destino}\n` +
                `🚗 Placa: ${formData.vehiculo_placa}\n` +
                `👤 Conductor: ${formData.conductor_nombre}\n` +
                `⏰ Hora Salida: ${formData.hora_salida}\n` +
                `📊 KM Inicial: ${formData.km_salida}\n` +
                `⚠️ Riesgo: ${savedRiskLevel} (${savedRiskScore} pts)`;

            window.open(`https://wa.me/3136332887?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
            TS.toastSuccess(`Viaje registrado con ${savedRiskLevel}. Notificación enviada a HSE.`);
            resetFormAndExit();
        }

    } catch (error) {
        console.error(error);
        TS.toastError("Hubo un problema al guardar: " + error.message);
    } finally {
        const btnSubmit = document.getElementById('nextBtn');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            updateNavigation(currentStep);
        }
    }
}

// --- PIN AUTH (HSE / Gerencia) ---
let pinAuthCallback = null;

function openPinAuthModal(callback) {
    pinAuthCallback = callback;
    const modal = document.getElementById('pinAuthModal');
    const input = document.getElementById('pinAuthInput');
    const errorEl = document.getElementById('pinAuthError');
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
    if (input) {
        input.value = '';
        input.focus();
        // Permitir enviar con Enter
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitPinAuth();
            }
        };
    }
    if (errorEl) errorEl.classList.add('hidden');
}

function closePinAuthModal() {
    const modal = document.getElementById('pinAuthModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    pinAuthCallback = null;
}

async function submitPinAuth() {
    const input = document.getElementById('pinAuthInput');
    const errorEl = document.getElementById('pinAuthError');
    const pin = input?.value?.trim();

    if (!pin) {
        if (errorEl) {
            errorEl.textContent = 'Ingrese el PIN';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    const btn = document.getElementById('btnPinVerify');
    if (btn) {
        btn.textContent = 'Verificando...';
        btn.disabled = true;
    }

    console.log('[PIN] Verificando PIN...');

    try {
        const isValid = await verifyPinAdmin(pin);
        console.log('[PIN] Resultado verifyPinAdmin:', isValid);

        if (isValid) {
            console.log('[PIN] PIN válido.');
            const callback = pinAuthCallback; // Capturar ANTES de cerrar modal
            if (typeof callback === 'function') {
                console.log('[PIN] Ejecutando callback...');
                TS.toastInfo('PIN correcto. Procesando autorización...');
                closePinAuthModal();
                await callback();
                console.log('[PIN] Callback ejecutado correctamente.');
            } else {
                console.warn('[PIN] PIN válido pero callback no es función:', callback);
                TS.toastWarning('PIN válido, pero no hay acción definida.');
                closePinAuthModal();
            }
        } else {
            console.warn('[PIN] PIN incorrecto.');
            if (errorEl) {
                errorEl.textContent = 'PIN incorrecto. Intente nuevamente.';
                errorEl.classList.remove('hidden');
            }
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    } catch (e) {
        console.error('[PIN] Error verificando PIN:', e);
        const msg = 'Error al verificar: ' + (e.message || 'Intente nuevamente.');
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.classList.remove('hidden');
        }
        TS.toastError(msg);
    } finally {
        if (btn) {
            btn.textContent = 'Verificar';
            btn.disabled = false;
        }
    }
}

window.closePinAuthModal = closePinAuthModal;
window.submitPinAuth = submitPinAuth;

// Cerrar modal PIN con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePinAuthModal();
});

// --- AUTORIZACIÓN HSE ---
async function submitHSEAuth() {
    if (!currentTripId) return TS.toastWarning("Error: No hay viaje activo.");
    
    const btnAuth = document.getElementById('btnHSEAuth');
    const canvasModal = document.getElementById('signatureCanvasHSE_Modal');
    
    if (canvasModal.getAttribute('data-signed') !== 'true') {
        return TS.toastWarning("Por favor, estampe la firma antes de autorizar.");
    }

    // Pedir PIN antes de proceder
    openPinAuthModal(async () => {
        await executeHSEAuth();
    });
}

async function executeHSEAuth() {
    const btnAuth = document.getElementById('btnHSEAuth');
    
    try {
        if (btnAuth) {
            btnAuth.disabled = true;
            btnAuth.innerHTML = 'Procesando... <i class="animate-spin" data-lucide="loader-2"></i>';
        }

        // Obtener datos completos del viaje
        const { data: tripData, error: fetchError } = await supabase
            .from('operacion.viajes')
            .select('*')
            .eq('id', currentTripId)
            .single();
        
        if (fetchError) throw fetchError;

        const existingSignatures = tripData?.signatures || {};
        const newSignatures = {
            ...existingSignatures,
            hse: document.getElementById('signatureCanvasHSE_Modal').toDataURL()
        };

        // Determinar siguiente estado según nivel de riesgo
        const isHighRisk = (tripData?.risk_score || 0) > 23;
        const nextEstado = isHighRisk ? "Pendiente Gerencia" : "Autorizado";

        await db.saveTrip({
            id: currentTripId,
            signatures: newSignatures,
            estado: nextEstado
        });

        const vPlaca = document.getElementById('vPlaca')?.value || '';
        
        hseModalActive = false;
        document.getElementById('hseSignModal').classList.add('hidden');
        document.getElementById('hseSignModal').style.display = 'none';
        
        if (isHighRisk) {
            // ALTO: enviar WhatsApp solicitando autorización y resetear
            const whatsappMessage = `🚨 *SOLICITUD DE AUTORIZACIÓN - VIAJE ALTO RIESGO*\n\n` +
                `📍 Ruta: ${tripData.origen} → ${tripData.destino}\n` +
                `🚗 Placa: ${tripData.vehiculo_placa}\n` +
                `👤 Conductor: ${tripData.conductor_nombre}\n` +
                `⏰ Hora Salida: ${tripData.hora_salida}\n` +
                `📊 KM Inicial: ${tripData.km_salida}\n` +
                `⚠️ Riesgo: ${tripData.risk_level} (${tripData.risk_score} pts)\n\n` +
                `⚠️ Este viaje requiere autorización de Gerencia antes de iniciar.`;

            window.open(`https://wa.me/3136332887?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
            TS.toastSuccess(`Viaje autorizado por HSE. Solicitud enviada a Gerencia para riesgo ${tripData.risk_level}.`);
            resetFormAndExit();

        } else {
            // MEDIO: enviar WhatsApp de inicio de viaje y resetear
            const whatsappMessage = `🚛 *VIAJE INICIADO*\n\n` +
                `📍 Ruta: ${tripData.origen} → ${tripData.destino}\n` +
                `🚗 Placa: ${tripData.vehiculo_placa}\n` +
                `👤 Conductor: ${tripData.conductor_nombre}\n` +
                `⏰ Hora Salida: ${tripData.hora_salida}\n` +
                `📊 KM Inicial: ${tripData.km_salida}\n` +
                `⚠️ Riesgo: ${tripData.risk_level} (${tripData.risk_score} pts)`;

            window.open(`https://wa.me/3136332887?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
            TS.toastSuccess("¡Viaje autorizado por HSE! Notificación enviada.");
            resetFormAndExit();
        }

    } catch (err) {
        TS.toastError("Error al autorizar: " + err.message);
    } finally {
        btnAuth.disabled = false;
        btnAuth.innerHTML = 'AUTORIZAR VIAJE Y NOTIFICAR <i data-lucide="send" class="w-4 h-4 ml-2"></i>';
    }
}

// --- AUTORIZACIÓN GERENCIA ---
async function submitGerenciaAuth() {
    if (!currentTripId) return TS.toastWarning("Error: No hay viaje activo.");
    
    const canvasGerencia = document.getElementById('signatureCanvasGerencia');
    if (!canvasGerencia || canvasGerencia.getAttribute('data-signed') !== 'true') {
        return TS.toastWarning("Por favor, estampe la firma de Gerencia antes de aprobar.");
    }

    // Pedir PIN antes de proceder
    openPinAuthModal(async () => {
        await executeGerenciaAuth();
    });
}

async function executeGerenciaAuth() {
    try {
        const canvasGerencia = document.getElementById('signatureCanvasGerencia');
        
        // Obtener firmas existentes para mergear
        const { data: existingTrip, error: fetchError } = await supabase
            .from('operacion.viajes')
            .select('signatures, risk_level')
            .eq('id', currentTripId)
            .single();
        
        if (fetchError) throw fetchError;

        const existingSignatures = existingTrip?.signatures || {};
        const newSignatures = {
            ...existingSignatures,
            gerencia: canvasGerencia.toDataURL()
        };

        await db.saveTrip({
            id: currentTripId,
            signatures: newSignatures,
            estado: "Autorizado"
        });

        TS.toastSuccess("¡Viaje aprobado por Gerencia!");
        resetFormAndExit();

    } catch (err) {
        TS.toastError("Error al aprobar: " + err.message);
    }
}

// --- FIRMAS Y CANVAS ---
function autoSignHSEModal() {
    const cMod = document.getElementById('signatureCanvasHSE_Modal');
    if (!cMod) {
        console.error("No se encontró el canvas del modal");
        TS.toastError("Error: No se encontró el canvas");
        return;
    }

    // Primero redimensionar el canvas
    const rect = cMod.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        cMod.width = 340;
        cMod.height = 160;
    } else {
        cMod.width = rect.width;
        cMod.height = rect.height;
    }

    const ctxMod = cMod.getContext('2d');
    
    // Dibujar firma profesional
    ctxMod.clearRect(0, 0, cMod.width, cMod.height);
    
    // Fondo
    ctxMod.fillStyle = '#ffffff';
    ctxMod.fillRect(0, 0, cMod.width, cMod.height);
    
    // Borde azul
    ctxMod.strokeStyle = '#1e40af';
    ctxMod.lineWidth = 3;
    ctxMod.strokeRect(5, 5, cMod.width-10, cMod.height-10);
    
    // Línea decorativa superior
    ctxMod.fillStyle = '#1e40af';
    ctxMod.fillRect(15, 15, cMod.width-30, 3);
    
    // Título empresa
    ctxMod.fillStyle = '#1e3a8a';
    ctxMod.font = 'bold 16px Arial';
    ctxMod.textAlign = 'center';
    ctxMod.fillText('TRANS SERVICES A&B', cMod.width/2, 35);
    
    // Subtítulo
    ctxMod.fillStyle = '#64748b';
    ctxMod.font = '11px Arial';
    ctxMod.fillText('Autorización HSE', cMod.width/2, 50);
    
    // Línea separadora
    ctxMod.strokeStyle = '#e2e8f0';
    ctxMod.lineWidth = 1;
    ctxMod.beginPath();
    ctxMod.moveTo(15, 60);
    ctxMod.lineTo(cMod.width-15, 60);
    ctxMod.stroke();
    
    // Firma estilizada
    ctxMod.fillStyle = '#0f172a';
    ctxMod.font = 'italic 28px "Brush Script MT", cursive';
    ctxMod.fillText('Owen Alvares Zuñiga', cMod.width/2, 105);
    
    // Cargo
    ctxMod.fillStyle = '#64748b';
    ctxMod.font = 'bold 12px Arial';
    ctxMod.fillText('Profesional HSE / Coordinador de Seguridad Vial', cMod.width/2, 125);
    
    // Fecha automática
    const fecha = new Date().toLocaleDateString('es-CO');
    ctxMod.fillStyle = '#94a3b8';
    ctxMod.font = '10px Arial';
    ctxMod.fillText(`Firmado digitalmente: ${fecha}`, cMod.width/2, cMod.height - 15);
    
    cMod.setAttribute('data-signed', 'true');
    
    const btnAuth = document.getElementById('btnHSEAuth');
    if(btnAuth) {
        btnAuth.disabled = false;
        btnAuth.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

function autoSignGerencia() {
    const cGer = document.getElementById('signatureCanvasGerencia');
    if (!cGer) {
        console.error("No se encontró el canvas de Gerencia");
        TS.toastError("Error: No se encontró el canvas de Gerencia");
        return;
    }

    // Redimensionar el canvas
    const rect = cGer.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        cGer.width = 340;
        cGer.height = 128;
    } else {
        cGer.width = rect.width;
        cGer.height = rect.height;
    }

    const ctxGer = cGer.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = function() {
        // Limpiar canvas
        ctxGer.clearRect(0, 0, cGer.width, cGer.height);
        
        // Dibujar imagen de firma ajustada al canvas
        ctxGer.drawImage(img, 0, 0, cGer.width, cGer.height);
        
        cGer.setAttribute('data-signed', 'true');
        
        // Ocultar el overlay del botón
        const overlay = document.getElementById('gerenciaAutoSignOverlay');
        if (overlay) overlay.style.display = 'none';
        
        TS.toastSuccess("Firma de Gerencia estampada correctamente.");
    };
    
    img.onerror = function() {
        console.error("Error cargando imagen de firma");
        // Fallback: dibujar texto
        ctxGer.clearRect(0, 0, cGer.width, cGer.height);
        ctxGer.fillStyle = '#ffffff';
        ctxGer.fillRect(0, 0, cGer.width, cGer.height);
        ctxGer.fillStyle = '#1e3a8a';
        ctxGer.font = 'bold 16px Arial';
        ctxGer.textAlign = 'center';
        ctxGer.fillText('APROBACIÓN GERENCIA', cGer.width/2, cGer.height/2);
        cGer.setAttribute('data-signed', 'true');
        const overlay = document.getElementById('gerenciaAutoSignOverlay');
        if (overlay) overlay.style.display = 'none';
    };
    
    img.src = './assets/firma-gerencia.png';
}

function clearSignature(id) {
    const c = document.getElementById(id);
    if(c) {
        c.getContext('2d').clearRect(0, 0, c.width, c.height);
        c.removeAttribute('data-signed');
        
        if (id === 'signatureCanvasHSE_Modal') {
            const btnAuth = document.getElementById('btnHSEAuth');
            if(btnAuth) {
                btnAuth.disabled = true;
                btnAuth.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    }
    checkSignatures();
    if (currentStep === totalSteps - 1) updateNavigation(currentStep);
}

function resizeCanvas(id) {
    const c = document.getElementById(id);
    if (!c) return;
    const r = c.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
        c.width = r.width;
        c.height = r.height;
    }
}

function setupCanvas(id) {
    const c = document.getElementById(id);
    if (!c) return;
    
    if (c.getAttribute('data-setup') === 'true') return;
    c.setAttribute('data-setup', 'true');

    const ctx = c.getContext('2d');
    let drawing = false;

    const startDrawing = (e) => { drawing = true; draw(e); };
    const stopDrawing = () => { 
        if (drawing) {
            drawing = false; 
            ctx.beginPath(); 
            c.setAttribute('data-signed', 'true');
            
            if (id === 'signatureCanvasHSE_Modal') {
                const btnAuth = document.getElementById('btnHSEAuth');
                if(btnAuth) {
                    btnAuth.disabled = false;
                    btnAuth.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            } else {
                if (currentStep === totalSteps - 1) updateNavigation(currentStep);
            }
        }
    };
    const draw = (e) => {
        if (!drawing) return;
        ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = "#000";
        e.preventDefault(); 
        const r = c.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
        ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
    };

    c.addEventListener('mousedown', startDrawing);
    c.addEventListener('mouseup', stopDrawing);
    c.addEventListener('mouseout', stopDrawing);
    c.addEventListener('mousemove', draw);
    
    c.addEventListener('touchstart', startDrawing, {passive: false});
    c.addEventListener('touchend', stopDrawing, {passive: false});
    c.addEventListener('touchcancel', stopDrawing, {passive: false});
    c.addEventListener('touchmove', draw, {passive: false});
}

function resetFormAndExit() {
    document.getElementById("travelForm")?.reset();
    currentTripId = null;
    skipGerenciaSignature = false;
    currentStep = 0;
    ['signatureCanvasConductor', 'signatureCanvasHSE_Modal', 'signatureCanvasGerencia'].forEach(clearSignature);
    
    const formInputs = document.querySelectorAll('#travelForm input, #travelForm select, #travelForm textarea');
    formInputs.forEach(el => el.disabled = false);
    
    const kmLlegada = document.getElementById('kmLlegada');
    if (kmLlegada) kmLlegada.setAttribute('readonly', 'true');
    
    // Restaurar botón nextBtn a su función original
    const nextBtn = document.getElementById('nextBtn');
    if(nextBtn) {
        nextBtn.onclick = function() { nextPrev(1); };
    }
    
    // Mostrar container del conductor de nuevo
    const conductorContainer = document.getElementById('containerFirmaConductor');
    if (conductorContainer) conductorContainer.style.display = '';
    
    showStep(0);
    updateRisk();
}

// --- HISTORIAL ---
function toggleHistory() {
    const modal = document.getElementById('historyModal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        loadHistory();
    } else {
        modal.classList.add('hidden');
    }
}

async function loadHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = `<div class="text-center text-blue-600 py-10"><i class="animate-spin" data-lucide="loader-2"></i> Cargando...</div>`;
    if(typeof lucide !== 'undefined') lucide.createIcons();

    try {
        currentHistoryData = await db.getTrips();
        historyDataMap = currentHistoryData.reduce((acc, curr) => { acc[curr.id] = curr; return acc; }, {});
        renderHistoryList();
    } catch (err) {
        console.error("Error loading history:", err);
        list.innerHTML = `<div class="text-center text-red-500 py-10">Error al cargar historial</div>`;
    }
}

function renderHistoryList() {
    const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const listContainer = document.getElementById('historyList');
    if (currentHistoryData.length === 0) {
        listContainer.innerHTML = `<p class="p-10 text-center text-gray-500">No hay viajes registrados.</p>`;
        return;
    }
    listContainer.innerHTML = currentHistoryData.map(t => {
        const isFinalized = t.estado === 'Finalizado' || (t.km_llegada && parseFloat(t.km_llegada) > 0);
        const statusColor = isFinalized ? 'text-emerald-600' : 'text-amber-600';

        return `
        <div class="p-4 border-b border-gray-100 hover:bg-blue-50 flex justify-between items-center transition-colors">
            <div onclick="editTrip('${escapeHTML(t.id)}')" class="cursor-pointer flex-1">
                <p class="font-bold text-gray-900">${escapeHTML(t.origen || 'S/O')} → ${escapeHTML(t.destino || 'S/D')}</p>
                <p class="text-xs text-gray-500">${escapeHTML(t.vehiculo_placa)} | <span class="${statusColor} font-bold">${escapeHTML(t.estado || 'Registrado')}</span></p>
            </div>
            <div class="flex gap-2">
                ${isFinalized 
                    ? `<button onclick="exportTripPDF('${escapeHTML(t.id)}')" class="p-2 text-red-600 hover:bg-red-100 rounded-full" title="Descargar PDF"><i data-lucide="file-down" class="w-5 h-5"></i></button>` 
                    : `<button onclick="editTrip('${escapeHTML(t.id)}')" class="p-2 text-blue-600 hover:bg-blue-100 rounded-full" title="Registrar KM Final"><i data-lucide="eye" class="w-5 h-5"></i></button>`}
            </div>
        </div>
    `}).join('');
    
    if(typeof lucide !== 'undefined') lucide.createIcons();
}

async function editTrip(id) {
    toggleHistory(); 
    const nextBtn = document.getElementById("nextBtn");
    if(nextBtn) nextBtn.innerHTML = 'Cargando... <i class="ml-2 animate-spin" data-lucide="loader-2"></i>';
    
    try {
        const { data: tripData, error } = await supabase.from('operacion.viajes').select('*').eq('id', id).single();
        if (error || !tripData) return TS.toastError("Viaje no encontrado");
        
        const data = tripData;
        currentTripId = id; 

        const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val ?? ''; };
        const setRadio = (name, val) => {
            if (val == null) return;
            const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
            if (radio) radio.checked = true;
        };
        
        setVal('fecha', data.fecha); setVal('horaSalida', data.hora_salida); 
        setVal('origen', data.origen); setVal('destino', data.destino); 
        setVal('kmSalida', data.km_salida); setVal('vPlaca', data.vehiculo_placa); 
        setVal('cNombre', data.conductor_nombre);

        // Determinar si el viaje ya fue autorizado/firmado para omitir firma de Gerencia
        skipGerenciaSignature = (
            data.estado === "Autorizado" ||
            data.estado === "Finalizado" ||
            !!data.signatures?.gerencia
        );

        // Restaurar análisis de riesgo desde risk_inputs
        if (data.risk_inputs) {
            setRadio('rDistancia', data.risk_inputs.rDistancia);
            setRadio('rClima', data.risk_inputs.rClima);
            setRadio('rVehiculos', data.risk_inputs.rVehiculos);
            setRadio('rVia', data.risk_inputs.rVia);
            setRadio('rCom', data.risk_inputs.rCom);
            setRadio('rFatiga', data.risk_inputs.rFatiga);
            setRadio('rHora', data.risk_inputs.rHora);
            updateRisk(); // Recalcular risk_score y risk_level con los valores restaurados
        }

        currentStep = 0;
        showStep(currentStep);

        const formInputs = document.querySelectorAll('#travelForm input:not([type="hidden"]), #travelForm select, #travelForm textarea');
        formInputs.forEach(el => el.disabled = true);

        if (data.estado === "Finalizado" || (data.km_llegada && parseFloat(data.km_llegada) > 0)) {
            setVal('kmLlegada', data.km_llegada);
            TS.toastInfo("Este viaje ya está finalizado. Se muestra en modo lectura.");
        } else if (data.estado === "Pendiente Gerencia") {
            // Modo aprobación de Gerencia: saltar al paso 7
            currentStep = totalSteps - 1;
            showStep(currentStep);
            TS.toast(`Viaje pendiente de aprobación de Gerencia (${data.risk_level}). Por favor estampe la firma y apruebe.`);
            
            // Ocultar firma del conductor, mostrar solo Gerencia
            const conductorContainer = document.getElementById('containerFirmaConductor');
            if (conductorContainer) conductorContainer.style.display = 'none';
            
            // Asegurar que el contenedor de Gerencia esté visible
            const gerenciaContainer = document.getElementById('containerFirmaGerencia');
            if (gerenciaContainer) {
                gerenciaContainer.classList.remove('hidden');
                gerenciaContainer.style.display = 'block';
            }

            // Mantener botón de auto-firma visible para estampar firma de Gerencia
            const autoSignOverlay = document.getElementById('gerenciaAutoSignOverlay');
            if (autoSignOverlay) autoSignOverlay.style.display = 'flex';

            // Mantener canvas bloqueado para dibujo manual — solo auto-firma permitida
            const canvasGerencia = document.getElementById('signatureCanvasGerencia');
            if (canvasGerencia) {
                canvasGerencia.classList.add('pointer-events-none');
                canvasGerencia.style.pointerEvents = 'none';
            }

            // Cambiar texto del botón para reflejar acción de Gerencia
            if(nextBtn) {
                nextBtn.innerHTML = 'Guardar y Autorizar <i class="ml-2" data-lucide="check-circle"></i>';
                nextBtn.onclick = function() { submitGerenciaAuth(); };
            }
            
            return; // Salir temprano, no ejecutar lógica de conductor
        } else if (data.estado === "Autorizado") {
            // Viaje ya autorizado: saltar firma de Gerencia y permitir solo KM final
            skipGerenciaSignature = true;
            TS.toast(`Viaje autorizado (${data.risk_level}). Por favor ingrese el Kilometraje Final para cerrar.`);
            setTimeout(() => {
                const kmInput = document.getElementById('kmLlegada');
                if(kmInput) {
                    kmInput.disabled = false;
                    kmInput.removeAttribute('readonly');
                    kmInput.addEventListener('input', () => {
                        calcKm();
                        updateNavigation(currentStep);
                    });
                    kmInput.focus();
                }
            }, 500);
        } else {
            TS.toast(`Viaje en curso (${data.estado}). Por favor ingrese el Kilometraje Final.`);
            setTimeout(() => {
                const kmInput = document.getElementById('kmLlegada');
                if(kmInput) {
                    kmInput.disabled = false;
                    kmInput.removeAttribute('readonly');
                    kmInput.addEventListener('input', () => {
                        calcKm();
                        updateNavigation(currentStep);
                    });
                    kmInput.focus();
                }
            }, 500);
        }
    } catch (e) {
        console.error(e);
        TS.toastError("Error al cargar viaje: " + e.message);
    } finally {
        updateNavigation(currentStep);
    }
}

async function exportTripPDF(id) {
    const data = historyDataMap[id];
    if (data && typeof generatePDF === 'function') await generatePDF(data);
    else TS.toastError("Generador de PDF no disponible o viaje no encontrado.");
}

function filterHistory() {
    const filter = document.getElementById('historyFilter')?.value;
    if (!filter || filter === 'all') {
        currentHistoryData = Object.values(historyDataMap);
    } else {
        currentHistoryData = Object.values(historyDataMap).filter(t => t.estado === filter);
    }
    renderHistoryList();
}

async function createNewTrip() {
    if (await TS.confirm("¿Desea iniciar un nuevo viaje? Se perderán los datos no guardados.")) resetFormAndExit();
}
function openEmergencyPanel() { document.getElementById('emergencyModal')?.classList.remove('hidden'); }
function closeEmergencyPanel() { document.getElementById('emergencyModal')?.classList.add('hidden'); }
async function logout() {
    if (!(await TS.confirm('¿Cerrar sesión?'))) return;
    
    // Deshabilitar botones durante logout
    const logoutBtns = document.querySelectorAll('button[onclick*="logout"]');
    logoutBtns.forEach(btn => btn.disabled = true);
    
    try {
        await signOut();
    } catch (e) {
        console.warn('SignOut error:', e);
    }
    
    // Pequeño delay para asegurar limpieza, luego redirigir
    setTimeout(() => {
        window.location.replace('./login.html');
    }, 300);
}

// --- EXPORTACIÓN A PDF (delegado a pdf-generator.js) ---
// La función generatePDF se importa desde './pdf-generator.js'

// --- INICIO ---
window.onload = () => {
    showStep(currentStep);
    if(typeof lucide !== 'undefined') lucide.createIcons();
    getGPS('salida'); 
    
    setupCanvas('signatureCanvasConductor');
    setupCanvas('signatureCanvasHSE_Modal');
    setupCanvas('signatureCanvasGerencia');
    updateRisk();

    // Mostrar formulario inmediatamente
    const loading = document.getElementById('loadingScreen');
    const main = document.getElementById('mainContainer');
    if(loading) loading.style.display = 'none';
    if(main) main.style.display = 'block';
    
    // Inicializar auth en背景 (sin bloquear)
    initAuth().catch(console.error);
};

// --- EXPORTAR FUNCIONES AL SCOPE GLOBAL ---
window.showStep = showStep;
window.nextPrev = nextPrev;
window.updateNavigation = updateNavigation;
window.updateProgressBar = updateProgressBar;
window.getGPS = getGPS;
window.calcKm = calcKm;
window.updateRisk = updateRisk;
window.checkSignatures = checkSignatures;
window.previewRutograma = previewRutograma;
window.removeRutograma = removeRutograma;
window.searchVehicle = searchVehicle;
window.addControlPoint = addControlPoint;
window.removeControlPoint = removeControlPoint;
window.handleSubmit = handleSubmit;
window.submitHSEAuth = submitHSEAuth;
window.executeHSEAuth = executeHSEAuth;
window.autoSignHSEModal = autoSignHSEModal;
window.autoSignGerencia = autoSignGerencia;
window.submitGerenciaAuth = submitGerenciaAuth;
window.executeGerenciaAuth = executeGerenciaAuth;
window.clearSignature = clearSignature;
window.resizeCanvas = resizeCanvas;
window.setupCanvas = setupCanvas;
window.resetFormAndExit = resetFormAndExit;
window.toggleHistory = toggleHistory;
window.loadHistory = loadHistory;
window.renderHistoryList = renderHistoryList;
window.editTrip = editTrip;
window.exportTripPDF = exportTripPDF;
window.createNewTrip = createNewTrip;
window.openEmergencyPanel = openEmergencyPanel;
window.closeEmergencyPanel = closeEmergencyPanel;
window.logout = logout;
window.generatePDF = generatePDF;
window.filterHistory = filterHistory;
window.openPinAuthModal = openPinAuthModal;
window.closePinAuthModal = closePinAuthModal;
window.submitPinAuth = submitPinAuth;

// ==================== NUEVAS FUNCIONES ====================

// --- AUTENTICACIÓN ---
// (currentUser, currentProfile, currentConductor ya declarados al inicio)

async function initAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            console.warn('initAuth: No hay sesión activa');
            return;
        }
        
        currentUser = session.user;
        console.log('initAuth: Sesión encontrada. Email:', currentUser.email);
        
        // Cargar perfil
        const { data: profile, error: profileError } = await supabase
            .from('core.personas')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();
        if (profileError) console.error('initAuth: Error cargando perfil:', profileError);
        currentProfile = profile;
        
        // Cargar conductor (búsqueda insensible a mayúsculas/minúsculas)
        const { data: conductores, error: conductorError } = await supabase
            .from('core.conductores')
            .select('*')
            .ilike('email', currentUser.email);
        if (conductorError) console.error('initAuth: Error cargando conductor:', conductorError);
        currentConductor = conductores?.[0] || null;
        
        if (!currentConductor) {
            console.warn('initAuth: No se encontró conductor para:', currentUser.email);
            
            // Intentar auto-crear conductor desde datos del perfil
            if (currentProfile?.nombre_completo) {
                console.log('initAuth: Intentando auto-crear conductor...');
                const palabras = currentProfile.nombre_completo.trim().split(/\s+/);
                const nombres = palabras[0] || currentProfile.nombre_completo;
                const apellidos = palabras.slice(1).join(' ') || '';
                
                try {
                    const { data: newConductor, error: createError } = await supabase
                        .from('core.conductores')
                        .insert({
                            email: currentUser.email,
                            nombres,
                            apellidos,
                            numero_documento: currentUser.id.substring(0, 12),
                            estado: 'activo'
                        })
                        .select()
                        .single();
                    
                    if (createError) {
                        console.error('initAuth: Error auto-creando conductor:', createError);
                        TS.toastError('Error: No se encontró tu registro de conductor. Por favor contacta al administrador.');
                    } else {
                        currentConductor = newConductor;
                        console.log('initAuth: Conductor auto-creado:', newConductor.id);
                    }
                } catch (e) {
                    console.error('initAuth: Error auto-creando conductor:', e);
                    TS.toastError('Error: No se encontró tu registro de conductor. Por favor contacta al administrador.');
                }
            } else {
                TS.toastError('Error: No se encontró tu registro de conductor. Por favor contacta al administrador.');
            }
        } else {
            console.log('initAuth: Conductor cargado:', currentConductor?.id, currentConductor?.email);
        }
    } catch (e) {
        console.error('initAuth: Error general:', e);
    }
}

// --- PANEL DE USUARIO ---
window.openUserPanel = function() {
    document.getElementById('userPanel').classList.remove('hidden');
    renderUserPanel();
    lucide.createIcons();
};

window.closeUserPanel = function() {
    document.getElementById('userPanel').classList.add('hidden');
};

async function renderUserPanel() {
    const content = document.getElementById('userPanelContent');
    
    if (!currentUser) {
        content.innerHTML = '<div class="text-center py-10"><p class="text-slate-400">No has iniciado sesión</p><a href="login.html" class="text-primary block mt-2">Iniciar Sesión</a></div>';
        return;
    }
    
    const { data: trips } = await supabase.from('operacion.viajes').select('*').eq('conductor_id', currentConductor?.id);
    const stats = {
        total: trips?.length || 0,
        completed: trips?.filter(t => t.estado === 'Finalizado' || t.km_llegada).length || 0,
        totalKm: trips?.reduce((acc, t) => acc + (parseFloat(t.distancia_km) || 0), 0) || 0
    };
    stats.inProgress = stats.total - stats.completed;
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="apple-card p-4">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
                        ${currentUser.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <p class="font-semibold text-[17px]">${currentProfile?.nombre_completo || currentUser.email}</p>
                        <p class="text-[13px] text-slate-400">${currentUser.email}</p>
                        <span class="apple-badge ${currentProfile?.rol === 'admin' ? 'apple-badge-danger' : 'apple-badge-info'}">${currentProfile?.rol === 'admin' ? 'Admin' : 'Conductor'}</span>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div class="apple-card p-4 text-center">
                    <p class="text-[12px] text-slate-400">Mis Viajes</p>
                    <p class="text-2xl font-bold">${stats.total}</p>
                </div>
                <div class="apple-card p-4 text-center">
                    <p class="text-[12px] text-slate-400">KM</p>
                    <p class="text-2xl font-bold">${Math.round(stats.totalKm).toLocaleString()}</p>
                </div>
            </div>
            ${currentConductor ? `
            <div class="apple-card p-4">
                <h4 class="font-semibold text-[15px] mb-3">Datos del Conductor</h4>
                <div class="space-y-2 text-[14px]">
                    <div class="flex justify-between"><span class="text-slate-400">Licencia:</span><span>${currentConductor.licencia_conducir || 'N/A'}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Categoría:</span><span>${currentConductor.categoria_licencia || 'N/A'}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Teléfono:</span><span>${currentConductor.telefono || 'N/A'}</span></div>
                </div>
            </div>
            ` : ''}
            <button onclick="logout()" class="btn bg-danger text-white w-full">
                <i data-lucide="log-out" class="w-5 h-5"></i> Cerrar Sesión
            </button>
        </div>
    `;
    lucide.createIcons();
}

window.logout = async function() {
    if (!(await TS.confirm('¿Cerrar sesión?'))) return;
    
    try {
        await signOut();
    } catch (e) {
        console.warn('SignOut error:', e);
    }
    
    setTimeout(() => {
        window.location.replace('./login.html');
    }, 300);
};

// --- REPORTES ---
window.openReportsPanel = function() {
    document.getElementById('reportsModal').classList.remove('hidden');
    loadReport('today');
    lucide.createIcons();
};

window.closeReportsPanel = function() {
    document.getElementById('reportsModal').classList.add('hidden');
};

window.loadReport = async function(period) {
    const content = document.getElementById('reportsContent');
    content.innerHTML = '<div class="flex justify-center py-10"><i class="animate-spin w-8 h-8 text-primary" data-lucide="loader-2"></i></div>';
    lucide.createIcons();

    document.querySelectorAll('.apple-tab').forEach(t => t.classList.remove('apple-tab-active'));
    document.getElementById(`tab-${period}`)?.classList.add('apple-tab-active');

    try {
        let query = supabase.from('operacion.viajes').select('*');
        
        if (currentProfile?.rol !== 'admin' && currentConductor?.id) {
            query = query.eq('conductor_id', currentConductor.id);
        }
        
        const { data: trips } = await query.order('created_at', { ascending: false });
        
        const total = trips?.length || 0;
        const finalized = trips?.filter(t => t.estado === 'Finalizado' || t.km_llegada).length || 0;
        const totalKm = trips?.reduce((acc, t) => acc + (parseFloat(t.distancia_km) || 0), 0) || 0;

        const riskLevels = { bajo: 0, medio: 0, alto: 0 };
        trips?.forEach(t => {
            const score = t.risk?.score || 0;
            if (score > 23) riskLevels.alto++;
            else if (score > 15) riskLevels.medio++;
            else riskLevels.bajo++;
        });

        content.innerHTML = `
            <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="apple-card p-4"><p class="text-[12px] text-slate-400 mb-1">Total</p><p class="text-2xl font-bold">${total}</p></div>
                <div class="apple-card p-4"><p class="text-[12px] text-slate-400 mb-1">KM</p><p class="text-2xl font-bold">${Math.round(totalKm).toLocaleString()}</p></div>
                <div class="apple-card p-4"><p class="text-[12px] text-slate-400 mb-1">Finalizados</p><p class="text-2xl font-bold text-success">${finalized}</p></div>
                <div class="apple-card p-4"><p class="text-[12px] text-slate-400 mb-1">En Curso</p><p class="text-2xl font-bold text-warning">${total - finalized}</p></div>
            </div>
            <div class="apple-section mb-4">
                <div class="px-4 py-3 border-b border-slate-200"><h4 class="font-semibold text-[15px]">Nivel de Riesgo</h4></div>
                <div class="p-4 flex gap-4 justify-center">
                    <div class="text-center"><div class="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-1"><span class="text-lg font-bold text-success">${riskLevels.bajo}</span></div><span class="text-[11px] text-slate-400">Bajo</span></div>
                    <div class="text-center"><div class="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-1"><span class="text-lg font-bold text-warning">${riskLevels.medio}</span></div><span class="text-[11px] text-slate-400">Medio</span></div>
                    <div class="text-center"><div class="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-1"><span class="text-lg font-bold text-danger">${riskLevels.alto}</span></div><span class="text-[11px] text-slate-400">Alto</span></div>
                </div>
            </div>
            <div class="apple-section mb-4">
                <div class="px-4 py-3 border-b border-slate-200"><h4 class="font-semibold text-[15px]">Últimos Viajes</h4></div>
                <div class="divide-y divide-slate-200">
                    ${trips?.slice(0, 5).map(t => `
                        <div class="apple-list-item">
                            <div><p class="font-medium text-[15px]">${t.origen} → ${t.destino}</p><p class="text-[12px] text-slate-400">${t.fecha || ''}</p></div>
                            <span class="apple-badge ${t.km_llegada ? 'apple-badge-success' : 'apple-badge-warning'}">${t.km_llegada ? 'Finalizado' : 'En curso'}</span>
                        </div>
                    `).join('') || '<div class="p-4 text-center text-slate-400">Sin viajes</div>'}
                </div>
            </div>
        `;
        lucide.createIcons();
    } catch (err) {
        content.innerHTML = `<div class="text-center text-danger py-10">Error al cargar</div>`;
    }
};

// --- PLANTILLAS ---
window.openTemplatesPanel = function() {
    document.getElementById('templatesModal').classList.remove('hidden');
    loadTemplates();
    lucide.createIcons();
};

window.loadTemplates = function() {
    const list = document.getElementById('templatesList');
    const templates = JSON.parse(localStorage.getItem('tripTemplates') || '[]');
    
    if (templates.length === 0) {
        list.innerHTML = '<div class="text-center py-10"><i data-lucide="bookmark" class="w-12 h-12 text-slate-400 mx-auto mb-3"></i><p class="text-slate-400">No hay plantillas</p></div>';
    } else {
        list.innerHTML = templates.map((t, i) => `
            <div class="apple-card mb-3 cursor-pointer" onclick="applyTemplate(${i})">
                <div class="p-4">
                    <p class="font-semibold text-[15px]">${t.nombre || 'Sin nombre'}</p>
                    <p class="text-[12px] text-slate-400">${t.origen || ''} → ${t.destino || ''}</p>
                </div>
            </div>
        `).join('');
    }
    lucide.createIcons();
};

window.saveAsTemplate = function() {
    const nombre = prompt('Nombre de la plantilla:');
    if (!nombre) return;
    const getVal = (id) => document.getElementById(id)?.value || '';
    const template = { nombre, origen: getVal('origen'), destino: getVal('destino'), vPlaca: getVal('vPlaca'), cNombre: getVal('cNombre') };
    const templates = JSON.parse(localStorage.getItem('tripTemplates') || '[]');
    templates.push(template);
    localStorage.setItem('tripTemplates', JSON.stringify(templates));
    loadTemplates();
};

window.applyTemplate = function(index) {
    const templates = JSON.parse(localStorage.getItem('tripTemplates') || '[]');
    const t = templates[index];
    if (!t) return;
    ['origen', 'destino', 'vPlaca', 'cNombre'].forEach(f => {
        if (t[f] && document.getElementById(f)) document.getElementById(f).value = t[f];
    });
    document.getElementById('templatesModal').classList.add('hidden');
};

// --- EXPORTAR ---
window.exportHistoryExcel = async function() {
    try {
        const { data: trips } = await supabase.from('operacion.viajes').select('*').order('created_at', { ascending: false });
        const data = trips.map(t => ({
            Fecha: t.fecha || '', Origen: t.origen || '', Destino: t.destino || '',
            Placa: t.vehiculo_placa || '', Conductor: t.conductor_nombre || '', 'Distancia (KM)': t.distancia_km || '',
            Estado: t.estado || ''
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Viajes');
        XLSX.writeFile(wb, `Viajes_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
        TS.toastError('Error al exportar: ' + err.message);
    }
};

// --- AUTO-GUARDADO ---
window.initAutoSave = function() {
    setInterval(() => {
        const formData = {};
        document.querySelectorAll('#travelForm input, #travelForm select, #travelForm textarea').forEach(input => {
            if (input.id && input.value) formData[input.id] = input.value;
        });
        if (Object.keys(formData).length > 0) {
            localStorage.setItem('tripDraft', JSON.stringify({ data: formData, step: currentStep, timestamp: new Date().toISOString() }));
        }
    }, 30000);
};

window.loadDraft = async function() {
    const draft = JSON.parse(localStorage.getItem('tripDraft'));
    if (draft?.data && (await TS.confirm('¿Restaurar borrador?'))) {
        Object.entries(draft.data).forEach(([key, value]) => {
            const el = document.getElementById(key);
            if (el) el.value = value;
        });
        currentStep = draft.step || 0;
        showStep(currentStep);
    }
    localStorage.removeItem('tripDraft');
};

// --- INICIALIZAR ---
window.initNewFeatures = function() {
    loadDraft();
    initAutoSave();
    checkAlerts();
};

window.checkAlerts = async function() {
    // Función de alertas
};

window.closeAlertsPanel = function() {
    document.getElementById('alertsModal')?.classList.add('hidden');
};

// Exportar funciones al scope global
window.openUserPanel = openUserPanel;
window.closeUserPanel = closeUserPanel;
window.openReportsPanel = openReportsPanel;
window.closeReportsPanel = closeReportsPanel;
window.loadReport = loadReport;
window.openTemplatesPanel = openTemplatesPanel;
window.loadTemplates = loadTemplates;
window.saveAsTemplate = saveAsTemplate;
window.applyTemplate = applyTemplate;
window.exportHistoryExcel = exportHistoryExcel;
window.initAutoSave = initAutoSave;
window.loadDraft = loadDraft;
window.initNewFeatures = initNewFeatures;
window.checkAlerts = checkAlerts;
window.initAuth = initAuth;
window.toggleHistory = toggleHistory;
window.createNewTrip = createNewTrip;
window.logout = logout;

// --- MENÚ MOBILE ---
window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobileMenu');
    const icon = document.getElementById('menuIcon');
    
    if (!menu || !icon) return;
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        icon.setAttribute('data-lucide', 'x');
    } else {
        menu.classList.add('hidden');
        icon.setAttribute('data-lucide', 'menu');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
};