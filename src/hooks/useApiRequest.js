"use client";

import { useCallback, useState } from "react";

/** Ejecuta una operaciÃ³n de services/ con estados reutilizables para la interfaz. */
export function useApiRequest() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const ejecutar = useCallback(async (request) => {
    setCargando(true);
    setError("");
    try {
      return await request();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible completar la solicitud.";
      setError(message);
      throw cause instanceof Error ? cause : new Error(message);
    } finally {
      setCargando(false);
    }
  }, []);

  return { ejecutar, cargando, error, limpiarError: () => setError("") };
}
