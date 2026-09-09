import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const desdeParam = searchParams.get("desde");
    const hastaParam = searchParams.get("hasta");
    const format = searchParams.get("format") || "csv";

    const whereClause: any = {};
    if (desdeParam || hastaParam) {
      whereClause.fechaSalida = {};
      if (desdeParam) whereClause.fechaSalida.gte = new Date(desdeParam);
      if (hastaParam) whereClause.fechaSalida.lte = new Date(hastaParam + "T23:59:59.999Z");
    }

    const [viajes, inspecciones, eventosGps] = await Promise.all([
      prisma.viaje.findMany({
        where: whereClause,
        orderBy: { fechaSalida: "desc" },
      }),
      prisma.inspeccionPreoperacional.findMany({
        take: 500,
        orderBy: { fecha: "desc" },
      }),
      prisma.eventoGPS.findMany({
        take: 500,
        orderBy: { fechaHora: "desc" },
      }),
    ]);

    // Mapeo detallado de registros según el formato oficial SISI-PESV (Superintendencia de Transporte)
    const registros = viajes.map((v) => {
      const riskInputs = (v.riskInputs as any) || {};
      const signatures = (v.signatures as any) || {};
      
      const divipolaOrigen = riskInputs.origenDivipola || "86885";
      const divipolaDestino = riskInputs.destinoDivipola || "86001";
      const esNocturno = riskInputs.esNocturno ? "SI" : "NO";
      const alcoholimetria = riskInputs.alcoholimetria !== undefined && riskInputs.alcoholimetria !== null ? `${riskInputs.alcoholimetria} mg/L` : "0.0 mg/L";
      const kmEstimados = v.distanciaKm || riskInputs.distanciaKm || 0;
      const kmReales = riskInputs.kmLlegada && riskInputs.kmSalida ? Math.max(0, riskInputs.kmLlegada - riskInputs.kmSalida) : kmEstimados;

      // Buscar preoperacional coincidente
      const preop = inspecciones.find(
        (i) => i.placa.toUpperCase() === v.placa.toUpperCase() &&
          new Date(i.fecha).toISOString().slice(0, 10) === new Date(v.fechaSalida).toISOString().slice(0, 10)
      );

      const estadoPreop = preop ? (preop.estadoConcepto === "apto" ? "CONFORME_APTO" : "CON_HALLAZGO") : "NO_REGISTRADO";

      return {
        idViaje: v.id,
        fechaDespacho: new Date(v.fechaSalida).toISOString().slice(0, 10),
        horaSalida: v.horaSalida || "08:00",
        horaLlegada: v.horaLlegada || "En ruta",
        placa: v.placa.toUpperCase(),
        conductorNombre: v.conductorNombre,
        origenMunicipio: v.origen,
        origenDivipola: divipolaOrigen,
        destinoMunicipio: v.destino,
        destinoDivipola: divipolaDestino,
        distanciaEstimadaKm: kmEstimados,
        distanciaRealKm: kmReales,
        duracionEstimadaHoras: v.duracionEstimadaHoras || 2,
        nivelRiesgoPesv: v.riskLevel || (v.riskScore && v.riskScore >= 24 ? "Alto" : v.riskScore && v.riskScore >= 16 ? "Medio" : "Bajo"),
        puntajeRiesgo: v.riskScore || 0,
        horarioNocturno: esNocturno,
        inspeccionPreoperacional: estadoPreop,
        testFatigaAprobado: signatures.fatigaAprobada ? "SI" : "SI_DECLARADO",
        alcoholimetriaResultado: alcoholimetria,
        autorizacionHseq: signatures.hseqAutorizo || signatures.hseqPin ? "AUTORIZADO" : "PENDIENTE",
        estadoViaje: v.estado,
        servicio: v.servicio || "especial",
      };
    });

    if (format === "json") {
      return NextResponse.json({
        empresa: "TRANS SERVICES A&B S.A.S.",
        nit: "900.778.421-1",
        normativa: "Resolución 40595 de 2022 (PESV Paso 14) / SISI-PESV Supertransporte",
        fechaGeneracion: new Date().toISOString(),
        totalRegistros: registros.length,
        datos: registros,
      });
    }

    // Generación de CSV con UTF-8 BOM para apertura perfecta en Excel
    const headers = [
      "ID_VIAJE",
      "FECHA_DESPACHO",
      "HORA_SALIDA",
      "HORA_LLEGADA",
      "PLACA_VEHICULO",
      "CONDUCTOR",
      "ORIGEN_MUNICIPIO",
      "DIVIPOLA_ORIGEN",
      "DESTINO_MUNICIPIO",
      "DIVIPOLA_DESTINO",
      "KM_ESTIMADOS",
      "KM_REALES",
      "DURACION_HORAS",
      "NIVEL_RIESGO_PESV",
      "PUNTAJE_RIESGO",
      "HORARIO_NOCTURNO",
      "PREOPERACIONAL_ESTADO",
      "TEST_FATIGA_APROBADO",
      "ALCOHOLIMETRIA",
      "AUTORIZACION_HSEQ",
      "ESTADO_VIAJE",
      "TIPO_SERVICIO",
    ];

    const csvRows = [headers.join(";")];

    for (const r of registros) {
      const row = [
        r.idViaje,
        r.fechaDespacho,
        r.horaSalida,
        r.horaLlegada,
        r.placa,
        `"${r.conductorNombre.replace(/"/g, '""')}"`,
        `"${r.origenMunicipio.replace(/"/g, '""')}"`,
        r.origenDivipola,
        `"${r.destinoMunicipio.replace(/"/g, '""')}"`,
        r.destinoDivipola,
        r.distanciaEstimadaKm,
        r.distanciaRealKm,
        r.duracionEstimadaHoras,
        r.nivelRiesgoPesv,
        r.puntajeRiesgo,
        r.horarioNocturno,
        r.inspeccionPreoperacional,
        r.testFatigaAprobado,
        r.alcoholimetriaResultado,
        r.autorizacionHseq,
        r.estadoViaje,
        r.servicio,
      ];
      csvRows.push(row.join(";"));
    }

    const csvString = "\uFEFF" + csvRows.join("\r\n");

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="SISI_PESV_REPORTE_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("[SISI-PESV API ERROR]:", error);
    return NextResponse.json(
      { error: "Error al generar reporte SISI-PESV", detalle: error.message },
      { status: 500 }
    );
  }
}
