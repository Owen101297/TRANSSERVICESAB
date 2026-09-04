"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Ocurrió un problema al cargar los datos",
  message = "No fue posible conectar con el servidor o procesar la solicitud.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-10 rounded-2xl border border-rose-200/80 bg-rose-50/40 animate-fadeIn ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-3 shadow-xs">
        <AlertTriangle size={24} />
      </div>

      <h3 className="text-sm sm:text-base font-bold text-rose-950 tracking-tight">
        {title}
      </h3>

      {message && (
        <p className="text-xs text-rose-700/80 max-w-md mt-1 leading-relaxed font-medium">
          {message}
        </p>
      )}

      {onRetry && (
        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="text-xs bg-white border-rose-200 text-rose-800 hover:bg-rose-50"
          >
            <RefreshCw size={14} className="mr-1.5" />
            <span>Reintentar</span>
          </Button>
        </div>
      )}
    </div>
  );
}
