import { API_BASE_URL } from "./api_config.js";

const normalizarFecha = (valor) => {
  if (!valor) return 0;
  const parsed = new Date(valor).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const pedirNotificaciones = async (userId) => {
  console.debug("[Notificaciones API] Solicitando notificaciones para usuario:", userId);
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/notificaciones?usuario_id=${encodeURIComponent(userId)}`);
  const datos = await respuesta.json().catch(() => ({}));

  console.debug("[Notificaciones API] Status:", respuesta.status, "Datos:", datos);

  if (!respuesta.ok || !datos.ok) {
    console.error("[Notificaciones API] Error:", datos.mensaje);
    throw new Error(datos.mensaje || "No fue posible obtener las notificaciones");
  }

  const notificaciones = (datos.notificaciones || []).sort((a, b) => normalizarFecha(b.creada_en) - normalizarFecha(a.creada_en));
  console.debug("[Notificaciones API] Total de notificaciones:", notificaciones.length);
  return notificaciones;
};

export const escucharNotificacionesUsuario = ({ userId }, onCambio) => {
  if (!userId) {
    onCambio([]);
    return () => {};
  }

  let activo = true;
  let timer = null;

  const refrescar = async () => {
    try {
      const notificaciones = await pedirNotificaciones(userId);
      if (activo) onCambio(notificaciones);
    } catch (error) {
      console.error("Error escuchando notificaciones:", error);
      if (activo) onCambio([]);
    }
  };

  refrescar();
  timer = setInterval(refrescar, 5000);

  return () => {
    activo = false;
    if (timer) clearInterval(timer);
  };
};

export const marcarNotificacionLeida = async ({ notificationId }) => {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/notificaciones/${encodeURIComponent(notificationId)}/leida`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible marcar la notificación como leída");
  }
  return true;
};

export const marcarTodasNotificacionesLeidas = async ({ userId }) => {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/notificaciones/leidas`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ usuario_id: userId }),
  });
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible marcar todas las notificaciones como leídas");
  }
  return datos.actualizadas || 0;
};

export const eliminarNotificacion = async ({ notificationId }) => {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/notificaciones/${encodeURIComponent(notificationId)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible eliminar la notificación");
  }
  return true;
};

