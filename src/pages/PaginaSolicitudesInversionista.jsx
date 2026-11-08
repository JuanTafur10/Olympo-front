// PaginaSolicitudesInversionista.jsx — Mis solicitudes de inversión
import { useEffect, useState } from "react";
import { useContextoApp } from "../context/contexto_app";
import { API_BASE_URL } from "../services/api_config";
import { listar_solicitudes_por_inversionista_api } from "../services/solicitudes_api";
import { useNavigate } from "react-router-dom";
import { 
  FileText, MessageSquare, User, Mail, Phone,
  ExternalLink, Printer, CheckCircle, TrendingUp,
  ShieldAlert, AlertTriangle, Zap, ShieldCheck, X,
  ChevronDown, ChevronUp
} from "lucide-react";
import {
  obtener_riesgos_detectados_ares,
  detectar_riesgos_ares,
  listar_riesgos_personalizados_ares,
} from "../services/chatbot_api";
import "./PaginaProyectos.css";
import "./PaginaMisSolicitudes.css"; // Importar estilos de modales y contacto compartidos
import "./PaginaRiesgos.css";

/* ── Helpers de riesgos (solo lectura) ── */
const NIVEL_COLOR_INV = {
  alto:  { bg: "rgba(239,68,68,0.15)",    border: "rgba(239,68,68,0.5)",    text: "#fca5a5", badge: "#ef4444" },
  medio: { bg: "rgba(251,191,36,0.13)",   border: "rgba(251,191,36,0.45)",  text: "#fde68a", badge: "#f59e0b" },
  bajo:  { bg: "rgba(52,211,153,0.12)",   border: "rgba(52,211,153,0.4)",   text: "#6ee7b7", badge: "#10b981" },
};
const calcNivel = (p, i) => { const s = p * i; return s >= 12 ? "alto" : s >= 6 ? "medio" : "bajo"; };
const PROB_L = ["", "Muy baja", "Baja", "Media", "Alta", "Muy alta"];
const IMP_L  = ["", "Mínimo",  "Menor", "Moderado", "Mayor", "Crítico"];

const normalizarRiesgosDetectados = (riesgos = []) => {
  if (!Array.isArray(riesgos)) return [];
  return riesgos
    .filter((r) => r && typeof r === "object")
    .map((r, idx) => {
      const probabilidad = Math.max(1, Math.min(5, Number(r.probabilidad) || 3));
      const impacto = Math.max(1, Math.min(5, Number(r.impacto) || 3));
      return {
        id: r.id || r.riesgo_id || `ia-${idx + 1}`,
        categoria: r.categoria || "Detectado por IA",
        nombre: r.nombre || `Riesgo IA ${idx + 1}`,
        descripcion: r.descripcion || "Riesgo identificado automáticamente por IA.",
        probabilidad,
        impacto,
        tratamiento: r.tratamiento || "Definir plan de mitigación para este riesgo.",
        tipo: calcNivel(probabilidad, impacto),
        esDetectadoIA: true,
      };
    });
};

const normalizarRiesgosPersonalizados = (riesgos = []) => {
  if (!Array.isArray(riesgos)) return [];
  return riesgos
    .filter((r) => r && typeof r === "object")
    .map((r, idx) => {
      const probabilidad = Math.max(1, Math.min(5, Number(r.probabilidad) || 3));
      const impacto = Math.max(1, Math.min(5, Number(r.impacto) || 3));
      return {
        id: r.id || r.riesgo_id || `usr-${idx + 1}`,
        categoria: r.categoria || "Usuario",
        nombre: r.nombre || `Riesgo personalizado ${idx + 1}`,
        descripcion: r.descripcion || "Riesgo creado por el usuario.",
        probabilidad,
        impacto,
        tratamiento: r.tratamiento || "Definir un plan de mitigación para este riesgo.",
        tipo: r.tipo || calcNivel(probabilidad, impacto),
        esPersonalizado: true,
      };
    });
};

const fusionarRiesgos = (riesgosBase = [], riesgosDetectados = []) => {
  const nombresBase = new Set(
    riesgosBase
      .map((r) => String(r?.nombre || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const detectadosUnicos = riesgosDetectados.filter((r) => {
    const nombre = String(r?.nombre || "").trim().toLowerCase();
    if (!nombre || nombresBase.has(nombre)) return false;
    nombresBase.add(nombre);
    return true;
  });

  return [...riesgosBase, ...detectadosUnicos];
};

export default function PaginaSolicitudesInversionista() {
  const { datos_usuario, set_id_inversionista_activo, mostrar_notificacion, set_datos_contacto_temporario } = useContextoApp();
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todas");

  // Modales
  const [modalAcuerdoOpen, setModalAcuerdoOpen] = useState(false);
  const [solicitudSeleccionadaAcuerdo, setSolicitudSeleccionadaAcuerdo] = useState(null);

  // ── Estado del modal de riesgos ──
  const [modalRiesgosOpen, setModalRiesgosOpen] = useState(false);
  const [proyectoRiesgos, setProyectoRiesgos] = useState(null);
  const [riesgosModal, setRiesgosModal] = useState([]);
  const [cargandoRiesgos, setCargandoRiesgos] = useState(false);
  const [aresEvaluadoModal, setAresEvaluadoModal] = useState(false);
  const [celdaSelModal, setCeldaSelModal] = useState(null);
  const [filtroModal, setFiltroModal] = useState("todos");

  const abrirModalRiesgos = async (solicitud) => {
    const propietario_id = solicitud.emprendedor_usuario_id;
    const proyecto = {
      id: solicitud.proyecto_id,
      titulo: solicitud.proyecto_nombre || "Proyecto",
      propietario_id: propietario_id,
    };
    setProyectoRiesgos(proyecto);
    setRiesgosModal([]);
    setAresEvaluadoModal(false);
    setCeldaSelModal(null);
    setFiltroModal("todos");
    setModalRiesgosOpen(true);

    if (!propietario_id) {
      mostrar_notificacion("warning", "La solicitud no contiene información del propietario.");
      return;
    }

    setCargandoRiesgos(true);
    try {
      // 1. Intentar cargar riesgos detectados por Ares
      const detectadosCache = await obtener_riesgos_detectados_ares(proyecto.id, propietario_id);

      // 2. Intentar cargar riesgos personalizados
      let personalizados = [];
      try {
        personalizados = await listar_riesgos_personalizados_ares(proyecto.id, propietario_id);
      } catch (errPers) {
        console.warn("No se pudieron cargar riesgos personalizados del dueño:", errPers);
      }

      const detectadosNorm = detectadosCache && Array.isArray(detectadosCache.riesgos)
        ? normalizarRiesgosDetectados(detectadosCache.riesgos)
        : [];
      const personalizadosNorm = normalizarRiesgosPersonalizados(personalizados);

      const fusionados = fusionarRiesgos(personalizadosNorm, detectadosNorm);

      if (fusionados.length > 0) {
        setRiesgosModal(fusionados);
        setAresEvaluadoModal(true);
      } else {
        setRiesgosModal([]);
        setAresEvaluadoModal(false);
      }
    } catch (err) {
      console.error("Error al obtener los riesgos del proyecto:", err);
      setRiesgosModal([]);
      setAresEvaluadoModal(false);
    } finally {
      setCargandoRiesgos(false);
    }
  };

  const evaluarAresModal = async () => {
    if (!proyectoRiesgos || !proyectoRiesgos.propietario_id) return;
    setCargandoRiesgos(true);
    try {
      const result = await detectar_riesgos_ares(proyectoRiesgos.id, proyectoRiesgos.propietario_id);
      if (result && Array.isArray(result.riesgos_detectados)) {
        const detectados = normalizarRiesgosDetectados(result.riesgos_detectados);
        
        let personalizados = [];
        try {
          personalizados = await listar_riesgos_personalizados_ares(proyectoRiesgos.id, proyectoRiesgos.propietario_id);
        } catch (_) {}

        const personalizadosNorm = normalizarRiesgosPersonalizados(personalizados);
        const fusionados = fusionarRiesgos(personalizadosNorm, detectados);

        setRiesgosModal(fusionados);
        setAresEvaluadoModal(true);
        mostrar_notificacion("success", "Riesgos evaluados exitosamente con Ares");
      } else {
        mostrar_notificacion("info", "Ares no detectó riesgos para este proyecto");
      }
    } catch (err) {
      mostrar_notificacion("error", "Error al evaluar riesgos con Ares: " + err.message);
    } finally {
      setCargandoRiesgos(false);
    }
  };

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setError("");
      try {
        const solicitudes_db = await listar_solicitudes_por_inversionista_api(datos_usuario.id);
        if (!activo) return;
        setSolicitudes(Array.isArray(solicitudes_db) ? solicitudes_db : []);
      } catch (err) {
        if (!activo) return;
        setError(err.message || "No se pudieron cargar las solicitudes");
        setSolicitudes([]);
      } finally {
        if (activo) setCargando(false);
      }
    };

    if (datos_usuario?.id) {
      cargar();
    }

    return () => { activo = false; };
  }, [datos_usuario?.id]);

  const solicitudes_filtradas = solicitudes.filter((s) => {
    if (filtroEstado === "todas") return true;
    return (s.estado || "").toLowerCase() === filtroEstado.toLowerCase();
  });

  const formatearPresupuesto = (valor) => {
    if (!valor) return "$0";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const getStatusColor = (estado) => {
    const estadoLower = (estado || "").toLowerCase();
    if (estadoLower === "aprobado" || estadoLower === "aceptada") return "#10b981";
    if (estadoLower === "rechazado" || estadoLower === "rechazada") return "#ef4444";
    if (estadoLower === "pendiente") return "#f59e0b";
    return "#6b7280";
  };

  const getEstadoLabel = (estado) => {
    if (estado === "todas") return "Todas";
    if (estado === "pendiente") return "Pendientes";
    if (estado === "aceptada") return "Aprobadas";
    if (estado === "rechazada") return "Rechazadas";
    return estado;
  };

  const estados = ["todas", "pendiente", "aceptada", "rechazada"];
  const totalAceptadas = solicitudes.filter((s) => (s.estado || "").toLowerCase() === "aceptada").length;

  return (
    <div className="pagina-proyectos">
      {/* Banner de éxito cuando hay inversiones aceptadas */}
      {totalAceptadas > 0 && (
        <div style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)",
          border: "1px solid rgba(16,185,129,0.28)",
          borderLeft: "4px solid #10b981",
          borderRadius: "14px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "4px",
          animation: "scaleIn 300ms cubic-bezier(0.16,1,0.3,1)",
        }}>
          <CheckCircle size={22} color="#34d399" strokeWidth={2} style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: "#34d399", fontSize: ".95rem" }}>
              ¡Felicidades! {totalAceptadas} inversión{totalAceptadas > 1 ? "es" : ""} aceptada{totalAceptadas > 1 ? "s" : ""}
            </strong>
            <p style={{ margin: "2px 0 0 0", fontSize: ".82rem", color: "rgba(200,215,255,0.65)" }}>
              Los emprendedores han aprobado tu solicitud. Contáctalos para continuar.
            </p>
          </div>
          <TrendingUp size={18} color="rgba(52,211,153,0.55)" style={{ marginLeft: "auto", flexShrink: 0 }} />
        </div>
      )}

      {/* Header */}
      <div className="proyectos__header">
        <div>
          <h1>Mis Solicitudes de Inversión</h1>
          <p className="proyectos__subtitulo">
            Seguimiento de tus solicitudes de inversión en proyectos
          </p>
        </div>
      </div>

      {/* Filtros por estado */}
      <div className="proyectos__controles">
        <div className="proyectos__filtros">
          {estados.map((estado) => (
            <button
              key={estado}
              className={`proyectos__filtro ${
                filtroEstado === estado ? "proyectos__filtro--activo" : ""
              }`}
              onClick={() => setFiltroEstado(estado)}
            >
              {estado === "todas"
                ? `Todas (${solicitudes.length})`
                : `${getEstadoLabel(estado)} (${solicitudes.filter(
                    (s) => (s.estado || "").toLowerCase() === estado.toLowerCase()
                  ).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Mensajes de estado */}
      {error && <p className="proyectos__error">{error}</p>}
      {cargando && <p className="proyectos__loading">Cargando solicitudes...</p>}

      {/* Listado de solicitudes */}
      {!cargando && solicitudes_filtradas.length === 0 ? (
        <div className="proyectos__vacio">
          <p>No tienes solicitudes de inversión</p>
        </div>
      ) : (
        <div className="solicitudes__lista">
          {solicitudes_filtradas.map((solicitud) => (
            <div key={solicitud.id} className="solicitudes__card">
              <div className="solicitudes__header">
                <h3>{solicitud.proyecto_nombre || "Proyecto"}</h3>
                <span
                  className="solicitudes__estado"
                  style={{ backgroundColor: getStatusColor(solicitud.estado) }}
                >
                  {solicitud.estado || "Pendiente"}
                </span>
              </div>

              <p className="solicitudes__propuesta">
                {solicitud.propuesta || "Sin comentarios"}
              </p>

              <div className="solicitudes__meta">
                <div className="solicitudes__meta-item">
                  <span className="solicitudes__meta-label">Monto Solicitado</span>
                  <span className="solicitudes__meta-valor">
                    {formatearPresupuesto(solicitud.monto_solicitado)}
                  </span>
                </div>
                <div className="solicitudes__meta-item">
                  <span className="solicitudes__meta-label">Fecha de Solicitud</span>
                  <span className="solicitudes__meta-valor">
                    {new Date(solicitud.creada_en).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Información del emprendedor cuando es Aceptada */}
              {solicitud.estado?.toLowerCase() === "aceptada" && (
                <div className="solicitudes__contacto-info-card">
                  <h4>📇 Información de Contacto del Emprendedor</h4>
                  <div className="contacto-info-grid">
                    {solicitud.emprendedor_nombre && (
                      <div className="contacto-info-item">
                        <User size={14} />
                        <span>{solicitud.emprendedor_nombre}</span>
                      </div>
                    )}
                    {solicitud.emprendedor_email && (
                      <div className="contacto-info-item">
                        <Mail size={14} />
                        <a href={`mailto:${solicitud.emprendedor_email}`}>{solicitud.emprendedor_email}</a>
                      </div>
                    )}
                    {solicitud.emprendedor_telefono && (
                      <div className="contacto-info-item">
                        <Phone size={14} />
                        <a href={`tel:${solicitud.emprendedor_telefono}`}>{solicitud.emprendedor_telefono}</a>
                      </div>
                    )}
                    {solicitud.emprendedor_linkedin && (
                      <div className="contacto-info-item">
                        <ExternalLink size={14} />
                        <a href={solicitud.emprendedor_linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <ExternalLink size={10} /></a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {solicitud.estado?.toLowerCase() === "pendiente" && (
                <p className="solicitudes__nota">
                  Esperando respuesta del emprendedor
                </p>
              )}

              {/* Acciones para el Inversionista cuando es Aceptada */}
              {solicitud.estado?.toLowerCase() === "aceptada" && (
                <div className="solicitudes__acciones no-print">
                  <button
                    className="solicitudes__boton solicitudes__boton--chat"
                    onClick={async () => {
                      console.debug('[PaginaSolicitudesInversionista] click Chat - solicitud:', solicitud);
                      // Prioridad: emprendedor_contacto_id (calculado por backend) > firebase_uid > usuario_id
                      let contactId = solicitud.emprendedor_contacto_id || solicitud.emprendedor_firebase_uid || solicitud.emprendedor_usuario_id;
                      try {
                        // Si tenemos un usuario_id pero no un firebase_uid, intentar resolver el firebase_uid
                        if (contactId && !solicitud.emprendedor_firebase_uid && solicitud.emprendedor_usuario_id) {
                          try {
                            const resUsuario = await fetch(`${API_BASE_URL}/api/v1/usuarios/${encodeURIComponent(solicitud.emprendedor_usuario_id)}`);
                            const datosUsuario = await resUsuario.json().catch(() => ({}));
                            if (resUsuario.ok && datosUsuario?.ok && datosUsuario?.usuario?.firebase_uid) {
                              contactId = datosUsuario.usuario.firebase_uid;
                              console.debug('[PaginaSolicitudesInversionista] firebase_uid resuelto desde usuario:', contactId);
                            }
                          } catch (e) {
                            console.debug('[PaginaSolicitudesInversionista] No se pudo resolver firebase_uid del usuario:', e);
                          }
                        }

                        if (!contactId) {
                          // Último recurso: obtener propietario del proyecto desde la API de proyectos
                          const res = await fetch(`${API_BASE_URL}/api/v1/proyectos/${encodeURIComponent(solicitud.proyecto_id)}`);
                          const pj = await res.json().catch(() => ({}));
                          console.debug('[PaginaSolicitudesInversionista] proyecto fetch result:', { status: res.status, ok: res.ok, body: pj });
                          if (res.ok && pj && pj.ok && pj.proyecto) {
                            const propietarioId = pj.proyecto.propietario_id || pj.proyecto.propietarioId || null;
                            if (propietarioId) {
                              // Intentar resolver firebase_uid del propietario
                              try {
                                const resOwner = await fetch(`${API_BASE_URL}/api/v1/usuarios/${encodeURIComponent(propietarioId)}`);
                                const datosOwner = await resOwner.json().catch(() => ({}));
                                if (resOwner.ok && datosOwner?.ok && datosOwner?.usuario?.firebase_uid) {
                                  contactId = datosOwner.usuario.firebase_uid;
                                } else {
                                  contactId = propietarioId;
                                }
                              } catch (e) {
                                contactId = propietarioId;
                              }
                              console.debug('[PaginaSolicitudesInversionista] propietarioId encontrado:', contactId);
                            }
                          }
                        }

                        console.debug('[PaginaSolicitudesInversionista] contactId final:', contactId);
                        if (contactId) {
                          // Preparar datos temporales para el panel de mensajes
                          try {
                            set_datos_contacto_temporario({
                              id_contacto: String(contactId),
                              id_chat: String(contactId),
                              firebase_uid_contacto: String(contactId),
                              usuario_id_contacto: solicitud.emprendedor_usuario_id || null,
                              nombre_contacto: solicitud.emprendedor_nombre || solicitud.emprendedor_email || 'Emprendedor',
                              rol_contacto: 'emprendedor',
                              estado_contacto: 'activo',
                              detalle_contacto: solicitud.propuesta || solicitud.emprendedor_ciudad || null,
                              foto_perfil: solicitud.emprendedor_foto_perfil || null,
                            });
                          } catch (e) {}

                          navigate("/mensajes");
                          setTimeout(() => set_id_inversionista_activo(String(contactId)), 50);
                        } else {
                          mostrar_notificacion("error", "No se pudo iniciar el chat: falta el ID del emprendedor");
                        }
                      } catch (err) {
                        console.error("Error intentando abrir chat por falta de ID:", err);
                        mostrar_notificacion("error", "No se pudo iniciar el chat: error al obtener datos del proyecto");
                      }
                    }}
                  >
                    <MessageSquare size={14} /> Chatear
                  </button>
                  <button
                    className="solicitudes__boton solicitudes__boton--acuerdo"
                    onClick={() => {
                      setSolicitudSeleccionadaAcuerdo(solicitud);
                      setModalAcuerdoOpen(true);
                    }}
                  >
                    <FileText size={14} /> Acuerdo
                  </button>
                  <button
                    className="solicitudes__boton solicitudes__boton--riesgos"
                    onClick={() => abrirModalRiesgos(solicitud)}
                    style={{
                      background: "rgba(124,143,245,0.15)",
                      border: "1px solid rgba(124,143,245,0.4)",
                      color: "#a7b5ff",
                    }}
                  >
                    <ShieldAlert size={14} /> Ver Riesgos
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Acuerdo */}
      {modalAcuerdoOpen && solicitudSeleccionadaAcuerdo && (
        <div className="mis-solicitudes__modal-overlay" onClick={() => setModalAcuerdoOpen(false)}>
          <div className="mis-solicitudes__modal-content mis-solicitudes__modal-content--acuerdo" onClick={(e) => e.stopPropagation()}>
            <div className="mis-solicitudes__modal-header no-print">
              <h2 className="mis-solicitudes__modal-title">📄 Borrador de Acuerdo de Inversión</h2>
              <button className="mis-solicitudes__modal-close" onClick={() => setModalAcuerdoOpen(false)}>×</button>
            </div>
            
            <div className="mis-solicitudes__acuerdo-print-area">
              <div className="acuerdo__documento">
                <div className="acuerdo__cabecera">
                  <h1>BORRADOR DE ACUERDO PRELIMINAR DE INVERSIÓN</h1>
                  <p className="acuerdo__fecha">Fecha: {new Date().toLocaleDateString("es-CO", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
                      <p>Nombre: {solicitudSeleccionadaAcuerdo.emprendedor_nombre || "N/A"}</p>
                      <p>Email: {solicitudSeleccionadaAcuerdo.emprendedor_email || "N/A"}</p>
                      <p>Teléfono: {solicitudSeleccionadaAcuerdo.emprendedor_telefono || "N/A"}</p>
                    </div>
                    <div>
                      <strong>EL INVERSIONISTA:</strong>
                      <p>Nombre: {datos_usuario.nombre || datos_usuario.nombre_usuario || "N/A"}</p>
                      <p>Email: {datos_usuario.email || "N/A"}</p>
                      <p>Rol: Inversionista</p>
                    </div>
                  </div>
                </div>

                <div className="acuerdo__seccion">
                  <h3>2. OBJETO DE INVERSIÓN</h3>
                  <p>
                    El inversionista aportará la suma total de <strong>COP ${solicitudSeleccionadaAcuerdo.monto_solicitado?.toLocaleString("es-CO") || 0}</strong> a favor del proyecto titulado <strong>"{solicitudSeleccionadaAcuerdo.proyecto_nombre || "Proyecto"}"</strong>.
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
                    <p><strong>{solicitudSeleccionadaAcuerdo.emprendedor_nombre || "El Emprendedor"}</strong></p>
                    <p>Por: Emprendedor</p>
                  </div>
                  <div className="acuerdo__firma-bloque">
                    <div className="acuerdo__firma-linea"></div>
                    <p><strong>{datos_usuario.nombre || datos_usuario.nombre_usuario || "El Inversionista"}</strong></p>
                    <p>Por: Inversionista</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mis-solicitudes__modal-footer no-print">
              <button className="boton boton--secundario" onClick={() => setModalAcuerdoOpen(false)}>
                Cerrar
              </button>
              <button className="boton boton--primario agreement-print-btn" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE MATRIZ DE RIESGOS ── */}
      {modalRiesgosOpen && proyectoRiesgos && (
        <div className="riesgos-modal-inv__overlay" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(6px)" }}
          onClick={() => setModalRiesgosOpen(false)}>
          <div className="riesgos-modal-inv__content" style={{ width:"95%", maxWidth:"1100px", maxHeight:"92vh", overflowY:"auto", background:"#0f1729", borderRadius:"22px", border:"1px solid rgba(124,143,245,0.2)", padding:"28px", boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header del modal */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
              <div>
                <h2 style={{ margin:0, color:"#e2e8f0", display:"flex", alignItems:"center", gap:"10px" }}>
                  <ShieldAlert size={24} color="#7c8ff5" /> Matriz de Riesgos
                </h2>
                <p style={{ margin:"4px 0 0", color:"#94a3b8", fontSize:"0.9rem" }}>Proyecto: <strong style={{ color:"#7c8ff5" }}>{proyectoRiesgos.titulo}</strong></p>
              </div>
              <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                {!aresEvaluadoModal && (
                  <button
                    onClick={evaluarAresModal}
                    disabled={cargandoRiesgos}
                    style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 18px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg,#7c8ff5,#a78bfa)", color:"#fff", fontWeight:600, cursor:"pointer", fontSize:"0.9rem" }}
                  >
                    <Zap size={15} />
                    {cargandoRiesgos ? "Ares Evaluando..." : "Evaluar con Ares"}
                  </button>
                )}
                {aresEvaluadoModal && (
                  <button
                    onClick={evaluarAresModal}
                    disabled={cargandoRiesgos}
                    style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 14px", borderRadius:"10px", border:"1px solid rgba(124,143,245,0.4)", background:"transparent", color:"#7c8ff5", cursor:"pointer", fontSize:"0.85rem" }}
                  >
                    <Zap size={13} /> Re-evaluar
                  </button>
                )}
                <button onClick={() => setModalRiesgosOpen(false)}
                  style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"50%", width:36, height:36, cursor:"pointer", color:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Mensaje antes de evaluar */}
            {!aresEvaluadoModal && !cargandoRiesgos && (
              <div style={{ textAlign:"center", padding:"50px 20px", color:"#94a3b8", border:"1px dashed rgba(124,143,245,0.3)", borderRadius:"16px", marginBottom:"20px" }}>
                <Zap size={44} style={{ opacity:0.4, marginBottom:"14px", color:"#7c8ff5" }} />
                <h3 style={{ color:"#e2e8f0", marginBottom:"8px" }}>Evaluación Pendiente</h3>
                <p>Presiona <strong style={{ color:"#7c8ff5" }}>"Evaluar con Ares"</strong> para que la IA analice los riesgos de este proyecto.</p>
              </div>
            )}

            {/* Spinner mientras carga */}
            {cargandoRiesgos && (
              <div style={{ textAlign:"center", padding:"50px 20px", color:"#94a3b8" }}>
                <div style={{ width:48, height:48, border:"3px solid rgba(124,143,245,0.2)", borderTopColor:"#7c8ff5", borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
                <p>Ares está analizando el proyecto...</p>
              </div>
            )}

            {/* Contenido una vez evaluado */}
            {aresEvaluadoModal && !cargandoRiesgos && (() => {
              const contAlto  = riesgosModal.filter(r => r.tipo === "alto").length;
              const contMedio = riesgosModal.filter(r => r.tipo === "medio").length;
              const contBajo  = riesgosModal.filter(r => r.tipo === "bajo").length;
              const filtrados = filtroModal === "todos" ? riesgosModal : riesgosModal.filter(r => r.tipo === filtroModal);
              const celda = celdaSelModal ? riesgosModal.filter(r => r.probabilidad === celdaSelModal.prob && r.impacto === celdaSelModal.imp) : [];

              return (
                <>
                  {/* KPIs */}
                  <div className="riesgos-modal-inv__kpis" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px", marginBottom:"20px" }}>
                    {[
                      { label:"Alto",  val:contAlto,  color:"#ef4444", bg:"rgba(239,68,68,0.1)",   icon:<AlertTriangle size={18}/> },
                      { label:"Medio", val:contMedio, color:"#f59e0b", bg:"rgba(251,191,36,0.1)",  icon:<Zap size={18}/> },
                      { label:"Bajo",  val:contBajo,  color:"#10b981", bg:"rgba(52,211,153,0.1)",  icon:<ShieldCheck size={18}/> },
                      { label:"Total", val:riesgosModal.length, color:"#7c8ff5", bg:"rgba(124,143,245,0.1)", icon:<ShieldAlert size={18}/> },
                    ].map(k => (
                      <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.color}33`, borderRadius:"12px", padding:"12px 16px", display:"flex", alignItems:"center", gap:"10px" }}>
                        <span style={{ color:k.color }}>{k.icon}</span>
                        <div>
                          <div style={{ fontSize:"1.5rem", fontWeight:700, color:k.color, lineHeight:1 }}>{k.val}</div>
                          <div style={{ fontSize:"0.75rem", color:"#94a3b8", marginTop:"2px" }}>Riesgo {k.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Layout Matriz + Lista */}
                  <div className="riesgos-modal-inv__grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>

                    {/* MATRIZ */}
                    <div className="riesgos__panel-matriz" style={{ height:"100%" }}>
                      <h3 className="riesgos__panel-titulo">Probabilidad × Impacto</h3>
                      <div className="riesgos__matriz-wrap">
                        <div className="riesgos__eje-y">
                          {[5,4,3,2,1].map(p => <div key={p} className="riesgos__eje-y-label">{PROB_L[p]}</div>)}
                          <div className="riesgos__eje-y-titulo">← Probabilidad</div>
                        </div>
                        <div className="riesgos__matriz-grid">
                          {[5,4,3,2,1].map(prob => [1,2,3,4,5].map(imp => {
                            const nivel = calcNivel(prob, imp);
                            const cnt   = riesgosModal.filter(r => r.probabilidad === prob && r.impacto === imp).length;
                            const col   = NIVEL_COLOR_INV[nivel];
                            return (
                              <div key={`${prob}-${imp}`}
                                className={`riesgos__matriz-celda riesgos__matriz-celda--${nivel}`}
                                onClick={() => cnt > 0 && setCeldaSelModal(celdaSelModal?.prob === prob && celdaSelModal?.imp === imp ? null : { prob, imp })}
                                style={{ cursor: cnt > 0 ? "pointer" : "default" }}
                                title={cnt > 0 ? `${cnt} riesgo(s)` : ""}>
                                {cnt > 0 && <span className="riesgos__matriz-badge" style={{ background: col.badge }}>{cnt}</span>}
                              </div>
                            );
                          }))}
                        </div>
                        <div className="riesgos__eje-x">
                          {[1,2,3,4,5].map(i => <div key={i} className="riesgos__eje-x-label">{IMP_L[i]}</div>)}
                          <div className="riesgos__eje-x-titulo">Impacto →</div>
                        </div>
                      </div>
                      <div className="riesgos__leyenda">
                        <span className="riesgos__leyenda-item riesgos__leyenda-item--bajo">Bajo (1–5)</span>
                        <span className="riesgos__leyenda-item riesgos__leyenda-item--medio">Medio (6–11)</span>
                        <span className="riesgos__leyenda-item riesgos__leyenda-item--alto">Alto (12–25)</span>
                      </div>
                      {celdaSelModal && celda.length > 0 && (
                        <div className="riesgos__celda-detalle">
                          <div className="riesgos__celda-detalle-title">
                            Prob {celdaSelModal.prob} × Impacto {celdaSelModal.imp}
                            <button className="riesgos__celda-cerrar" onClick={() => setCeldaSelModal(null)}>✕</button>
                          </div>
                          {celda.map(r => <TarjetaRiesgoInv key={r.id} riesgo={r} />)}
                        </div>
                      )}
                    </div>

                    {/* LISTA */}
                    <div className="riesgos__panel-lista" style={{ display:"flex", flexDirection:"column", minHeight:0 }}>
                      <div className="riesgos__panel-titulo-row">
                        <h3 className="riesgos__panel-titulo">Catálogo de riesgos</h3>
                        <div className="riesgos__filtros">
                          {["todos","alto","medio","bajo"].map(f => (
                            <button key={f}
                              className={`riesgos__filtro-btn ${filtroModal === f ? "activo" : ""} riesgos__filtro-btn--${f}`}
                              onClick={() => setFiltroModal(f)}>
                              {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="riesgos__lista" style={{ flex:1, minHeight:0, overflowY:"auto" }}>
                        {filtrados.map(r => <TarjetaRiesgoInv key={r.id} riesgo={r} />)}
                      </div>
                    </div>
                  </div>

                  {/* Alertas */}
                  {contAlto > 0 && (
                    <div className="riesgos__alertas">
                      <div className="riesgos__alertas-titulo"><AlertTriangle size={16}/> Alertas proactivas activas</div>
                      <div className="riesgos__alertas-lista">
                        {riesgosModal.filter(r => r.tipo === "alto").map(r => (
                          <div key={r.id} className="riesgos__alerta-item">
                            <span className="riesgos__alerta-dot" />
                            <strong>{r.nombre}</strong> — {r.tratamiento}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tarjeta de riesgo de solo lectura para el inversionista ── */
function TarjetaRiesgoInv({ riesgo }) {
  const [abierto, setAbierto] = useState(false);
  const col = NIVEL_COLOR_INV[riesgo.tipo];
  return (
    <div className="riesgos__tarjeta" style={{ background:col.bg, borderColor:col.border }}>
      <div className="riesgos__tarjeta-header" onClick={() => setAbierto(!abierto)}>
        <div className="riesgos__tarjeta-meta">
          <span className="riesgos__tarjeta-categoria">{riesgo.categoria}</span>
          <span className="riesgos__tarjeta-nivel" style={{ background:col.badge }}>{riesgo.tipo.toUpperCase()}</span>
        </div>
        <div className="riesgos__tarjeta-nombre-row">
          <span className="riesgos__tarjeta-nombre" style={{ color:col.text }}>{riesgo.nombre}</span>
          {abierto ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </div>
        <div className="riesgos__tarjeta-scores">
          <span>Prob: <strong>{riesgo.probabilidad}/5</strong></span>
          <span>Impacto: <strong>{riesgo.impacto}/5</strong></span>
          <span>Score: <strong>{riesgo.probabilidad * riesgo.impacto}/25</strong></span>
        </div>
      </div>
      {abierto && (
        <div className="riesgos__tarjeta-body">
          <p className="riesgos__tarjeta-desc">{riesgo.descripcion}</p>
          <div className="riesgos__tarjeta-tratamiento">
            <ShieldCheck size={14}/>
            <span>{riesgo.tratamiento}</span>
          </div>
        </div>
      )}
    </div>
  );
}

