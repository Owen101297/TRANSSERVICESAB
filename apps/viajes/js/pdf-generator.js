// pdf-generator.js - Generador de PDF STE-F-010 para Trans Services A&B
// Formato profesional de una sola página con toda la información del viaje

function normalizeTripData(data) {
    if (!data) return null;

    // Si ya está normalizado (viene del formulario), devolver tal cual
    if (data.horaSalida !== undefined && data.hora_salida === undefined) return data;

    // Normalizar desde Supabase (snake_case → camelCase + JSONB)
    const ri = data.risk_inputs || {};
    const rDistancia = parseInt(ri.rDistancia) || 0;
    const rClima = parseInt(ri.rClima) || 0;
    const rVehiculos = parseInt(ri.rVehiculos) || 0;
    const rVia = parseInt(ri.rVia) || 0;
    const rCom = parseInt(ri.rCom) || 0;
    const rFatiga = parseInt(ri.rFatiga) || 0;
    const rHora = parseInt(ri.rHora) || 0;
    const totalScore = rDistancia + rClima + rVehiculos + rVia + rCom + rFatiga + rHora;

    const distanciaTxt = { 1: '< 50 KM', 2: '< 100 KM', 5: '< 200 KM', 8: '> 200 KM' }[rDistancia] || 'N/A';
    const climaTxt = { 2: 'SECO / NORMALES', 4: 'LLUVIA SUAVE', 8: 'LLUVIA FUERTE / NIEBLA' }[rClima] || 'N/A';
    const vehiculosTxt = { 1: '1 VEH / 1 PER', 2: '1 VEH / 2+ PER', 3: '2+ VEH / 1+ PER', 6: '2+ VEH / 2+ PER' }[rVehiculos] || 'N/A';
    const viaTxt = { 1: 'PAVIMENTADA', 2: 'MIXTA', 4: 'NO PAVIMENTADA' }[rVia] || 'N/A';
    const comTxt = { 0: 'CEL. DISPONIBLE', 2: 'SIN COM./CARAVANA', 4: 'SIN COMUNICACIÓN' }[rCom] || 'N/A';
    const fatigaTxt = { 1: '< 12 Hrs', 3: '< 14 Hrs', 6: '< 16 Hrs' }[rFatiga] || 'N/A';
    const horaTxt = rHora === 8 ? 'NOCHE (18-6)' : 'DÍA (6-18)';

    return {
        fecha: data.fecha || '',
        horaSalida: data.hora_salida || '',
        horaLlegada: data.hora_llegada || '',
        origen: data.origen || '',
        destino: data.destino || '',
        kmSalida: data.km_salida != null ? String(data.km_salida) : '',
        kmLlegada: data.km_llegada != null ? String(data.km_llegada) : '',
        distanciaEstimada: data.distancia_km != null ? String(data.distancia_km) : '',
        vPlaca: data.vehiculo_placa || '',
        vModelo: data.vehiculo_modelo || '',
        vColor: data.vehiculo_color || '',
        vTipo: data.vehiculo_tipo || '',
        vEmpresa: data.vehiculo_empresa || '',
        cNombre: data.conductor_nombre || '',
        cLicencia: data.conductor_licencia || '',
        cCat: data.conductor_categoria || '',
        cVence: data.conductor_vencimiento || '',
        cTelefono: data.conductor_telefono || '',
        observaciones: data.observaciones || '',
        medio: data.medio || '',
        gpsSalida: data.gps_salida || '',
        gpsLlegada: data.gps_llegada || '',
        estado: data.estado || '',
        risk: {
            distancia: rDistancia, clima: rClima, vehiculos: rVehiculos,
            via: rVia, comunicaciones: rCom, horas: rFatiga,
            turno: rHora === 8 ? 'noche' : 'dia',
            score: totalScore,
            level: totalScore <= 15 ? 'BAJO' : (totalScore <= 23 ? 'MEDIO' : 'ALTO'),
            distanciaTxt, climaTxt, vehiculosTxt, viaTxt, comTxt, fatigaTxt, horaTxt
        },
        previaje: data.previaje || {},
        fatiga: data.fatiga || {},
        control: data.control || {},
        puntosControl: (data.puntos_control || []).map(p => ({ l: p.l || p.lugar || '', h: p.h || p.hora || '' })),
        signatures: data.signatures || {},
        id: data.id || '',
        created_at: data.created_at || data.fecha
    };
}

async function loadLogo(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return null;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Colores del tema
const C = {
    primary: [30, 58, 138],
    primaryLight: [239, 243, 255],
    white: [255, 255, 255],
    black: [30, 30, 30],
    gray: [100, 100, 100],
    lightGray: [245, 247, 250],
    border: [200, 205, 215],
    green: [22, 163, 74],
    greenBg: [240, 253, 244],
    yellow: [202, 138, 4],
    yellowBg: [254, 252, 232],
    red: [220, 38, 38],
    redBg: [254, 242, 242],
};

export async function generatePDF(data) {
    if (!window.jspdf) {
        TS.toastError('Error: La librería de PDF no ha cargado.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pw = doc.internal.pageSize.getWidth();   // ~216
    const ph = doc.internal.pageSize.getHeight();   // ~279
    const m = 7; // margin
    const cw = pw - m * 2; // content width

    // --- NORMALIZAR DATOS ---
    let d;
    if (!data) {
        const gv = (id) => document.getElementById(id)?.value || '';
        const gc = (id) => document.getElementById(id)?.checked || false;
        const gn = (id) => { const v = document.getElementById(id)?.value; return (v === '' || v == null) ? null : parseFloat(v); };
        const gr = (name) => parseInt(document.querySelector(`input[name="${name}"]:checked`)?.value) || 0;

        const rD = gr('rDistancia'), rCl = gr('rClima'), rV = gr('rVehiculos');
        const rVi = gr('rVia'), rCo = gr('rCom'), rF = gr('rFatiga'), rH = gr('rHora');
        const ts = rD + rCl + rV + rVi + rCo + rF + rH;

        d = {
            fecha: gv('fecha'), horaSalida: gv('horaSalida'), horaLlegada: gv('horaLlegada'),
            origen: gv('origen'), destino: gv('destino'),
            kmSalida: gv('kmSalida'), kmLlegada: gv('kmLlegada'), distanciaEstimada: gv('distanciaEstimada'),
            vPlaca: gv('vPlaca'), vModelo: gv('vModelo'), vColor: gv('vColor'),
            vTipo: gv('vTipo'), vEmpresa: gv('vEmpresa'),
            cNombre: gv('cNombre'), cLicencia: gv('cLicencia'), cCat: gv('cCat'),
            cVence: gv('cVence'), cTelefono: gv('cTelefono'),
            observaciones: gv('observaciones'), medio: '', gpsSalida: '', gpsLlegada: '', estado: '',
            risk: {
                distancia: rD, clima: rCl, vehiculos: rV, via: rVi, comunicaciones: rCo, horas: rF,
                turno: rH === 8 ? 'noche' : 'dia', score: ts,
                level: ts <= 15 ? 'BAJO' : (ts <= 23 ? 'MEDIO' : 'ALTO'),
                distanciaTxt: { 1: '< 50 KM', 2: '< 100 KM', 5: '< 200 KM', 8: '> 200 KM' }[rD] || 'N/A',
                climaTxt: { 2: 'SECO / NORMALES', 4: 'LLUVIA SUAVE', 8: 'LLUVIA FUERTE / NIEBLA' }[rCl] || 'N/A',
                vehiculosTxt: { 1: '1 VEH / 1 PER', 2: '1 VEH / 2+ PER', 3: '2+ VEH / 1+ PER', 6: '2+ VEH / 2+ PER' }[rV] || 'N/A',
                viaTxt: { 1: 'PAVIMENTADA', 2: 'MIXTA', 4: 'NO PAVIMENTADA' }[rVi] || 'N/A',
                comTxt: { 0: 'CEL. DISPONIBLE', 2: 'SIN COM./CARAVANA', 4: 'SIN COMUNICACIÓN' }[rCo] || 'N/A',
                fatigaTxt: { 1: '< 12 Hrs', 3: '< 14 Hrs', 6: '< 16 Hrs' }[rF] || 'N/A',
                horaTxt: rH === 8 ? 'NOCHE (18-6)' : 'DÍA (6-18)'
            },
            previaje: { riesgos: gc('cp_riesgos'), personal: gc('cp_personal'), inspeccion: gc('cp_inspeccion'), cinturon: gc('cp_cinturon') },
            fatiga: { sustancias: gc('tf_sustancias'), descanso: gc('tf_descanso'), condiciones: gc('tf_condiciones'), peligros: gc('tf_peligros'), celular: gc('tf_celular') },
            control: { dia1: gc('dia1'), dia2: gc('dia2') },
            puntosControl: Array.from(document.querySelectorAll('#puntosControlContainer > div')).map(row => ({
                l: row.querySelector('input[name="pc_lugar[]"]')?.value || '',
                h: row.querySelector('input[name="pc_hora[]"]')?.value || ''
            })).filter(p => p.l !== ''),
            signatures: {},
            id: '', created_at: new Date().toISOString()
        };

        const sigC = document.getElementById('signatureCanvasConductor');
        if (sigC && sigC.getAttribute('data-signed') === 'true') {
            try { d.signatures.conductor = sigC.toDataURL(); } catch (e) { }
        }
    } else {
        d = normalizeTripData(data);
    }

    // --- CARGAR LOGO ---
    let logoBase64 = await loadLogo('./assets/logo.png');

    // =========================================================
    // HEADER - Encabezado corporativo
    // =========================================================
    // Franja azul superior
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, pw, 18, 'F');

    if (logoBase64) {
        try {
            // Fondo blanco circular para el logo
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(m, 2.5, 16, 13, 2, 2, 'F');
            doc.addImage(logoBase64, 'PNG', m + 1, 3, 14, 11);
        } catch (e) { }
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('GERENCIAMIENTO DE VIAJES', m + 20, 8.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 255);
    doc.text('COOPERATIVA DE TRANSPORTES Y SERVICIOS A&B  |  STE-F-010', m + 20, 13);

    // Estado y folio (derecha)
    const estadoText = d.estado || 'REGISTRADO';
    const estadoColors = {
        'Finalizado': { bg: C.greenBg, text: C.green },
        'Pendiente': { bg: C.yellowBg, text: C.yellow },
        'Pendiente HSE': { bg: C.yellowBg, text: C.yellow },
        'Pendiente Gerencia': { bg: C.yellowBg, text: C.yellow },
        'Autorizado': { bg: C.greenBg, text: C.green },
    };
    const ec = estadoColors[estadoText] || { bg: C.primaryLight, text: C.primary };

    doc.setFillColor(...ec.bg);
    doc.roundedRect(pw - m - 38, 3, 38, 7, 1.5, 1.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ec.text);
    doc.text(estadoText.toUpperCase(), pw - m - 19, 8, { align: 'center' });

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 255);
    doc.text(`Folio: ${d.id ? d.id.toString().slice(-8).toUpperCase() : 'N/A'}`, pw - m, 14.5, { align: 'right' });

    let y = 21;

    // =========================================================
    // Helper para títulos de sección
    // =========================================================
    function sectionTitle(text, yPos) {
        doc.setFillColor(...C.primary);
        doc.rect(m, yPos, cw, 5, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(text, m + 2, yPos + 3.5);
        return yPos + 5;
    }

    // Helper: caja de dato compacta
    function dataCell(label, value, x, yPos, w, h) {
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.rect(x, yPos, w, h);
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray);
        doc.text(label, x + 1.2, yPos + 3);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.black);
        const val = value || '—';
        doc.text(val.toString().substring(0, 30), x + 1.2, yPos + h - 1.5);
    }

    // =========================================================
    // SECCIÓN 1: DATOS DEL SERVICIO
    // =========================================================
    y = sectionTitle('1. DATOS DEL SERVICIO', y);
    const cellH = 9;
    const c3 = cw / 3;
    const c4 = cw / 4;
    const c2 = cw / 2;

    dataCell('FECHA', formatDate(d.fecha), m, y, c4, cellH);
    dataCell('HORA SALIDA', d.horaSalida, m + c4, y, c4, cellH);
    dataCell('HORA LLEGADA', d.horaLlegada, m + c4 * 2, y, c4, cellH);
    dataCell('ESTADO', d.estado || 'Registrado', m + c4 * 3, y, c4, cellH);
    y += cellH;

    dataCell('ORIGEN', d.origen, m, y, c2, cellH);
    dataCell('DESTINO', d.destino, m + c2, y, c2, cellH);
    y += cellH;

    dataCell('KM SALIDA', d.kmSalida, m, y, c4, cellH);
    dataCell('KM LLEGADA', d.kmLlegada, m + c4, y, c4, cellH);
    dataCell('DISTANCIA (KM)', d.distanciaEstimada, m + c4 * 2, y, c4, cellH);
    dataCell('MEDIO', d.medio || 'Celular', m + c4 * 3, y, c4, cellH);
    y += cellH + 1.5;

    // =========================================================
    // SECCIÓN 2: VEHÍCULO Y CONDUCTOR (lado a lado)
    // =========================================================
    const halfW = cw / 2 - 0.75;

    // Vehículo (izquierda)
    y = sectionTitle('2A. VEHÍCULO', y);
    const yVeh = y;
    dataCell('PLACA', d.vPlaca, m, y, halfW / 2, cellH);
    dataCell('TIPO', d.vTipo, m + halfW / 2, y, halfW / 2, cellH);
    y += cellH;
    dataCell('MODELO', d.vModelo, m, y, halfW / 2, cellH);
    dataCell('COLOR', d.vColor, m + halfW / 2, y, halfW / 2, cellH);
    y += cellH;
    dataCell('EMPRESA', d.vEmpresa, m, y, halfW, cellH);
    const yVehEnd = y + cellH;

    // Conductor (derecha) - resetear Y al inicio
    const xR = m + halfW + 1.5;
    doc.setFillColor(...C.primary);
    doc.rect(xR, yVeh - 5, halfW, 5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('2B. CONDUCTOR', xR + 2, yVeh - 1.5);

    let yCon = yVeh;
    dataCell('NOMBRE', d.cNombre, xR, yCon, halfW, cellH);
    yCon += cellH;
    dataCell('LICENCIA', d.cLicencia, xR, yCon, halfW / 3, cellH);
    dataCell('CATEGORÍA', d.cCat, xR + halfW / 3, yCon, halfW / 3, cellH);
    dataCell('VENCE', formatDate(d.cVence), xR + halfW / 3 * 2, yCon, halfW / 3, cellH);
    yCon += cellH;
    dataCell('TELÉFONO', d.cTelefono, xR, yCon, halfW, cellH);

    y = Math.max(yVehEnd, yCon + cellH) + 1.5;

    // =========================================================
    // SECCIÓN 3: ANÁLISIS DE RIESGO
    // =========================================================
    y = sectionTitle('3. ANÁLISIS DE RIESGO VIAL', y);

    const riskItems = [
        ['A. Distancia', d.risk?.distanciaTxt, d.risk?.distancia],
        ['B. Clima', d.risk?.climaTxt, d.risk?.clima],
        ['C. Vehículos/Personas', d.risk?.vehiculosTxt, d.risk?.vehiculos],
        ['D. Condición Vía', d.risk?.viaTxt, d.risk?.via],
        ['E. Comunicaciones', d.risk?.comTxt, d.risk?.comunicaciones],
        ['F. Hrs Trabajadas', d.risk?.fatigaTxt, d.risk?.horas],
        ['G. Hora Traslado', d.risk?.horaTxt, d.risk?.turno === 'noche' ? 8 : 1]
    ];

    const riskColW = [48, cw - 48 - 18, 18];
    const riskRowH = 5;

    // Header de tabla de riesgo
    doc.setFillColor(...C.primaryLight);
    doc.rect(m, y, cw, riskRowH, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.rect(m, y, cw, riskRowH);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.primary);
    doc.text('FACTOR', m + 2, y + 3.5);
    doc.text('CONDICIÓN', m + riskColW[0] + 2, y + 3.5);
    doc.text('PTS', m + riskColW[0] + riskColW[1] + 9, y + 3.5, { align: 'center' });
    y += riskRowH;

    riskItems.forEach((item, i) => {
        const bg = i % 2 === 0 ? C.white : C.lightGray;
        doc.setFillColor(...bg);
        doc.rect(m, y, cw, riskRowH, 'F');
        doc.setDrawColor(...C.border);
        doc.rect(m, y, cw, riskRowH);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.black);
        doc.text(item[0], m + 2, y + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray);
        doc.text(String(item[1] || '—'), m + riskColW[0] + 2, y + 3.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.primary);
        doc.text(String(item[2] || 0), m + riskColW[0] + riskColW[1] + 9, y + 3.5, { align: 'center' });
        y += riskRowH;
    });

    // TOTAL de riesgo
    const totalRisk = d.risk?.score || 0;
    const levelRisk = d.risk?.level || 'BAJO';
    const levelColors = { 'BAJO': C.green, 'MEDIO': C.yellow, 'ALTO': C.red };
    const levelBgColors = { 'BAJO': C.greenBg, 'MEDIO': C.yellowBg, 'ALTO': C.redBg };

    doc.setFillColor(...(levelBgColors[levelRisk] || C.greenBg));
    doc.rect(m, y, cw, 6, 'F');
    doc.setDrawColor(...C.border);
    doc.rect(m, y, cw, 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(levelColors[levelRisk] || C.green));
    doc.text(`TOTAL: ${totalRisk} pts`, m + 2, y + 4.2);
    doc.text(`NIVEL DE RIESGO: ${levelRisk}`, pw - m - 2, y + 4.2, { align: 'right' });
    y += 7.5;

    // =========================================================
    // SECCIÓN 4 y 5: CHECK PREVIAJE + TEST FATIGA (lado a lado)
    // =========================================================
    const checkW = cw / 2 - 0.75;
    const checkRowH = 4.5;
    const si = (v) => v ? '✓ SÍ' : '✗ NO';
    const siColor = (v) => v ? C.green : C.red;

    // — 4. Previaje (izquierda) —
    doc.setFillColor(...C.primary);
    doc.rect(m, y, checkW, 5, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('4. CHECK LIST PREVIO VIAJE', m + 2, y + 3.5);

    // — 5. Fatiga (derecha) —
    const xF = m + checkW + 1.5;
    doc.setFillColor(...C.primary);
    doc.rect(xF, y, checkW, 5, 'F');
    doc.text('5. TEST DE FATIGA / SOMNOLENCIA', xF + 2, y + 3.5);
    y += 5;

    const prevItems = [
        ['Conoce riesgos locales', d.previaje?.riesgos],
        ['No transportar personal ajeno', d.previaje?.personal],
        ['Inspección pre-operacional OK', d.previaje?.inspeccion],
        ['Cinturón de seguridad OK', d.previaje?.cinturon]
    ];

    const fatItems = [
        ['Sin sustancias psicoactivas', d.fatiga?.sustancias],
        ['Durmió al menos 8 horas', d.fatiga?.descanso],
        ['Óptimas condiciones físicas', d.fatiga?.condiciones],
        ['Conoce peligros del viaje', d.fatiga?.peligros],
        ['No usa celular al conducir', d.fatiga?.celular]
    ];

    const maxRows = Math.max(prevItems.length, fatItems.length);

    for (let i = 0; i < maxRows; i++) {
        const bg = i % 2 === 0 ? C.white : C.lightGray;

        // Previaje
        if (i < prevItems.length) {
            doc.setFillColor(...bg);
            doc.rect(m, y, checkW, checkRowH, 'F');
            doc.setDrawColor(...C.border);
            doc.rect(m, y, checkW, checkRowH);
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.black);
            doc.text(prevItems[i][0], m + 1.5, y + 3.2);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...siColor(prevItems[i][1]));
            doc.text(si(prevItems[i][1]), m + checkW - 2, y + 3.2, { align: 'right' });
        }

        // Fatiga
        if (i < fatItems.length) {
            doc.setFillColor(...bg);
            doc.rect(xF, y, checkW, checkRowH, 'F');
            doc.setDrawColor(...C.border);
            doc.rect(xF, y, checkW, checkRowH);
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.black);
            doc.text(fatItems[i][0], xF + 1.5, y + 3.2);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...siColor(fatItems[i][1]));
            doc.text(si(fatItems[i][1]), xF + checkW - 2, y + 3.2, { align: 'right' });
        }

        y += checkRowH;
    }

    y += 1.5;

    // =========================================================
    // SECCIÓN 6: PUNTOS DE CONTROL (si existen)
    // =========================================================
    if (d.puntosControl && d.puntosControl.length > 0) {
        y = sectionTitle('6. PUNTOS DE CONTROL EN RUTA', y);
        d.puntosControl.forEach((p, i) => {
            const bg = i % 2 === 0 ? C.white : C.lightGray;
            doc.setFillColor(...bg);
            doc.rect(m, y, cw, checkRowH, 'F');
            doc.setDrawColor(...C.border);
            doc.rect(m, y, cw, checkRowH);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.black);
            doc.text(`${i + 1}. ${p.l}`, m + 2, y + 3.2);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C.primary);
            doc.text(p.h || '—', pw - m - 2, y + 3.2, { align: 'right' });
            y += checkRowH;
        });
        y += 1.5;
    }

    // =========================================================
    // SECCIÓN 7: FIRMAS
    // =========================================================
    const sigSectionTitle = d.puntosControl && d.puntosControl.length > 0 ? '7. AUTORIZACIÓN Y FIRMAS' : '6. AUTORIZACIÓN Y FIRMAS';
    y = sectionTitle(sigSectionTitle, y);

    const sigW = (cw - 3) / 3;
    const sigH = Math.min(ph - y - 14, 26); // Ajustar para que quepa en la página

    const sigBoxes = [
        { x: m, label: 'FIRMA CONDUCTOR', name: d.cNombre || '', key: 'conductor' },
        { x: m + sigW + 1.5, label: 'FIRMA HSE', name: 'Profesional HSE', key: 'hse' },
        { x: m + sigW * 2 + 3, label: 'FIRMA GERENCIA', name: 'Gerencia', key: 'gerencia' }
    ];

    sigBoxes.forEach(box => {
        const sigData = d.signatures?.[box.key];

        // Fondo
        doc.setFillColor(...C.lightGray);
        doc.roundedRect(box.x, y, sigW, sigH, 1, 1, 'F');
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.3);
        doc.roundedRect(box.x, y, sigW, sigH, 1, 1, 'S');

        // Firma como imagen
        if (sigData && sigH > 10) {
            try {
                doc.addImage(sigData, 'PNG', box.x + 3, y + 1, sigW - 6, sigH - 10);
            } catch (e) { }
        } else {
            // Línea para firma manual
            doc.setDrawColor(...C.gray);
            doc.setLineWidth(0.3);
            doc.line(box.x + 5, y + sigH - 10, box.x + sigW - 5, y + sigH - 10);
        }

        // Labels
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.primary);
        doc.text(box.label, box.x + sigW / 2, y + sigH - 5, { align: 'center' });

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray);
        doc.text(box.name || '_______________', box.x + sigW / 2, y + sigH - 1.5, { align: 'center' });
    });

    // =========================================================
    // FOOTER
    // =========================================================
    doc.setFontSize(5.5);
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha documento: ${formatDate(d.created_at)}`, m, ph - m);
    doc.text('Trans Services A&B — Documento generado digitalmente', pw / 2, ph - m, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, pw - m, ph - m, { align: 'right' });

    // =========================================================
    // GUARDAR
    // =========================================================
    const fileName = `STE-F-010_${d.vPlaca || 'SinPlaca'}_${d.fecha || 'SinFecha'}.pdf`;
    doc.save(fileName);
}
