// PaginaNotificaciones.jsx — Panel de notificaciones en tiempo real
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContextoApp } from "../context/contexto_app";
import {
  escucharNotificacionesUsuario,
  eliminarNotificacion,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "../services/notificaciones_firebase";
import "./PaginaNotificaciones.css";

const obtenerIcono = (tipo) => {
  const iconos = {
    proyecto: "📁",
    inversion: "💰",
    solicitud_inversion: "📋",
    solicitud_aceptada: "✅",
    solicitud_rechazada: "❌",
    sistema: "🔔",
    verificacion: "🛡️",
    perfil: "👤",
    mensaje: "💬",
  };

  return iconos[tipo] || "🔔";
};

const formatearFecha = (valor) => {
  if (!valor) return "Ahora";
  if (typeof valor.toDate === "function") {
    return valor.toDate().toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Ahora";
  return fecha.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
};

export default function PaginaNotificaciones() {
  const { datos_usuario, set_notificaciones_persistentes, set_notificaciones_sin_leer } = useContextoApp();
  const navigate = useNavigate();
  const usuario_id = datos_usuario.id;

  const [notificaciones, set_notificaciones] = useState([]);
  const [pestana_activa, set_pestana_activa] = useState("recientes");
  const [busqueda_notificacion, set_busqueda_notificacion] = useState("");
  const [cargando, set_cargando] = useState(true);
  const [error, set_error] = useState("");
  const [notificacion_seleccionada, set_notificacion_seleccionada] = useState(null);

  useEffect(() => {
    if (!usuario_id) {
      set_notificaciones([]);
      set_cargando(false);
      return undefined;
    }

    let activo = true;
    set_cargando(true);
    set_error("");

    const desuscribir = escucharNotificacionesUsuario({ userId: usuario_id }, (items) => {
      if (!activo) return;
      set_notificaciones(items);
      set_cargando(false);
    });

    return () => {
      activo = false;
      if (typeof desuscribir === "function") desuscribir();
    };
  }, [usuario_id]);

  // Sincronizar notificaciones con el contexto
  useEffect(() => {
    set_notificaciones_persistentes(notificaciones);
    const cantidad_sin_leer = notificaciones.filter((n) => !n.leida).length;
    set_notificaciones_sin_leer(cantidad_sin_leer);
  }, [notificaciones, set_notificaciones_persistentes, set_notificaciones_sin_leer]);

  const cantidad_no_leidas = useMemo(
    () => notificaciones.filter((n) => !n.leida).length,
    [notificaciones]
  );

  const notificaciones_filtradas = useMemo(() => {
    const busqueda = busqueda_notificacion.toLowerCase().trim();

    return notificaciones.filter((n) => {
      const cumplePestana = pestana_activa === "archivadas" ? Boolean(n.leida) : !n.leida;
      const texto = `${n.titulo || ""} ${n.mensaje || ""}`.toLowerCase();
      const cumpleBusqueda = texto.includes(busqueda);
      return cumplePestana && cumpleBusqueda;
    });
  }, [notificaciones, pestana_activa, busqueda_notificacion]);

  const recientes_laterales = useMemo(() => {
    // Mostrar todas las notificaciones que ya fueron abiertas (leida === true), ordenadas por fecha descendente
    return [...notificaciones]
      .filter((n) => Boolean(n.leida))
      .sort((a, b) => {
        const ta = a.creada_en?.toDate ? a.creada_en.toDate().getTime() : new Date(a.creada_en).getTime();
        const tb = b.creada_en?.toDate ? b.creada_en.toDate().getTime() : new Date(b.creada_en).getTime();
        return tb - ta;
      });
  }, [notificaciones]);

  const _marcar_todo_leido = async () => {
    try {
      const actualizadas = await marcarTodasNotificacionesLeidas({ userId: usuario_id });
      if (actualizadas >= 0) {
        set_notificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      }
    } catch (err) {
      set_error(err.message || "No se pudieron marcar como leídas");
    }
  };

  const _abrir_notificacion = async (notificacion) => {
    try {
      if (!notificacion.leida) {
        await marcarNotificacionLeida({ notificationId: notificacion.id });
        set_notificaciones((prev) =>
          prev.map((n) => (n.id === notificacion.id ? { ...n, leida: true } : n))
        );
      }

      // Mostrar la notificación en un modal en lugar de navegar automáticamente.
      // La navegación (si aplica) queda como acción explícita dentro del modal.
      set_notificacion_seleccionada(notificacion);
    } catch (err) {
      set_error(err.message || "No se pudo abrir la notificación");
    }
  };

  const _eliminar_notificacion = async (notificationId) => {
    try {
      await eliminarNotificacion({ notificationId });
      set_notificaciones((prev) => prev.filter((n) => n.id !== notificationId));
      
      // Si la notificación eliminada es la que está abierta, cerrar el modal
      if (notificacion_seleccionada?.id === notificationId) {
        set_notificacion_seleccionada(null);
      }
    } catch (err) {
      set_error(err.message || "No se pudo eliminar la notificación");
    }
  };

  return (
    <div className="notificaciones">
      <div className="notificaciones__buscador">
        <span>🔍</span>
        <input
          type="text"
          placeholder="Buscar notificaciones"
          className="notificaciones__buscador-input"
          value={busqueda_notificacion}
          onChange={(e) => set_busqueda_notificacion(e.target.value)}
        />
      </div>

      <div className="notificaciones__contenido">
        <div className="notificaciones__panel-izq">
          <div className="notificaciones__panel-header">
            <h3>Recientes</h3>
            {cantidad_no_leidas > 0 && (
              <span className="notificaciones__badge">{cantidad_no_leidas} nuevas</span>
            )}
            <span className="notificaciones__chevron">▼</span>
          </div>

          <div className="notificaciones__lista-recientes">
            {recientes_laterales.length === 0 && !cargando && (
              <div className="notificaciones__estado-vacio">
                <span className="notificaciones__icon-bell notificaciones__icon-bell--sm" aria-hidden="true">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                </span>
                <span>Sin notificaciones recientes</span>
              </div>
            )}

            {recientes_laterales.map((item) => (
              <div key={item.id} className="notificaciones__item-reciente" onClick={() => _abrir_notificacion(item)} style={{ cursor: "pointer" }}>
                <div className="notificaciones__icono-reciente">{obtenerIcono(item.tipo)}</div>
                <div className="notificaciones__info-reciente">
                  <strong>{item.titulo}</strong>
                  <span>{item.mensaje}</span>
                </div>
              </div>
            ))}
          </div>

          <button className="notificaciones__btn-ver-todo" onClick={() => navigate("/notificaciones")}>
            Ver todo
          </button>
        </div>

        <div className="notificaciones__panel-der">
          <div className="notificaciones__der-header">
            <h3>Notificaciones</h3>
            <button className="notificaciones__btn-leido" onClick={_marcar_todo_leido}>
              Marcar todo como leído
            </button>
          </div>

          <div className="notificaciones__pestanas">
            <button
              className={`notificaciones__pestana ${pestana_activa === "recientes" ? "notificaciones__pestana--activa" : ""}`}
              onClick={() => set_pestana_activa("recientes")}
            >
              Recientes
            </button>
            <button
              className={`notificaciones__pestana ${pestana_activa === "archivadas" ? "notificaciones__pestana--activa" : ""}`}
              onClick={() => set_pestana_activa("archivadas")}
            >
              Archivadas
            </button>
          </div>

          {error && (
            <div className="notificaciones__estado-vacio">
              <span className="notificaciones__icon-bell notificaciones__icon-bell--sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </span>
              <span>{error}</span>
            </div>
          )}
          {cargando && (
            <div className="notificaciones__estado-vacio">
              <span className="notificaciones__icon-bell notificaciones__icon-bell--sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              </span>
              <span>Cargando notificaciones...</span>
            </div>
          )}

          <div className="notificaciones__lista">
            {!cargando && notificaciones_filtradas.length === 0 && (
              <div className="notificaciones__estado-vacio">
                <span className="notificaciones__icon-bell notificaciones__icon-bell--sm" aria-hidden="true">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                </span>
                <span>No hay notificaciones para mostrar</span>
              </div>
            )}

            {notificaciones_filtradas.map((notificacion) => (
              <div
                key={notificacion.id}
                className={`notificaciones__fila ${!notificacion.leida ? "notificaciones__fila--nueva" : ""}`}
                onClick={() => _abrir_notificacion(notificacion)}
                style={{ cursor: "pointer" }}
              >
                <div className="notificaciones__fila-avatar">
                  <span className="notificaciones__fila-icono">{obtenerIcono(notificacion.tipo)}</span>
                  {!notificacion.leida && <span className="notificaciones__punto-naranja" />}
                </div>

                <div className="notificaciones__fila-contenido">
                  <p className="notificaciones__fila-titulo">{notificacion.titulo}</p>
                  {notificacion.mensaje ? <p className="notificaciones__fila-sub">● {notificacion.mensaje}</p> : null}
                </div>

                <div className="notificaciones__fila-tiempo">{formatearFecha(notificacion.creada_en)}</div>

                <button
                  type="button"
                  className="notificaciones__btn-eliminar"
                  onClick={(e) => {
                    e.stopPropagation();
                    _eliminar_notificacion(notificacion.id);
                  }}
                  aria-label="Eliminar notificación"
                  style={{ marginLeft: 8, border: "none", background: "transparent", cursor: "pointer" }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>

          <div className="notificaciones__ver-mas">▼</div>
        </div>
      </div>

      {notificacion_seleccionada && (
        <div className="notificaciones__modal-overlay" onClick={() => set_notificacion_seleccionada(null)}>
          <div className="notificaciones__modal" onClick={(e) => e.stopPropagation()}>

            <div className="notificaciones__modal-header">
              <span className="notificaciones__modal-icono">{obtenerIcono(notificacion_seleccionada.tipo)}</span>
              <div className="notificaciones__modal-header-texto">
                <h2>{notificacion_seleccionada.titulo}</h2>
                <span className="notificaciones__modal-tipo">{notificacion_seleccionada.tipo.toUpperCase()}</span>
              </div>
            </div>

            <div className="notificaciones__modal-cuerpo">
              {notificacion_seleccionada.tipo === "mensaje" ? (
                <>
                  <div className="notificaciones__modal-mensaje-remitente">
                    <div className="notificaciones__modal-avatar-remitente">
                      {notificacion_seleccionada.metadata?.nombre_remitente?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <h3>{notificacion_seleccionada.metadata?.nombre_remitente || "Contacto"}</h3>
                      <span className="notificaciones__modal-mensaje-hora">
                        {formatearFecha(notificacion_seleccionada.creada_en)}
                      </span>
                    </div>
                  </div>

                  <div className="notificaciones__modal-contenido-mensaje">
                    <p>{notificacion_seleccionada.mensaje || "Mensaje sin contenido"}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="notificaciones__modal-seccion">
                    <h3>Mensaje</h3>
                    <p className="notificaciones__modal-mensaje">
                      {notificacion_seleccionada.mensaje || "Sin mensaje adicional"}
                    </p>
                  </div>

                  <div className="notificaciones__modal-meta">
                    <div className="notificaciones__modal-item">
                      <span className="notificaciones__modal-label">Fecha</span>
                      <span className="notificaciones__modal-valor">{formatearFecha(notificacion_seleccionada.creada_en)}</span>
                    </div>
                    <div className="notificaciones__modal-item">
                      <span className="notificaciones__modal-label">Estado</span>
                      <span className="notificaciones__modal-valor">
                        {notificacion_seleccionada.leida ? "Leída" : "No leída"}
                      </span>
                    </div>
                  </div>

                  {notificacion_seleccionada.metadata && Object.keys(notificacion_seleccionada.metadata).length > 0 && (
                    <div className="notificaciones__modal-seccion">
                      <h3>Información Adicional</h3>
                      <div className="notificaciones__modal-metadata">
                        {Object.entries(notificacion_seleccionada.metadata).map(([clave, valor]) => (
                          <div key={clave} className="notificaciones__modal-metadata-item">
                            <span className="notificaciones__modal-label">{clave}</span>
                            <span className="notificaciones__modal-valor">{String(valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="notificaciones__modal-acciones">
              <button 
                className="notificaciones__modal-btn-eliminar"
                onClick={() => {
                  _eliminar_notificacion(notificacion_seleccionada.id);
                }}
                title="Eliminar notificación"
              >
                🗑 Eliminar
              </button>
              {notificacion_seleccionada.ruta_destino && (
                <button 
                  className="notificaciones__modal-btn-primario"
                  onClick={() => {
                    navigate("/" + notificacion_seleccionada.ruta_destino);
                    set_notificacion_seleccionada(null);
                  }}
                >
                  Ir a {notificacion_seleccionada.ruta_destino}
                </button>
              )}
              <button 
                className="notificaciones__modal-btn-secundario"
                onClick={() => set_notificacion_seleccionada(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
