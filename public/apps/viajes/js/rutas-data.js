/**
 * rutas-data.js
 * Catálogo Oficial de Rutas Frecuentes y Tiempos Estándar
 * Trans Services A&B S.A.S. - Formato STE-F-010 (Paso 14 PESV)
 */

export const RUTAS_FRECUENTES = [
    // --- CORREDOR PUTUMAYO INTERNO ---
    {
        id: 'vg-mocoa',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'MOCOA (PUTUMAYO)',
        destinoDivipola: '86001',
        distanciaKm: 18,
        duracionHoras: 0.5,
        tipoVia: 1, // Pavimentada
        puntosControl: [
            { lugar: 'Peaje / Retén Policía Villagarzón - Mocoa', horaOffset: 0.25 }
        ]
    },
    {
        id: 'vg-ptoasis',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'PUERTO ASIS (PUTUMAYO)',
        destinoDivipola: '86568',
        distanciaKm: 68,
        duracionHoras: 1.5,
        tipoVia: 1,
        puntosControl: [
            { lugar: 'Puerto Caicedo (Punto Control y Descanso)', horaOffset: 0.75 },
            { lugar: 'Entrada Puerto Asís', horaOffset: 1.5 }
        ]
    },
    {
        id: 'vg-orito',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'ORITO (PUTUMAYO)',
        destinoDivipola: '86320',
        distanciaKm: 110,
        duracionHoras: 2.5,
        tipoVia: 2, // Mixta
        puntosControl: [
            { lugar: 'Puerto Caicedo', horaOffset: 0.75 },
            { lugar: 'Inspección Santana / El Yarumo (Pausa Activa)', horaOffset: 1.75 },
            { lugar: 'Llegada Orito - Base Operativa', horaOffset: 2.5 }
        ]
    },
    {
        id: 'vg-lahormiga',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'VALLE DEL GUAMUEZ (LA HORMIGA)',
        destinoDivipola: '86865',
        distanciaKm: 140,
        duracionHoras: 3.0,
        tipoVia: 2,
        puntosControl: [
            { lugar: 'Santana (Punto de Control)', horaOffset: 1.25 },
            { lugar: 'El Tigre / San Miguel Cruce (Pausa Activa)', horaOffset: 2.25 },
            { lugar: 'La Hormiga Base', horaOffset: 3.0 }
        ]
    },
    {
        id: 'vg-ptoguzman',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'PUERTO GUZMAN (PUTUMAYO)',
        destinoDivipola: '86571',
        distanciaKm: 48,
        duracionHoras: 1.25,
        tipoVia: 2,
        puntosControl: [
            { lugar: 'Cruce Mocoa - Guzmán', horaOffset: 0.5 },
            { lugar: 'Puerto Guzmán Base', horaOffset: 1.25 }
        ]
    },
    {
        id: 'mocoa-sibundoy',
        origen: 'MOCOA (PUTUMAYO)',
        origenDivipola: '86001',
        destino: 'SIBUNDOY (PUTUMAYO)',
        destinoDivipola: '86749',
        distanciaKm: 80,
        duracionHoras: 2.75,
        tipoVia: 2, // Trampolín de la Muerte / Vía de Alta Montaña
        puntosControl: [
            { lugar: 'Mirador La Calera', horaOffset: 0.75 },
            { lugar: 'San Francisco (Pausa Activa y Revisión Frenos)', horaOffset: 2.25 },
            { lugar: 'Sibundoy Casco Urbano', horaOffset: 2.75 }
        ]
    },

    // --- CORREDOR INTERDEPARTAMENTAL (PUTUMAYO - HUILA) ---
    {
        id: 'vg-pitalito',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'PITALITO (HUILA)',
        destinoDivipola: '41551',
        distanciaKm: 155,
        duracionHoras: 3.5,
        tipoVia: 1,
        puntosControl: [
            { lugar: 'Mocoa - Control Salida', horaOffset: 0.5 },
            { lugar: 'San Juan de Villalobos (Pausa Activa / Almuerzo)', horaOffset: 2.0 },
            { lugar: 'Bruselas (Huila)', horaOffset: 3.0 },
            { lugar: 'Pitalito Terminal / Base', horaOffset: 3.5 }
        ]
    },
    {
        id: 'vg-neiva',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'NEIVA (HUILA)',
        destinoDivipola: '41001',
        distanciaKm: 340,
        duracionHoras: 7.0,
        tipoVia: 1,
        puntosControl: [
            { lugar: 'San Juan de Villalobos (Pausa Activa 1)', horaOffset: 2.0 },
            { lugar: 'Pitalito (Descanso 45 min / Alimentación)', horaOffset: 3.5 },
            { lugar: 'Garzón / Gigante (Pausa Activa 2)', horaOffset: 5.5 },
            { lugar: 'Neiva Base Operativa', horaOffset: 7.0 }
        ]
    },

    // --- CORREDOR PUTUMAYO - NARIÑO ---
    {
        id: 'vg-pasto',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'PASTO (NARIÑO)',
        destinoDivipola: '52001',
        distanciaKm: 160,
        duracionHoras: 5.0,
        tipoVia: 2,
        puntosControl: [
            { lugar: 'Mocoa', horaOffset: 0.5 },
            { lugar: 'San Francisco (Pausa Activa 1)', horaOffset: 2.25 },
            { lugar: 'Santiago / Laguna de la Cocha (Pausa Activa 2)', horaOffset: 4.0 },
            { lugar: 'Pasto Base Operativa', horaOffset: 5.0 }
        ]
    },

    // --- CORREDOR PUTUMAYO - CAQUETÁ ---
    {
        id: 'vg-florencia',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'FLORENCIA (CAQUETA)',
        destinoDivipola: '18001',
        distanciaKm: 235,
        duracionHoras: 5.0,
        tipoVia: 1,
        puntosControl: [
            { lugar: 'Mocoa', horaOffset: 0.5 },
            { lugar: 'San Juan de Villalobos (Pausa Activa)', horaOffset: 2.0 },
            { lugar: 'Pitalito Cruce Caquetá', horaOffset: 3.5 },
            { lugar: 'Florencia Base', horaOffset: 5.0 }
        ]
    },

    // --- CORREDOR NACIONAL A BOGOTÁ ---
    {
        id: 'vg-bogota',
        origen: 'VILLAGARZON (PUTUMAYO)',
        origenDivipola: '86885',
        destino: 'BOGOTA D.C. (CUNDINAMARCA)',
        destinoDivipola: '11001',
        distanciaKm: 650,
        duracionHoras: 13.0,
        tipoVia: 1,
        puntosControl: [
            { lugar: 'San Juan de Villalobos (Pausa 1)', horaOffset: 2.0 },
            { lugar: 'Pitalito (Descanso 1)', horaOffset: 3.5 },
            { lugar: 'Neiva (Descanso 2 / Relevo si aplica)', horaOffset: 7.0 },
            { lugar: 'Espinal / Girardot (Pausa 3)', horaOffset: 10.5 },
            { lugar: 'Bogotá D.C.', horaOffset: 13.0 }
        ]
    }
];

export function findRuta(origenStr, destinoStr) {
    if (!origenStr || !destinoStr) return null;
    const cleanO = String(origenStr).toUpperCase().trim();
    const cleanD = String(destinoStr).toUpperCase().trim();

    return RUTAS_FRECUENTES.find(r => 
        (cleanO.includes(r.origen.split(' ')[0]) || (r.origenDivipola && cleanO.includes(r.origenDivipola))) &&
        (cleanD.includes(r.destino.split(' ')[0]) || (r.destinoDivipola && cleanD.includes(r.destinoDivipola)))
    ) || null;
}
