// PaginaProyectos.jsx — Listado de proyectos del emprendedor
import { useEffect, useMemo, useState } from "react";
import { PencilLine } from "lucide-react";
import { useContextoApp } from "../context/contexto_app";
import { crear_proyecto_api, listar_proyectos_api, actualizar_proyecto_api, optimizar_descripcion_ia_api } from "../services/proyectos_api";
import "./PaginaProyectos.css";

export default function PaginaProyectos() {
  const { datos_usuario, configuracion_global } = useContextoApp();
  const [proyectos_visibles, set_proyectos_visibles] = useState([]);
  const [filtro_activo, set_filtro_activo] = useState("recientes");
  const [esta_expandido, set_esta_expandido] = useState(false);
  const [cargando, set_cargando] = useState(true);
  const [error, set_error] = useState("");

  const cantidad_visible = esta_expandido ? proyectos_visibles.length : 6;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAnalisisOpen, setModalAnalisisOpen] = useState(false);
  const [analisisSeleccionado, setAnalisisSeleccionado] = useState(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", presupuesto: "", estado: "activo" });
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const presupuesto_maximo = 999999999999.99;

  const openModal = (proyecto = null) => {
    if (proyecto) {
      setEditingId(proyecto.id);
      setForm({
        nombre: proyecto.titulo ?? "",
        descripcion: proyecto.descripcion ?? "",
        presupuesto: proyecto.presupuesto ?? "",
        estado: proyecto.estado ?? "activo"
      });
    } else {
      setEditingId(null);
      setForm({ nombre: "", descripcion: "", presupuesto: "", estado: "activo" });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleOptimizar = async () => {
    const nombre = String(form.nombre ?? "").trim();
    const descripcion = String(form.descripcion ?? "").trim();

    if (!nombre || !descripcion) {
      set_error("Necesitas un título y una descripción base para optimizar.");
      return;
    }

    setOptimizing(true);
    set_error("");
    try {
      const optimizada = await optimizar_descripcion_ia_api(nombre, descripcion);
      setForm(s => ({ ...s, descripcion: optimizada }));
    } catch (err) {
      set_error(err.message || "Error al optimizar con IA");
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = async () => {
    const nombre = String(form.nombre ?? "").trim();
    if (!nombre) return;

    const presupuesto_numero = form.presupuesto ? Number(form.presupuesto) : 0;
    if (!Number.isFinite(presupuesto_numero) || presupuesto_numero < 0) {
      set_error("Ingresa un presupuesto válido");
      return;
    }

    if (presupuesto_numero > presupuesto_maximo) {
      set_error(`El presupuesto máximo permitido es ${presupuesto_maximo.toLocaleString()}`);
      return;
    }

    setSaving(true);
    try {
      const propietario_id = datos_usuario.id || null;
      const propietario_email = datos_usuario.email || null;

      if (!propietario_id && !propietario_email) {
        throw new Error("No hay usuario autenticado");
      }

      const payload = {
        propietario_id,
        propietario_email,
        titulo: nombre,
        descripcion: String(form.descripcion ?? ""),
        presupuesto: presupuesto_numero,
        estado: form.estado,
      };

      if (editingId) {
        await actualizar_proyecto_api(editingId, payload);
      } else {
        await crear_proyecto_api(payload);
      }

      const proyectos_db = await listar_proyectos_api(propietario_id);
      set_proyectos_visibles(proyectos_db);
      closeModal();
      set_error("");
    } catch (err) {
      set_error(err.message || "Error al procesar el proyecto");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const propietario_id = datos_usuario.id;
    const propietario_email = datos_usuario.email;
    if (!propietario_id) {
      set_proyectos_visibles([]);
      set_cargando(false);
      return;
    }

    let activo = true;

    const cargar = async () => {
      set_cargando(true);
      set_error("");
      try {
        const proyectos_db = await listar_proyectos_api(propietario_id, propietario_email);
        if (!activo) return;
        set_proyectos_visibles(proyectos_db);
      } catch (err) {
        if (!activo) return;
        set_error(err.message || "No se pudieron cargar los proyectos");
      } finally {
        if (activo) set_cargando(false);
      }
    };

    cargar();

    return () => {
      activo = false;
    };
  }, [datos_usuario.id, datos_usuario.email]);

  const proyectos_para_tabla = useMemo(() => {
    if (filtro_activo === "recientes") {
      return proyectos_visibles.slice(0, 6);
    }
    return proyectos_visibles;
  }, [proyectos_visibles, filtro_activo]);

  const formatearFecha = (valor) => {
    if (!valor) return "-";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "-";
    
    // Usar formato preferido
    if (configuracion_global.formato_fecha === "mm/dd/yyyy") {
      return `${fecha.getMonth() + 1}/${fecha.getDate()}/${fecha.getFullYear()}`;
    } else if (configuracion_global.formato_fecha === "yyyy-mm-dd") {
      return `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`;
    }
    return fecha.toLocaleDateString();
  };

  const formatearHora = (valor) => {
    if (!valor) return "";
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return "";
    return fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const obtenerResumenProyecto = (texto, limite = 96) => {
    const contenido = String(texto ?? "").replace(/\s+/g, " ").trim();
    if (!contenido) return "Sin descripción disponible";
    if (contenido.length <= limite) return contenido;
    return `${contenido.slice(0, limite).trimEnd()}...`;
  };

  const _obtener_clase_estado = (estado_proyecto) => {
    if (estado_proyecto === "activo") return "proyecto__estado--activo";
    return "proyecto__estado--inactivo";
  };

  const _obtener_texto_estado = (estado_proyecto) => {
    if (estado_proyecto === "activo") return "Activo";
    return "Inactivo";
  };

  return (
    <div className="proyectos" role="main" aria-label="Mis proyectos">
      <div className="proyectos__card">
        {/* Encabezado */}
        <div className="proyectos__encabezado">
          <div className="proyectos__titulo-grupo">
            <h2 className="proyectos__titulo">Proyectos</h2>
            <div className="proyectos__filtro">
              <span>Filtrar</span>
              <button
                className="proyectos__filtro-btn"
                onClick={() => set_filtro_activo(filtro_activo === "recientes" ? "todos" : "recientes")}
              >
                {filtro_activo === "recientes" ? "Recientes ▼" : "Todos ▼"}
              </button>
            </div>
          </div>
          <button
            className="proyectos__btn-nuevo"
            onClick={openModal}
            aria-label="Crear nuevo proyecto"
          >
            Crear Nuevo Proyecto
          </button>
        </div>

        {/* Tabla */}
        <div className="proyectos__tabla" role="region" aria-label="Lista de proyectos">
          <div
            className="proyectos__tabla-header"
            role="row"
            aria-label="Encabezados de columna"
          >
            <span role="columnheader">Nombre</span>
            <span role="columnheader">Fecha</span>
            <span role="columnheader">Presupuesto</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader">Análisis IA</span>
            <span role="columnheader">Acciones</span>
          </div>

          {error && <div className="mensajes__estado-vacio" role="alert" style={{ margin: "16px" }}>{error}</div>}

          {/* Skeleton de carga para tabla */}
          {cargando && (
            <div aria-label="Cargando proyectos" aria-busy="true" role="status">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-fila" aria-hidden="true">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skeleton skeleton--texto" />
                    <div className="skeleton skeleton--parrafo" />
                  </div>
                  <div className="skeleton skeleton--texto" style={{ width: "80%" }} />
                  <div className="skeleton skeleton--texto" style={{ width: "60%" }} />
                  <div className="skeleton skeleton--badge" />
                  <div className="skeleton skeleton--texto" style={{ width: "70%" }} />
                </div>
              ))}
            </div>
          )}

          {!cargando && proyectos_para_tabla.slice(0, cantidad_visible).map((proyecto, idx) => (
            <div
              key={proyecto.id || proyecto.id_proyecto}
              className="proyectos__fila proyectos__card--animada"
              role="row"
              aria-label={`Proyecto: ${proyecto.titulo || proyecto.nombre_proyecto}`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="proyectos__nombre">
                <strong>{proyecto.titulo || proyecto.nombre_proyecto}</strong>
                <span
                  className="proyectos__descripcion"
                  title={proyecto.descripcion || proyecto.descripcion_proyecto || "Sin descripción disponible"}
                >
                  Descripción: {obtenerResumenProyecto(proyecto.descripcion || proyecto.descripcion_proyecto)}
                </span>
              </div>
              <div className="proyectos__fecha">
                <span>{formatearFecha(proyecto.fecha_publicacion || proyecto.fecha_proyecto)}</span>
                <span className="proyectos__hora">{formatearHora(proyecto.fecha_publicacion || proyecto.hora_proyecto)}</span>
              </div>
              <div className="proyectos__presupuesto" aria-label={`Presupuesto: ${typeof (proyecto.presupuesto ?? proyecto.presupuesto_proyecto) !== 'undefined' ? (configuracion_global.mostrar_saldos ? `${configuracion_global.moneda} ${Number(proyecto.presupuesto ?? proyecto.presupuesto_proyecto ?? 0).toLocaleString()}` : 'oculto') : 'sin datos'}`}>
                {typeof (proyecto.presupuesto ?? proyecto.presupuesto_proyecto) !== 'undefined' 
                  ? (configuracion_global.mostrar_saldos 
                      ? `${configuracion_global.moneda} ${Number(proyecto.presupuesto ?? proyecto.presupuesto_proyecto ?? 0).toLocaleString()}` 
                      : "****")
                  : "-"}
              </div>
              <div
                className={`proyectos__estado ${_obtener_clase_estado(proyecto.estado || proyecto.estado_proyecto)}`}
                aria-label={`Estado: ${_obtener_texto_estado(proyecto.estado || proyecto.estado_proyecto)}`}
              >
                {_obtener_texto_estado(proyecto.estado || proyecto.estado_proyecto)}
              </div>
              <div className="proyectos__analisis">
                {proyecto.analisis_ai ? (
                  <button 
                    className="proyectos__boton-analisis" 
                    onClick={() => {
                      setAnalisisSeleccionado(proyecto.analisis_ai);
                      setModalAnalisisOpen(true);
                    }}
                    aria-label={`Ver análisis de IA para ${proyecto.titulo || proyecto.nombre_proyecto}`}
                  >
                    Ver Análisis IA
                  </button>
                ) : (
                  <span className="proyectos__generando" aria-label="Análisis en proceso">Analizando... ⏳</span>
                )}
              </div>
              <div className="proyectos__acciones">
                <button
                  className="proyectos__btn-editar"
                  onClick={() => openModal(proyecto)}
                  aria-label={`Editar proyecto ${proyecto.titulo || proyecto.nombre_proyecto}`}
                >
                  <PencilLine size={18} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}

          {!cargando && !error && proyectos_para_tabla.length === 0 && (
            <div className="mensajes__estado-vacio" style={{ margin: "16px" }}>No hay proyectos en la base de datos.</div>
          )}
        </div>

        {/* Ver todos */}
        <div className="proyectos__ver-todos">
          <button
            className="proyectos__ver-todos-btn"
            onClick={() => set_esta_expandido(!esta_expandido)}
          >
            {esta_expandido ? "Ver menos ▲" : "Ver todos mis proyectos ▼"}
          </button>
        </div>
      </div>

      {/* Modal crear proyecto */}
      {modalOpen && (
        <div className="modal__overlay" onClick={closeModal}>
          <div className="modal__content" onClick={(e) => e.stopPropagation()}>
            <h3>Crear nuevo proyecto</h3>
            {error && <div style={{ color: '#fca5a5', marginTop: 6 }}>{error}</div>}
            <div className="modal__formulario">
              <label>
                <span>Nombre</span>
                <input name="nombre" value={form.nombre} onChange={handleChange} />
              </label>

              <label>
                <span>Descripción</span>
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} />
              </label>

              <div className="modal__ia-acciones">
                <button
                  onClick={handleOptimizar}
                  disabled={optimizing}
                  className="boton boton--ia"
                >
                  {optimizing ? "Optimizando..." : "✨ Optimizar con IA"}
                </button>
              </div>

              <label>
                <span>Presupuesto (USD)</span>
                <input name="presupuesto" value={form.presupuesto} onChange={handleChange} type="number" step="0.01" min="0" max={presupuesto_maximo} />
              </label>

              <label>
                <span>Estado</span>
                <select name="estado" value={form.estado} onChange={handleChange}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </label>

              <div className="modal__acciones">
                <button onClick={closeModal} disabled={saving} className="boton boton--secundario">Cancelar</button>
                <button onClick={handleSave} disabled={saving || optimizing} className="boton boton--primario">
                  {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear proyecto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análisis AI */}
      {modalAnalisisOpen && (
        <div className="modal__overlay modal__overlay--analisis" onClick={() => setModalAnalisisOpen(false)}>
          <div className="modal__content modal__content--analisis" onClick={(e) => e.stopPropagation()}>
            <div className="modal__analisis-header">
              <h2 className="modal__analisis-titulo">
                <span>📊</span> Análisis de Inversión (IA)
              </h2>
              <button
                onClick={() => setModalAnalisisOpen(false)} 
                className="modal__analisis-cerrar"
              >
                ✕
              </button>
            </div>
            
            <div className="modal__analisis-contenido">
              {analisisSeleccionado}
            </div>

            <div className="modal__analisis-acciones">
              <button onClick={() => setModalAnalisisOpen(false)} className="boton boton--primario modal__analisis-boton">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
