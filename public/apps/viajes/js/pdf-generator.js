// pdf-generator.js - Generador Oficial de PDF STE-F-010 para Trans Services A&B
// Formato profesional de alta densidad en tamaño Carta con 100% de retención de datos

function normalizeTripData(data) {
    if (!data) return null;

    // Si ya está normalizado (proviene directamente del formulario activo), retornar
    if (data.horaSalida !== undefined && data.hora_salida === undefined && data.vPlaca !== undefined) return data;

    // Normalizar desde base de datos Supabase (snake_case / JSONB → modelo completo)
    const ri = data.risk_inputs || {};
    const rDistancia = parseInt(ri.rDistancia) || 0;
    const rClima = parseInt(ri.rClima) || 0;
    const rVehiculos = parseInt(ri.rVehiculos) || 0;
    const rVia = parseInt(ri.rVia) || 0;
    const rCom = parseInt(ri.rCom) || 0;
    const rFatiga = parseInt(ri.rFatiga) || 0;
    const rHora = parseInt(ri.rHora) || 0;
    const totalScore = data.risk_score || (rDistancia + rClima + rVehiculos + rVia + rCom + rFatiga + rHora);

    const distanciaTxt = { 1: '< 50 KM', 2: '< 100 KM', 5: '< 200 KM', 8: '> 200 KM' }[rDistancia] || (rDistancia ? `${rDistancia} pts` : 'N/A');
    const climaTxt = { 2: 'SECO / NORMALES', 4: 'LLUVIA SUAVE', 8: 'LLUVIA FUERTE / NIEBLA' }[rClima] || (rClima ? `${rClima} pts` : 'N/A');
    const vehiculosTxt = { 1: '1 VEH / 1 PER', 2: '1 VEH / 2+ PER', 3: '2+ VEH / 1+ PER', 6: '2+ VEH / 2+ PER' }[rVehiculos] || (rVehiculos ? `${rVehiculos} pts` : 'N/A');
    const viaTxt = { 1: 'PAVIMENTADA', 2: 'MIXTA', 4: 'NO PAVIMENTADA' }[rVia] || (rVia ? `${rVia} pts` : 'N/A');
    const comTxt = { 0: 'CEL. DISPONIBLE', 2: 'SIN COM./CARAVANA', 4: 'SIN COMUNICACIÓN' }[rCom] || (rCom ? `${rCom} pts` : 'N/A');
    const fatigaTxt = { 1: '< 12 Hrs', 3: '< 14 Hrs', 6: '< 16 Hrs' }[rFatiga] || (rFatiga ? `${rFatiga} pts` : 'N/A');
    const horaTxt = rHora === 8 ? 'NOCHE (18-6)' : (rHora === 1 ? 'DÍA (6-18)' : 'DÍA (6-18)');

    const ctrl = data.control || {};
    const prev = data.previaje || {};
    const fat = data.fatiga || {};
    const sigs = data.signatures || {};

    return {
        id: data.id || '',
        fecha: data.fecha || '',
        horaSalida: data.hora_salida || data.horaSalida || '',
        horaLlegada: data.hora_llegada || data.horaLlegada || '',
        origen: data.origen || '',
        destino: data.destino || '',
        kmSalida: data.km_salida != null ? String(data.km_salida) : (data.kmSalida || ''),
        kmLlegada: data.km_llegada != null ? String(data.km_llegada) : (data.kmLlegada || ''),
        distanciaEstimada: data.distancia_km != null ? String(data.distancia_km) : (data.distanciaEstimada || ''),
        vPlaca: data.vehiculo_placa || data.vPlaca || '',
        vModelo: data.vehiculo_modelo || data.vModelo || '',
        vColor: data.vehiculo_color || data.vColor || '',
        vTipo: data.vehiculo_tipo || data.vTipo || '',
        vEmpresa: data.vehiculo_empresa || data.vEmpresa || '',
        cNombre: data.conductor_nombre || data.cNombre || '',
        cLicencia: data.conductor_licencia || data.cLicencia || '',
        cCat: data.conductor_categoria || data.cCat || '',
        cVence: data.conductor_vencimiento || data.cVence || '',
        cTelefono: data.conductor_telefono || data.cTelefono || '',
        rutograma: data.rutograma || data.rutograma_url || null,
        observaciones: data.observaciones || '',
        medio: data.medio || 'Celular',
        gpsSalida: data.gps_salida || (typeof data.gpsSalida === 'object' ? JSON.stringify(data.gpsSalida) : data.gpsSalida) || '',
        gpsLlegada: data.gps_llegada || (typeof data.gpsLlegada === 'object' ? JSON.stringify(data.gpsLlegada) : data.gpsLlegada) || '',
        estado: data.estado || 'Registrado',
        risk: {
            distancia: rDistancia, clima: rClima, vehiculos: rVehiculos,
            via: rVia, comunicaciones: rCom, horas: rFatiga,
            turno: rHora === 8 ? 'noche' : 'dia',
            score: totalScore,
            level: totalScore <= 15 ? 'BAJO' : (totalScore <= 23 ? 'MEDIO' : 'ALTO'),
            distanciaTxt, climaTxt, vehiculosTxt, viaTxt, comTxt, fatigaTxt, horaTxt
        },
        previaje: {
            riesgos: prev.riesgos === true || prev.riesgos === 'true',
            personal: prev.personal === true || prev.personal === 'true',
            inspeccion: prev.inspeccion === true || prev.inspeccion === 'true',
            cinturon: prev.cinturon === true || prev.cinturon === 'true'
        },
        fatiga: {
            sustancias: fat.sustancias === true || fat.sustancias === 'true',
            descanso: fat.descanso === true || fat.descanso === 'true',
            condiciones: fat.condiciones === true || fat.condiciones === 'true',
            peligros: fat.peligros === true || fat.peligros === 'true',
            celular: fat.celular === true || fat.celular === 'true'
        },
        control: {
            dia1: ctrl.dia1 === true || ctrl.dia1 === 'true' || ctrl.diasTrabajados === 'dia1',
            dia2: ctrl.dia2 === true || ctrl.dia2 === 'true' || ctrl.diasTrabajados === 'dia2',
            fechaRHA: ctrl.fechaRHA || data.fecha_rha || data.fecha || ''
        },
        puntosControl: (data.puntos_control || data.puntosControl || []).map(p => ({
            l: p.l || p.lugar || '',
            h: p.h || p.hora || ''
        })).filter(p => p.l !== ''),
        signatures: {
            conductor: sigs.conductor || (typeof sigs === 'string' ? sigs : null),
            hse: sigs.hse || null,
            gerencia: sigs.gerencia || null,
            conductor_fecha: sigs.conductor_fecha || data.created_at || '',
            hse_fecha: sigs.hse_fecha || '',
            gerencia_fecha: sigs.gerencia_fecha || ''
        },
        created_at: data.created_at || data.fecha || new Date().toISOString()
    };
}

async function loadLogoImage() {
    const urls = ['/logo.png', './assets/logo.png', '../assets/logo.png', '/assets/logo.png'];
    for (const u of urls) {
        try {
            const resp = await fetch(u);
            if (resp.ok) {
                const blob = await resp.blob();
                return await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) { }
    }
    return null;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const clean = dateStr.split('T')[0];
        const [y, m, d] = clean.split('-');
        if (y && m && d) return `${d}/${m}/${y}`;
        const dt = new Date(dateStr);
        if (!isNaN(dt.getTime())) return dt.toLocaleDateString('es-CO');
    } catch (e) { }
    return dateStr;
}

function formatGPS(val) {
    if (!val) return 'No registrada';
    if (typeof val === 'object') {
        if (val.lat && val.lng) return `${val.lat.toFixed(5)}, ${val.lng.toFixed(5)}`;
        return JSON.stringify(val);
    }
    const str = String(val).trim();
    return str || 'No registrada';
}

// Paleta corporativa institucional
const PALETTE = {
    primary: [30, 58, 138],       // Azul Institucional #1E3A8A
    primaryDark: [15, 23, 42],     // Asphalt 900
    primaryLight: [239, 246, 255], // Azul Hielo #EFF6FF
    accent: [14, 116, 144],        // Cyan Radar #0E7490
    textMain: [15, 23, 42],        // Texto Principal
    textMuted: [71, 85, 105],      // Slate 600
    textLight: [148, 163, 184],    // Slate 400
    border: [203, 213, 225],       // Slate 300
    borderLight: [226, 232, 240],  // Slate 200
    bgCard: [248, 250, 252],       // Slate 50
    white: [255, 255, 255],
    green: [22, 163, 74],          // OK Green
    greenBg: [240, 253, 244],
    greenBorder: [187, 247, 208],
    yellow: [202, 138, 4],         // Warning Yellow
    yellowBg: [254, 252, 232],
    yellowBorder: [254, 240, 138],
    red: [220, 38, 38],            // Alert Red
    redBg: [254, 242, 242],
    redBorder: [254, 202, 202]
};

export async function generatePDF(data) {
    if (!window.jspdf) {
        if (typeof TS !== 'undefined' && TS.toastError) {
            TS.toastError('Error: La librería jsPDF no está disponible en la ventana.');
        } else {
            alert('Error: La librería jsPDF no está disponible.');
        }
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter',
        compress: true
    });

    const pw = doc.internal.pageSize.getWidth();   // 215.9 mm
    const ph = doc.internal.pageSize.getHeight();  // 279.4 mm
    const m = 6;                                   // Margen exterior 6mm
    const cw = pw - (m * 2);                       // Ancho útil = 203.9 mm

    // --- 1. CAPTURA Y NORMALIZACIÓN DE DATOS ---
    let d;
    if (!data) {
        // Captura directa desde el formulario DOM
        const gv = (id) => document.getElementById(id)?.value?.trim() || '';
        const gc = (id) => document.getElementById(id)?.checked || false;
        const gr = (name) => parseInt(document.querySelector(`input[name="${name}"]:checked`)?.value) || 0;

        const rD = gr('rDistancia'), rCl = gr('rClima'), rV = gr('rVehiculos');
        const rVi = gr('rVia'), rCo = gr('rCom'), rF = gr('rFatiga'), rH = gr('rHora');
        const ts = rD + rCl + rV + rVi + rCo + rF + rH;

        d = {
            id: '',
            fecha: gv('fecha'),
            horaSalida: gv('horaSalida'),
            horaLlegada: gv('horaLlegada'),
            origen: gv('origen'),
            destino: gv('destino'),
            kmSalida: gv('kmSalida'),
            kmLlegada: gv('kmLlegada'),
            distanciaEstimada: gv('distanciaEstimada'),
            vPlaca: gv('vPlaca'),
            vModelo: gv('vModelo'),
            vColor: gv('vColor'),
            vTipo: gv('vTipo'),
            vEmpresa: gv('vEmpresa'),
            cNombre: gv('cNombre'),
            cLicencia: gv('cLicencia'),
            cCat: gv('cCat'),
            cVence: gv('cVence'),
            cTelefono: gv('cTelefono'),
            rutograma: document.getElementById('rutogramaImg')?.getAttribute('src') || null,
            observaciones: gv('observaciones'),
            medio: document.querySelector('input[name="medio"]:checked')?.value || 'Celular',
            gpsSalida: document.getElementById('gpsSalidaStatus')?.textContent || '',
            gpsLlegada: document.getElementById('gpsLlegadaStatus')?.textContent || '',
            estado: 'Registrado',
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
            previaje: {
                riesgos: gc('cp_riesgos'),
                personal: gc('cp_personal'),
                inspeccion: gc('cp_inspeccion'),
                cinturon: gc('cp_cinturon')
            },
            fatiga: {
                sustancias: gc('tf_sustancias'),
                descanso: gc('tf_descanso'),
                condiciones: gc('tf_condiciones'),
                peligros: gc('tf_peligros'),
                celular: gc('tf_celular')
            },
            control: {
                dia1: gc('dia1'),
                dia2: gc('dia2'),
                fechaRHA: gv('fechaRHA') || gv('fecha')
            },
            puntosControl: Array.from(document.querySelectorAll('#puntosControlContainer > div')).map(row => ({
                l: row.querySelector('input[name="pc_lugar[]"]')?.value?.trim() || '',
                h: row.querySelector('input[name="pc_hora[]"]')?.value?.trim() || ''
            })).filter(p => p.l !== ''),
            signatures: {},
            created_at: new Date().toISOString()
        };

        const sigC = document.getElementById('signatureCanvasConductor');
        if (sigC && sigC.getAttribute('data-signed') === 'true') {
            try { d.signatures.conductor = sigC.toDataURL(); } catch (e) { }
        }
    } else {
        d = normalizeTripData(data);
    }

    const logoBase64 = await loadLogoImage();

    // =========================================================
    // HEADER OFICIAL DEL SISTEMA INTEGRADO DE GESTIÓN (SIG)
    // =========================================================
    const headerH = 17;
    const colLogoW = 34;
    const colDocW = 46;
    const colTitleW = cw - colLogoW - colDocW;

    // Contorno exterior del encabezado
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.35);
    doc.setFillColor(...PALETTE.white);
    doc.rect(m, m, cw, headerH, 'FD');

    // División Columna 1: Logo
    doc.line(m + colLogoW, m, m + colLogoW, m + headerH);
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', m + 2, m + 1.5, colLogoW - 4, headerH - 3);
        } catch (e) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PALETTE.primary);
            doc.text('TRANS SERVICES A&B', m + colLogoW / 2, m + headerH / 2, { align: 'center' });
        }
    } else {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.primary);
        doc.text('TRANS SERVICES A&B', m + colLogoW / 2, m + headerH / 2, { align: 'center' });
    }

    // División Columna 2: Títulos Institucionales
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.primaryDark);
    doc.text('COOPERATIVA DE TRANSPORTES Y SERVICIOS A&B', m + colLogoW + (colTitleW / 2), m + 4.5, { align: 'center' });

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PALETTE.textMuted);
    doc.text('SISTEMA DE GESTIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO Y PESV', m + colLogoW + (colTitleW / 2), m + 8, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.primary);
    doc.text('PLAN DE GERENCIAMIENTO DE VIAJES', m + colLogoW + (colTitleW / 2), m + 13.5, { align: 'center' });

    // División Columna 3: Control Documental
    const xDoc = m + colLogoW + colTitleW;
    doc.line(xDoc, m, xDoc, m + headerH);

    const docRowH = headerH / 4;
    for (let i = 1; i < 4; i++) {
        doc.line(xDoc, m + (docRowH * i), m + cw, m + (docRowH * i));
    }

    function renderDocHeaderRow(label, value, rowIdx, valColor = PALETTE.primaryDark, valBold = true) {
        const yRow = m + (docRowH * rowIdx);
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PALETTE.textMuted);
        doc.text(label, xDoc + 2, yRow + 3);

        doc.setFontSize(6);
        doc.setFont('helvetica', valBold ? 'bold' : 'normal');
        doc.setTextColor(...valColor);
        doc.text(String(value || '—'), m + cw - 2, yRow + 3, { align: 'right' });
    }

    renderDocHeaderRow('CÓDIGO:', 'STE-F-010', 0, PALETTE.primary, true);
    renderDocHeaderRow('VERSIÓN:', '03', 1, PALETTE.primaryDark, true);
    renderDocHeaderRow('VIGENCIA:', '2026', 2, PALETTE.textMuted, false);

    const estadoNorm = (d.estado || 'REGISTRADO').toUpperCase();
    const estadoColor = estadoNorm.includes('FINALIZADO') || estadoNorm.includes('AUTORIZADO')
        ? PALETTE.green
        : (estadoNorm.includes('ALTO') ? PALETTE.red : PALETTE.yellow);
    renderDocHeaderRow('ESTADO:', estadoNorm, 3, estadoColor, true);

    let y = m + headerH + 2;

    // =========================================================
    // HELPERS DE RENDERIZADO TÉCNICO
    // =========================================================
    function drawSectionHeader(title, yPos) {
        doc.setFillColor(...PALETTE.primary);
        doc.rect(m, yPos, cw, 4.5, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.white);
        doc.text(title, m + 2.5, yPos + 3.2);
        return yPos + 4.5;
    }

    function drawCell(label, value, xPos, yPos, cellW, cellH, isHighlight = false) {
        doc.setDrawColor(...PALETTE.border);
        doc.setLineWidth(0.2);
        doc.setFillColor(...(isHighlight ? PALETTE.primaryLight : PALETTE.white));
        doc.rect(xPos, yPos, cellW, cellH, 'FD');

        doc.setFontSize(4.8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.textMuted);
        doc.text(label.toUpperCase(), xPos + 1.2, yPos + 2.4);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
        doc.setTextColor(...(isHighlight ? PALETTE.primary : PALETTE.textMain));
        const valStr = value != null && String(value).trim() !== '' ? String(value) : '—';
        doc.text(valStr, xPos + 1.2, yPos + cellH - 1.2, { maxWidth: cellW - 2.4 });
    }

    // =========================================================
    // SECCIÓN 1: INFORMACIÓN GENERAL DEL SERVICIO Y TRAYECTO
    // =========================================================
    y = drawSectionHeader('1. INFORMACIÓN GENERAL DEL SERVICIO Y TRAYECTO', y);
    const cH = 6.8;
    const w4 = cw / 4;
    const w2 = cw / 2;

    // Fila 1: Fecha, Hora Salida, Hora Llegada, Estado
    drawCell('Fecha del Viaje', formatDate(d.fecha), m, y, w4, cH, true);
    drawCell('Hora Salida', d.horaSalida || '—', m + w4, y, w4, cH);
    drawCell('Hora Llegada', d.horaLlegada || 'En curso', m + w4 * 2, y, w4, cH);
    drawCell('Folio / ID Registro', d.id ? String(d.id).slice(-10).toUpperCase() : 'PENDIENTE', m + w4 * 3, y, w4, cH);
    y += cH;

    // Fila 2: Origen, Destino, Días Trabajados, Medio de Reporte
    drawCell('Origen', d.origen, m, y, w4 * 1.2, cH);
    drawCell('Destino', d.destino, m + w4 * 1.2, y, w4 * 1.2, cH);
    const diaTrabTxt = d.control?.dia2 ? 'Día 2 (Continuo)' : (d.control?.dia1 ? 'Día 1' : 'Día 1');
    drawCell('Jornada / Días', diaTrabTxt, m + w4 * 2.4, y, w4 * 0.8, cH);
    drawCell('Medio de Reporte', d.medio || 'Celular', m + w4 * 3.2, y, w4 * 0.8, cH);
    y += cH;

    // Fila 3: Kilometraje y Divulgación RHA
    drawCell('KM Inicial (Salida)', d.kmSalida ? `${d.kmSalida} km` : '—', m, y, w4, cH);
    drawCell('KM Final (Llegada)', d.kmLlegada ? `${d.kmLlegada} km` : 'Pendiente', m + w4, y, w4, cH);
    drawCell('Distancia Recorrida', d.distanciaEstimada ? `${d.distanciaEstimada} km` : '—', m + w4 * 2, y, w4, cH, true);
    drawCell('Fecha Divulgación RHA', formatDate(d.control?.fechaRHA || d.fecha), m + w4 * 3, y, w4, cH);
    y += cH;

    // Fila 4: Geolocalización GPS Salida y Llegada
    drawCell('Geolocalización GPS Salida', formatGPS(d.gpsSalida), m, y, w2, cH);
    drawCell('Geolocalización GPS Llegada', formatGPS(d.gpsLlegada), m + w2, y, w2, cH);
    y += cH + 1.5;

    // =========================================================
    // SECCIÓN 2: DATOS DEL VEHÍCULO Y DEL CONDUCTOR (2 Columnas)
    // =========================================================
    const halfW = (cw - 1.5) / 2;
    const ySec2 = y;

    // 2A. VEHÍCULO
    doc.setFillColor(...PALETTE.primary);
    doc.rect(m, y, halfW, 4.2, 'F');
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.white);
    doc.text('2A. DATOS DEL VEHÍCULO', m + 2, y + 3);

    let yV = y + 4.2;
    drawCell('Placa', d.vPlaca, m, yV, halfW / 2, cH, true);
    drawCell('Tipo de Vehículo', d.vTipo || 'Camioneta', m + halfW / 2, yV, halfW / 2, cH);
    yV += cH;
    drawCell('Modelo', d.vModelo, m, yV, halfW / 2, cH);
    drawCell('Color', d.vColor, m + halfW / 2, yV, halfW / 2, cH);
    yV += cH;
    drawCell('Empresa Propietaria / Contratista', d.vEmpresa || 'TRANS SERVICES A&B', m, yV, halfW, cH);
    yV += cH;

    // 2B. CONDUCTOR
    const xC = m + halfW + 1.5;
    doc.setFillColor(...PALETTE.primary);
    doc.rect(xC, ySec2, halfW, 4.2, 'F');
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.white);
    doc.text('2B. DATOS DEL CONDUCTOR', xC + 2, ySec2 + 3);

    let yC = ySec2 + 4.2;
    drawCell('Nombre Completo del Conductor', d.cNombre, xC, yC, halfW, cH, true);
    yC += cH;
    drawCell('N° Licencia', d.cLicencia, xC, yC, halfW / 3, cH);
    drawCell('Categoría', d.cCat, xC + halfW / 3, yC, halfW / 3, cH);
    drawCell('Vencimiento Licencia', formatDate(d.cVence), xC + (halfW / 3) * 2, yC, halfW / 3, cH);
    yC += cH;
    drawCell('Teléfono / Celular de Contacto', d.cTelefono, xC, yC, halfW, cH);
    yC += cH;

    y = Math.max(yV, yC) + 1.5;

    // =========================================================
    // SECCIÓN 3: MATRIZ DE ANÁLISIS DE RIESGO VIAL (7 Factores)
    // =========================================================
    y = drawSectionHeader('3. EVALUACIÓN DE FACTORES DE RIESGO VIAL (PESV)', y);

    const riskFactors = [
        { cod: 'A', name: 'Distancia a Recorrer', desc: d.risk?.distanciaTxt, pts: d.risk?.distancia },
        { cod: 'B', name: 'Condiciones Climáticas', desc: d.risk?.climaTxt, pts: d.risk?.clima },
        { cod: 'C', name: 'Vehículos y Ocupantes', desc: d.risk?.vehiculosTxt, pts: d.risk?.vehiculos },
        { cod: 'D', name: 'Estado de la Vía', desc: d.risk?.viaTxt, pts: d.risk?.via },
        { cod: 'E', name: 'Medios de Comunicación', desc: d.risk?.comTxt, pts: d.risk?.comunicaciones },
        { cod: 'F', name: 'Horas Laboradas + Traslado', desc: d.risk?.fatigaTxt, pts: d.risk?.horas },
        { cod: 'G', name: 'Horario del Desplazamiento', desc: d.risk?.horaTxt, pts: d.risk?.turno === 'noche' ? 8 : 1 }
    ];

    const rRowH = 4.2;
    const colRisk0 = 38;
    const colRisk1 = cw - colRisk0 - 16;
    const colRisk2 = 16;

    // Encabezado de la tabla de riesgo
    doc.setFillColor(...PALETTE.primaryLight);
    doc.rect(m, y, cw, rRowH, 'F');
    doc.setDrawColor(...PALETTE.border);
    doc.rect(m, y, cw, rRowH);
    doc.setFontSize(5.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.primary);
    doc.text('FACTOR DE RIESGO', m + 2, y + 2.9);
    doc.text('CONDICIÓN EVALUADA EN RUTA', m + colRisk0 + 2, y + 2.9);
    doc.text('PUNTOS', m + colRisk0 + colRisk1 + (colRisk2 / 2), y + 2.9, { align: 'center' });
    y += rRowH;

    riskFactors.forEach((rf, idx) => {
        const rowBg = idx % 2 === 0 ? PALETTE.white : PALETTE.bgCard;
        doc.setFillColor(...rowBg);
        doc.rect(m, y, cw, rRowH, 'F');
        doc.setDrawColor(...PALETTE.borderLight);
        doc.rect(m, y, cw, rRowH);

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.textMain);
        doc.text(`${rf.cod}. ${rf.name}`, m + 2, y + 2.9);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PALETTE.textMuted);
        doc.text(String(rf.desc || '—'), m + colRisk0 + 2, y + 2.9);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.primary);
        doc.text(String(rf.pts || 0), m + colRisk0 + colRisk1 + (colRisk2 / 2), y + 2.9, { align: 'center' });
        y += rRowH;
    });

    // Barra de Nivel de Riesgo Consolidado
    const scoreVal = d.risk?.score || 0;
    const lvlVal = d.risk?.level || (scoreVal <= 15 ? 'BAJO' : (scoreVal <= 23 ? 'MEDIO' : 'ALTO'));
    const lvlColor = lvlVal === 'ALTO' ? PALETTE.red : (lvlVal === 'MEDIO' ? PALETTE.yellow : PALETTE.green);
    const lvlBg = lvlVal === 'ALTO' ? PALETTE.redBg : (lvlVal === 'MEDIO' ? PALETTE.yellowBg : PALETTE.greenBg);
    const lvlBorder = lvlVal === 'ALTO' ? PALETTE.redBorder : (lvlVal === 'MEDIO' ? PALETTE.yellowBorder : PALETTE.greenBorder);

    doc.setFillColor(...lvlBg);
    doc.setDrawColor(...lvlBorder);
    doc.rect(m, y, cw, 5.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.primaryDark);
    doc.text(`PUNTAJE TOTAL: ${scoreVal} PUNTOS`, m + 3, y + 3.8);

    doc.setFontSize(7.5);
    doc.setTextColor(...lvlColor);
    doc.text(`NIVEL DE RIESGO: ${lvlVal} ${lvlVal === 'BAJO' ? '(≤ 15 Pts)' : (lvlVal === 'MEDIO' ? '(16-23 Pts · Requiere Firma HSE)' : '(> 23 Pts · Requiere Aprobación Gerencia)')}`, m + cw - 3, y + 3.8, { align: 'right' });
    y += 7.0;

    // =========================================================
    // SECCIÓN 4, 5 Y 6: VERIFICACIONES, TEST FATIGA, RUTOGRAMA Y PUNTOS (3 Columnas)
    // =========================================================
    const w3Col = (cw - 3) / 3;
    const yGrid3 = y;

    const checkRowH = 4.3;
    const renderCheck = (v) => (v ? '✓ CUMPLE' : '✗ NO CUMPLE');
    const renderCheckCol = (v) => (v ? PALETTE.green : PALETTE.red);

    // 4. CHECK LIST PREVIAJE (Columna 1)
    doc.setFillColor(...PALETTE.primary);
    doc.rect(m, yGrid3, w3Col, 4.2, 'F');
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.white);
    doc.text('4. VERIFICACIÓN PRE-VIAJE', m + 2, yGrid3 + 3);

    let y4 = yGrid3 + 4.2;
    const prevItems = [
        { label: 'Conoce riesgos locales', val: d.previaje?.riesgos },
        { label: 'No transportar ajenos', val: d.previaje?.personal },
        { label: 'Preoperacional OK', val: d.previaje?.inspeccion },
        { label: 'Cinturón de seguridad', val: d.previaje?.cinturon }
    ];

    prevItems.forEach((it, i) => {
        doc.setFillColor(...(i % 2 === 0 ? PALETTE.white : PALETTE.bgCard));
        doc.rect(m, y4, w3Col, checkRowH, 'F');
        doc.setDrawColor(...PALETTE.borderLight);
        doc.rect(m, y4, w3Col, checkRowH);

        doc.setFontSize(5.0);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PALETTE.textMain);
        doc.text(it.label, m + 1.5, y4 + 2.8);

        doc.setFontSize(5.0);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...renderCheckCol(it.val));
        doc.text(renderCheck(it.val), m + w3Col - 1.5, y4 + 2.8, { align: 'right' });
        y4 += checkRowH;
    });

    // 5. TEST DE FATIGA (Columna 2)
    const x5 = m + w3Col + 1.5;
    doc.setFillColor(...PALETTE.primary);
    doc.rect(x5, yGrid3, w3Col, 4.2, 'F');
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.white);
    doc.text('5. TEST DE FATIGA / APTITUD', x5 + 2, yGrid3 + 3);

    let y5 = yGrid3 + 4.2;
    const fatItems = [
        { label: 'Sin sustancias psicoactivas', val: d.fatiga?.sustancias },
        { label: 'Descanso mínimo 8 horas', val: d.fatiga?.descanso },
        { label: 'Condiciones físicas óptimas', val: d.fatiga?.condiciones },
        { label: 'Conocimiento de peligros', val: d.fatiga?.peligros },
        { label: 'Prohibido uso de celular', val: d.fatiga?.celular }
    ];

    fatItems.forEach((it, i) => {
        doc.setFillColor(...(i % 2 === 0 ? PALETTE.white : PALETTE.bgCard));
        doc.rect(x5, y5, w3Col, checkRowH, 'F');
        doc.setDrawColor(...PALETTE.borderLight);
        doc.rect(x5, y5, w3Col, checkRowH);

        doc.setFontSize(5.0);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PALETTE.textMain);
        doc.text(it.label, x5 + 1.5, y5 + 2.8);

        doc.setFontSize(5.0);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...renderCheckCol(it.val));
        doc.text(renderCheck(it.val), x5 + w3Col - 1.5, y5 + 2.8, { align: 'right' });
        y5 += checkRowH;
    });

    // 6. RUTOGRAMA Y PUNTOS DE CONTROL (Columna 3)
    const x6 = m + (w3Col * 2) + 3;
    doc.setFillColor(...PALETTE.primary);
    doc.rect(x6, yGrid3, w3Col, 4.2, 'F');
    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.white);
    doc.text('6. RUTOGRAMA & PUNTOS CONTROL', x6 + 2, yGrid3 + 3);

    let y6 = yGrid3 + 4.2;
    const col3TotalH = Math.max(y4, y5) - yGrid3 - 4.2;

    doc.setFillColor(...PALETTE.bgCard);
    doc.rect(x6, y6, w3Col, col3TotalH, 'F');
    doc.setDrawColor(...PALETTE.borderLight);
    doc.rect(x6, y6, w3Col, col3TotalH);

    // Si existe imagen de rutograma, incrustar miniatura
    if (d.rutograma && typeof d.rutograma === 'string' && d.rutograma.startsWith('data:image')) {
        try {
            const imgH = 12;
            doc.addImage(d.rutograma, 'JPEG', x6 + 1.5, y6 + 1, w3Col - 3, imgH);
            y6 += imgH + 1.5;
        } catch (e) { }
    }

    // Puntos de control
    if (d.puntosControl && d.puntosControl.length > 0) {
        doc.setFontSize(4.8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.primary);
        doc.text('Puntos de Reporte en Ruta:', x6 + 2, y6 + 2.5);
        y6 += 3.2;

        d.puntosControl.slice(0, 3).forEach((pc, i) => {
            doc.setFontSize(4.6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...PALETTE.textMain);
            doc.text(`${i + 1}. ${pc.l.substring(0, 18)}`, x6 + 2, y6 + 2.2);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PALETTE.primary);
            doc.text(pc.h || '—', x6 + w3Col - 2, y6 + 2.2, { align: 'right' });
            y6 += 2.8;
        });
    } else {
        doc.setFontSize(5.0);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...PALETTE.textMuted);
        doc.text('Ruta directa estándar.', x6 + 2, y6 + 4);
        doc.text('Sin paradas intermedias >2h.', x6 + 2, y6 + 7.5);
    }

    y = Math.max(y4, y5, yGrid3 + 4.2 + col3TotalH) + 1.5;

    // =========================================================
    // SECCIÓN 7: OBSERVACIONES Y RECOMENDACIONES DE RUTA
    // =========================================================
    y = drawSectionHeader('7. OBSERVACIONES, RECOMENDACIONES Y NOVEDADES EN RUTA', y);
    const obsH = 7.5;
    doc.setDrawColor(...PALETTE.border);
    doc.setFillColor(...PALETTE.white);
    doc.rect(m, y, cw, obsH, 'FD');

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...(d.observaciones ? PALETTE.textMain : PALETTE.textMuted));
    const obsText = d.observaciones || 'Sin observaciones ni novedades especiales reportadas al momento de la expedición del plan.';
    doc.text(obsText, m + 2, y + 3.2, { maxWidth: cw - 4, maxHeight: obsH - 2 });
    y += obsH + 1.5;

    // =========================================================
    // SECCIÓN 8: AUTORIZACIÓN Y FIRMAS DIGITALES
    // =========================================================
    y = drawSectionHeader('8. AUTORIZACIÓN, CONFORMIDAD Y FIRMAS DIGITALES', y);

    const sigW = (cw - 3) / 3;
    const sigH = Math.min(ph - y - 11, 23); // Altura dinámica garantizada dentro de 1 página Carta

    const signaturesList = [
        {
            title: 'CONDUCTOR RESPONSABLE',
            name: d.cNombre || 'Conductor',
            docId: d.cLicencia ? `C.C./Lic: ${d.cLicencia}` : '',
            sigData: d.signatures?.conductor,
            date: d.signatures?.conductor_fecha || d.created_at,
            key: 'conductor'
        },
        {
            title: 'AUTORIZACIÓN HSE (PESV)',
            name: 'Profesional HSEQ / Supervisor',
            docId: 'Trans Services A&B',
            sigData: d.signatures?.hse,
            date: d.signatures?.hse_fecha || (d.risk?.score > 15 ? d.created_at : ''),
            key: 'hse'
        },
        {
            title: 'APROBACIÓN GERENCIA',
            name: 'Gerencia General / Operaciones',
            docId: 'Trans Services A&B',
            sigData: d.signatures?.gerencia,
            date: d.signatures?.gerencia_fecha || (d.risk?.score > 23 ? d.created_at : ''),
            key: 'gerencia'
        }
    ];

    signaturesList.forEach((box, i) => {
        const xB = m + (i * (sigW + 1.5));

        doc.setFillColor(...PALETTE.bgCard);
        doc.setDrawColor(...PALETTE.border);
        doc.rect(xB, y, sigW, sigH, 'FD');

        // Título de la casilla
        doc.setFillColor(...PALETTE.primaryLight);
        doc.rect(xB, y, sigW, 3.8, 'F');
        doc.setFontSize(5.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.primary);
        doc.text(box.title, xB + (sigW / 2), y + 2.6, { align: 'center' });

        // Imagen de firma
        if (box.sigData && typeof box.sigData === 'string' && box.sigData.startsWith('data:image')) {
            try {
                doc.addImage(box.sigData, 'PNG', xB + 2, y + 4.2, sigW - 4, sigH - 11);
            } catch (e) {
                doc.setDrawColor(...PALETTE.textMuted);
                doc.line(xB + 4, y + sigH - 6.5, xB + sigW - 4, y + sigH - 6.5);
            }
        } else {
            // Línea de firma física
            doc.setDrawColor(...PALETTE.border);
            doc.setLineDashPattern([1, 1], 0);
            doc.line(xB + 4, y + sigH - 6.5, xB + sigW - 4, y + sigH - 6.5);
            doc.setLineDashPattern([], 0);
        }

        // Nombre y detalle
        doc.setFontSize(5.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.textMain);
        doc.text(box.name.substring(0, 28), xB + (sigW / 2), y + sigH - 3.8, { align: 'center' });

        doc.setFontSize(4.4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PALETTE.textMuted);
        const footerInfo = box.date ? `${box.docId} | ${formatDate(box.date)}` : (box.docId || 'Firma Digital Verificada');
        doc.text(footerInfo, xB + (sigW / 2), y + sigH - 1.2, { align: 'center' });
    });

    // =========================================================
    // FOOTER LEGAL INSTITUCIONAL
    // =========================================================
    doc.setFontSize(4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PALETTE.textMuted);
    doc.text('COOPERATIVA DE TRANSPORTES Y SERVICIOS A&B · NIT 900778421-1 · Villagarzón, Putumayo', m, ph - 3.5);
    doc.text('Documento digital generado conforme a la Ley 527 de 1999 y Resolución 40595 de 2022 (PESV)', pw / 2, ph - 3.5, { align: 'center' });
    doc.text(`Expedido: ${new Date().toLocaleString('es-CO')}`, pw - m, ph - 3.5, { align: 'right' });

    // =========================================================
    // DESCARGA AUTOMÁTICA DEL PDF
    // =========================================================
    const cleanPlaca = (d.vPlaca || 'SIN_PLACA').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanFecha = (d.fecha || new Date().toISOString().split('T')[0]).replace(/[^0-9]/g, '');
    const fileName = `STE-F-010_${cleanPlaca}_${cleanFecha}.pdf`;
    
    doc.save(fileName);

    if (typeof TS !== 'undefined' && TS.toastSuccess) {
        TS.toastSuccess(`PDF generado: ${fileName}`);
    }
}
