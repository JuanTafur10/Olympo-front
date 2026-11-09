// PaginaDashboard.jsx — Dashboard principal del emprendedor
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import {
  AlertTriangle, TrendingUp, Edit3, MessageSquare,
  Eye, Calendar, Folder, CheckCircle2, Clock3, BarChart3, X,
} from "lucide-react";
import { useContextoApp } from "../context/contexto_app";
import { useNavigate } from "../hooks/useNavigate";
import { listar_proyectos_api } from "../services/proyectos_api";
import { listar_solicitudes_por_proyecto_api } from "../services/solicitudes_api";
import "./PaginaDashboard.css";

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

/* ── Tooltip personalizado ── */
const TooltipPersonalizado = ({ active, payload, label }) => {
  const { configuracion_global } = useContextoApp();
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
          <span className="dashboard__tooltip-valor">
            {entry.dataKey === "inversiones" && !configuracion_global.mostrar_saldos 
              ? "****" 
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const formatear_analisis_ia = (texto) => {
  const lineas = String(texto ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);

  const resumen = [];
  const puntos = [];
  let modo = "inicio";
  let itemActual = null;

  const cerrarItem = () => {
    if (!itemActual) return;
    puntos.push({
      ...itemActual,
      descripcion: itemActual.descripcion.join(" ").trim(),
    });
    itemActual = null;
  };

  lineas.forEach((linea) => {
    const encabezado = linea.replace(/\*\*/g, "").toLowerCase();
    const itemCoincide = linea.match(/^\d+\.\s*\*\*(.+?)\*\*:\s*(\d+)\/10\s*$/);

    if (encabezado === "resumen ejecutivo") {
      modo = "resumen";
      return;
    }

    if (encabezado === "desglose de puntajes") {
      if (itemActual) cerrarItem();
      modo = "puntos";
      return;
    }

    if (itemCoincide) {
      cerrarItem();
      modo = "item";
      itemActual = {
        titulo: itemCoincide[1].replace(/\*\*/g, "").trim(),
        score: Number(itemCoincide[2]),
        descripcion: [],
      };
      return;
    }

    if (modo === "resumen") {
      resumen.push(linea.replace(/\*\*/g, ""));
      return;
    }

    if (modo === "item" && itemActual) {
      itemActual.descripcion.push(linea.replace(/\*\*/g, ""));
    }
  });

  cerrarItem();

  return {
    resumen: resumen.join(" ").trim(),
    puntos,
  };
};

export default function PaginaDashboard() {
  const { datos_usuario, configuracion_global } = useContextoApp();
  const navigate = useNavigate();
  const [cargando, set_cargando] = useState(true);
  const [error, set_error] = useState("");
  const [proyectoPrincipal, setProyectoPrincipal] = useState(null);
  const [proyectosConAnalisis, setProyectosConAnalisis] = useState([]);
  const [proyectoAnalisisActivo, setProyectoAnalisisActivo] = useState(null);
  const [datosGrafica, setDatosGrafica] = useState(construir_base_grafica());
  const [modalAnalisisOpen, setModalAnalisisOpen] = useState(false);
  const [modalProyeccionOpen, setModalProyeccionOpen] = useState(false);
  const [proyeccionCargando] = useState(false);
  const [proyeccionData] = useState(null);

  useEffect(() => {
    const propietario_id = datos_usuario?.id ?? datos_usuario?.id_usuario ?? null;
    const propietario_email = datos_usuario?.email ?? datos_usuario?.email_usuario ?? null;

    if (!propietario_id && !propietario_email) {
      setProyectoPrincipal(null);
      setProyectosConAnalisis([]);
      setProyectoAnalisisActivo(null);
      setDatosGrafica(construir_base_grafica());
      set_cargando(false);
      return;
    }

    let activo = true;

    const cargar = async () => {
      set_cargando(true);
      set_error("");
      try {
        const proyectos = await listar_proyectos_api(propietario_id, propietario_email);
        if (!activo) return;

        if (!Array.isArray(proyectos) || proyectos.length === 0) {
          setProyectoPrincipal(null);
          setProyectosConAnalisis([]);
          setProyectoAnalisisActivo(null);
          setDatosGrafica(construir_base_grafica());
          return;
        }

        const ordenados = [...proyectos].sort((a, b) => {
          const fechaA = new Date(a.fecha_publicacion || a.creado_en || 0).getTime();
          const fechaB = new Date(b.fecha_publicacion || b.creado_en || 0).getTime();
          return fechaB - fechaA;
        });

        const principal = ordenados[0];

        const solicitudesPorProyecto = await Promise.all(
          ordenados.map(async (proyecto) => {
            try {
              const solicitudes = await listar_solicitudes_por_proyecto_api(proyecto.id);
              return { proyectoId: proyecto.id, solicitudes };
            } catch (_) {
              return { proyectoId: proyecto.id, solicitudes: [] };
            }
          })
        );

        if (!activo) return;

        const totalSolicitudesPrincipal = (
          solicitudesPorProyecto.find((item) => item.proyectoId === principal.id)?.solicitudes || []
        ).length;

        setProyectoPrincipal({
          id: principal.id,
          nombre: principal.titulo || principal.nombre_proyecto || "Proyecto",
          descripcion: principal.descripcion || principal.descripcion_proyecto || "Sin descripción",
          fecha: principal.fecha_publicacion || principal.creado_en,
          solicitudes: totalSolicitudesPrincipal,
          vistas: principal.solicitudes || totalSolicitudesPrincipal || 0,
          analisis_ai: principal.analisis_ai || null,
        });

        const listaAnalisis = ordenados
          .filter((proyecto) => String(proyecto.analisis_ai ?? "").trim())
          .map((proyecto) => ({
            id: proyecto.id,
            titulo: proyecto.titulo || proyecto.nombre_proyecto || "Proyecto",
            analisis_ai: proyecto.analisis_ai,
          }));
        setProyectosConAnalisis(listaAnalisis);
        setProyectoAnalisisActivo((actual) => {
          if (listaAnalisis.length === 0) return null;
          const existe = actual && listaAnalisis.some((proyecto) => String(proyecto.id) === String(actual.id));
          return existe ? actual : listaAnalisis[0];
        });

        const base = construir_base_grafica();
        const indexByKey = new Map(base.map((item, idx) => [item.key, idx]));

        ordenados.forEach((proyecto) => {
          const fecha = new Date(proyecto.fecha_publicacion || proyecto.creado_en || 0);
          if (Number.isNaN(fecha.getTime())) return;
          const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;
          const pos = indexByKey.get(key);
          if (typeof pos === "undefined") return;
          base[pos].inversiones += Number(proyecto.presupuesto || 0);
        });

        solicitudesPorProyecto.forEach(({ solicitudes }) => {
          solicitudes.forEach((solicitud) => {
            const fecha = new Date(solicitud.creada_en || 0);
            if (Number.isNaN(fecha.getTime())) return;
            const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;
            const pos = indexByKey.get(key);
            if (typeof pos === "undefined") return;
            base[pos].solicitudes += 1;
          });
        });

        setDatosGrafica(base);
      } catch (e) {
        if (!activo) return;
        set_error(e.message || "No se pudo cargar el dashboard");
        setProyectoPrincipal(null);
        setProyectosConAnalisis([]);
        setProyectoAnalisisActivo(null);
        setDatosGrafica(construir_base_grafica());
      } finally {
        if (activo) set_cargando(false);
      }
    };

    cargar();
    return () => { activo = false; };
  }, [datos_usuario?.id, datos_usuario?.id_usuario, datos_usuario?.email, datos_usuario?.email_usuario]);

  const fechaPrincipal = useMemo(() => {
    if (!proyectoPrincipal?.fecha) return "Sin fecha";
    const fecha = new Date(proyectoPrincipal.fecha);
    if (Number.isNaN(fecha.getTime())) return "Sin fecha";
    return fecha.toLocaleDateString();
  }, [proyectoPrincipal?.fecha]);

  const obtenerResumenProyecto = (texto, limite = 120) => {
    const contenido = String(texto ?? "").replace(/\s+/g, " ").trim();
    if (!contenido) return "Sin descripción disponible";
    if (contenido.length <= limite) return contenido;
    return `${contenido.slice(0, limite).trimEnd()}...`;
  };

  const analisisFormateado = useMemo(
    () => formatear_analisis_ia(proyectoAnalisisActivo?.analisis_ai),
    [proyectoAnalisisActivo?.analisis_ai]
  );

  const hayAnalisisDisponibles = proyectosConAnalisis.length > 0;

  return (
    <div className="dashboard">

      {/* ── Fila superior: Mi Proyecto + Gráfica ── */}
      <div className="dashboard__fila-superior">

        {/* Card Mi Proyecto */}
        <div className="dashboard__card-proyecto">
          <div className="dashboard__card-titulo">
            <h3>Mi Proyecto</h3>
          </div>

          {error   && <p className="dashboard__error">{error}</p>}
          {cargando && <p className="dashboard__loading">Cargando dashboard...</p>}

          {/* Thumbnail */}
          <div className="dashboard__proyecto-thumb">
            <div className="dashboard__proyecto-info">
              <span className="dashboard__proyecto-label">
                {proyectoPrincipal?.nombre || "SIN PROYECTOS"}
              </span>
              <span
                className="dashboard__proyecto-label"
                title={proyectoPrincipal?.descripcion || "Crea tu primer proyecto"}
              >
                {obtenerResumenProyecto(proyectoPrincipal?.descripcion || "Crea tu primer proyecto")}
              </span>
            </div>
            <div className="dashboard__proyecto-avatar">
              <Folder size={26} strokeWidth={1.6} />
            </div>
            <div className="dashboard__proyecto-footer">
              <span className="dashboard__proyecto-fecha">
                <Calendar size={12} strokeWidth={2} style={{ marginRight: 4, opacity: .8 }} />
                {fechaPrincipal}
              </span>
              <button
                className="dashboard__ver-mas"
                onClick={() => navigate("/proyectos")}
              >
                Ver detalles
              </button>
            </div>
          </div>

          {/* Solicitudes */}
          <div className="dashboard__solicitudes">
            <p>
              <strong className="dashboard__solicitudes-label">SOLICITUDES:</strong>{" "}
              <strong>{proyectoPrincipal?.solicitudes || 0}</strong>
            </p>
            <button className="dashboard__link" onClick={() => navigate("/mensajes")}>
              <MessageSquare size={13} strokeWidth={2} />
              Comentarios
            </button>
            <button className="dashboard__link" onClick={() => {}}>
              <Eye size={13} strokeWidth={2} />
              Vistas: {configuracion_global.mostrar_saldos ? (proyectoPrincipal?.vistas || 0) : "****"}
            </button>
          </div>

          {/* Botón editar */}
          <button className="dashboard__boton-editar" onClick={() => navigate("/proyectos")}>
            <Edit3 size={15} strokeWidth={2.2} />
            EDITAR
          </button>
        </div>

        {/* ── Gráfica de barras ── */}
        <div className="dashboard__card-grafica">
          <div className="dashboard__card-titulo">
            <h3>Actividad</h3>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datosGrafica} barSize={22} barGap={6} barCategoryGap="28%">

              <defs>
                <linearGradient id="gradSolicitudes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#1d86ee" stopOpacity={1}   />
                  <stop offset="100%" stopColor="#0f5cb8" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="gradInversiones" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#ff6b35" stopOpacity={1}   />
                  <stop offset="100%" stopColor="#cc4a1a" stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "rgba(200,215,255,0.45)", fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "rgba(200,215,255,0.35)" }}
                width={32}
              />
              <Tooltip content={<TooltipPersonalizado />} cursor={{ fill: "rgba(29,134,238,0.06)", radius: 8 }} />
              <Bar dataKey="solicitudes" fill="url(#gradSolicitudes)" radius={[6,6,0,0]} name="Solicitudes" />
              <Bar dataKey="inversiones" fill="url(#gradInversiones)" radius={[6,6,0,0]} name="Inversiones" />

            </BarChart>
          </ResponsiveContainer>

          {/* Leyenda */}
          <div className="dashboard__grafica-leyenda">
            <span className="dashboard__grafica-leyenda-item dashboard__grafica-leyenda-item--azul">
              Solicitudes
            </span>
            <span className="dashboard__grafica-leyenda-item dashboard__grafica-leyenda-item--naranja">
              Inversiones ({configuracion_global.moneda})
            </span>
          </div>
        </div>
      </div>

      {/* ── Fila inferior: Riesgos + Proyección ── */}
      <div className="dashboard__fila-inferior">

        <div className="dashboard__card-riesgo" onClick={() => navigate("/riesgos") }>
          <div className="dashboard__riesgo-icono">
            <AlertTriangle size={34} strokeWidth={1.6} />
          </div>
          <span className="dashboard__riesgo-label">RIESGOS</span>
          <span className="dashboard__riesgo-sub">Matriz probabilidad × impacto</span>
        </div>

        <div className="dashboard__card-proyeccion" onClick={() => navigate("/proyecciones") }>
        
          <div className="dashboard__proyeccion-icono">
            <TrendingUp size={34} strokeWidth={1.6} />
          </div>
          <span className="dashboard__proyeccion-label">Proyección</span>
          <span className="dashboard__proyeccion-sub">Estimación de crecimiento</span>
        </div>

        {/* Card Viabilidad IA */}
        <div
          className={`dashboard__card-ia${cargando ? " dashboard__card-ia--cargando" : ""}`}
          onClick={() => {
            if (cargando) {
              setModalAnalisisOpen(true);
              return;
            }

            if (hayAnalisisDisponibles) {
              setModalAnalisisOpen(true);
              return;
            }

            navigate("/proyectos");
          }}
        >
          <div className={`dashboard__ia-icono${cargando ? " dashboard__ia-icono--cargando" : ""}`}>
            {cargando ? (
              <span className="dashboard__ia-loader" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            ) : hayAnalisisDisponibles ? (
              <CheckCircle2 size={34} strokeWidth={1.6} />
            ) : (
              <Clock3 size={34} strokeWidth={1.6} />
            )}
          </div>
          <span className="dashboard__ia-label">VIABILIDAD IA</span>
          {!cargando && (
            <span className="dashboard__ia-sub">
              {hayAnalisisDisponibles
                ? "Análisis técnico completado"
                : proyectoPrincipal ? "Análisis en progreso..." : "Sin proyectos activos"}
            </span>
          )}
        </div>
      </div>

      {/* Modal de Análisis IA (Dashboard) */}
      {modalAnalisisOpen && (
        <div className="dashboard__analisis-overlay" onClick={() => setModalAnalisisOpen(false)}>
          <div className="dashboard__analisis-modal" onClick={(evento) => evento.stopPropagation()}>
            <div className="dashboard__analisis-header">
              <div className="dashboard__analisis-titulos">
                <span className="dashboard__analisis-chip">IA</span>
                <h2 className="dashboard__analisis-titulo">
                  <BarChart3 size={22} strokeWidth={2} />
                  Análisis de Viabilidad
                </h2>
                <p className="dashboard__analisis-subtitulo">
                  Elige el proyecto que quieres revisar.
                </p>
              </div>
              <button
                onClick={() => setModalAnalisisOpen(false)}
                className="dashboard__analisis-cerrar"
                aria-label="Cerrar análisis IA"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="dashboard__analisis-cuerpo">
              {cargando && !hayAnalisisDisponibles ? (
                <section className="dashboard__analisis-loading" aria-live="polite">
                  <div className="dashboard__analisis-spinner" aria-hidden="true" />
                  <p className="dashboard__analisis-loading-text">Cargando viabilidad del proyecto...</p>
                  <span className="dashboard__analisis-loading-sub">Estamos buscando los proyectos con análisis IA.</span>
                </section>
              ) : hayAnalisisDisponibles ? (
                <>
                  <section className="dashboard__analisis-selector">
                    <div className="dashboard__analisis-etiqueta">Proyecto a visualizar</div>
                    <select
                      className="dashboard__analisis-select"
                      value={proyectoAnalisisActivo?.id ?? ""}
                      onChange={(evento) => {
                        const siguiente = proyectosConAnalisis.find((proyecto) => String(proyecto.id) === String(evento.target.value));
                        if (siguiente) setProyectoAnalisisActivo(siguiente);
                      }}
                    >
                      {proyectosConAnalisis.map((proyecto) => (
                        <option key={proyecto.id} value={proyecto.id}>
                          {proyecto.titulo}
                        </option>
                      ))}
                    </select>
                  </section>

                  <section className="dashboard__analisis-resumen">
                    <div className="dashboard__analisis-etiqueta">Resumen Ejecutivo</div>
                    <p>
                      {analisisFormateado.resumen || proyectoAnalisisActivo?.analisis_ai || "Sin análisis disponible."}
                    </p>
                  </section>

                  {analisisFormateado.puntos.length > 0 && (
                    <section className="dashboard__analisis-grid">
                      <div className="dashboard__analisis-etiqueta">Desglose de Puntajes</div>
                      <div className="dashboard__analisis-lista">
                        {analisisFormateado.puntos.map((punto, indice) => (
                          <article className="dashboard__analisis-item" key={`${punto.titulo}-${indice}`}>
                            <div className="dashboard__analisis-item-header">
                              <h3>{punto.titulo}</h3>
                              <span className="dashboard__analisis-score">{punto.score}/10</span>
                            </div>
                            {punto.descripcion && <p>{punto.descripcion}</p>}
                            <div className="dashboard__analisis-barra" aria-hidden="true">
                              <span style={{ width: `${Math.max(0, Math.min(100, punto.score * 10))}%` }} />
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <section className="dashboard__analisis-vacio">
                  <div className="dashboard__analisis-vacio-icono" aria-hidden="true">
                    <Clock3 size={28} strokeWidth={1.8} />
                  </div>
                  <p className="dashboard__analisis-vacio-titulo">No hay viabilidad disponible todavía</p>
                  <span className="dashboard__analisis-vacio-texto">Crea o abre un proyecto con análisis IA para verlo aquí.</span>
                  <button
                    type="button"
                    className="dashboard__analisis-vacio-boton"
                    onClick={() => {
                      setModalAnalisisOpen(false);
                      navigate("/proyectos");
                    }}
                  >
                    Ir a Proyectos
                  </button>
                </section>
              )}
            </div>

            <div className="dashboard__analisis-footer">
              <button
                onClick={() => setModalAnalisisOpen(false)}
                className="dashboard__analisis-boton"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Proyección */}
      {modalProyeccionOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}>
          <div style={{ width: 900, maxHeight: "85vh", background: "white", borderRadius: 16, padding: 24, overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, color: "#1e3d7b" }}>Proyección del proyecto</h2>
              <div>
                <button onClick={() => setModalProyeccionOpen(false)} style={{ marginRight: 8 }} className="boton">Cerrar</button>
              </div>
            </div>

            {proyeccionCargando && <p>Cargando proyección...</p>}
            {!proyeccionCargando && !proyeccionData && <p>No hay datos de proyección disponibles.</p>}

            {!proyeccionCargando && proyeccionData && (
              <div style={{ height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...proyeccionData.historico, ...proyeccionData.proyectado]}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.04)" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="solicitudes" stroke="#1d86ee" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="inversiones_monto" stroke="#ff6b35" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 12 }}>
                  <strong>Últimas solicitudes:</strong> {proyeccionData.metrica?.ultima_solicitudes ?? 0} &nbsp;•&nbsp;
                  <strong>Último monto invertido:</strong> {proyeccionData.metrica?.ultima_inversiones_monto ?? 0}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
