import { API_BASE_URL } from "./api_config.js";
import { apiFetch } from "./api_client.js";

const estadoFront = { PENDING: "pendiente", APPROVED: "aceptada", REJECTED: "rechazada", WITHDRAWN: "retirada" };
const estadoApi = { PENDIENTE: "PENDING", ACEPTADA: "APPROVED", APROBADA: "APPROVED", RECHAZADA: "REJECTED", RETIRADA: "WITHDRAWN" };

const mapearSolicitud = (item) => ({
  ...item,
  proyecto_id: item.projectId,
  proyecto_nombre: item.project?.title,
  proyecto_imagen: item.project?.imageUrl,
  proyecto_presupuesto: Number(item.project?.targetAmount ?? 0),
  emprendedor_usuario_id: item.project?.owner?.id || item.project?.ownerId,
  emprendedor_nombre: item.project?.owner?.name,
  emprendedor_email: item.project?.owner?.email,
  inversionista_usuario_id: item.investor?.id || item.investorId,
  inversionista_nombre: item.investor?.name,
  inversionista_email: item.investor?.email,
  monto_solicitado: Number(item.amount ?? 0),
  propuesta: item.message,
  estado: estadoFront[item.status] || item.status,
  creada_en: item.createdAt,
});

async function leerRespuesta(response, fallback) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || body?.mensaje || fallback);
  return body;
}

// Función de prueba para verificar si PATCH funciona
export async function test_patch_api() {
  try {
    const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/test-patch`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await respuesta.json();
  } catch (error) {
    throw error;
  }
}

export async function listar_solicitudes_por_proyecto_api(proyecto_id) {
  if (!proyecto_id) return [];
  const response = await apiFetch(`${API_BASE_URL}/api/v1/investment-requests?page=1&limit=100`);
  const body = await leerRespuesta(response, "No fue posible listar las solicitudes del proyecto.");
  return (body.data || []).filter((item) => item.projectId === proyecto_id).map(mapearSolicitud);
}

export async function listar_solicitudes_por_inversionista_api(inversionista_id) {
  if (!inversionista_id) return [];
  const response = await apiFetch(`${API_BASE_URL}/api/v1/investment-requests?page=1&limit=100`);
  const body = await leerRespuesta(response, "No fue posible listar las solicitudes de inversión.");
  return (body.data || []).filter((item) => item.investorId === inversionista_id).map(mapearSolicitud);
}

export async function crear_solicitud_api(datos_solicitud) {
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/investment-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId: datos_solicitud.projectId || datos_solicitud.proyecto_id,
      amount: datos_solicitud.amount ?? datos_solicitud.monto_solicitado,
      message: datos_solicitud.message ?? datos_solicitud.propuesta,
    }),
  });

  const datos = await leerRespuesta(respuesta, "No fue posible crear la solicitud.");
  return mapearSolicitud(datos.data);
}

export async function actualizar_estado_solicitud_api(solicitud_id, nuevo_estado) {
  const url = `${API_BASE_URL}/api/v1/investment-requests/${encodeURIComponent(solicitud_id)}`;
  const status = estadoApi[String(nuevo_estado).toUpperCase()];
  if (!status || status === "PENDING" || status === "WITHDRAWN") {
    throw new Error("Selecciona un estado válido para la solicitud.");
  }
  const respuesta = await apiFetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  const datos = await leerRespuesta(respuesta, `No fue posible actualizar la solicitud (HTTP ${respuesta.status}).`);
  return mapearSolicitud(datos.data);
}
