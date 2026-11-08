// PaginaProyectosInversionista.jsx — Exploración de proyectos para inversionistas
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, ShieldAlert, X, AlertTriangle, Zap, ShieldCheck, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { useContextoApp } from "../context/contexto_app";
import { useNavigate } from "react-router-dom";
import { listar_proyectos_api } from "../services/proyectos_api";
import { obtener_usuario_por_id_api } from "../services/auth_api";
import { crear_solicitud_api } from "../services/solicitudes_api";
import {
  obtener_riesgos_detectados_ares,
  detectar_riesgos_ares,
  listar_riesgos_personalizados_ares,
} from "../services/chatbot_api";
import "./PaginaProyectos.css";
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

const formatearAnalisisIA = (texto) => {
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

export default function PaginaProyectosInversionista() {
  const { datos_usuario, mostrar_notificacion, set_id_inversionista_activo, set_datos_contacto_temporario, configuracion_global } = useContextoApp();
  const navigate = useNavigate();
  const [proyectos_visibles, set_proyectos_visibles] = useState([]);
  const [filtro_activo, set_filtro_activo] = useState("recientes");
  const [esta_expandido, set_esta_expandido] = useState(false);
  const [cargando, set_cargando] = useState(true);
  const [error, set_error] = useState("");
  const [busqueda, set_busqueda] = useState("");

  const cantidad_visible = esta_expandido ? proyectos_visibles.length : 6;

  const [modalOpen, setModalOpen] = useState(false);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [formSolicitud, setFormSolicitud] = useState({
    monto_solicitado: "",
    propuesta: "",
  });
  const [saving, setSaving] = useState(false);
  const [modalAnalisisOpen, setModalAnalisisOpen] = useState(false);
  const [analisisSeleccionado, setAnalisisSeleccionado] = useState(null);

  const analisisFormateado = useMemo(() => {
    if (!analisisSeleccionado) return { resumen: "", puntos: [] };
    return formatearAnalisisIA(analisisSeleccionado.analisis_ai);
  }, [analisisSeleccionado]);

  // ── Estado del modal de riesgos ──
  const [modalRiesgosOpen, setModalRiesgosOpen] = useState(false);
  const [proyectoRiesgos, setProyectoRiesgos] = useState(null);
  const [riesgosModal, setRiesgosModal] = useState([]);
  const [cargandoRiesgos, setCargandoRiesgos] = useState(false);
  const [aresEvaluadoModal, setAresEvaluadoModal] = useState(false);
  const [celdaSelModal, setCeldaSelModal] = useState(null);
  const [filtroModal, setFiltroModal] = useState("todos");

  const openModalSolicitud = (proyecto) => {
    setProyectoSeleccionado(proyecto);
    setFormSolicitud({ monto_solicitado: "", propuesta: "" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setProyectoSeleccionado(null);
  };

  // ── Abrir modal de riesgos ──
  const abrirModalRiesgos = async (proyecto) => {
    setProyectoRiesgos(proyecto);
    setRiesgosModal([]);
    setAresEvaluadoModal(false);
    setCeldaSelModal(null);
    setFiltroModal("todos");
    setModalRiesgosOpen(true);

    if (!proyecto.propietario_id) {
      mostrar_notificacion("warning", "El proyecto no tiene un propietario asignado.");
      return;
    }

    setCargandoRiesgos(true);
    try {
      // 1. Intentar cargar riesgos detectados por Ares
      const detectadosCache = await obtener_riesgos_detectados_ares(proyecto.id, proyecto.propietario_id);

      // 2. Intentar cargar riesgos personalizados
      let personalizados = [];
      try {
        personalizados = await listar_riesgos_personalizados_ares(proyecto.id, proyecto.propietario_id);
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

  // Refrescar riesgos modal cuando otro componente actualice la cache local
  useEffect(() => {
    const handler = async (e) => {
      try {
        const detail = e?.detail || {};
        if (!modalRiesgosOpen || !proyectoRiesgos) return;
        if (String(detail.proyectoId) !== String(proyectoRiesgos.id)) return;
        // Re-cargar riesgos para el modal afectado
        setCargandoRiesgos(true);
        try {
          const detectadosCache = await obtener_riesgos_detectados_ares(proyectoRiesgos.id, proyectoRiesgos.propietario_id);
          let personalizados = [];
          try {
            personalizados = await listar_riesgos_personalizados_ares(proyectoRiesgos.id, proyectoRiesgos.propietario_id);
          } catch (_err) {}
          const detectadosNorm = detectadosCache && Array.isArray(detectadosCache.riesgos) ? normalizarRiesgosDetectados(detectadosCache.riesgos) : [];
          const personalizadosNorm = normalizarRiesgosPersonalizados(personalizados);
          const fusionados = fusionarRiesgos(personalizadosNorm, detectadosNorm);
          setRiesgosModal(fusionados);
        } finally {
          setCargandoRiesgos(false);
        }
      } catch (_) {}
    };
    window.addEventListener("olympo:riesgos:updated", handler);
    return () => window.removeEventListener("olympo:riesgos:updated", handler);
  }, [modalRiesgosOpen, proyectoRiesgos]);

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

  const handleContactarDueno = async (proyecto) => {
    if (!proyecto.propietario_id) {
      mostrar_notificacion("error", "No se puede establecer contacto con el dueño del proyecto");
      return;
    }

    try {
      // Obtener los datos completos del dueño del proyecto
      const dueno = await obtener_usuario_por_id_api(proyecto.propietario_id);

      const nombre_dueno = dueno.nombre_usuario || dueno.nombre || "Dueño del Proyecto";
      
      // Guardar datos del contacto temporario para que PaginaMensajes pueda usarlo
      const contactId = String(dueno.firebase_uid ?? dueno.id ?? dueno.email ?? proyecto.propietario_id);
      set_datos_contacto_temporario({
        id_contacto: contactId,
        id_chat: contactId,
        firebase_uid_contacto: contactId,
        usuario_id_contacto: dueno.id ?? dueno.id_usuario ?? null,
        nombre_contacto: nombre_dueno,
        rol_contacto: "emprendedor",
        estado_contacto: dueno.esta_activo ? "activo" : "inactivo",
        detalle_contacto: `Proyecto: ${proyecto.titulo}`,
        foto_perfil: dueno.foto_perfil || null,
      });
      
      set_id_inversionista_activo(contactId);
      navigate("/mensajes");
      mostrar_notificacion("success", `Abriendo chat con ${nombre_dueno}...`);
    } catch (err) {
      mostrar_notificacion("error", err.message || "No se pudo abrir el chat");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormSolicitud((s) => ({ ...s, [name]: value }));
  };

  const handleSaveSolicitud = async () => {
    if (!formSolicitud.monto_solicitado || !formSolicitud.propuesta.trim()) {
      mostrar_notificacion("error", "Por favor completa todos los campos");
      return;
    }

    const monto = Number(formSolicitud.monto_solicitado);
    if (!Number.isFinite(monto) || monto <= 0) {
      mostrar_notificacion("error", "Ingresa un monto válido");
      return;
    }

    setSaving(true);
    try {
      await crear_solicitud_api({
        proyecto_id: proyectoSeleccionado.id,
        inversionista_id: datos_usuario.id,
        monto_solicitado: monto,
        propuesta: formSolicitud.propuesta,
      });

      mostrar_notificacion("success", "Solicitud creada exitosamente");
      closeModal();
      // Recargar proyectos
      const proyectos_db = await listar_proyectos_api(null, null, datos_usuario.id);
      set_proyectos_visibles(proyectos_db);
    } catch (err) {
      mostrar_notificacion("error", err.message || "No se pudo crear la solicitud");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      set_cargando(true);
      set_error("");
      try {
        // Cargar todos los proyectos (no filtrados por propietario)
        const proyectos_db = await listar_proyectos_api(null, null, datos_usuario.id);
        if (!activo) return;

        set_proyectos_visibles(proyectos_db || []);
      } catch (err) {
        if (!activo) return;
        set_error(err.message || "No se pudieron cargar los proyectos");
        set_proyectos_visibles([]);
      } finally {
        if (activo) set_cargando(false);
      }
    };

    cargar();
    return () => { activo = false; };
  }, [datos_usuario.id]);

  const proyectos_filtrados = useMemo(() => {
    let resultado = [...proyectos_visibles];

    // Aplicar búsqueda
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(
        (p) =>
          (p.titulo || "").toLowerCase().includes(busquedaLower) ||
          (p.descripcion || "").toLowerCase().includes(busquedaLower)
      );
    }

    // Aplicar ordenamiento
    if (filtro_activo === "presupuesto-alto") {
      resultado.sort((a, b) => (b.presupuesto || 0) - (a.presupuesto || 0));
    } else if (filtro_activo === "presupuesto-bajo") {
      resultado.sort((a, b) => (a.presupuesto || 0) - (b.presupuesto || 0));
    } else if (filtro_activo === "con-ia") {
      resultado = resultado.filter(p => p.analisis_ai);
      resultado.sort((a, b) => {
        const fechaA = new Date(a.fecha_publicacion || a.creado_en || 0).getTime();
        const fechaB = new Date(b.fecha_publicacion || b.creado_en || 0).getTime();
        return fechaB - fechaA;
      });
    } else {
      // "recientes" es el default
      resultado.sort((a, b) => {
        const fechaA = new Date(a.fecha_publicacion || a.creado_en || 0).getTime();
        const fechaB = new Date(b.fecha_publicacion || b.creado_en || 0).getTime();
        return fechaB - fechaA;
      });
    }

    return resultado;
  }, [proyectos_visibles, busqueda, filtro_activo]);

  const proyectos_mostrados = proyectos_filtrados.slice(0, cantidad_visible);

  const formatearPresupuesto = (valor) => {
    if (!valor) return "$0";
    if (!configuracion_global.mostrar_saldos) return "****";
    
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: configuracion_global.moneda || "COP",
      maximumFractionDigits: 0,
    }).format(valor);
  };

  return (
    <div className="pagina-proyectos" role="main" aria-label="Explorar proyectos de inversión">
      {/* Header */}
      <div className="proyectos__header">
        <div>
          <h1>Explorar Proyectos</h1>
          <p className="proyectos__subtitulo">Descubre proyectos para invertir</p>
        </div>
      </div>

      {/* Controles de filtro */}
      <div className="proyectos__controles" role="search" aria-label="Buscar y filtrar proyectos">
        <input
          type="search"
          placeholder="Buscar proyectos..."
          value={busqueda}
          onChange={(e) => set_busqueda(e.target.value)}
          className="proyectos__busqueda"
          aria-label="Buscar proyectos por nombre o descripción"
        />
        <div className="proyectos__filtros" role="group" aria-label="Filtros de ordenamiento">
          {["recientes", "presupuesto-alto", "presupuesto-bajo", "con-ia"].map((filtro) => (
            <button
              key={filtro}
              className={`proyectos__filtro ${
                filtro_activo === filtro ? "proyectos__filtro--activo" : ""
              }`}
              onClick={() => set_filtro_activo(filtro)}
              aria-pressed={filtro_activo === filtro}
              aria-label={`Ordenar por: ${
                filtro === "recientes" ? "más recientes"
                : filtro === "presupuesto-alto" ? "mayor presupuesto"
                : filtro === "presupuesto-bajo" ? "menor presupuesto"
                : "con análisis IA"
              }`}
            >
              {filtro === "recientes"
                ? "Recientes"
                : filtro === "presupuesto-alto"
                ? "Mayor presupuesto"
                : filtro === "presupuesto-bajo"
                ? "Menor presupuesto"
                : "Con Análisis IA"}
            </button>
          ))}
        </div>
      </div>

      {/* Mensajes de estado */}
      {error && <p className="proyectos__error" role="alert" aria-live="assertive">{error}</p>}

      {/* Skeleton de carga */}
      {cargando && (
        <div aria-label="Cargando proyectos" aria-busy="true" role="status">
          <div className="proyectos__carga-panel">
            <div className="proyectos__carga-orbita" aria-hidden="true">
              <span className="proyectos__carga-orbita-nucleo" />
              <span className="proyectos__carga-orbita-anillo proyectos__carga-orbita-anillo--uno" />
              <span className="proyectos__carga-orbita-anillo proyectos__carga-orbita-anillo--dos" />
            </div>

            <div className="proyectos__carga-texto">
              <p className="proyectos__carga-kicker">Analizando oportunidades</p>
              <strong>Cargando proyectos destacados</strong>
              <span>Estamos encontrando oportunidades disponibles para invertir</span>
            </div>

            <div className="proyectos__carga-barras" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="proyectos__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card" aria-hidden="true">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="skeleton skeleton--titulo" style={{ width: "60%" }} />
                <div className="skeleton skeleton--badge" />
              </div>
              <div className="skeleton skeleton--parrafo" />
              <div className="skeleton skeleton--parrafo" style={{ width: "75%" }} />
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <div className="skeleton skeleton--meta" />
                <div className="skeleton skeleton--meta" />
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="skeleton skeleton--boton" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="skeleton skeleton--boton" style={{ height: 40 }} />
                <div className="skeleton skeleton--boton" style={{ height: 40 }} />
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* Grid de proyectos */}
      {!cargando && (
      <div
        className="proyectos__grid"
        role="list"
        aria-label={`${proyectos_mostrados.length} proyectos encontrados`}
      >
        {proyectos_mostrados.map((proyecto, idx) => {
          const estadoProyecto = String(proyecto.estado || "activo").toLowerCase();
          const esActivo = estadoProyecto === "activo";

          return (
          <div
            key={proyecto.id}
            className="proyectos__card proyectos__card--animada"
            role="listitem"
            aria-label={`Proyecto: ${proyecto.titulo}`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="proyectos__card-header">
              <h3>{proyecto.titulo}</h3>
              <span
                className={`proyectos__estado proyectos__estado--${esActivo ? "activo" : "inactivo"}`}
                aria-label={`Estado: ${esActivo ? "Activo" : "Inactivo"}`}
              >
                {esActivo ? "Activo" : "Inactivo"}
              </span>
            </div>

            <p className="proyectos__descripcion">
              {proyecto.descripcion || "Sin descripción disponible"}
            </p>

            <div className="proyectos__card-meta" aria-label="Detalles del proyecto">
              <div className="proyectos__meta-item">
                <span className="proyectos__meta-label">Presupuesto</span>
                <span className="proyectos__meta-valor" aria-label={`Presupuesto: ${formatearPresupuesto(proyecto.presupuesto)}`}>
                  {formatearPresupuesto(proyecto.presupuesto)}
                </span>
              </div>
              <div className="proyectos__meta-item">
                <span className="proyectos__meta-label">Fecha</span>
                <span className="proyectos__meta-valor">
                  {new Date(proyecto.fecha_publicacion || proyecto.creado_en).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="proyectos__card-botones" role="group" aria-label="Acciones del proyecto">
              {/* Fila 1: botón principal */}
              <button
                className="proyectos__boton-invertir"
                disabled={!esActivo}
                onClick={() => {
                  if (esActivo) openModalSolicitud(proyecto);
                }}
                aria-label={esActivo ? `Invertir en ${proyecto.titulo}` : `Proyecto ${proyecto.titulo} ya adjudicado`}
                aria-disabled={!esActivo}
              >
                {esActivo ? "Quiero Invertir" : "Proyecto adjudicado"}
              </button>

              {/* Fila 2: acciones secundarias */}
              <div className="proyectos__card-botones__fila">
                <button
                  className="proyectos__boton-contactar"
                  onClick={() => handleContactarDueno(proyecto)}
                  title="Chat con el dueño del proyecto"
                  aria-label={`Contactar al dueño de ${proyecto.titulo}`}
                >
                  <MessageSquare size={16} />
                  <span>Contactar</span>
                </button>
                <button
                  className="proyectos__boton-contactar"
                  style={{ background: "rgba(124,143,245,0.15)", borderColor: "rgba(124,143,245,0.4)" }}
                  onClick={() => abrirModalRiesgos(proyecto)}
                  aria-label={`Ver matriz de riesgos de ${proyecto.titulo}`}
                >
                  <ShieldAlert size={16} />
                  <span>Ver Riesgos</span>
                </button>
                {proyecto.analisis_ai && (
                  <button
                    className="proyectos__boton-analisis"
                    onClick={() => {
                      setAnalisisSeleccionado({
                        titulo: proyecto.titulo,
                        analisis_ai: proyecto.analisis_ai,
                      });
                      setModalAnalisisOpen(true);
                    }}
                    aria-label={`Ver análisis de IA para ${proyecto.titulo}`}
                  >
                    Ver Análisis IA
                  </button>
                )}
              </div>
            </div>
          </div>
        );
        })}
      </div>
      )}

      {/* Botón expandir */}
      {proyectos_filtrados.length > 6 && !esta_expandido && (
        <div className="proyectos__expandir">
          <button
            className="proyectos__boton-expandir"
            onClick={() => set_esta_expandido(true)}
          >
            Ver más proyectos ({proyectos_filtrados.length - 6} más)
          </button>
        </div>
      )}

      {esta_expandido && proyectos_filtrados.length > 6 && (
        <div className="proyectos__expandir">
          <button
            className="proyectos__boton-expandir"
            onClick={() => set_esta_expandido(false)}
          >
            Ver menos
          </button>
        </div>
      )}

      {/* Modal para crear solicitud */}
      {modalOpen && proyectoSeleccionado && (
        <div className="modal__overlay" onClick={closeModal}>
          <div className="modal__content" onClick={(e) => e.stopPropagation()}>
            <h2>Solicitar Inversión</h2>
            <p className="modal__subtitulo">Proyecto: {proyectoSeleccionado.titulo}</p>

            <div className="modal__formulario">
              <label>
                <span>Monto a Invertir</span>
                <input
                  type="number"
                  name="monto_solicitado"
                  placeholder="Ej: 5000000"
                  value={formSolicitud.monto_solicitado}
                  onChange={handleChange}
                  min="0"
                  step="100000"
                />
              </label>

              <label>
                <span>Propuesta o Comentarios</span>
                <textarea
                  name="propuesta"
                  placeholder="Cuéntanos por qué deseas invertir en este proyecto..."
                  value={formSolicitud.propuesta}
                  onChange={handleChange}
                  rows={6}
                />
              </label>
            </div>

            <div className="modal__acciones">
              <button className="boton boton--secundario" onClick={closeModal}>
                Cancelar
              </button>
              <button
                className="boton boton--primario"
                onClick={handleSaveSolicitud}
                disabled={saving}
              >
                {saving ? "Enviando..." : "Enviar Solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análisis IA */}
      {modalAnalisisOpen && (
        <div className="modal__overlay modal__overlay--analisis" onClick={() => setModalAnalisisOpen(false)}>
          <div className="modal__content modal__content--analisis" onClick={(e) => e.stopPropagation()}>
            <div className="modal__analisis-header">
              <h2 className="modal__analisis-titulo">
                <BarChart3 size={22} color="#7c8ff5" /> Análisis de Inversión (IA)
              </h2>
              <button
                onClick={() => setModalAnalisisOpen(false)}
                className="modal__analisis-cerrar"
                aria-label="Cerrar análisis"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal__analisis-contenido">
              {analisisSeleccionado?.titulo && (
                <p className="modal__analisis-proyecto">
                  Proyecto: <strong>{analisisSeleccionado.titulo}</strong>
                </p>
              )}

              {analisisFormateado.resumen && (
                <>
                  <h3>Resumen Ejecutivo</h3>
                  <p>{analisisFormateado.resumen}</p>
                </>
              )}

              {analisisFormateado.puntos.length > 0 ? (
                <>
                  <h3>Desglose de Puntajes</h3>
                  {analisisFormateado.puntos.map((punto, idx) => (
                    <div key={`${punto.titulo}-${idx}`} className="modal__analisis-punto">
                      <div className="modal__analisis-punto-header">
                        <strong>{idx + 1}. {punto.titulo}</strong>
                        <span>{punto.score}/10</span>
                      </div>
                      <p>{punto.descripcion}</p>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <h3>Contenido del análisis</h3>
                  <p>{analisisSeleccionado?.analisis_ai}</p>
                </>
              )}
            </div>

            <div className="modal__analisis-acciones">
              <button onClick={() => setModalAnalisisOpen(false)} className="boton boton--primario modal__analisis-boton">
                Cerrar
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
                        </div>
                        <div className="riesgos__eje-y-titulo">← Probabilidad</div>
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
                        <div className="riesgos__eje-x-titulo">Impacto →</div>
                        <div className="riesgos__eje-x">
                          {[1,2,3,4,5].map(i => <div key={i} className="riesgos__eje-x-label">{IMP_L[i]}</div>)}
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
