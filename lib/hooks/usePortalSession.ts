"use client";

import { useEffect, useState } from "react";

export type PortalSession = {
  id: string;
  nombre: string;
  documento: string;
  rol: "conductor" | "coordinador" | "hseq" | "administrativo";
  placa: string | null;
};

export function usePortalSession() {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/portal-conductor/contexto", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("La sesión terminó. Ingresa nuevamente.");
        return response.json();
      })
      .then((data) => {
        if (!data?.success || !data.usuario) throw new Error("No hay una sesión activa.");
        const value: PortalSession = {
          id: data.usuario.id,
          nombre: data.usuario.nombre,
          documento: data.usuario.documento,
          rol: data.usuario.rol,
          placa: data.asignacion?.placa || null,
        };
        setSession(value);
        // Compatibilidad temporal para microapps. La API sigue siendo la autoridad.
        localStorage.setItem("transservices_conductor", JSON.stringify(value));
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "No fue posible validar la sesión.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return { session, loading, error };
}
