// PaginaDashboardInversionista.jsx — Dashboard para inversionistas
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from "recharts";
import {
  Calendar, Folder, ArrowRight, TrendingUp,
  MessageSquare, FileText, CheckCircle, Mail, Phone, ExternalLink,
} from "lucide-react";
import { useContextoApp } from "../context/contexto_app";
import { useNavigate } from "react-router-dom";
import { listar_proyectos_api } from "../services/proyectos_api";
import { listar_solicitudes_por_inversionista_api } from "../services/solicitudes_api";
import { API_BASE_URL } from "../services/api_config";
import { apiFetch } from "../services/api_client";
import "./PaginaDashboard.css";
import "./Paginadashboardinversionista.css";
import "./PaginaMisSolicitudes.css";

const LABELS_MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const construir_base_grafica = () => {
  const actual = new Date();
  const base = [];
  for (let i = 2; i >= 0; i -= 1) {
    const fecha = new Date(actual.getFullYear(), actual.getMonth() - i, 1);
    base.push({
      key: `${fecha.getFullYear()}-${fecha.getMonth()}`,
      mes: LABELS_MESES[fecha.getMonth()],
      solicitudes: 0,
      inversiones: 0,
    });
  }
  return base;
};

const TooltipPersonalizado = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dashboard__tooltip">
      <p className="dashboard__tooltip-label">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="dashboard__tooltip-fila">
          <span
            className="dashboard__tooltip-dot"
            style={{ background: entry.dataKey === "solicitudes" ? "#1d86ee" : "#ff6b35" }}
          />
          <span className="dashboard__tooltip-nombre">{entry.name}</span>
          <span className="dashboard__tooltip-valor">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function PaginaDashboardInversionista() {
  const { datos_usuario, set_id_inversionista_activo, mostrar_notificacion, set_datos_contacto_temporario } = useContextoApp();
  const navigate = useNavigate();
  const [cargando, set_cargando] = useState(true);
  const [error, set_error] = useState("");
  const [proyectosDestacados, setProyectosDestacados] = useState([]);
  const [datosGrafica, setDatosGrafica] = useState(construir_base_grafica());
  const [inversionesAceptadas, setInversionesAceptadas] = useState([]);
  const [modalAcuerdoOpen, setModalAcuerdoOpen] = useState(false);
  const [solicitudAcuerdo, setSolicitudAcuerdo] = useState(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [solicitudDetalle, setSolicitudDetalle] = useState(null);
  const [proyectoDetalle, setProyectoDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  useEffect(() => {
    const inversionista_id = datos_usuario?.id;

    if (!inversionista_id) {
      setProyectosDestacados([]);
      setDatosGrafica(construir_base_grafica());
      set_cargando(false);
      return;
    }

    let activo = true;

    const cargar = async () => {
      set_cargando(true);
      set_error("");
      try {
        const proyectos = await listar_proyectos_api(null, null, inversionista_id);
        if (!activo) return;

        if (!Array.isArray(proyectos) || proyectos.length === 0) {
          setProyectosDestacados([]);
          setDatosGrafica(construir_base_grafica());
          return;
        }

        const ordenados = [...proyectos].sort((a, b) => {
          const fechaA = new Date(a.fecha_publicacion || a.creado_en || 0).getTime();
          const fechaB = new Date(b.fecha_publicacion || b.creado_en || 0).getTime();
          return fechaB - fechaA;
        });

        setProyectosDestacados(ordenados.slice(0, 3));

        try {
          const solicitudes = await listar_solicitudes_por_inversionista_api(inversionista_id);
          const base = construir_base_grafica();
          const indexByKey = new Map(base.map((item, idx) => [item.key, idx]));

          if (Array.isArray(solicitudes)) {
            solicitudes.forEach((solicitud) => {
              const fecha = new Date(solicitud.creada_en || 0);
              if (Number.isNaN(fecha.getTime())) return;
              const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;
              const pos = indexByKey.get(key);
              if (typeof pos === "undefined") return;
              base[pos].solicitudes += 1;
              base[pos].inversiones += Number(solicitud.monto_solicitado || 0);
            });

            // Guardar inversiones aceptadas para la sección "Mis Inversiones"
            const aceptadas = solicitudes.filter((s) => (s.estado || "").toLowerCase() === "aceptada");
            setInversionesAceptadas(aceptadas);
          }

          setDatosGrafica(base);
        } catch (_) {
          setDatosGrafica(construir_base_grafica());
        }
      } catch (e) {
        if (!activo) return;
        set_error(e.message || "No se pudo cargar los proyectos");
        setProyectosDestacados([]);
      } finally {
        if (activo) set_cargando(false);
      }
    };

    cargar();
    return () => { activo = false; };
  }, [datos_usuario?.id]);

  const formatearPresupuesto = (valor) => {
    if (!valor) return "$0";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const irAlChat = async (solicitud) => {
    console.debug('[PaginaDashboardInversionista] click Chat - solicitud:', solicitud);
    // Prioridad: emprendedor_contacto_id (calculado por backend) > firebase_uid > usuario_id
    let contactId = solicitud.emprendedor_contacto_id || solicitud.emprendedor_firebase_uid || solicitud.emprendedor_usuario_id;
    try {
      // Si tenemos un usuario_id pero no un firebase_uid, intentar resolver el firebase_uid
      if (contactId && !solicitud.emprendedor_firebase_uid && solicitud.emprendedor_usuario_id) {
        try {
          const resUsuario = await apiFetch(`${API_BASE_URL}/api/v1/usuarios/${encodeURIComponent(solicitud.emprendedor_usuario_id)}`);
          const datosUsuario = await resUsuario.json().catch(() => ({}));
          if (resUsuario.ok && datosUsuario?.ok && datosUsuario?.usuario?.firebase_uid) {
            contactId = datosUsuario.usuario.firebase_uid;
            console.debug('[PaginaDashboardInversionista] firebase_uid resuelto desde usuario:', contactId);
          }
        } catch (e) {
          console.debug('[PaginaDashboardInversionista] No se pudo resolver firebase_uid del usuario:', e);
        }
      }

      if (!contactId) {
        // Último recurso: obtener propietario del proyecto desde la API de proyectos
        const res = await apiFetch(`${API_BASE_URL}/api/v1/proyectos/${encodeURIComponent(solicitud.proyecto_id)}`);
        const pj = await res.json().catch(() => ({}));
        console.debug('[PaginaDashboardInversionista] proyecto fetch result:', { status: res.status, ok: res.ok, body: pj });
        if (res.ok && pj && pj.ok && pj.proyecto) {
          const propietarioId = pj.proyecto.propietario_id || pj.proyecto.propietarioId || null;
          if (propietarioId) {
            // Intentar resolver firebase_uid del propietario
            try {
              const resOwner = await apiFetch(`${API_BASE_URL}/api/v1/usuarios/${encodeURIComponent(propietarioId)}`);
              const datosOwner = await resOwner.json().catch(() => ({}));
              if (resOwner.ok && datosOwner?.ok && datosOwner?.usuario?.firebase_uid) {
                contactId = datosOwner.usuario.firebase_uid;
              } else {
                contactId = propietarioId;
              }
            } catch (e) {
              contactId = propietarioId;
            }
            console.debug('[PaginaDashboardInversionista] propietarioId encontrado:', contactId);
          }
        }
      }

      console.debug('[PaginaDashboardInversionista] contactId final:', contactId);
      if (contactId) {
        // Preparar datos temporales para el panel de mensajes
        try {
          if (set_datos_contacto_temporario) {
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
          }
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
  };

  const abrirDetalleProyecto = async (solicitud) => {
    setSolicitudDetalle(solicitud);
    setProyectoDetalle(null);
    setModalDetalleOpen(true);
    setCargandoDetalle(true);

    try {
      const res = await apiFetch(`${API_BASE_URL}/api/v1/proyectos/${encodeURIComponent(solicitud.proyecto_id)}`);
      const datos = await res.json().catch(() => ({}));
      if (res.ok && datos?.ok && datos?.proyecto) {
        setProyectoDetalle(datos.proyecto);
      } else {
        setProyectoDetalle(null);
      }
    } catch (err) {
      console.error("No se pudo cargar el detalle del proyecto:", err);
      setProyectoDetalle(null);
    } finally {
      setCargandoDetalle(false);
    }
  };

  return (
    <div className="dashboard inv">

      {/* ══ FILA 1: Gráfica full-width ══ */}
      <div className="inv__fila-grafica">
        <div className="dashboard__card-grafica inv__card-grafica">
          <div className="dashboard__card-titulo">
            <h3>Actividad de Inversiones</h3>
            <span className="dashboard__card-opciones">···</span>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={datosGrafica} barSize={22} barGap={6} barCategoryGap="28%">
              <defs>
                <linearGradient id="gradSol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#1d86ee" stopOpacity={1}   />
                  <stop offset="100%" stopColor="#0f5cb8" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#ff6b35" stopOpacity={1}   />
                  <stop offset="100%" stopColor="#cc4a1a" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "rgba(200,215,255,0.45)", fontSize: 11, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(200,215,255,0.35)", fontSize: 10 }} width={32} />
              <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: "rgba(29,134,238,0.06)", radius: 8 }} />
              <Bar dataKey="solicitudes" fill="url(#gradSol)" radius={[6,6,0,0]} name="Solicitudes" />
              <Bar dataKey="inversiones" fill="url(#gradInv)" radius={[6,6,0,0]} name="Monto (COP)" />
            </BarChart>
          </ResponsiveContainer>

          <div className="dashboard__grafica-leyenda">
            <span className="dashboard__grafica-leyenda-item dashboard__grafica-leyenda-item--azul">Solicitudes</span>
            <span className="dashboard__grafica-leyenda-item dashboard__grafica-leyenda-item--naranja">Inversiones</span>
          </div>
        </div>
      </div>

      {/* ══ FILA 2: Destacados (3 cards horizontales) ══ */}
      <div className="inv__seccion-titulo">
        <TrendingUp size={16} strokeWidth={2} />
        Proyectos Destacados
      </div>

      {error   && <p className="dashboard__error">{error}</p>}
      {cargando && (
        <div className="inv__carga-wrap" role="status" aria-live="polite">
          <div className="inv__carga-panel">
            <div className="inv__carga-orbita" aria-hidden="true">
              <span className="inv__carga-nucleo" />
              <span className="inv__carga-anillo inv__carga-anillo--uno" />
              <span className="inv__carga-anillo inv__carga-anillo--dos" />
            </div>
            <div className="inv__carga-texto">
              <p className="inv__carga-kicker">Proyectos</p>
              <strong>Cargando proyectos destacados…</strong>
              <span>Buscando oportunidades disponibles para ti</span>
            </div>
            <div className="inv__carga-barras" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      {!cargando && (
        <div className="inv__destacados">
          {proyectosDestacados.map((proyecto, idx) => (
            <div key={proyecto.id || idx} className="inv__destacado-card">
              {/* Número de ranking */}
              <span className="inv__ranking">#{idx + 1}</span>

              <div className="inv__destacado-header">
                <div className="inv__destacado-icono">
                  <Folder size={20} strokeWidth={1.6} />
                </div>
                <div className="inv__destacado-info">
                  <strong className="inv__destacado-nombre">
                    {proyecto.titulo || "Proyecto"}
                  </strong>
                  <span className="inv__destacado-desc">
                    {(proyecto.descripcion || "Sin descripción").substring(0, 60)}
                    {(proyecto.descripcion || "").length > 60 ? "…" : ""}
                  </span>
                </div>
              </div>

              <div className="inv__destacado-meta">
                <span className="inv__meta-fecha">
                  <Calendar size={11} strokeWidth={2} />
                  {new Date(proyecto.fecha_publicacion || proyecto.creado_en).toLocaleDateString()}
                </span>
                <span className="inv__meta-presupuesto">
                  {formatearPresupuesto(proyecto.presupuesto)}
                </span>
              </div>

              <button
                className="inv__btn-ver"
                onClick={() => navigate("/proyectos")}
              >
                Ver proyecto
                <ArrowRight size={13} strokeWidth={2.2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ══ FILA 4: Mis Inversiones (solicitudes aceptadas) ══ */}
      {!cargando && inversionesAceptadas.length > 0 && (
        <>
          <div className="inv__seccion-titulo inv__seccion-titulo--exito">
            <CheckCircle size={16} strokeWidth={2} />
            Mis Inversiones Activas
            <span className="inv__badge inv__badge--exito">{inversionesAceptadas.length}</span>
          </div>

          <div className="inv__inversiones-lista">
            {inversionesAceptadas.map((inv) => (
              <div key={inv.id} className="inv__inversion-card">
                <div className="inv__inversion-top">
                  <div className="inv__inversion-proyecto">
                    <Folder size={16} strokeWidth={1.6} />
                    <strong>{inv.proyecto_nombre || "Proyecto"}</strong>
                  </div>
                  <span className="inv__inversion-monto">
                    {formatearPresupuesto(inv.monto_solicitado)}
                  </span>
                </div>

                {/* Información del emprendedor */}
                <div className="inv__inversion-contacto">
                  {inv.emprendedor_nombre && (
                    <span className="inv__contacto-chip">
                      <Mail size={12} /> {inv.emprendedor_nombre}
                    </span>
                  )}
                  {inv.emprendedor_email && (
                    <a href={`mailto:${inv.emprendedor_email}`} className="inv__contacto-chip">
                      <Mail size={12} /> {inv.emprendedor_email}
                    </a>
                  )}
                  {inv.emprendedor_telefono && (
                    <a href={`tel:${inv.emprendedor_telefono}`} className="inv__contacto-chip">
                      <Phone size={12} /> {inv.emprendedor_telefono}
                    </a>
                  )}
                </div>

                <div className="inv__inversion-acciones">
                  <button
                    className="inv__inversion-btn inv__inversion-btn--chat"
                    onClick={() => irAlChat(inv)}
                    title="Chatear con el emprendedor"
                  >
                    <MessageSquare size={14} /> Chatear
                  </button>
                  <button
                    className="inv__inversion-btn inv__inversion-btn--acuerdo"
                    onClick={() => { setSolicitudAcuerdo(inv); setModalAcuerdoOpen(true); }}
                    title="Ver borrador de acuerdo"
                  >
                    <FileText size={14} /> Acuerdo
                  </button>
                  <button
                    className="inv__inversion-btn inv__inversion-btn--solicitudes"
                    onClick={() => abrirDetalleProyecto(inv)}
                    title="Ver detalle completo"
                  >
                    <ExternalLink size={14} /> Ver detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal: Detalle de inversión */}
      {modalDetalleOpen && solicitudDetalle && (
        <div className="mis-solicitudes__modal-overlay" onClick={() => setModalDetalleOpen(false)}>
          <div className="mis-solicitudes__modal-content inv__detalle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mis-solicitudes__modal-header no-print">
              <h2 className="mis-solicitudes__modal-title">📌 Detalle del proyecto</h2>
              <button className="mis-solicitudes__modal-close" onClick={() => setModalDetalleOpen(false)}>×</button>
            </div>

            <div className="mis-solicitudes__acuerdo-print-area">
              <div className="acuerdo__documento inv__detalle-documento">
                <div className="acuerdo__cabecera">
                  <h1>{proyectoDetalle?.titulo || solicitudDetalle.proyecto_nombre || "Proyecto"}</h1>
                  <p className="acuerdo__fecha">{proyectoDetalle?.sector ? `Sector: ${proyectoDetalle.sector}` : "Resumen del proyecto"}</p>
                </div>

                {cargandoDetalle ? (
                  <div className="acuerdo__seccion">
                    <p>Cargando datos del proyecto...</p>
                  </div>
                ) : (
                  <>
                    <div className="acuerdo__seccion">
                      <p>
                        Aquí puedes revisar el resumen del proyecto en el que ya invertiste, junto con el monto asociado a tu solicitud y los datos de contacto del emprendedor.
                      </p>
                    </div>

                    <div className="acuerdo__seccion">
                      <h3>1. RESUMEN DEL PROYECTO</h3>
                      <div className="acuerdo__partes-grid">
                        <div>
                          <p><strong>Proyecto:</strong> {proyectoDetalle?.titulo || solicitudDetalle.proyecto_nombre || "N/A"}</p>
                          <p><strong>Descripción:</strong> {proyectoDetalle?.descripcion || "Sin descripción disponible"}</p>
                          <p><strong>Presupuesto:</strong> {formatearPresupuesto(proyectoDetalle?.presupuesto)}</p>
                        </div>
                        <div>
                          <p><strong>Estado:</strong> {proyectoDetalle?.estado || "Activo"}</p>
                          <p><strong>Fecha de publicación:</strong> {proyectoDetalle?.fecha_publicacion ? new Date(proyectoDetalle.fecha_publicacion).toLocaleDateString("es-CO") : "N/A"}</p>
                          <p><strong>Mi inversión:</strong> COP ${solicitudDetalle.monto_solicitado?.toLocaleString("es-CO") || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="acuerdo__seccion">
                      <h3>2. CONTACTO DEL EMPRENDEDOR</h3>
                      <div className="acuerdo__partes-grid">
                        <div>
                          <p><strong>Nombre:</strong> {solicitudDetalle.emprendedor_nombre || "N/A"}</p>
                          <p><strong>Email:</strong> {solicitudDetalle.emprendedor_email || "N/A"}</p>
                        </div>
                        <div>
                          <p><strong>Teléfono:</strong> {solicitudDetalle.emprendedor_telefono || "N/A"}</p>
                          <p><strong>LinkedIn:</strong> {solicitudDetalle.emprendedor_linkedin || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {solicitudDetalle.propuesta && (
                      <div className="acuerdo__seccion">
                        <h3>3. PROPUESTA DEL EMPRENDEDOR</h3>
                        <p className="acuerdo__bloque-propuesta">"{solicitudDetalle.propuesta}"</p>
                      </div>
                    )}

                    <div className="acuerdo__seccion">
                      <h3>4. PRÓXIMOS PASOS</h3>
                      <p>
                        Puedes seguir la conversación con el emprendedor, revisar el acuerdo preliminar o volver al listado de solicitudes para explorar más contexto.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mis-solicitudes__modal-footer no-print">
              <button className="boton boton--secundario" onClick={() => setModalDetalleOpen(false)}>
                Cerrar
              </button>
              <button className="boton boton--primario" onClick={() => navigate("/solicitudes") }>
                <ExternalLink size={16} /> Ver solicitudes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Borrador de Acuerdo */}
      {modalAcuerdoOpen && solicitudAcuerdo && (
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
                  <p className="acuerdo__fecha">Fecha: {new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>

                <div className="acuerdo__seccion">
                  <p>El presente documento constituye un borrador de acuerdo preliminar de inversión que resume los términos y condiciones de buena fe bajo los cuales las partes manifiestan su interés en colaborar mutuamente en el desarrollo del proyecto.</p>
                </div>

                <div className="acuerdo__seccion">
                  <h3>1. PARTES CONTRATANTES</h3>
                  <div className="acuerdo__partes-grid">
                    <div>
                      <strong>EL EMPRENDEDOR:</strong>
                      <p>Nombre: {solicitudAcuerdo.emprendedor_nombre || "N/A"}</p>
                      <p>Email: {solicitudAcuerdo.emprendedor_email || "N/A"}</p>
                      <p>Teléfono: {solicitudAcuerdo.emprendedor_telefono || "N/A"}</p>
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
                  <p>El inversionista aportará la suma total de <strong>COP ${solicitudAcuerdo.monto_solicitado?.toLocaleString("es-CO") || 0}</strong> a favor del proyecto titulado <strong>"{solicitudAcuerdo.proyecto_nombre || "Proyecto"}"</strong>.</p>
                  <p>El emprendedor utilizará dichos recursos financieros única y exclusivamente para el desarrollo, ejecución técnica y aceleración comercial del citado proyecto.</p>
                </div>

                {solicitudAcuerdo.propuesta && (
                  <div className="acuerdo__seccion">
                    <h3>3. PROPUESTA Y CONDICIONES</h3>
                    <p className="acuerdo__bloque-propuesta">"{solicitudAcuerdo.propuesta}"</p>
                  </div>
                )}

                <div className="acuerdo__seccion">
                  <h3>4. CONFIDENCIALIDAD Y PRÓXIMOS PASOS</h3>
                  <p>Las partes se obligan recíprocamente a guardar confidencialidad absoluta sobre los datos, secretos comerciales y tecnológicos a los que tengan acceso.</p>
                  <p>A partir del presente borrador, las partes iniciarán la etapa de debida diligencia para formalizar y firmar el contrato definitivo de inversión en un plazo máximo de 30 días.</p>
                </div>

                <div className="acuerdo__firmas">
                  <div className="acuerdo__firma-bloque">
                    <div className="acuerdo__firma-linea"></div>
                    <p><strong>{solicitudAcuerdo.emprendedor_nombre || "El Emprendedor"}</strong></p>
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
              <button className="boton boton--secundario" onClick={() => setModalAcuerdoOpen(false)}>Cerrar</button>
              <button className="boton boton--primario" onClick={() => window.print()}>
                <FileText size={16} /> Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
