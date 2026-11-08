const envUrl = process.env.REACT_APP_API_URL?.trim() || "";
const fallbackLocalUrl = "http://localhost:8000";

const isLocalHost = typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname);
const productionBaseUrl = typeof window !== "undefined" ? window.location.origin : "";

// En producción: usa el mismo origen del sitio para que el proxy de Nginx resuelva /api/v1/...
// En local dev: usa la URL de env o localhost:8000
export const API_BASE_URL = isLocalHost
  ? (envUrl || fallbackLocalUrl)
  : productionBaseUrl;
