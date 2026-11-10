import {
  actualizarProyecto,
  crearProyecto,
  listarCategorias,
  listarProyectos,
  obtenerProyecto,
} from "./marketplace_api.js";
import { API_BASE_URL } from "./api_config.js";
import { apiFetch } from "./api_client.js";

const adaptarProyecto = (project) => ({
  ...project,
  titulo: project.title,
  descripcion: project.description,
  presupuesto: Number(project.targetAmount ?? 0),
  monto_recaudado: Number(project.raisedAmount ?? 0),
  estado: ({ DRAFT: "borrador", PUBLISHED: "publicado", CLOSED: "cerrado", DELETED: "eliminado" })[project.status] || project.status,
  fecha_publicacion: project.createdAt,
  creado_en: project.createdAt,
  imagen_url: project.imageUrl,
  propietario_id: project.ownerId,
  categoria: project.category?.name,
});

const adaptarPayloadProyecto = async (payload, current = null) => {
  const categories = await listarCategorias();
  const categoryId = payload.categoryId || current?.categoryId || categories[0]?.id;
  if (!categoryId) throw new Error("No hay categorías disponibles para crear el proyecto.");
  const status = String(payload.status || payload.estado || current?.status || "PUBLISHED").toUpperCase();
  return {
    title: String(payload.title || payload.titulo || payload.nombre || current?.title || "").trim(),
    description: String(payload.description || payload.descripcion || current?.description || "").trim(),
    categoryId,
    targetAmount: Number(payload.targetAmount ?? payload.presupuesto ?? current?.targetAmount ?? 0),
    status: ({ ACTIVO: "PUBLISHED", PUBLICADO: "PUBLISHED", BORRADOR: "DRAFT", CERRADO: "CLOSED" })[status] || status,
  };
};

export async function listar_proyectos_api(propietario_id, propietario_email, inversionista_id) {
  void propietario_email;
  void inversionista_id;
  const { data } = await listarProyectos({ page: 1, limit: 100 });
  const ownedProjects = propietario_id ? data.filter((project) => project.ownerId === propietario_id) : data;
  return ownedProjects.map(adaptarProyecto);
}

export async function crear_proyecto_api(payload) {
  return adaptarProyecto(await crearProyecto(await adaptarPayloadProyecto(payload)));
}

export async function obtener_proyecto_api(proyecto_id) {
  return adaptarProyecto(await obtenerProyecto(proyecto_id));
}

export async function actualizar_proyecto_api(proyecto_id, payload) {
  const current = await obtenerProyecto(proyecto_id);
  return adaptarProyecto(await actualizarProyecto(proyecto_id, await adaptarPayloadProyecto(payload, current)));
}

export async function optimizar_descripcion_ia_api(titulo, descripcion) {
  const respuesta = await apiFetch(`${API_BASE_URL}/api/v1/ia/optimizar`, {
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
