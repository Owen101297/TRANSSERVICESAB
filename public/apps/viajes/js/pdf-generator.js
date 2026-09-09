// pdf-generator.js - Generador Oficial de PDF STE-F-010 para Trans Services A&B
// Formato profesional de ingeniería institucional SIG HSEQ-PESV en tamaño Carta con 100% de retención de datos

function normalizeTripData(data) {
    if (!data) return null;

    if (data.horaSalida !== undefined && data.hora_salida === undefined && data.vPlaca !== undefined) return data;

    const ri = data.risk_inputs || {};
    const rDistancia = parseInt(ri.rDistancia) || 0;
    const rClima = parseInt(ri.rClima) || 0;
    const rVehiculos = parseInt(ri.rVehiculos) || 0;
    const rVia = parseInt(ri.rVia) || 0;
    const rCom = parseInt(ri.rCom) || 0;
    const rFatiga = parseInt(ri.rFatiga) || 0;
    const rHora = parseInt(ri.rHora) || 0;
    const totalScore = data.risk_score || (rDistancia + rClima + rVehiculos + rVia + rCom + rFatiga + rHora);

    const distanciaTxt = { 1: 'MENOS DE 50 KM', 2: 'MENOS DE 100 KM', 5: 'MENOS DE 200 KM', 8: 'MÁS DE 200 KM' }[rDistancia] || (rDistancia ? `${rDistancia} pts` : 'N/A');
    const climaTxt = { 1: 'SECO / NORMALES', 2: 'LLUVIA SUAVE', 4: 'LLUVIA FUERTE / NIEBLA' }[rClima] || (rClima ? `${rClima} pts` : 'N/A');
    const vehiculosTxt = { 1: '1 VEH / 1 PER', 2: '1 VEH / 2+ PER', 3: '2+ VEH / 1+ PER', 6: '2+ VEH / 2+ PER' }[rVehiculos] || (rVehiculos ? `${rVehiculos} pts` : 'N/A');
    const viaTxt = { 1: 'PAVIMENTADA', 2: 'MIXTA (<50% NO PAV)', 4: 'NO PAVIMENTADA' }[rVia] || (rVia ? `${rVia} pts` : 'N/A');
    const comTxt = { 0: 'TELÉFONO CELULAR', 2: 'SIN COM. / CARAVANA', 4: 'SIN COMUNICACIÓN' }[rCom] || (rCom ? `${rCom} pts` : 'N/A');
    const fatigaTxt = { 1: '< 12 HRS', 3: '< 14 HRS', 6: '< 16 HRS' }[rFatiga] || (rFatiga ? `${rFatiga} pts` : 'N/A');
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
        origenDivipola: data.origen_divipola || data.origenDivipola || '',
        destinoDivipola: data.destino_divipola || data.destinoDivipola || '',
        kmSalida: data.km_salida != null ? String(data.km_salida) : (data.kmSalida || ''),
        kmLlegada: data.km_llegada != null ? String(data.km_llegada) : (data.kmLlegada || ''),
        distanciaEstimada: data.distancia_km != null ? String(data.distancia_km) : (data.distanciaEstimada || ''),
        vPlaca: data.vehiculo_placa || data.vPlaca || '',
        vModelo: data.vehiculo_modelo || data.vModelo || '',
        vColor: data.vehiculo_color || data.vColor || '',
        vTipo: data.vehiculo_tipo || data.vTipo || '',
        vEmpresa: data.vehiculo_empresa || data.vEmpresa || 'TRANS SERVICES A&B',
        cNombre: data.conductor_nombre || data.cNombre || '',
        cLicencia: data.conductor_licencia || data.cLicencia || '',
        cCat: data.conductor_categoria || data.cCat || '',
        cVence: data.conductor_vencimiento || data.cVence || '',
        cTelefono: data.conductor_telefono || data.cTelefono || '',
        rutograma: data.rutograma || data.rutograma_url || null,
        observaciones: data.observaciones || '',
        medio: data.medio || 'FISICAMENTE',
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

async function generateQrBase64(text) {
    if (!text) return null;
    if (window.QRCode && typeof window.QRCode.toDataURL === 'function') {
        try {
            return await window.QRCode.toDataURL(text, { width: 140, margin: 1 });
        } catch (e) { }
    }
    return null;
}

// Paleta oficial de ingeniería documental SIG HSEQ
const PALETTE = {
    headerGreen: [217, 234, 211],   // Verde institucional de sección #D9EAD3
    headerGreenText: [20, 50, 20],  // Verde oscuro texto
    lineDark: [0, 0, 0],            // Línea negra fina formato oficial
    textBlack: [0, 0, 0],           // Texto principal negro
    textMuted: [70, 70, 70],        // Gris técnico
    white: [255, 255, 255],
    greenBg: [198, 239, 206],       // Verde Riesgo Bajo #C6EFCE
    greenText: [0, 97, 0],
    yellowBg: [255, 235, 156],      // Amarillo Riesgo Medio #FFEB9C
    yellowText: [156, 101, 0],
    redBg: [255, 199, 206],         // Rojo Riesgo Alto #FFC7CE
    redText: [156, 0, 6]
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
            origenDivipola: gv('origenDivipola') || '',
            destinoDivipola: gv('destinoDivipola') || '',
            kmSalida: gv('kmSalida'),
            kmLlegada: gv('kmLlegada'),
            distanciaEstimada: gv('distanciaEstimada'),
            vPlaca: gv('vPlaca'),
            vModelo: gv('vModelo'),
            vColor: gv('vColor'),
            vTipo: gv('vTipo'),
            vEmpresa: gv('vEmpresa') || 'TRANS SERVICES A&B',
            cNombre: gv('cNombre'),
            cLicencia: gv('cLicencia'),
            cCat: gv('cCat'),
            cVence: gv('cVence'),
            cTelefono: gv('cTelefono'),
            rutograma: document.getElementById('rutogramaImg')?.getAttribute('src') || null,
            observaciones: gv('observaciones'),
            medio: document.querySelector('input[name="medio"]:checked')?.value || 'FISICAMENTE',
            gpsSalida: document.getElementById('gpsSalidaStatus')?.textContent || '',
            gpsLlegada: document.getElementById('gpsLlegadaStatus')?.textContent || '',
            estado: 'Registrado',
            risk: {
                distancia: rD, clima: rCl, vehiculos: rV, via: rVi, comunicaciones: rCo, horas: rF,
                turno: rH === 8 ? 'noche' : 'dia', score: ts,
                level: ts <= 15 ? 'BAJO' : (ts <= 23 ? 'MEDIO' : 'ALTO'),
                distanciaTxt: { 1: 'MENOS DE 50 KM', 2: 'MENOS DE 100 KM', 5: 'MENOS DE 200 KM', 8: 'MÁS DE 200 KM' }[rD] || 'N/A',
                climaTxt: { 1: 'SECO / NORMALES', 2: 'LLUVIA SUAVE', 4: 'LLUVIA FUERTE / NIEBLA' }[rCl] || 'N/A',
                vehiculosTxt: { 1: '1 VEH / 1 PER', 2: '1 VEH / 2+ PER', 3: '2+ VEH / 1+ PER', 6: '2+ VEH / 2+ PER' }[rV] || 'N/A',
                viaTxt: { 1: 'PAVIMENTADA', 2: 'MIXTA (<50% NO PAV)', 4: 'NO PAVIMENTADA' }[rVi] || 'N/A',
                comTxt: { 0: 'TELÉFONO CELULAR', 2: 'SIN COM. / CARAVANA', 4: 'SIN COMUNICACIÓN' }[rCo] || 'N/A',
                fatigaTxt: { 1: '< 12 HRS', 3: '< 14 HRS', 6: '< 16 HRS' }[rF] || 'N/A',
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
    // ENCABEZADO OFICIAL REPLICADO EXACTO AL FORMATO FÍSICO
    // =========================================================
    const headerH = 15;
    const colLogoW = 38;
    const colDocW = 46;
    const colTitleW = cw - colLogoW - colDocW;

    doc.setDrawColor(...PALETTE.lineDark);
    doc.setLineWidth(0.25);
    doc.setFillColor(...PALETTE.white);
    doc.rect(m, m, cw, headerH, 'FD');

    // Columna 1: Logo Oficial con texto
    doc.line(m + colLogoW, m, m + colLogoW, m + headerH);
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', m + 1.5, m + 1, colLogoW - 3, headerH - 3.5);
        } catch (e) {
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PALETTE.textBlack);
            doc.text('TRANS SERVICES A&B', m + colLogoW / 2, m + 7, { align: 'center' });
        }
    } else {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.textBlack);
        doc.text('TRANS SERVICES A&B', m + colLogoW / 2, m + 7, { align: 'center' });
    }
    doc.setFontSize(4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PALETTE.textMuted);
    doc.text('COOPERATIVA DE TRANSPORTES Y SERVICIOS A&B', m + colLogoW / 2, m + headerH - 1.5, { align: 'center' });

    // Columna 2: Título Central
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.textBlack);
    doc.text('GERENCIAMIENTO DE VIAJES', m + colLogoW + (colTitleW / 2), m + 8.5, { align: 'center' });

    // Columna 3: Control Documental Normativo
    const xDoc = m + colLogoW + colTitleW;
    doc.line(xDoc, m, xDoc, m + headerH);
    const docRowH = headerH / 3;
    doc.line(xDoc, m + docRowH, m + cw, m + docRowH);
    doc.line(xDoc, m + docRowH * 2, m + cw, m + docRowH * 2);

    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.textBlack);
    doc.text('STE-F-010', xDoc + (colDocW / 2), m + 3.3, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.text('Fecha de Aprobacion:', xDoc + (colDocW / 2), m + docRowH + 2.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('01 de septiembre de 2024', xDoc + (colDocW / 2), m + docRowH + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text('Versión: 003', xDoc + (colDocW / 2), m + docRowH * 2 + 3.3, { align: 'center' });

    let y = m + headerH;

    // =========================================================
    // HELPER: ENCABEZADO DE SECCIÓN CON VERDE OFICIAL
    // =========================================================
    function drawSectionHeader(title, yPos) {
        doc.setFillColor(...PALETTE.headerGreen);
        doc.setDrawColor(...PALETTE.lineDark);
        doc.setLineWidth(0.2);
        doc.rect(m, yPos, cw, 3.8, 'FD');
        doc.setFontSize(5.8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.headerGreenText);
        doc.text(title, m + (cw / 2), yPos + 2.6, { align: 'center' });
        return yPos + 3.8;
    }

    function drawGridCell(label, value, xPos, yPos, cellW, cellH, labelW = 0) {
        doc.setDrawColor(...PALETTE.lineDark);
        doc.setLineWidth(0.15);
        doc.setFillColor(...PALETTE.white);
        doc.rect(xPos, yPos, cellW, cellH, 'FD');

        if (labelW > 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(xPos, yPos, labelW, cellH, 'FD');
            doc.setFontSize(5.0);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PALETTE.textBlack);
            doc.text(label.toUpperCase(), xPos + 1, yPos + (cellH / 2) + 1.2);

            doc.setFontSize(5.5);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value || '—'), xPos + labelW + 1.5, yPos + (cellH / 2) + 1.2, { maxWidth: cellW - labelW - 2 });
        } else {
            doc.setFontSize(4.6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PALETTE.textMuted);
            doc.text(label.toUpperCase(), xPos + 1, yPos + 2.4);

            doc.setFontSize(5.6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...PALETTE.textBlack);
            doc.text(String(value || '—'), xPos + 1, yPos + cellH - 1.2, { maxWidth: cellW - 2 });
        }
    }

    // =========================================================
    // 1. INFORMACION GENERAL
    // =========================================================
    y = drawSectionHeader('1. INFORMACION GENERAL', y);
    const rH = 5.0;

    // Fila 1: FECHA | HORA DE SALIDA
    drawGridCell('FECHA', formatDate(d.fecha), m, y, cw * 0.5, rH, 20);
    drawGridCell('HORA DE SALIDA', d.horaSalida || '—', m + cw * 0.5, y, cw * 0.5, rH, 28);
    y += rH;

    // Fila 2: ORIGEN | DESTINO
    const origenLabel = d.origenDivipola ? `${d.origen || ''} [DIVIPOLA: ${d.origenDivipola}]` : (d.origen || '—');
    const destinoLabel = d.destinoDivipola ? `${d.destino || ''} [DIVIPOLA: ${d.destinoDivipola}]` : (d.destino || '—');
    drawGridCell('ORIGEN', origenLabel, m, y, cw * 0.5, rH, 20);
    drawGridCell('DESTINO', destinoLabel, m + cw * 0.5, y, cw * 0.5, rH, 28);
    y += rH;

    // Fila 3: KM ABIERTO | HORA SALIDA | KM CERRADO | HORA LLEGADA | KM RECORRIDOS
    const wKm5 = cw / 5;
    drawGridCell('KM ABIERTO', d.kmSalida ? `${d.kmSalida} km` : '—', m, y, wKm5, rH);
    drawGridCell('HORA SALIDA', d.horaSalida || '—', m + wKm5, y, wKm5, rH);
    drawGridCell('KM CERRADO', d.kmLlegada ? `${d.kmLlegada} km` : '—', m + wKm5 * 2, y, wKm5, rH);
    drawGridCell('HORA LLEGADA', d.horaLlegada || 'En curso', m + wKm5 * 3, y, wKm5, rH);
    drawGridCell('KM RECORRIDOS', d.distanciaEstimada ? `${d.distanciaEstimada} km` : '—', m + wKm5 * 4, y, wKm5, rH);
    y += rH;

    // =========================================================
    // 2. DATOS DEL VEHICULO Y CONDUCTOR
    // =========================================================
    y = drawSectionHeader('2. DATOS DEL VEHICULO Y CONDUCTOR.', y);

    const w4 = cw / 4;
    drawGridCell('TIPO DE VEHICULO', d.vTipo || 'Camioneta', m, y, w4, rH, 22);
    drawGridCell('PLACA', d.vPlaca || '—', m + w4, y, w4, rH, 14);
    drawGridCell('MODELO', d.vModelo || '—', m + w4 * 2, y, w4, rH, 16);
    drawGridCell('COLOR', d.vColor || '—', m + w4 * 3, y, w4, rH, 14);
    y += rH;

    drawGridCell('NOMBRE DE LA EMPRESA', d.vEmpresa || 'TRANS SERVICES A&B', m, y, cw, rH, 36);
    y += rH;

    drawGridCell('NOMBRE CONDUCTOR', d.cNombre || '—', m, y, cw * 0.65, rH, 28);
    drawGridCell('TELEFONO CELULAR', d.cTelefono || '—', m + cw * 0.65, y, cw * 0.35, rH, 26);
    y += rH;

    drawGridCell('NUMERO DE LICENCIA', d.cLicencia || '—', m, y, cw * 0.4, rH, 28);
    drawGridCell('CATEGORIA', d.cCat || '—', m + cw * 0.4, y, cw * 0.25, rH, 18);
    drawGridCell('FECHA DE VENCIMIENTO', formatDate(d.cVence), m + cw * 0.65, y, cw * 0.35, rH, 30);
    y += rH;

    // =========================================================
    // 3. RUTA Y SITIOS DE REPORTE Y DESCANSO
    // =========================================================
    y = drawSectionHeader('3. RUTA', y);

    doc.setFillColor(240, 240, 240);
    doc.setDrawColor(...PALETTE.lineDark);
    doc.rect(m, y, cw, 3.2, 'FD');
    doc.setFontSize(5.0);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.textBlack);
    doc.text('SITIOS DE REPORTE Y DESCANSO (PARA VIAJES SUPERIORES A 2 HORAS)', m + (cw / 2), y + 2.2, { align: 'center' });
    y += 3.2;

    const pc1 = d.puntosControl?.[0] || { l: '', h: '' };
    const pc2 = d.puntosControl?.[1] || { l: '', h: '' };
    const pc3 = d.puntosControl?.[2] || { l: '', h: '' };
    const pc4 = d.puntosControl?.[3] || { l: '', h: '' };

    const wPcHalf = cw / 2;
    drawGridCell('PUNTO 1', pc1.l, m, y, wPcHalf * 0.7, 4.2, 14);
    drawGridCell('HORA', pc1.h, m + wPcHalf * 0.7, y, wPcHalf * 0.3, 4.2, 10);
    drawGridCell('PUNTO 2', pc2.l, m + wPcHalf, y, wPcHalf * 0.7, 4.2, 14);
    drawGridCell('HORA', pc2.h, m + wPcHalf + wPcHalf * 0.7, y, wPcHalf * 0.3, 4.2, 10);
    y += 4.2;

    drawGridCell('PUNTO 3', pc3.l, m, y, wPcHalf * 0.7, 4.2, 14);
    drawGridCell('HORA', pc3.h, m + wPcHalf * 0.7, y, wPcHalf * 0.3, 4.2, 10);
    drawGridCell('PUNTO 4', pc4.l, m + wPcHalf, y, wPcHalf * 0.7, 4.2, 14);
    drawGridCell('HORA', pc4.h, m + wPcHalf + wPcHalf * 0.7, y, wPcHalf * 0.3, 4.2, 10);
    y += 4.2;

    // =========================================================
    // 4. ANALISIS DE RIESGO (MATRIZ A-G + EMERGENCIAS + EVALUACIÓN)
    // =========================================================
    y = drawSectionHeader('4. ANALISIS DE RIESGO', y);

    const matW = cw * 0.62;
    const sideW = cw - matW;
    const yMatStart = y;
    const rColW = matW / 3;
    const rCellH = 3.0;

    function drawRiskCategory(catLetter, title, options, selectedVal, xPos, yPos, colWidth) {
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(...PALETTE.lineDark);
        doc.setLineWidth(0.15);
        doc.rect(xPos, yPos, colWidth, 3.2, 'FD');

        doc.setFontSize(4.6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.textBlack);
        doc.text(`${catLetter}. ${title}`, xPos + 1, yPos + 2.2);

        let curY = yPos + 3.2;
        options.forEach(opt => {
            const isSel = (opt.val === selectedVal);
            doc.setFillColor(isSel ? 220 : 255, isSel ? 240 : 255, isSel ? 220 : 255);
            doc.rect(xPos, curY, colWidth, rCellH, 'FD');

            doc.setFontSize(4.0);
            doc.setFont('helvetica', isSel ? 'bold' : 'normal');
            doc.setTextColor(...(isSel ? [0, 80, 0] : PALETTE.textBlack));
            doc.text(`${isSel ? '▶ ' : ''}${opt.label}`, xPos + 1, curY + 2.1, { maxWidth: colWidth - 7 });

            doc.setFont('helvetica', 'bold');
            doc.text(String(opt.pts), xPos + colWidth - 1, curY + 2.1, { align: 'right' });
            curY += rCellH;
        });
        return curY;
    }

    const yA = drawRiskCategory('A', 'DISTANCIA A RECORRER', [
        { label: 'MENOS DE 50 KM', pts: 1, val: 1 },
        { label: 'MENOS DE 100 KM', pts: 2, val: 2 },
        { label: 'MENOS DE 200KM', pts: 5, val: 5 },
        { label: 'MÁS DE 200 KM', pts: 8, val: 8 }
    ], d.risk?.distancia, m, yMatStart, rColW);

    const yB = drawRiskCategory('B', 'CLIMA', [
        { label: 'SECO / NORMALES', pts: 1, val: 1 },
        { label: 'LLUVIA SUAVE', pts: 2, val: 2 },
        { label: 'LLUVIA FUERTE / NIEBLA', pts: 4, val: 4 }
    ], d.risk?.clima, m + rColW, yMatStart, rColW);

    const yC = drawRiskCategory('C', 'VEHÍCULOS Y PERSONAS', [
        { label: '1 VEH CON 1 PERS', pts: 1, val: 1 },
        { label: '1 VEH CON 2 Ó + PERS', pts: 2, val: 2 },
        { label: '2+ VEH CON 1+ PERS', pts: 3, val: 3 },
        { label: '2+ VEH CON 2+ PERS', pts: 6, val: 6 }
    ], d.risk?.vehiculos, m + rColW * 2, yMatStart, rColW);

    const yRow1Max = Math.max(yA, yB, yC);

    const yD = drawRiskCategory('D', 'CONDICIONES DE LA VÍA', [
        { label: 'PAVIMENTADA', pts: 1, val: 1 },
        { label: 'MIXTA (<50% NO PAV)', pts: 2, val: 2 },
        { label: 'NO PAVIMENTADA', pts: 4, val: 4 }
    ], d.risk?.via, m, yRow1Max, rColW);

    const yE = drawRiskCategory('E', 'COMUNICACIONES', [
        { label: 'TELÉFONO CELULAR', pts: 0, val: 0 },
        { label: 'SIN COM. / CARAVANA', pts: 2, val: 2 },
        { label: 'SIN COMUNICACIÓN', pts: 4, val: 4 }
    ], d.risk?.comunicaciones, m + rColW, yRow1Max, rColW);

    const yF = drawRiskCategory('F', 'HRS. TRABAJO + VIAJE', [
        { label: 'HRS TRABAJO+VIAJE <12', pts: 1, val: 1 },
        { label: 'HRS TRABAJO+VIAJE <14', pts: 3, val: 3 },
        { label: 'HRS TRABAJO+VIAJE <16', pts: 6, val: 6 }
    ], d.risk?.horas, m + rColW * 2, yRow1Max, rColW);

    const yRow2Max = Math.max(yD, yE, yF);

    drawRiskCategory('G', 'HORA TRASLADO', [
        { label: 'DÍA (6-18)', pts: 1, val: d.risk?.turno === 'dia' ? 1 : 0 },
        { label: 'NOCHE (18-6)', pts: 8, val: d.risk?.turno === 'noche' ? 8 : 0 }
    ], d.risk?.turno === 'noche' ? 8 : 1, m, yRow2Max, rColW);

    doc.setFillColor(240, 240, 240);
    doc.rect(m + rColW, yRow2Max, rColW, 3.2, 'FD');
    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.textBlack);
    doc.text('DÍAS TRABAJADOS', m + rColW + 1, yRow2Max + 2.2);

    doc.setFillColor(...PALETTE.white);
    doc.rect(m + rColW, yRow2Max + 3.2, rColW, 6.0, 'FD');
    const isDia2 = d.control?.dia2;
    doc.setFontSize(4.5);
    doc.text(`[ ${!isDia2 ? 'X' : ' '} ] 1 DÍA    [ ${isDia2 ? 'X' : ' '} ] 2 DÍAS`, m + rColW + 2, yRow2Max + 7.0);

    doc.setFillColor(240, 240, 240);
    doc.rect(m + rColW * 2, yRow2Max, rColW, 3.2, 'FD');
    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.text('DIVULGACIÓN RHA', m + rColW * 2 + 1, yRow2Max + 2.2);

    doc.setFillColor(...PALETTE.white);
    doc.rect(m + rColW * 2, yRow2Max + 3.2, rColW, 6.0, 'FD');
    doc.setFontSize(4.4);
    doc.setFont('helvetica', 'normal');
    doc.text(`FECHA: ${formatDate(d.control?.fechaRHA || d.fecha)}`, m + rColW * 2 + 1.5, yRow2Max + 7.0);

    const yMatEnd = yRow2Max + 9.2;

    const xSide = m + matW;
    const wEval = sideW * 0.42;
    const wEmerg = sideW * 0.58;

    doc.setFillColor(240, 240, 240);
    doc.rect(xSide, yMatStart, wEval, 3.2, 'FD');
    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.text('EVALUACIÓN', xSide + 1, yMatStart + 2.2);

    const evalList = [
        { k: 'A:', v: d.risk?.distancia || 0 },
        { k: 'B:', v: d.risk?.clima || 0 },
        { k: 'C:', v: d.risk?.vehiculos || 0 },
        { k: 'D:', v: d.risk?.via || 0 },
        { k: 'E:', v: d.risk?.comunicaciones || 0 },
        { k: 'F:', v: d.risk?.horas || 0 },
        { k: 'G:', v: d.risk?.turno === 'noche' ? 8 : 1 }
    ];

    let yEv = yMatStart + 3.2;
    evalList.forEach(e => {
        doc.setFillColor(...PALETTE.white);
        doc.rect(xSide, yEv, wEval, 2.6, 'FD');
        doc.setFontSize(4.3);
        doc.setFont('helvetica', 'bold');
        doc.text(e.k, xSide + 1, yEv + 1.9);
        doc.text(String(e.v), xSide + wEval - 2, yEv + 1.9, { align: 'right' });
        yEv += 2.6;
    });

    doc.setFillColor(220, 240, 220);
    doc.rect(xSide, yEv, wEval, 3.2, 'FD');
    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', xSide + 1, yEv + 2.2);
    doc.text(String(d.risk?.score || 0), xSide + wEval - 2, yEv + 2.2, { align: 'right' });

    const xEmerg = xSide + wEval;
    doc.setFillColor(240, 240, 240);
    doc.rect(xEmerg, yMatStart, wEmerg, 3.2, 'FD');
    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.text('EMERGENCIAS', xEmerg + 1, yMatStart + 2.2);

    const emergList = [
        { ent: 'GERENTE', tel: '3213415180' },
        { ent: 'HSE', tel: '3123196323' },
        { ent: 'BOMBEROS', tel: '3105699619' },
        { ent: 'CRUZ ROJA', tel: '3105770698' },
        { ent: 'DEFENSA CIVIL', tel: '6014206074' },
        { ent: 'EMERG. GTE.', tel: '3213500500' },
        { ent: 'POLICIA', tel: '3214922157' },
        { ent: 'HOSPITAL S.G.A', tel: '3186156525' }
    ];

    let yEm = yMatStart + 3.2;
    emergList.forEach(em => {
        doc.setFillColor(...PALETTE.white);
        doc.rect(xEmerg, yEm, wEmerg, 2.6, 'FD');
        doc.setFontSize(4.1);
        doc.setFont('helvetica', 'bold');
        doc.text(em.ent, xEmerg + 1, yEm + 1.9);
        doc.setFont('helvetica', 'normal');
        doc.text(em.tel, xEmerg + wEmerg - 1, yEm + 1.9, { align: 'right' });
        yEm += 2.6;
    });

    y = Math.max(yMatEnd, yEv + 3.2, yEm);

    doc.setFillColor(255, 255, 230);
    doc.rect(m, y, cw, 3.2, 'FD');
    doc.setFontSize(4.3);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(140, 50, 0);
    doc.text('MANEJO NOCTURNO REQUIERE APROBACION DE GERENCIA DE OPERACIONES Y DE HSEQ DETALLE ACCIONES DE CONTROL EN CASILLA DE OBSERVACIONES.', m + (cw / 2), y + 2.2, { align: 'center' });
    y += 3.2;

    doc.setFillColor(...PALETTE.white);
    doc.rect(m, y, cw, 4.5, 'FD');
    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.textBlack);
    doc.text('OBSERVACIONES:', m + 1, y + 2.0);
    doc.setFont('helvetica', 'normal');
    doc.text(d.observaciones || 'Sin observaciones ni novedades especiales reportadas.', m + 24, y + 2.0, { maxWidth: cw - 26, maxHeight: 4.0 });
    y += 4.5;

    const semH = 4.2;
    const wSem = cw / 3;

    const isBajo = (d.risk?.score <= 15);
    doc.setFillColor(...(isBajo ? PALETTE.greenBg : [240, 240, 240]));
    doc.rect(m, y, wSem, semH, 'FD');
    doc.setFontSize(4.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(isBajo ? PALETTE.greenText : PALETTE.textMuted));
    doc.text('RIESGO BAJO (0 A 15)', m + (wSem / 2), y + 2.0, { align: 'center' });
    doc.setFontSize(4.1);
    doc.text('AUTORIZA SUPERVISOR LOGISTICA Y/O HSE', m + (wSem / 2), y + 3.5, { align: 'center' });

    const isMedio = (d.risk?.score > 15 && d.risk?.score <= 23);
    doc.setFillColor(...(isMedio ? PALETTE.yellowBg : [240, 240, 240]));
    doc.rect(m + wSem, y, wSem, semH, 'FD');
    doc.setFontSize(4.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(isMedio ? PALETTE.yellowText : PALETTE.textMuted));
    doc.text('RIESGO MEDIO (16 A 23)', m + wSem + (wSem / 2), y + 2.0, { align: 'center' });
    doc.setFontSize(4.1);
    doc.text('AUTORIZA PROFESIONAL HSE', m + wSem + (wSem / 2), y + 3.5, { align: 'center' });

    const isAlto = (d.risk?.score > 23);
    doc.setFillColor(...(isAlto ? PALETTE.redBg : [240, 240, 240]));
    doc.rect(m + wSem * 2, y, wSem, semH, 'FD');
    doc.setFontSize(4.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(isAlto ? PALETTE.redText : PALETTE.textMuted));
    doc.text('RIESGO ALTO (MAYOR A 23)', m + wSem * 2 + (wSem / 2), y + 2.0, { align: 'center' });
    doc.setFontSize(4.1);
    doc.text('AUTORIZA GERENCIA', m + wSem * 2 + (wSem / 2), y + 3.5, { align: 'center' });
    y += semH;

    // =========================================================
    // 5. CONOCIMIENTOS PREVIAJE
    // =========================================================
    y = drawSectionHeader('5. CONOCIMIENTOS PREVIAJE. (Verificar por parte del conductor)', y);

    const prevQuestions = [
        { q: '1. EL CONDUCTOR TIENE CONOCIMIENTO DE LOS RIESGOS LOCALES (ESTADO DE LAS VIAS, CLIMA, PEATONES, PARTE AUTOMOTOR, ANIMALES EN LA VIA, CICLISTAS, MOTOCICLISTAS)?', val: d.previaje?.riesgos },
        { q: '2. EL CONDUCTOR ESTA INFORMADO QUE ES PROHIBIDO TRANSPORTAR PERSONAL AJENO A LA EMPRESA?', val: d.previaje?.personal },
        { q: '3. SE REALIZO LA INSPECCION DEL VEHICULO CON LA LISTA PRE - OPERACIONAL?', val: d.previaje?.inspeccion },
        { q: '4. SE ENCUENTRA EN BUEN ESTADO EL CINTURON DE SEGURIDAD DEL VEHICULO ?', val: d.previaje?.cinturon }
    ];

    const qH = 3.2;
    const wColQ = cw - 18;

    doc.setFillColor(240, 240, 240);
    doc.rect(m + wColQ, y - 3.8, 9, 3.8, 'FD');
    doc.rect(m + wColQ + 9, y - 3.8, 9, 3.8, 'FD');
    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.textBlack);
    doc.text('SI', m + wColQ + 4.5, y - 1.2, { align: 'center' });
    doc.text('NO', m + wColQ + 13.5, y - 1.2, { align: 'center' });

    prevQuestions.forEach(it => {
        doc.setFillColor(...PALETTE.white);
        doc.rect(m, y, wColQ, qH, 'FD');
        doc.rect(m + wColQ, y, 9, qH, 'FD');
        doc.rect(m + wColQ + 9, y, 9, qH, 'FD');

        doc.setFontSize(4.2);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PALETTE.textBlack);
        doc.text(it.q, m + 1, y + 2.2, { maxWidth: wColQ - 2 });

        doc.setFont('helvetica', 'bold');
        if (it.val) {
            doc.text('X', m + wColQ + 4.5, y + 2.2, { align: 'center' });
        } else {
            doc.text('X', m + wColQ + 13.5, y + 2.2, { align: 'center' });
        }
        y += qH;
    });

    // =========================================================
    // 6. TEST DE FATIGA
    // =========================================================
    y = drawSectionHeader('6. TEST DE FATIGA (Verificar por parte del supervisor logistica y/o HSE)', y);

    const fatQuestions = [
        { q: '1. ESTA CONSUMIENDO LICOR, DROGAS, SUSTANCIAS PSICOACTIVAS O MEDICAMENTOS QUE PUEDA ALTERAR SU CAPACIDAD PARA CONDUCIR Y MANTENERSE ALERTA?', val: d.fatiga?.sustancias },
        { q: '2. EL CONDUCTOR DURMIO POR LO MENOS 8 HORAS ANTES DE REALIZAR EL VIAJE?', val: d.fatiga?.descanso },
        { q: '3. SE SIENTE EN OPTIMAS CONDICIONES PARA REALIZAR ESTE VIAJE?', val: d.fatiga?.condiciones },
        { q: '4. TIENE USTED CONOCIMIENTO A LOS PELIGROS QUE SE EXPONE AL REALIZAR EL VIAJE?', val: d.fatiga?.peligros },
        { q: '5. EL CONDUCTOR SABE QUE ESTA PROHIBIDO USAR TELEFONOS CELULAR MIENTRAS CONDUCE UN VEHICULO DE LA EMPRESA ?', val: d.fatiga?.celular }
    ];

    doc.setFillColor(240, 240, 240);
    doc.rect(m + wColQ, y - 3.8, 9, 3.8, 'FD');
    doc.rect(m + wColQ + 9, y - 3.8, 9, 3.8, 'FD');
    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.textBlack);
    doc.text('SI', m + wColQ + 4.5, y - 1.2, { align: 'center' });
    doc.text('NO', m + wColQ + 13.5, y - 1.2, { align: 'center' });

    fatQuestions.forEach(it => {
        doc.setFillColor(...PALETTE.white);
        doc.rect(m, y, wColQ, qH, 'FD');
        doc.rect(m + wColQ, y, 9, qH, 'FD');
        doc.rect(m + wColQ + 9, y, 9, qH, 'FD');

        doc.setFontSize(4.2);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PALETTE.textBlack);
        doc.text(it.q, m + 1, y + 2.2, { maxWidth: wColQ - 2 });

        doc.setFont('helvetica', 'bold');
        if (it.val) {
            doc.text('X', m + wColQ + 4.5, y + 2.2, { align: 'center' });
        } else {
            doc.text('X', m + wColQ + 13.5, y + 2.2, { align: 'center' });
        }
        y += qH;
    });

    // =========================================================
    // 7. FORMA DE AUTORIZACION Y FIRMAS
    // =========================================================
    y = drawSectionHeader('7. FORMA DE AUTORIZACION.', y);

    const wMod = cw / 3;
    const isFis = d.medio?.toUpperCase().includes('FIS') || !d.medio;
    const isRad = d.medio?.toUpperCase().includes('RAD');
    const isCel = d.medio?.toUpperCase().includes('CEL') || d.medio?.toUpperCase().includes('TEL');

    doc.setFillColor(...PALETTE.white);
    doc.rect(m, y, wMod, 3.5, 'FD');
    doc.rect(m + wMod, y, wMod, 3.5, 'FD');
    doc.rect(m + wMod * 2, y, wMod, 3.5, 'FD');

    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.text(`[ ${isFis ? 'X' : ' '} ] FISICAMENTE`, m + (wMod / 2), y + 2.3, { align: 'center' });
    doc.text(`[ ${isRad ? 'X' : ' '} ] VIA RADIO COMUNICACIÓN`, m + wMod + (wMod / 2), y + 2.3, { align: 'center' });
    doc.text(`[ ${isCel ? 'X' : ' '} ] TELEFONO CELULAR`, m + wMod * 2 + (wMod / 2), y + 2.3, { align: 'center' });
    y += 3.5;

    const sigW = cw / 3;
    const sigH = 14;

    const signaturesList = [
        {
            title: 'NOMBRE Y FIRMA\nCONDUCTOR',
            name: d.cNombre || 'Conductor',
            docId: d.cLicencia ? `C.C./Lic: ${d.cLicencia}` : '',
            sigData: d.signatures?.conductor,
            date: d.signatures?.conductor_fecha || d.created_at
        },
        {
            title: 'NOMBRE Y FIRMA\nPROFESIONAL HSE',
            name: 'Profesional HSEQ',
            docId: 'Trans Services A&B',
            sigData: d.signatures?.hse,
            date: d.signatures?.hse_fecha
        },
        {
            title: 'NOMBRE Y FIRMA\nAUTORIZA JEFE GERENCIA',
            name: 'Gerencia General',
            docId: 'Trans Services A&B',
            sigData: d.signatures?.gerencia,
            date: d.signatures?.gerencia_fecha
        }
    ];

    signaturesList.forEach((box, i) => {
        const xB = m + (i * sigW);

        doc.setFillColor(...PALETTE.white);
        doc.rect(xB, y, sigW, sigH, 'FD');

        if (box.sigData && typeof box.sigData === 'string' && box.sigData.startsWith('data:image')) {
            try {
                doc.addImage(box.sigData, 'PNG', xB + 2, y + 1, sigW - 4, sigH - 7);
            } catch (e) { }
        }

        doc.setDrawColor(...PALETTE.lineDark);
        doc.line(xB + 4, y + sigH - 5.5, xB + sigW - 4, y + sigH - 5.5);

        doc.setFontSize(4.6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PALETTE.textBlack);
        doc.text(box.title, xB + (sigW / 2), y + sigH - 3.2, { align: 'center' });
    });
    y += sigH;

    // =========================================================
    // NOTA LEGAL Y PIE INSTITUCIONAL CON QR DE VERIFICACIÓN
    // =========================================================
    const qrUrl = d.id ? `${window.location.origin}/verificar/viaje/${d.id}` : `https://erp.transservicesab.com/verificar/viaje/${encodeURIComponent(d.vPlaca || 'TS')}`;
    const qrBase64 = await generateQrBase64(qrUrl);

    doc.setFillColor(248, 248, 248);
    doc.rect(m, y, cw, 7.0, 'FD');
    doc.setFontSize(3.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PALETTE.textBlack);
    const notaLegal = 'NOTA: Un Gerenciamiento de Viajes debe ser preparado para todos los viajes u operaciones en areas remotas o bajo condiciones inclementes. Los viajes con riesgo alto (mayor a 23 pts) deberan ser autorizados por Gerencia por via radio o celular. Este documento cuenta con validez electronica bajo la Ley 527 de 1999 y la Res. 40595 de 2022.';
    
    if (qrBase64) {
        doc.text(notaLegal, m + 1, y + 1.8, { maxWidth: cw - 12, align: 'justify' });
        try {
            doc.addImage(qrBase64, 'PNG', m + cw - 9.5, y + 0.5, 6.0, 6.0);
        } catch (e) { }
    } else {
        doc.text(notaLegal, m + 1, y + 1.8, { maxWidth: cw - 2, align: 'justify' });
    }
    y += 7.0;

    doc.setFontSize(4.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PALETTE.textBlack);
    doc.text('"COOPERATIVA DE TRANSPORTES Y SERVICIOS A&B" · NIT 900.778.421-1', m + 2, ph - 2.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Villagarzon Putumayo · transserviceshseq.ab@gmail.com', pw / 2, ph - 2.5, { align: 'center' });
    doc.text('SIG-HSEQ · STE-F-010', pw - m - 2, ph - 2.5, { align: 'right' });

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
