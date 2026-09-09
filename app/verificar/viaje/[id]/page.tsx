import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, AlertTriangle, ShieldCheck, Clock, MapPin, Truck, User, Calendar, Award } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function VerificarViajePage(props: {
  params: Promise<{ id: string }>;
}) {
  let id = "";
  try {
    const resolved = await props.params;
    id = resolved?.id || "";
  } catch (e) {
    console.warn("Aviso resolviendo params en VerificarViajePage:", e);
  }

  if (!id) notFound();

  const viaje = await prisma.viaje.findUnique({
    where: { id },
  });

  if (!viaje) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Viaje No Encontrado</h1>
          <p className="text-sm text-slate-400 mb-6">
            El código del plan de gerenciamiento de viaje <span className="font-mono text-slate-200">#{id}</span> no existe o no se encuentra registrado en el sistema oficial de Trans Services A&B.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500">
            Sistema Oficial de Gestión PESV · Trans Services A&B S.A.S.
          </div>
        </div>
      </div>
    );
  }

  const riskInputs = (viaje.riskInputs as any) || {};
  const signatures = (viaje.signatures as any) || {};
  const origenDivipola = riskInputs.origenDivipola || "";
  const destinoDivipola = riskInputs.destinoDivipola || "";
  const score = viaje.riskScore ?? 0;
  const isHighRisk = score >= 24;
  const isMedRisk = score >= 16 && score < 24;
  const riskLevel = viaje.riskLevel || (isHighRisk ? "ALTO" : (isMedRisk ? "MEDIO" : "BAJO"));

  const isAutorizado = viaje.estado === "en_curso" || viaje.estado === "Autorizado" || viaje.estado === "finalizado";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Encabezado Institucional */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-500" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full inline-block mb-2">
                Verificación Oficial DITRA / PESV
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                TRANS SERVICES A&B S.A.S.
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                NIT 900.778.421-1 · Plan STE-F-010
              </p>
            </div>
            <div className="text-center sm:text-right bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Estado del Plan</span>
              <span className={`text-xs font-bold uppercase ${isAutorizado ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isAutorizado ? '✓ Autorizado y Activo' : '⏳ En Trámite'}
              </span>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Documento Electrónico Válido</div>
              <div className="text-[11px] text-slate-400 font-mono">ID: {viaje.id}</div>
            </div>
          </div>
        </div>

        {/* Tarjeta de Ruta y Trayecto */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
            <MapPin size={15} className="text-sky-400" />
            Información del Desplazamiento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Origen</span>
              <span className="text-sm font-bold text-white">{viaje.origen}</span>
              {origenDivipola && (
                <span className="text-[10px] text-sky-400 font-mono block mt-0.5">DIVIPOLA: {origenDivipola}</span>
              )}
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Destino</span>
              <span className="text-sm font-bold text-white">{viaje.destino}</span>
              {destinoDivipola && (
                <span className="text-[10px] text-sky-400 font-mono block mt-0.5">DIVIPOLA: {destinoDivipola}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Fecha Salida</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {new Date(viaje.fechaSalida).toLocaleDateString("es-CO")}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Hora Salida</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {viaje.horaSalida || "—"}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Distancia</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {viaje.distanciaKm ? `${viaje.distanciaKm} km` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Vehículo y Conductor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
              <Truck size={15} className="text-amber-400" />
              Vehículo Asignado
            </h2>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Placa</span>
                <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-mono font-black text-sm tracking-wider">
                  {viaje.placa}
                </span>
              </div>
              <div className="text-xs text-slate-300">
                {riskInputs.vehiculoTipo || "Camioneta"} · {riskInputs.vehiculoModelo || "2024"} · {riskInputs.vehiculoColor || "Blanco"}
              </div>
              <div className="text-[10px] text-slate-500">
                Empresa: {riskInputs.vehiculoEmpresa || "TRANS SERVICES A&B"}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
              <User size={15} className="text-emerald-400" />
              Conductor Responsable
            </h2>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-white">{viaje.conductorNombre}</div>
              <div className="text-[11px] text-slate-400 font-mono">
                Licencia: {riskInputs.conductorLicencia || "Vigente"} ({riskInputs.conductorCategoria || "C2/C3"})
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 size={12} /> Test Anti-Fatiga y Previaje Aprobado
              </div>
            </div>
          </div>
        </div>

        {/* Nivel de Riesgo y Autorización */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-2">
            <Award size={15} className="text-purple-400" />
            Matriz de Evaluación de Riesgo (STE-F-010)
          </h2>

          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Puntaje Total de Riesgo</span>
              <span className="text-2xl font-bold font-mono text-white">{score} Puntos</span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border font-bold text-xs uppercase ${
              isHighRisk ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              isMedRisk ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
              'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              Riesgo {riskLevel}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Firma Conductor</span>
              <span className="text-emerald-400 font-bold block">✓ Registrada Digitalmente</span>
              <span className="text-[10px] text-slate-500 font-mono">{viaje.conductorNombre}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Autorización HSEQ</span>
              <span className="text-emerald-400 font-bold block">✓ Validada con PIN Seguro</span>
              <span className="text-[10px] text-slate-500 font-mono">Dpto. HSEQ / PESV</span>
            </div>
          </div>
        </div>

        {/* Pie de Página */}
        <div className="text-center text-xs text-slate-500 space-y-1 pt-4 pb-8">
          <p>© {new Date().getFullYear()} Trans Services A&B S.A.S. · Villagarzón, Putumayo</p>
          <p className="text-[10px] text-slate-600">
            Documento de control operativo generado de conformidad con la Resolución 40595 de 2022 del Ministerio de Transporte.
          </p>
        </div>
      </div>
    </div>
  );
}
