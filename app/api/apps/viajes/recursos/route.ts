import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [personas, vehiculos] = await Promise.all([
      prisma.persona.findMany({
        where: { estado: { in: ["activo", "Activo", "ACTIVO"] } },
        include: {
          licenciaConduccion: true,
        },
        orderBy: { nombres: "asc" },
      }),
      prisma.vehiculo.findMany({
        where: { estado: { in: ["activo", "Activo", "ACTIVO", "en_operacion", "disponible"] } },
        orderBy: { placa: "asc" },
      }),
    ]);

    const conductoresMapped = personas.map((p) => {
      const nombreCompleto = `${p.nombres || ""} ${p.apellidos || ""}`.trim();
      return {
        id: p.id,
        nombre: nombreCompleto,
        cedula: p.numeroDocumento,
        licencia: p.licenciaConduccion?.numero || p.numeroDocumento,
        categoria: p.licenciaConduccion?.categorias?.[0] || (p.licenciaConduccion as any)?.categoria || "C2",
        vencimiento: p.licenciaConduccion?.fechaVencimiento
          ? p.licenciaConduccion.fechaVencimiento.toISOString().split("T")[0]
          : null,
        telefono: p.telefono || "",
        email: p.email || "",
        activo: true,
      };
    });

    const vehiculosMapped = vehiculos.map((v) => ({
      id: v.id,
      placa: v.placa,
      tipo: v.tipo || "Camioneta",
      marca: v.marca || "Toyota",
      modelo: v.modelo || String(v.anio || "2024"),
      color: "Blanco", // Color institucional por defecto si no especifica
      empresa: v.contratistaNombre || "TRANS SERVICES A&B",
      soatVencimiento: v.soatVencimiento ? v.soatVencimiento.toISOString().split("T")[0] : null,
      rtmVencimiento: v.rtmVencimiento ? v.rtmVencimiento.toISOString().split("T")[0] : null,
      polizaVencimiento: v.polizaVencimiento ? v.polizaVencimiento.toISOString().split("T")[0] : null,
      activo: true,
    }));

    return NextResponse.json({
      success: true,
      conductores: conductoresMapped,
      vehiculos: vehiculosMapped,
    });
  } catch (error: any) {
    console.error("Error al obtener recursos para App Viajes:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error cargando recursos" },
      { status: 500 }
    );
  }
}
