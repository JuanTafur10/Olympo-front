import { API_BASE_URL } from "./api_config.js";
import { apiFetch } from "./api_client.js";
import { obtener_headers_autorizados } from "./auth_api.js";

/**
 * Crea un nuevo ticket en el sistema.
 * @param {Object} datos_ticket
 */
export async function crear_ticket_api(datos_ticket) {
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/tickets`, {
    method: "POST",
    headers: obtener_headers_autorizados(),
    body: JSON.stringify(datos_ticket),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible crear el ticket de soporte");
  }

  return datos.ticket;
}

/**
 * Obtiene la lista de tickets creados por el usuario actual.
 */
export async function listar_mis_tickets_api() {
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/tickets`, {
    method: "GET",
    headers: obtener_headers_autorizados(),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener tus tickets");
  }

  return datos.tickets || [];
}

/**
 * Lista todos los tickets para usuarios administradores, con filtros opcionales.
 * @param {Object} filtros { categoria, prioridad, estado, asignado_a }
 */
export async function admin_listar_tickets_api(filtros = {}) {
  const queryParams = new URLSearchParams();
  Object.entries(filtros).forEach(([key, val]) => {
    if (val) {
      queryParams.append(key, val);
    }
  });

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/admin/tickets${queryString}`, {
    method: "GET",
    headers: obtener_headers_autorizados(),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible listar los tickets");
  }

  return datos.tickets || [];
}

/**
 * Actualiza un ticket desde el panel de administración.
 * @param {string} ticket_id
 * @param {Object} datos_actualizados { prioridad, estado, asignado_a, notas_internas }
 */
export async function admin_actualizar_ticket_api(ticket_id, datos_actualizados) {
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/admin/tickets/${encodeURIComponent(ticket_id)}`, {
    method: "PATCH",
    headers: obtener_headers_autorizados(),
    body: JSON.stringify(datos_actualizados),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible actualizar el ticket");
  }

  return datos.ticket;
}
