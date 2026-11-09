import { API_BASE_URL } from "./api_config.js";
import { apiFetch } from "./api_client.js";

export async function enviar_mensaje_chatbot(mensaje, usuario_id = null) {
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/chatbot/mensaje`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mensaje,
      usuario_id,
    }),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible procesar el mensaje");
  }

  return datos.respuesta;
}

export async function obtener_historial_chatbot(usuario_id, limit = 200) {
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/chatbot/history?usuario_id=${usuario_id}&limit=${limit}`);
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener el historial");
  }

  return datos.historial || [];
}

export async function obtener_riesgos_detectados_ares(proyecto_id, usuario_id) {
  const respuesta = await apiFetch(
    `${API_BASE_URL}/api/v1/chatbot/ares/riesgos-detectados/${proyecto_id}?usuario_id=${encodeURIComponent(usuario_id)}`
  );
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener riesgos detectados por IA");
  }

  return datos.datos;
}

export async function obtener_riesgos_ares(proyecto_id, usuario_id) {
  return obtener_riesgos_detectados_ares(proyecto_id, usuario_id);
}

export async function detectar_riesgos_ares(proyecto_id, usuario_id = null) {
  const query = usuario_id ? `?usuario_id=${encodeURIComponent(usuario_id)}` : "";
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/chatbot/ares/detectar-riesgos/${proyecto_id}${query}`, {
    method: "POST",
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible detectar riesgos adicionales con IA");
  }

  return datos.datos;
}

export async function listar_riesgos_personalizados_ares(proyecto_id, usuario_id) {
  const respuesta = await apiFetch(
    `${API_BASE_URL}/api/v1/chatbot/ares/riesgos-personalizados/${proyecto_id}?usuario_id=${encodeURIComponent(usuario_id)}`
  );
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener los riesgos personalizados");
  }

  return datos.datos || [];
}

export async function crear_riesgo_personalizado_ares(payload) {
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/chatbot/ares/riesgos-personalizados`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible crear el riesgo personalizado");
  }

  return datos.datos;
}

export async function eliminar_riesgo_personalizado_ares(riesgo_id, usuario_id, proyecto_id = null, riesgo = null) {
  const query = new URLSearchParams({ usuario_id });
  if (proyecto_id) {
    query.set("proyecto_id", proyecto_id);
  }

  if (riesgo && typeof riesgo === "object") {
    if (riesgo.nombre) query.set("nombre", riesgo.nombre);
    if (riesgo.categoria) query.set("categoria", riesgo.categoria);
    if (riesgo.probabilidad != null) query.set("probabilidad", String(riesgo.probabilidad));
    if (riesgo.impacto != null) query.set("impacto", String(riesgo.impacto));
    if (riesgo.tipo) query.set("tipo", riesgo.tipo);
    if (riesgo.descripcion) query.set("descripcion", riesgo.descripcion);
  }

  const respuesta = await apiFetch(
    `${API_BASE_URL}/api/v1/chatbot/ares/riesgos-personalizados/${encodeURIComponent(riesgo_id)}?${query.toString()}`,
    {
      method: "DELETE",
    }
  );

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible eliminar el riesgo personalizado");
  }

  return datos.datos;
}
