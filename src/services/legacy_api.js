import { API_BASE_URL } from "./api_config.js";
import { apiFetch } from "./api_client.js";

// Endpoints heredados de la aplicaciÃ³n. Las llamadas pasan por el cliente central.
export function obtenerUsuarioLegado(id) {
  return apiFetch(`${API_BASE_URL}/api/v1/usuarios/${encodeURIComponent(id)}`);
}

export function obtenerProyectoLegado(id) {
  return apiFetch(`${API_BASE_URL}/api/v1/proyectos/${encodeURIComponent(id)}`);
}
