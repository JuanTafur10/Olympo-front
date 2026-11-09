import { API_BASE_URL } from "./api_config.js";
import { apiFetch } from "./api_client.js";

async function readData(response, fallback) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || body?.mensaje || fallback);
  return body?.data ?? body;
}

export async function listarProyectos({ page = 1, limit = 12, q = "", categoryId = "" } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q.trim()) params.set("q", q.trim());
  if (categoryId) params.set("categoryId", categoryId);
  const response = await apiFetch(`${API_BASE_URL}/api/v1/projects?${params}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || "No fue posible cargar los proyectos.");
  return { data: Array.isArray(body.data) ? body.data : [], pagination: body.pagination || { total: 0, currentPage: page, limit, totalPages: 0 } };
}

export async function obtenerProyecto(id) {
  return readData(await apiFetch(`${API_BASE_URL}/api/v1/projects/${encodeURIComponent(id)}`), "No fue posible cargar el proyecto.");
}

export async function listarCategorias() {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/categories?page=1&limit=100`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || "No fue posible cargar las categorías.");
  return Array.isArray(body.data) ? body.data : [];
}

export async function crearProyecto(payload) {
  return readData(await apiFetch(`${API_BASE_URL}/api/v1/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }), "No fue posible crear el proyecto.");
}

export async function actualizarProyecto(id, payload) {
  return readData(await apiFetch(`${API_BASE_URL}/api/v1/projects/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }), "No fue posible actualizar el proyecto.");
}

export async function subirImagenProyecto(id, file) {
  const form = new FormData();
  form.append("image", file);
  return readData(await apiFetch(`${API_BASE_URL}/api/v1/projects/${encodeURIComponent(id)}/image`, { method: "POST", body: form }), "No fue posible subir la imagen.");
}

export async function eliminarProyecto(id) {
  const response = await apiFetch(`${API_BASE_URL}/api/v1/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) await readData(response, "No fue posible eliminar el proyecto.");
}

export async function crearSolicitudInversion(payload) {
  return readData(await apiFetch(`${API_BASE_URL}/api/v1/investment-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }), "No fue posible enviar la solicitud.");
}
