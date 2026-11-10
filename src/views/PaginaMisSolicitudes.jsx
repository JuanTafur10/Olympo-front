// PaginaMisSolicitudes.jsx — Panel de solicitudes de inversión para emprendedores
import { useEffect, useMemo, useRef, useState } from "react";
import { useContextoApp } from "../context/contexto_app";
import { listar_proyectos_api } from "../services/proyectos_api";
import { listar_solicitudes_por_proyecto_api, actualizar_estado_solicitud_api } from "../services/solicitudes_api";
import { API_BASE_URL } from "../services/api_config.js";
import { apiFetch } from "../services/api_client.js";
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  MessageSquare,
  FileText,
  Printer,
  Phone,
  Mail,
  MapPin,
  User,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "../hooks/useNavigate";
import "./PaginaMisSolicitudes.css";

export default function PaginaMisSolicitudes() {
  const { datos_usuario, mostrar_notificacion, set_id_inversionista_activo, set_datos_contacto_temporario } = useContextoApp();
  const navigate = useNavigate();

  const [proyectos, set_proyectos] = useState([]);
  const [solicitudes_por_proyecto, set_solicitudes_por_proyecto] = useState({});
  const usuarios_cache_ref = useRef({});
  const [cargando, set_cargando] = useState(true);
  const [error, set_error] = useState("");
  const [expandidos, set_expandidos] = useState({});
  const [actualizando, set_actualizando] = useState(null);
  const [filtro, set_filtro] = useState("todas");
  const [modalAcuerdoOpen, set_modalAcuerdoOpen] = useState(false);
  const [solicitudSeleccionadaAcuerdo, set_solicitudSeleccionadaAcuerdo] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      set_cargando(true);
      set_error("");

      try {
        const todos = await listar_proyectos_api(datos_usuario.id, datos_usuario.email);
        const mis = (todos || []).filter((p) => p.propietario_id === datos_usuario.id);
        set_proyectos(mis);

        const cacheLocal = { ...usuarios_cache_ref.current };

        const fetchUsuario = async (usuarioId) => {
          if (!usuarioId) return null;
          if (cacheLocal[usuarioId]) return cacheLocal[usuarioId];

          try {
            const res = await apiFetch(`${API_BASE_URL}/api/v1/usuarios/${encodeURIComponent(usuarioId)}`);
            const datos = await res.json().catch(() => ({}));
            if (res.ok && datos?.ok && datos?.usuario) {
              cacheLocal[usuarioId] = datos.usuario;
              return datos.usuario;
            }
          } catch (e) {
            console.warn("No se pudo cargar usuario", usuarioId, e);
          }

          return null;
        };

        const map = {};
        for (const p of mis) {
          try {
            let solicitudes = await listar_solicitudes_por_proyecto_api(p.id);
            solicitudes = Array.isArray(solicitudes) ? solicitudes : [];

            for (const solicitud of solicitudes) {
              if ((!solicitud.inversionista_nombre || solicitud.inversionista_nombre === null) && solicitud.inversionista_usuario_id) {
                const usuario = await fetchUsuario(solicitud.inversionista_usuario_id);
                if (usuario) {
                  solicitud.inversionista_nombre = usuario.nombre || usuario.nombre_usuario || solicitud.inversionista_nombre;
                  solicitud.inversionista_email = solicitud.inversionista_email || usuario.email;
                  solicitud.inversionista_telefono = solicitud.inversionista_telefono || usuario.telefono;
                  solicitud.inversionista_foto_perfil = solicitud.inversionista_foto_perfil || usuario.foto_perfil;
                  solicitud.inversionista_ciudad = solicitud.inversionista_ciudad || usuario.ciudad;
                  solicitud.inversionista_firebase_uid = solicitud.inversionista_firebase_uid || usuario.firebase_uid;
                }
              }
            }

            map[p.id] = solicitudes;
          } catch (err) {
            console.error("Error cargando solicitudes para proyecto", p.id, err);
            map[p.id] = [];
          }
        }

        usuarios_cache_ref.current = cacheLocal;
        set_solicitudes_por_proyecto(map);
      } catch (err) {
        console.error("Error cargando proyectos:", err);
        set_error(err.message || "Error cargando proyectos");
      } finally {
        set_cargando(false);
      }
    };

    cargar();
  }, [datos_usuario.id, datos_usuario.email]);

  const toggle_proyecto = (id) => set_expandidos((prev) => ({ ...prev, [id]: !prev[id] }));

  const obtener_color_estado = (estado) => {
    switch ((estado || "").toLowerCase()) {
      case "pendiente": return "#f59e0b";
      case "aceptada": return "#10b981";
      case "rechazada": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const obtener_icono_estado = (estado) => {
    switch ((estado || "").toLowerCase()) {
      case "pendiente": return "⏳";
      case "aceptada": return "✅";
      case "rechazada": return "❌";
      default: return "•";
    }
  };

  const solicitudes_pendientes = useMemo(() => {
    let total = 0;
    for (const key in solicitudes_por_proyecto) {
      total += (solicitudes_por_proyecto[key] || []).filter((s) => (s.estado || "").toLowerCase() === "pendiente").length;
    }
    return total;
  }, [solicitudes_por_proyecto]);

  const manejar_actualizar_solicitud = async (solicitud_id, nuevo_estado) => {
    set_actualizando(solicitud_id);
    try {
      await actualizar_estado_solicitud_api(solicitud_id, nuevo_estado);

      const nuevo = {};
      for (const key in solicitudes_por_proyecto) {
        nuevo[key] = (solicitudes_por_proyecto[key] || []).map((s) => (s.id === solicitud_id ? { ...s, estado: nuevo_estado } : s));
      }

      set_solicitudes_por_proyecto(nuevo);
      mostrar_notificacion("success", "Solicitud actualizada");
    } catch (err) {
      console.error(err);
      mostrar_notificacion("error", err.message || "Error al actualizar solicitud");
    } finally {
      set_actualizando(null);
    }
  };

  const abrirChatConInversionista = async (solicitud) => {
    let contactId = solicitud.inversionista_contacto_id || solicitud.inversionista_firebase_uid || solicitud.inversionista_usuario_id;

    try {
      if (contactId && !solicitud.inversionista_firebase_uid && solicitud.inversionista_usuario_id) {
        try {
        const resUsuario = await apiFetch(`${API_BASE_URL}/api/v1/usuarios/${encodeURIComponent(solicitud.inversionista_usuario_id)}`);
          const datosUsuario = await resUsuario.json().catch(() => ({}));
          if (resUsuario.ok && datosUsuario?.ok && datosUsuario?.usuario?.firebase_uid) {
            contactId = datosUsuario.usuario.firebase_uid;
          }
        } catch (e) {
          console.debug("[PaginaMisSolicitudes] No se pudo resolver firebase_uid del usuario:", e);
        }
      }

      if (!contactId && solicitud.proyecto_id) {
        const res = await apiFetch(`${API_BASE_URL}/api/v1/proyectos/${encodeURIComponent(solicitud.proyecto_id)}`);
        const pj = await res.json().catch(() => ({}));
        if (res.ok && pj?.ok && pj?.proyecto) {
          const propietarioId = pj.proyecto.propietario_id || pj.proyecto.propietarioId || null;
          if (propietarioId) {
            try {
              const resOwner = await apiFetch(`${API_BASE_URL}/api/v1/usuarios/${encodeURIComponent(propietarioId)}`);
              const datosOwner = await resOwner.json().catch(() => ({}));
              contactId = resOwner.ok && datosOwner?.ok && datosOwner?.usuario?.firebase_uid ? datosOwner.usuario.firebase_uid : propietarioId;
            } catch (e) {
              contactId = propietarioId;
            }
          }
        }
      }

      if (!contactId) {
        mostrar_notificacion("error", "No se pudo iniciar el chat: Falta el ID del inversionista");
        return;
      }

      try {
        if (set_datos_contacto_temporario) {
          set_datos_contacto_temporario({
            id_contacto: String(contactId),
            id_chat: String(contactId),
            firebase_uid_contacto: String(contactId),
            usuario_id_contacto: solicitud.inversionista_usuario_id || null,
            nombre_contacto: solicitud.inversionista_nombre || solicitud.inversionista_email || "Inversionista",
            rol_contacto: "inversionista",
            estado_contacto: "activo",
            detalle_contacto: solicitud.propuesta || solicitud.inversionista_ciudad || null,
            foto_perfil: solicitud.inversionista_foto_perfil || null,
          });
        }
      } catch (_) {}

      navigate("/mensajes");
      setTimeout(() => set_id_inversionista_activo(String(contactId)), 50);
    } catch (err) {
      console.error("Error al abrir chat con inversionista:", err);
      mostrar_notificacion("error", "No se pudo iniciar el chat: error de red");
    }
  };

  if (cargando) {
    return (
      <div className="mis-solicitudes mis-solicitudes--cargando">
        <div className="mis-solicitudes__spinner"></div>
        Cargando...
      </div>
    );
  }

  return (
    <div className="mis-solicitudes">
      <div className="mis-solicitudes__header">
        <h1>Mis Solicitudes</h1>
        {error && <div className="mis-solicitudes__error-texto">{error}</div>}
      </div>

      <div className="mis-solicitudes__filtros">
        <button className={`mis-solicitudes__filtro-btn ${filtro === "todas" ? "is-active" : ""}`} onClick={() => set_filtro("todas")}>Todas</button>
        <button className={`mis-solicitudes__filtro-btn ${filtro === "pendiente" ? "is-active" : ""}`} onClick={() => set_filtro("pendiente")}>Pendientes ({solicitudes_pendientes})</button>
        <button className={`mis-solicitudes__filtro-btn ${filtro === "aceptada" ? "is-active" : ""}`} onClick={() => set_filtro("aceptada")}>Aprobadas</button>
        <button className={`mis-solicitudes__filtro-btn ${filtro === "rechazada" ? "is-active" : ""}`} onClick={() => set_filtro("rechazada")}>Rechazadas</button>
      </div>

      <div className="mis-solicitudes__proyectos">
        {proyectos.length === 0 && <div>No tienes proyectos aún.</div>}

        {proyectos.map((proy) => {
          const solicitudes = solicitudes_por_proyecto[proy.id] || [];
          const filtradas = filtro === "todas" ? solicitudes : solicitudes.filter((s) => (s.estado || "").toLowerCase() === filtro);
          const es_expandido = !!expandidos[proy.id];

          return (
            <div key={proy.id} className="mis-solicitudes__proyecto">
              <div className="mis-solicitudes__proyecto-header">
                <div className="mis-solicitudes__proyecto-info">
                  <strong className="mis-solicitudes__proyecto-titulo">{proy.titulo || proy.nombre || "Proyecto sin título"}</strong>
                </div>
                <button onClick={() => toggle_proyecto(proy.id)} className="mis-solicitudes__proyecto-toggle">
                  {es_expandido ? <ChevronUp /> : <ChevronDown />}
                </button>
              </div>

              {es_expandido && (
                <div className="mis-solicitudes__solicitudes-list">
                  {filtradas.length === 0 ? (
                    <div className="mis-solicitudes__sin-solicitudes">No hay solicitudes en esta categoría para este proyecto.</div>
                  ) : (
                    filtradas.map((solicitud) => (
                      <div key={solicitud.id} className={`mis-solicitudes__solicitud mis-solicitudes__solicitud--${solicitud.estado}`}>
                        <div className="mis-solicitudes__solicitud-contenido">
                          <div className="mis-solicitudes__solicitud-header">
                            <span className="mis-solicitudes__solicitud-estado" style={{ backgroundColor: obtener_color_estado(solicitud.estado) }}>
                              {obtener_icono_estado(solicitud.estado)} {solicitud.estado}
                            </span>
                            <span className="mis-solicitudes__solicitud-monto">COP ${solicitud.monto_solicitado?.toLocaleString("es-CO") || 0}</span>
                          </div>

                          <div className="mis-solicitudes__solicitud-inversionista">
                            <div className="solicitud__inv-avatar">
                              {solicitud.inversionista_foto_perfil ? <img src={solicitud.inversionista_foto_perfil} alt="Avatar" /> : <User size={14} />}
                            </div>
                            <span className="solicitud__inv-nombre"><strong>Inversionista:</strong> {solicitud.inversionista_nombre || "Cargando..."}</span>
                            {solicitud.inversionista_ciudad && <span className="solicitud__inv-ciudad">• {solicitud.inversionista_ciudad}</span>}
                          </div>

                          {solicitud.propuesta && <p className="mis-solicitudes__solicitud-propuesta"><strong>Propuesta:</strong> {solicitud.propuesta}</p>}

                          <div className="mis-solicitudes__solicitud-fecha">
                            Creada: {solicitud.creada_en ? new Date(solicitud.creada_en).toLocaleDateString("es-CO") : "N/A"}
                          </div>

                          {(solicitud.estado || "").toLowerCase() === "aceptada" && (
                            <div className="mis-solicitudes__contacto-info-card">
                              <h4>📇 Información de Contacto del Inversionista</h4>
                              <div className="contacto-info-grid">
                                {solicitud.inversionista_email && (
                                  <div className="contacto-info-item">
                                    <Mail size={14} />
                                    <a href={`mailto:${solicitud.inversionista_email}`}>{solicitud.inversionista_email}</a>
                                  </div>
                                )}
                                {solicitud.inversionista_telefono && (
                                  <div className="contacto-info-item">
                                    <Phone size={14} />
                                    <a href={`tel:${solicitud.inversionista_telefono}`}>{solicitud.inversionista_telefono}</a>
                                  </div>
                                )}
                                {solicitud.inversionista_linkedin && (
                                  <div className="contacto-info-item">
                                    <ExternalLink size={14} />
                                    <a href={solicitud.inversionista_linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                                  </div>
                                )}
                                {solicitud.inversionista_ciudad && (
                                  <div className="contacto-info-item">
                                    <MapPin size={14} />
                                    <span>{solicitud.inversionista_ciudad}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {(solicitud.estado || "").toLowerCase() === "pendiente" && (
                          <div className="mis-solicitudes__solicitud-acciones">
                            <button className="mis-solicitudes__boton mis-solicitudes__boton--aceptar" onClick={() => manejar_actualizar_solicitud(solicitud.id, "aceptada")} disabled={actualizando === solicitud.id}>
                              <Check size={16} /> Aceptar
                            </button>
                            <button className="mis-solicitudes__boton mis-solicitudes__boton--rechazar" onClick={() => manejar_actualizar_solicitud(solicitud.id, "rechazada")} disabled={actualizando === solicitud.id}>
                              <X size={16} /> Rechazar
                            </button>
                          </div>
                        )}

                        {(solicitud.estado || "").toLowerCase() === "aceptada" && (
                          <div className="mis-solicitudes__solicitud-acciones mis-solicitudes__solicitud-acciones--conectado">
                            <button className="mis-solicitudes__boton mis-solicitudes__boton--acuerdo" onClick={() => { set_solicitudSeleccionadaAcuerdo(solicitud); set_modalAcuerdoOpen(true); }}>
                              <FileText size={16} /> Acuerdo
                            </button>
                            <button className="mis-solicitudes__boton mis-solicitudes__boton--chat" onClick={() => abrirChatConInversionista(solicitud)}>
                              <MessageSquare size={16} /> Chatear
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Grupos adicionales removidos temporalmente para simplificar la renderización */}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalAcuerdoOpen && solicitudSeleccionadaAcuerdo && (
        <div className="mis-solicitudes__modal-overlay" onClick={() => set_modalAcuerdoOpen(false)}>
          <div className="mis-solicitudes__modal-content mis-solicitudes__modal-content--acuerdo" onClick={(e) => e.stopPropagation()}>
            <div className="mis-solicitudes__modal-header no-print">
              <h2 className="mis-solicitudes__modal-title">📄 Borrador de Acuerdo de Inversión</h2>
              <button className="mis-solicitudes__modal-close" onClick={() => set_modalAcuerdoOpen(false)}>×</button>
            </div>

            <div className="mis-solicitudes__acuerdo-print-area">
              <div className="acuerdo__documento">
                <div className="acuerdo__cabecera">
                  <h1>BORRADOR DE ACUERDO PRELIMINAR DE INVERSIÓN</h1>
                  <p className="acuerdo__fecha">Fecha: {new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>

                <div className="acuerdo__seccion">
                  <p>
                    El presente documento constituye un borrador de acuerdo preliminar de inversión que resume los términos y condiciones de buena fe bajo los cuales las partes manifiestan su interés en colaborar mutuamente en el desarrollo del proyecto.
                  </p>
                </div>

                <div className="acuerdo__seccion">
                  <h3>1. PARTES CONTRATANTES</h3>
                  <div className="acuerdo__partes-grid">
                    <div>
                      <strong>EL EMPRENDEDOR:</strong>
                      <p>Nombre: {datos_usuario.nombre || datos_usuario.nombre_usuario || "N/A"}</p>
                      <p>Email: {datos_usuario.email || "N/A"}</p>
                      <p>Rol: Creador del Proyecto</p>
                    </div>
                    <div>
                      <strong>EL INVERSIONISTA:</strong>
                      <p>Nombre: {solicitudSeleccionadaAcuerdo.inversionista_nombre || "N/A"}</p>
                      <p>Email: {solicitudSeleccionadaAcuerdo.inversionista_email || "N/A"}</p>
                      <p>Teléfono: {solicitudSeleccionadaAcuerdo.inversionista_telefono || "N/A"}</p>
                    </div>
                  </div>
                </div>

                <div className="acuerdo__seccion">
                  <h3>2. OBJETO DE INVERSIÓN</h3>
                  <p>
                    El inversionista aportará la suma total de <strong>COP ${solicitudSeleccionadaAcuerdo.monto_solicitado?.toLocaleString("es-CO") || 0}</strong> a favor del proyecto titulado <strong>"{solicitudSeleccionadaAcuerdo.proyecto_nombre || proyectos.find((p) => p.id === solicitudSeleccionadaAcuerdo.proyecto_id)?.titulo || "Proyecto"}"</strong>.
                  </p>
                  <p>
                    El emprendedor utilizará dichos recursos financieros única y exclusivamente para el desarrollo, ejecución técnica y aceleración comercial del citado proyecto.
                  </p>
                </div>

                {solicitudSeleccionadaAcuerdo.propuesta && (
                  <div className="acuerdo__seccion">
                    <h3>3. PROPUESTA Y CONDICIONES</h3>
                    <p className="acuerdo__bloque-propuesta">"{solicitudSeleccionadaAcuerdo.propuesta}"</p>
                  </div>
                )}

                <div className="acuerdo__seccion">
                  <h3>4. CONFIDENCIALIDAD Y PRÓXIMOS PASOS</h3>
                  <p>
                    Las partes se obligan recíprocamente a guardar confidencialidad absoluta sobre los datos, secretos comerciales y tecnológicos a los que tengan acceso.
                  </p>
                  <p>
                    A partir del presente borrador, las partes iniciarán la etapa de debida diligencia para formalizar y firmar el contrato definitivo de inversión en un plazo máximo de 30 días.
                  </p>
                </div>

                <div className="acuerdo__firmas">
                  <div className="acuerdo__firma-bloque">
                    <div className="acuerdo__firma-linea"></div>
                    <p><strong>{datos_usuario.nombre || datos_usuario.nombre_usuario || "El Emprendedor"}</strong></p>
                    <p>Por: Emprendedor</p>
                  </div>
                  <div className="acuerdo__firma-bloque">
                    <div className="acuerdo__firma-linea"></div>
                    <p><strong>{solicitudSeleccionadaAcuerdo.inversionista_nombre || "El Inversionista"}</strong></p>
                    <p>Por: Inversionista</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mis-solicitudes__modal-footer no-print">
              <button className="boton boton--secundario" onClick={() => set_modalAcuerdoOpen(false)}>
                Cerrar
              </button>
              <button className="boton boton--primario agreement-print-btn" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
