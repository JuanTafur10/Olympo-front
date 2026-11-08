import { API_BASE_URL } from "./api_config.js";

export async function listar_proyectos_api(propietario_id, propietario_email, inversionista_id) {
  const params = new URLSearchParams();
  if (propietario_id) params.set("propietario_id", propietario_id);
  if (propietario_email) params.set("propietario_email", propietario_email);
  if (inversionista_id) params.set("inversionista_id", inversionista_id);
  const query = params.toString() ? `?${params.toString()}` : "";
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/proyectos${query}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible listar los proyectos");
  }

  return datos.proyectos || [];
}

export async function crear_proyecto_api(payload) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/proyectos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible crear el proyecto");
  }

  return datos.proyecto;
}

export async function obtener_proyecto_api(proyecto_id) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/proyectos/${proyecto_id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible obtener el proyecto");
  }

  return datos.proyecto;
}

export async function actualizar_proyecto_api(proyecto_id, payload) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/proyectos/${proyecto_id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible actualizar el proyecto");
  }

  return datos;
}

export async function optimizar_descripcion_ia_api(titulo, descripcion) {
  const respuesta = await fetch(`${API_BASE_URL}/api/v1/ia/optimizar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ titulo, descripcion }),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible optimizar la descripción");
  }

  return datos.descripcion_optimizada;
}
