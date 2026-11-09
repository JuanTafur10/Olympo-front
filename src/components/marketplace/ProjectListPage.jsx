"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useContextoApp } from "../../context/contexto_app";
import { useNavigate } from "../../hooks/useNavigate";
import { actualizarProyecto, crearProyecto, eliminarProyecto, listarCategorias, listarProyectos, subirImagenProyecto } from "../../services/marketplace_api";
import ProjectCard from "./ProjectCard";
import "./ProjectListPage.css";

const emptyForm = { title: "", description: "", categoryId: "", targetAmount: "", status: "DRAFT" };
const roleFor = (user) => String(user?.role || user?.rol || user?.tipo_usuario || "").toUpperCase();

export default function ProjectListPage() {
  const { datos_usuario } = useContextoApp();
  const navigate = useNavigate();
  const role = roleFor(datos_usuario);
  const isAdmin = Boolean(datos_usuario?.es_admin || role === "ADMIN");
  const isOwner = role === "OWNER" || role === "EMPRENDEDOR";
  const canCreate = isAdmin || isOwner;
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, currentPage: 1, limit: 12, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listarProyectos({ page, limit: 12, q: search, categoryId });
      setProjects(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message || "No fue posible cargar los proyectos.");
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryId]);

  useEffect(() => {
    let active = true;
    listarCategorias().then((items) => { if (active) setCategories(items); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const startCreate = () => {
    if (!canCreate) { navigate("/register"); return; }
    setEditing(null);
    setForm({ ...emptyForm, categoryId: categories[0]?.id || "" });
    setImageFile(null);
    setError("");
    setDialog({ type: "form" });
  };

  const startEdit = (project) => {
    setEditing(project);
    setForm({ title: project.title || "", description: project.description || "", categoryId: project.categoryId || project.category?.id || "", targetAmount: String(project.targetAmount || ""), status: project.status === "CLOSED" ? "CLOSED" : project.status || "DRAFT" });
    setImageFile(null);
    setError("");
    setDialog({ type: "form" });
  };

  const saveProject = async (event) => {
    event.preventDefault();
    setError("");
    const payload = { ...form, title: form.title.trim(), description: form.description.trim(), targetAmount: Number(form.targetAmount) };
    if (payload.title.length < 5) { setError("El título debe tener al menos 5 caracteres."); return; }
    if (payload.description.length < 30) { setError("La descripción debe tener al menos 30 caracteres."); return; }
    if (!payload.categoryId) { setError("Selecciona una categoría."); return; }
    if (!Number.isFinite(payload.targetAmount) || payload.targetAmount <= 0) { setError("Ingresa una meta de financiación válida."); return; }
    if (imageFile && imageFile.size > 5 * 1024 * 1024) { setError("La imagen supera el límite de 5 MB."); return; }
    if (imageFile && !["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) { setError("Elige una imagen JPG, PNG o WEBP."); return; }

    setSaving(true);
    try {
      let project;
      if (editing) project = await actualizarProyecto(editing.id, payload);
      else project = await crearProyecto(payload);
      if (imageFile) {
        try {
          project = await subirImagenProyecto(project.id, imageFile);
        } catch (uploadError) {
          if (!editing) setEditing(project);
          await loadProjects();
          setError(`El proyecto se guardó, pero no se pudo subir la imagen: ${uploadError.message}`);
          return;
        }
      }
      setNotice(editing ? "Cambios guardados." : "Proyecto creado.");
      setDialog(null);
      setEditing(null);
      setImageFile(null);
      await loadProjects();
    } catch (err) {
      setError(err.message || "No fue posible guardar el proyecto.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!dialog?.project) return;
    setDeleting(true);
    try {
      await eliminarProyecto(dialog.project.id);
      const deletedId = dialog.project.id;
      setProjects((current) => current.filter((project) => project.id !== deletedId));
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
      setDialog(null);
    } catch (err) {
      setError(err.message || "No fue posible eliminar el proyecto.");
      setDialog(null);
    } finally {
      setDeleting(false);
    }
  };

  const visibleProjects = useMemo(() => projects, [projects]);

  return (
    <section className="project-list" aria-labelledby="project-list-title">
      <header className="project-list__header">
        <div><span className="project-list__eyebrow">Ideas que mueven el futuro</span><h1 id="project-list-title">Explora proyectos</h1><p>Conoce iniciativas, sus equipos y lo que buscan lograr.</p></div>
        {canCreate && <button className="project-list__primary" type="button" onClick={startCreate}>Crear proyecto</button>}
      </header>

      <form className="project-list__filters" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput); }}>
        <label className="project-list__search-label" htmlFor="projects-search">Buscar proyectos</label>
        <div className="project-list__filter-row">
          <input id="projects-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Busca por nombre o descripción" />
          <label className="project-list__category"><span>Categoría</span><select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <button type="submit">Buscar</button>
        </div>
      </form>

      {notice && <p className="project-list__notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Cerrar aviso">×</button></p>}
      {error && !dialog && <div className="project-list__error" role="alert"><span>{error}</span><button type="button" onClick={loadProjects}>Reintentar</button></div>}

      {loading ? <div className="project-list__grid" aria-busy="true" aria-label="Cargando proyectos">{Array.from({ length: 6 }, (_, index) => <div className="project-list__skeleton" key={index}><span /><i /><i /></div>)}</div>
        : error ? null
          : visibleProjects.length === 0 ? <div className="project-list__empty"><span>✦</span><h2>Aún no hay proyectos para mostrar</h2><p>Prueba otra búsqueda o vuelve más tarde para descubrir nuevas ideas.</p>{canCreate && <button className="project-list__primary" type="button" onClick={startCreate}>Crear el primer proyecto</button>}</div>
            : <div className="project-list__grid">{visibleProjects.map((project) => {
              const canManage = isAdmin || (isOwner && String(project.ownerId) === String(datos_usuario?.id));
              return <ProjectCard key={project.id} project={project} canManage={canManage} onEdit={startEdit} onDelete={(item) => { setNotice(""); setDialog({ type: "delete", project: item }); }} />;
            })}</div>}

      {!loading && !error && pagination.totalPages > 1 && <nav className="project-list__pagination" aria-label="Paginación de proyectos"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span>Página {pagination.currentPage} de {pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Siguiente</button></nav>}

      {dialog?.type === "form" && <div className="project-dialog__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDialog(null); }}>
        <section className="project-dialog" role="dialog" aria-modal="true" aria-labelledby="project-form-title">
          <div className="project-dialog__heading"><div><span className="project-list__eyebrow">{editing ? "Actualiza la información" : "Dale forma a tu idea"}</span><h2 id="project-form-title">{editing ? "Editar proyecto" : "Crear proyecto"}</h2></div><button type="button" className="project-dialog__close" onClick={() => !saving && setDialog(null)} aria-label="Cerrar formulario">×</button></div>
          <form onSubmit={saveProject} className="project-form">
            <label htmlFor="project-title">Nombre del proyecto<input id="project-title" required minLength={5} maxLength={160} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
            <label htmlFor="project-description">Descripción<textarea id="project-description" required minLength={30} maxLength={10000} rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /><small>{form.description.length}/10.000 caracteres (mínimo 30)</small></label>
            <div className="project-form__columns"><label htmlFor="project-category">Categoría<select id="project-category" required value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}><option value="">Selecciona una categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label htmlFor="project-goal">Meta de financiación (COP)<input id="project-goal" required type="number" min="1000" max="999999999999" step="1000" value={form.targetAmount} onChange={(event) => setForm((current) => ({ ...current, targetAmount: event.target.value }))} /></label></div>
            <label htmlFor="project-status">Visibilidad<select id="project-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="DRAFT">Guardar como borrador</option><option value="PUBLISHED">Publicar</option>{editing?.status === "CLOSED" && <option value="CLOSED">Cerrado</option>}</select></label>
            <label className="project-form__upload" htmlFor="project-image">Imagen del proyecto <span>JPG, PNG o WEBP · máximo 5 MB</span><input id="project-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0] || null; setImageFile(file); if (file && file.size > 5 * 1024 * 1024) setError("La imagen supera el límite de 5 MB."); else setError(""); }} />{imageFile && <small>Archivo elegido: {imageFile.name}</small>}{editing?.imageUrl && !imageFile && <small>Ya hay una imagen guardada. Selecciona otra para reemplazarla.</small>}</label>
            {error && <p className="project-dialog__error" role="alert">{error}</p>}
            <div className="project-dialog__actions"><button className="project-dialog__cancel" type="button" disabled={saving} onClick={() => setDialog(null)}>Cancelar</button><button className="project-list__primary" type="submit" disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear proyecto"}</button></div>
          </form>
        </section>
      </div>}

      {dialog?.type === "delete" && <div className="project-dialog__backdrop"><section className="project-dialog project-dialog--confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><span className="project-dialog__warning">!</span><h2 id="delete-title">¿Eliminar este proyecto?</h2><p id="delete-description"><strong>{dialog.project.title}</strong> dejará de aparecer en el listado. Esta acción también marcará como eliminadas sus solicitudes relacionadas.</p>{error && <p className="project-dialog__error" role="alert">{error}</p>}<div className="project-dialog__actions"><button className="project-dialog__cancel" type="button" disabled={deleting} onClick={() => { setDialog(null); setError(""); }}>Cancelar</button><button className="project-dialog__delete" type="button" disabled={deleting} onClick={confirmDelete}>{deleting ? "Eliminando…" : "Sí, eliminar"}</button></div></section></div>}
    </section>
  );
}
