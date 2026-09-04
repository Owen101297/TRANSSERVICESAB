"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = "No fue posible cargar la información",
  message = "Ocurrió un inconveniente al comunicarse con el servidor. Verifica tu conexión e inténtalo nuevamente.",
  onRetry,
  compact = false,
  className = "",
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-3 p-3 rounded-xl bg-alert-red-dim/20 border border-alert-red/30 text-xs text-paper-50 animate-fadeIn ${className}`}
      >
        <div className="flex items-center gap-2 text-alert-red">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="text-mist-200">{message || title}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-[11px] font-bold text-radar-cyan hover:underline shrink-0"
          >
            <RefreshCw size={12} />
            <span>Reintentar</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-alert-red/30 bg-alert-red-dim/10 backdrop-blur-sm animate-fadeIn ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-alert-red-dim/30 border border-alert-red/40 flex items-center justify-center text-alert-red mb-4 shadow-inner">
        <AlertTriangle size={26} />
      </div>

      <h3 className="text-base font-bold text-paper-50 tracking-tight">
        {title}
      </h3>

      {message && (
        <p className="text-xs text-mist-200/90 max-w-md mt-1.5 leading-relaxed">
          {message}
        </p>
      )}

      {onRetry && (
        <div className="mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="text-xs flex items-center gap-2 border-alert-red/40 text-paper-50 hover:bg-alert-red/20"
          >
            <RefreshCw size={13} />
            <span>Reintentar Carga</span>
          </Button>
        </div>
      )}
    </div>
  );
}
