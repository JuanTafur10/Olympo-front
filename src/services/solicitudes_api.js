import { API_BASE_URL } from "./api_config.js";
import { apiFetch } from "./api_client.js";

// Función de prueba para verificar si PATCH funciona
export async function test_patch_api() {
  console.log(`[DEBUG] Probando PATCH en: ${API_BASE_URL}/api/v1/test-patch`);
  try {
    const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/test-patch`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const datos = await respuesta.json();
    console.log(`[DEBUG] Respuesta test-patch:`, datos);
    return datos;
  } catch (error) {
    console.error(`[ERROR] Test PATCH falló:`, error);
    throw error;
  }
}

export async function listar_solicitudes_por_proyecto_api(proyecto_id) {
  if (!proyecto_id) return [];

  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/solicitudes/proyecto/${encodeURIComponent(proyecto_id)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const datos = await respuesta.json().catch((err) => {
    console.error(`[solicitudes_api] Error parseando JSON (proyecto ${proyecto_id}):`, err);
    return {};
  });

  console.debug(`[solicitudes_api] listar_solicitudes_por_proyecto_api -> status: ${respuesta.status}, ok: ${respuesta.ok}`, { proyecto_id, datos });

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible listar solicitudes del proyecto");
  }

  return datos.solicitudes || [];
}

export async function listar_solicitudes_por_inversionista_api(inversionista_id) {
  if (!inversionista_id) return [];

  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/solicitudes/inversionista/${encodeURIComponent(inversionista_id)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const datos = await respuesta.json().catch((err) => {
    console.error(`[solicitudes_api] Error parseando JSON (inversionista ${inversionista_id}):`, err);
    return {};
  });

  console.debug(`[solicitudes_api] listar_solicitudes_por_inversionista_api -> status: ${respuesta.status}, ok: ${respuesta.ok}`, { inversionista_id, datos });

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible listar solicitudes del inversionista");
  }

  return datos.solicitudes || [];
}

export async function crear_solicitud_api(datos_solicitud) {
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/solicitudes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos_solicitud),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || "No fue posible crear la solicitud");
  }

  return datos;
}

export async function actualizar_estado_solicitud_api(solicitud_id, nuevo_estado) {
  const url = `${API_BASE_URL}/api/v1/solicitudes/${encodeURIComponent(solicitud_id)}`;
  console.log(`[DEBUG] Llamando PATCH a: ${url}`);
  console.log(`[DEBUG] Payload: {estado: "${nuevo_estado}"}`);
  
  const respuesta = await apiFetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ estado: nuevo_estado }),
  });

  console.log(`[DEBUG] Respuesta status: ${respuesta.status}`);
  console.log(`[DEBUG] Respuesta headers:`, respuesta.headers);
  
  const datos = await respuesta.json().catch((err) => {
    console.error(`[ERROR] No se pudo parsear JSON:`, err);
    return {};
  });
  
  console.log(`[DEBUG] Datos respuesta:`, datos);

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.mensaje || `Error HTTP ${respuesta.status}: No fue posible actualizar la solicitud`);
  }

  return datos;
}
