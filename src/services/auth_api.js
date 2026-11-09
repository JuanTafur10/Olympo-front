import { API_BASE_URL } from "./api_config.js";

let token_sesion_actual = null;

export function establecer_token_sesion(token) {
  token_sesion_actual = token || null;
}

export function obtener_headers_autorizados() {
  const token = token_sesion_actual || localStorage.getItem("olympo_token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function leer_respuesta_backend(respuesta, mensaje_predeterminado) {
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos?.error?.message || datos?.mensaje || mensaje_predeterminado);
  }
  return datos?.data ?? datos;
}

export async function obtener_usuario_por_id_api(usuario_id) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/usuarios/${usuario_id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener el usuario");
  }

  return datos.usuario;
}

export async function actualizar_usuario_api(usuario_id, datos_perfil) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/usuarios/${usuario_id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos_perfil),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible actualizar el perfil");
  }

  return datos.usuario;
}

export async function actualizar_foto_perfil_api(usuario_id, archivo) {
  const formData = new FormData();
  formData.append("file", archivo);

  const respuesta = await fetch(`${API_BASE_URL}/api/v1/usuarios/${usuario_id}/foto`, {
    method: "POST",
    body: formData,
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible subir la foto");
  }

  return datos.url;
}

export async function listar_usuarios_api(usuario_id_excluir) {
  const query = usuario_id_excluir ? `?excluir_usuario_id=${encodeURIComponent(usuario_id_excluir)}` : "";
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/usuarios${query}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener los usuarios");
  }

  return (datos.usuarios || []).filter((usuario) => String(usuario?.rol || "").toLowerCase() !== "admin");
}

export async function registrar_usuario_api(datos_registro) {
  const respuesta = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: datos_registro.name || datos_registro.nombre || datos_registro.nombre_usuario,
      email: datos_registro.email,
      password: datos_registro.password,
      role: datos_registro.tipo_usuario === "emprendedor" ? "OWNER" : "USER",
    }),
  });

  const datos = await leer_respuesta_backend(respuesta, "No fue posible registrar el usuario");
  return { usuario: datos.user, token: datos.token, mensaje: "Registro exitoso" };
}

export async function login_usuario_api({ email, password, tipo_usuario }) {
  const respuesta = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const datos = await leer_respuesta_backend(respuesta, "No fue posible iniciar sesión");
  return { usuario: datos.user, token: datos.token, mensaje: "Sesión iniciada", tipo_usuario };
}

export async function enviar_mensaje_chat_api(datos_mensaje) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/chat/mensaje`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...datos_mensaje,
      sender_photo: datos_mensaje.sender_photo,
      receiver_photo: datos_mensaje.receiver_photo,
      tipo_mensaje: datos_mensaje.tipo_mensaje,
      meeting_url: datos_mensaje.meeting_url,
      meeting_title: datos_mensaje.meeting_title,
      meeting_start: datos_mensaje.meeting_start,
      meeting_end: datos_mensaje.meeting_end,
      meeting_details: datos_mensaje.meeting_details,
    }),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible enviar el mensaje");
  }

  return datos;
}

export async function marcar_mensajes_leidos_api({ chat_id, receiver_id }) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/chat/leidos`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id, receiver_id }),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible marcar los mensajes como leídos");
  }

  return datos;
}

export async function listar_usuarios_admin_api(usuario_id_excluir) {
  const query = usuario_id_excluir ? `?excluir_usuario_id=${encodeURIComponent(usuario_id_excluir)}` : "";
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/admin/usuarios${query}`, {
    method: "GET",
    headers: obtener_headers_autorizados(),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener los usuarios admin");
  }

  return (datos.usuarios || []).filter((usuario) => String(usuario?.rol || "").toLowerCase() !== "admin");
}

export async function crear_admin_api(datos_admin) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/admin/usuarios/admin`, {
    method: "POST",
    headers: obtener_headers_autorizados(),
    body: JSON.stringify(datos_admin),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible crear el administrador");
  }

  return datos;
}

export async function obtener_config_registro_libre_api() {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/admin/config/registro-libre`, {
    method: "GET",
    headers: obtener_headers_autorizados(),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener la configuración de registro");
  }

  return datos;
}

export async function actualizar_config_registro_libre_api(registro_libre) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/admin/config/registro-libre`, {
    method: "PATCH",
    headers: obtener_headers_autorizados(),
    body: JSON.stringify({ registro_libre }),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible actualizar la configuración de registro");
  }

  return datos;
}

export async function actualizar_estado_usuario_admin_api(usuario_id, activo) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/admin/usuarios/${usuario_id}/estado`, {
    method: "PATCH",
    headers: obtener_headers_autorizados(),
    body: JSON.stringify({ activo }),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible actualizar el estado del usuario");
  }

  return datos;
}

export async function rechazar_registro_usuario_admin_api(usuario_id) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/admin/usuarios/${usuario_id}/rechazar-registro`, {
    method: "DELETE",
    headers: obtener_headers_autorizados(),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible rechazar el registro");
  }

  return datos;
}

export async function listar_todos_los_usuarios_admin_api() {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/admin/usuarios`, {
    method: "GET",
    headers: obtener_headers_autorizados(),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener todos los usuarios");
  }

  return datos.usuarios || [];
}
