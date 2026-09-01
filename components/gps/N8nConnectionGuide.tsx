"use client";

import { useState } from "react";
import { Copy, Check, Terminal, ExternalLink, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function N8nConnectionGuide() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const webhookUrl = "https://transservicesab-production.up.railway.app/api/gps/eventos";
  const apiKey = "ts_gps_live_secret_key_ab2026";

  const samplePayload = JSON.stringify(
    {
      placa: "WLM-789",
      fechaHora: "2026-09-01T10:45:00.000Z",
      tipoEvento: "exceso_velocidad",
      prioridad: "alta",
      velocidad: 88,
      limiteVelocidad: 60,
      odometro: 145230,
      latitud: 10.3910,
      longitud: -75.4794,
      ubicacion: "Vía Turbaco - Variante Cartagena km 12",
      descripcion: "Velocidad registrada: 88 km/h en tramo regulado a 60 km/h",
    },
    null,
    2
  );

  const handleCopy = (text: string, setFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tarjeta de Resumen de Conexión */}
      <div className="rounded-xl border border-line-600 bg-asphalt-900 p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-radar-cyan/40 bg-radar-cyan/10 text-radar-cyan">
            <Zap size={22} />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-paper-50 leading-tight">
              Conexión de n8n &amp; Satelcopro al ERP
            </h3>
            <p className="text-xs text-fog-400">
              Configura el nodo <code className="text-signal-amber font-mono font-bold">HTTP Request</code> en n8n para enviar eventos en tiempo real
            </p>
          </div>
        </div>

        {/* Campos de Conexión */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Webhook URL */}
          <div className="rounded-lg border border-line-600 bg-asphalt-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-fog-400 uppercase">Endpoint URL (POST):</span>
              <button
                type="button"
                onClick={() => handleCopy(webhookUrl, setCopiedUrl)}
                className="inline-flex items-center gap-1 text-radar-cyan hover:underline"
              >
                {copiedUrl ? <Check size={12} className="text-ok-green" /> : <Copy size={12} />}
                <span>{copiedUrl ? "¡Copiado!" : "Copiar URL"}</span>
              </button>
            </div>
            <p className="font-mono text-xs text-paper-50 select-all truncate">
              {webhookUrl}
            </p>
          </div>

          {/* API Key */}
          <div className="rounded-lg border border-line-600 bg-asphalt-950 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-fog-400 uppercase">Cabecera de Autenticación (x-api-key):</span>
              <button
                type="button"
                onClick={() => handleCopy(apiKey, setCopiedKey)}
                className="inline-flex items-center gap-1 text-signal-amber hover:underline"
              >
                {copiedKey ? <Check size={12} className="text-ok-green" /> : <Copy size={12} />}
                <span>{copiedKey ? "¡Copiado!" : "Copiar Key"}</span>
              </button>
            </div>
            <p className="font-mono text-xs text-signal-amber select-all truncate">
              {apiKey}
            </p>
          </div>
        </div>
      </div>

      {/* Guía de Configuración en n8n */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pasos en n8n */}
        <Card className="space-y-4">
          <h4 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50 flex items-center gap-2">
            <Terminal size={18} className="text-signal-amber" /> Pasos en tu Workflow de n8n
          </h4>

          <ol className="space-y-3 text-xs text-fog-400 list-decimal list-inside">
            <li className="leading-relaxed">
              <strong className="text-paper-50">Agrega un nodo HTTP Request</strong> al final de tu flujo de Satelcopro.
            </li>
            <li className="leading-relaxed">
              <strong className="text-paper-50">Método:</strong> Selecciona <code className="text-ok-green font-mono">POST</code>.
            </li>
            <li className="leading-relaxed">
              <strong className="text-paper-50">URL:</strong> Pega la URL del endpoint indicada arriba.
            </li>
            <li className="leading-relaxed">
              <strong className="text-paper-50">Headers:</strong> Agrega el encabezado <code className="text-signal-amber font-mono">x-api-key</code> con el valor de la clave secreta.
            </li>
            <li className="leading-relaxed">
              <strong className="text-paper-50">Body:</strong> Envía el JSON con las variables de Satelcopro (Placa, Fecha, Tipo, Velocidad, etc.).
            </li>
          </ol>

          <div className="rounded-lg border border-ok-green/30 bg-ok-green/10 p-3 text-xs text-mist-200">
            <strong className="text-ok-green block mb-0.5">Asociación Automática de Conductor:</strong>
            El ERP busca automáticamente en tiempo real qué conductor tiene asignado ese vehículo para que puedas enviarle retroalimentación por WhatsApp de inmediato.
          </div>
        </Card>

        {/* Ejemplo de JSON Payload */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-[family-name:var(--font-display)] text-lg font-bold text-paper-50">
              Estructura JSON Recomendada
            </h4>
            <button
              type="button"
              onClick={() => handleCopy(samplePayload, setCopiedPayload)}
              className="inline-flex items-center gap-1 text-xs text-radar-cyan hover:underline font-mono"
            >
              {copiedPayload ? <Check size={12} className="text-ok-green" /> : <Copy size={12} />}
              <span>{copiedPayload ? "¡Copiado!" : "Copiar JSON"}</span>
            </button>
          </div>

          <pre className="rounded-lg border border-line-600 bg-asphalt-950 p-3 font-mono text-[11px] text-mist-200 overflow-x-auto max-h-72">
            {samplePayload}
          </pre>
        </Card>
      </div>
    </div>
  );
}
