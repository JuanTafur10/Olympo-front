import { API_BASE_URL } from "./api_config.js";
import { apiFetch } from "./api_client.js";

async function readAnalyticsResponse(response, fallback) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error?.message || body?.mensaje || fallback);
  }
  return body;
}

export async function obtenerAnaliticasProyectos(ownerId) {
  const query = new URLSearchParams({ propietario_id: String(ownerId) });
  return readAnalyticsResponse(
    await apiFetch(`${API_BASE_URL}/api/v1/analytics/proyectos?${query}`),
    "No fue posible cargar las analíticas."
  );
}

export async function obtenerProyeccionProyecto(projectId) {
  const query = new URLSearchParams({ proyecto_id: String(projectId), include_mensajes: "true" });
  return readAnalyticsResponse(
    await apiFetch(`${API_BASE_URL}/api/v1/analytics/proyeccion?${query}`),
    "No fue posible cargar la proyección."
  );
}
