// PaginaRiesgos.jsx — Matriz de Riesgos con IA para el emprendedor
import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, ShieldAlert, Zap, ShieldCheck, RefreshCw, ChevronDown, ChevronUp, Bot, X, Trash2 } from "lucide-react";
import { useContextoApp } from "../context/contexto_app";
import { listar_proyectos_api } from "../services/proyectos_api";
import {
  enviar_mensaje_chatbot,
  obtener_riesgos_detectados_ares,
  detectar_riesgos_ares,
  listar_riesgos_personalizados_ares,
  crear_riesgo_personalizado_ares,
  eliminar_riesgo_personalizado_ares,
} from "../services/chatbot_api";
import "./PaginaRiesgos.css";

const NIVEL_COLOR = {
  alto: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.5)", text: "#fca5a5", badge: "#ef4444" },
  medio: { bg: "rgba(251,191,36,0.13)", border: "rgba(251,191,36,0.45)", text: "#fde68a", badge: "#f59e0b" },
  bajo: { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.4)", text: "#6ee7b7", badge: "#10b981" },
};

const calcularNivel = (prob, imp) => {
  const score = prob * imp;
  if (score >= 12) return "alto";
  if (score >= 6) return "medio";
  return "bajo";
};

const PROB_LABELS = ["", "Muy baja", "Baja", "Media", "Alta", "Muy alta"];
const IMP_LABELS = ["", "Mínimo", "Menor", "Moderado", "Mayor", "Crítico"];
const PROB_LABELS_CORTAS = ["", "M. baja", "Baja", "Media", "Alta", "M. alta"];
const IMP_LABELS_CORTAS = ["", "Mín.", "Menor", "Mod.", "Mayor", "Crít."];

const getAresCacheKey = (usuarioId, proyectoId) => `olympo_ares_riesgos:${usuarioId || "anon"}:${proyectoId}`;
const getAyudaRiesgoKey = (usuarioId) => `olympo_ayuda_riesgo_vista:${usuarioId || "anon"}`;

const leerCacheAres = (usuarioId, proyectoId) => {
  if (!proyectoId) return null;
  try {
    const raw = localStorage.getItem(getAresCacheKey(usuarioId, proyectoId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.riesgos)) return null;
    return parsed.riesgos;
  } catch (_) {
    return null;
  }
};

const guardarCacheAres = (usuarioId, proyectoId, riesgos) => {
  if (!proyectoId || !Array.isArray(riesgos)) return;
  try {
    localStorage.setItem(
      getAresCacheKey(usuarioId, proyectoId),
      JSON.stringify({
        riesgos,
        guardado_en: new Date().toISOString(),
      })
    );
    try {
      window.dispatchEvent(new CustomEvent("olympo:riesgos:updated", { detail: { usuarioId, proyectoId } }));
    } catch (_) {}
    try {
      // Emitir también los contadores para sincronizar KPIs en otras vistas
      const contAlto = (riesgos || []).filter((r) => r.tipo === "alto").length;
      const contMedio = (riesgos || []).filter((r) => r.tipo === "medio").length;
      const contBajo = (riesgos || []).filter((r) => r.tipo === "bajo").length;
      window.dispatchEvent(new CustomEvent("olympo:riesgos:counts", { detail: { usuarioId, proyectoId, contAlto, contMedio, contBajo, total: (riesgos || []).length } }));
    } catch (_) {}
  } catch (_) {
    /* silenciar errores de almacenamiento */
  }
};

const emitirContadores = (usuarioId, proyectoId, riesgos) => {
  try {
    const contAlto = (riesgos || []).filter((r) => r.tipo === "alto").length;
    const contMedio = (riesgos || []).filter((r) => r.tipo === "medio").length;
    const contBajo = (riesgos || []).filter((r) => r.tipo === "bajo").length;
    window.dispatchEvent(new CustomEvent("olympo:riesgos:counts", { detail: { usuarioId, proyectoId, contAlto, contMedio, contBajo, total: (riesgos || []).length } }));
  } catch (_) {}
};

const leerAyudaRiesgoVista = (usuarioId) => {
  try {
    return localStorage.getItem(getAyudaRiesgoKey(usuarioId)) === "1";
  } catch (_) {
    return false;
  }
};

const guardarAyudaRiesgoVista = (usuarioId) => {
  try {
    localStorage.setItem(getAyudaRiesgoKey(usuarioId), "1");
  } catch (_) {
    /* silenciar errores de almacenamiento */
  }
};

const borrarAyudaRiesgoVista = (usuarioId) => {
  try {
    localStorage.removeItem(getAyudaRiesgoKey(usuarioId));
  } catch (_) {
    /* silenciar errores de almacenamiento */
  }
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
        tipo: calcularNivel(probabilidad, impacto),
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
        tipo: r.tipo || calcularNivel(probabilidad, impacto),
        esPersonalizado: true,
      };
    });
};

/* ─── Celda de la matriz ─── */
const MatrizCelda = ({ prob, imp, riesgos, onClick, selected }) => {
  const nivel = calcularNivel(prob, imp);
  const count = riesgos.filter((r) => r.probabilidad === prob && r.impacto === imp).length;
  const col = NIVEL_COLOR[nivel];
  return (
    <div
      className={`riesgos__matriz-celda riesgos__matriz-celda--${nivel}${selected ? " riesgos__matriz-celda--seleccionada" : ""}`}
      onClick={() => count > 0 && onClick(prob, imp)}
      aria-pressed={selected}
      title={count > 0 ? `${count} riesgo(s)` : ""}
      style={{ cursor: count > 0 ? "pointer" : "default" }}
    >
      {count > 0 && (
        <span className="riesgos__matriz-badge" style={{ background: col.badge }}>
          {count}
        </span>
      )}
    </div>
  );
};

/* ─── Tarjeta de riesgo ─── */
const TarjetaRiesgo = ({ riesgo, onDelete }) => {
  const [abierto, setAbierto] = useState(false);
  const col = NIVEL_COLOR[riesgo.tipo];
  return (
    <div
      className="riesgos__tarjeta"
      style={{ background: col.bg, borderColor: col.border }}
    >
      <div className="riesgos__tarjeta-header" onClick={() => setAbierto(!abierto)}>
        <div className="riesgos__tarjeta-meta">
          <span className="riesgos__tarjeta-categoria">{riesgo.categoria}</span>
          {riesgo.esPersonalizado && (
            <span className="riesgos__tarjeta-personal">Manual</span>
          )}
          <span className="riesgos__tarjeta-nivel" style={{ background: col.badge }}>
            {riesgo.tipo.toUpperCase()}
          </span>
        </div>
        <div className="riesgos__tarjeta-nombre-row">
          <span className="riesgos__tarjeta-nombre" style={{ color: col.text }}>
            {riesgo.nombre}
          </span>
          <div className="riesgos__tarjeta-acciones">
            {onDelete && (
              <button
                type="button"
                className="riesgos__btn-eliminar"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(riesgo);
                }}
                title="Eliminar riesgo"
                aria-label={`Eliminar riesgo ${riesgo.nombre}`}
              >
                <Trash2 size={14} />
              </button>
            )}
            {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
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
            <ShieldCheck size={14} />
            <span>{riesgo.tratamiento}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function PaginaRiesgos() {
  const { datos_usuario, mostrar_notificacion } = useContextoApp();
  const [proyectos, setProyectos] = useState([]);
  const [proyectoSel, setProyectoSel] = useState(null);
  const [riesgos, setRiesgos] = useState([]);
  const [celdaSel, setCeldaSel] = useState(null); // { prob, imp }
  const [filtroNivel, setFiltroNivel] = useState("todos");
  const [analizandoIA, setAnalizandoIA] = useState(false);
  const [evaluandoAres, setEvaluandoAres] = useState(false);
  const [analisisIA, setAnalisisIA] = useState("");
  const [modalIA, setModalIA] = useState(false);
  const [modalAyudaRiesgo, setModalAyudaRiesgo] = useState(false);
  const [modalRiesgo, setModalRiesgo] = useState(false);
  const [guardandoRiesgo, setGuardandoRiesgo] = useState(false);
  const [autocompletandoRiesgo, setAutocompletandoRiesgo] = useState(false);
  const [noVolverAMostrarAyuda, setNoVolverAMostrarAyuda] = useState(false);
  const [formRiesgo, setFormRiesgo] = useState({
    nombre: "",
    categoria: "",
    descripcion: "",
    tratamiento: "",
    probabilidad: 2,
    impacto: 2,
  });
  const [cargando, setCargando] = useState(true);

  /* Cargar proyectos del emprendedor */
  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const lista = await listar_proyectos_api(datos_usuario?.id, datos_usuario?.email);
        if (Array.isArray(lista) && lista.length > 0) {
          setProyectos(lista);
          setProyectoSel(lista[0]);
        }
      } catch (_) {
        /* silenciar — la evaluación se realiza bajo demanda con IA */
      } finally {
        setCargando(false);
      }
    };
    if (datos_usuario?.id) cargar();
  }, [datos_usuario?.id, datos_usuario?.email]);

  useEffect(() => {
    if (!datos_usuario?.id) return;
  }, [datos_usuario?.id]);

  /* Cuando cambia el proyecto seleccionado, cargar catálogo generado por IA */
  const reloadRiesgos = useCallback(async () => {
    if (!proyectoSel) {
      setRiesgos([]);
      return;
    }

    setAnalisisIA("");

    // Nivel 1: cache local del navegador (rápido)
    const riesgosCacheadosLocal = leerCacheAres(datos_usuario?.id, proyectoSel.id);
    let riesgosTrabajo = Array.isArray(riesgosCacheadosLocal) && riesgosCacheadosLocal.length > 0
      ? normalizarRiesgosDetectados(riesgosCacheadosLocal)
      : [];

    if (datos_usuario?.id) {
      try {
        const personalizados = await listar_riesgos_personalizados_ares(proyectoSel.id, datos_usuario.id);
        const normalizadosPersonalizados = normalizarRiesgosPersonalizados(personalizados);
        riesgosTrabajo = fusionarRiesgos(riesgosTrabajo, normalizadosPersonalizados);
      } catch (_) {
        // no bloquear la vista si falla la carga de riesgos personalizados
      }

      try {
        const detectadosCache = await obtener_riesgos_detectados_ares(proyectoSel.id, datos_usuario.id);
        if (Array.isArray(detectadosCache?.riesgos) && detectadosCache.riesgos.length > 0) {
          const detectados = normalizarRiesgosDetectados(detectadosCache.riesgos);
          riesgosTrabajo = fusionarRiesgos(riesgosTrabajo, detectados);
          guardarCacheAres(datos_usuario.id, proyectoSel.id, riesgosTrabajo);
        }
      } catch (_) {
        // No bloquear la vista si falla la carga de detectados
      }
    }

    setRiesgos(riesgosTrabajo);
    if (datos_usuario?.id && proyectoSel?.id) {
      guardarCacheAres(datos_usuario.id, proyectoSel.id, riesgosTrabajo);
    }
    // Emitir contadores para sincronizar KPI global
    emitirContadores(datos_usuario?.id, proyectoSel?.id, riesgosTrabajo);
  }, [proyectoSel, datos_usuario?.id]);

  useEffect(() => {
    reloadRiesgos();
  }, [reloadRiesgos]);

  /* Filtrado */
  const riesgosFiltrados = filtroNivel === "todos"
    ? riesgos
    : riesgos.filter((r) => r.tipo === filtroNivel);

  /* Riesgos de celda seleccionada */
  const riesgosCelda = celdaSel
    ? riesgos.filter((r) => r.probabilidad === celdaSel.prob && r.impacto === celdaSel.imp)
    : [];

  const abrirModalRiesgo = () => {
    setFormRiesgo({
      nombre: "",
      categoria: "",
      descripcion: "",
      tratamiento: "",
      probabilidad: 2,
      impacto: 2,
    });
    setModalRiesgo(true);
  };

  const abrirAyudaRiesgo = () => {
    if (datos_usuario?.id && leerAyudaRiesgoVista(datos_usuario.id)) {
      abrirModalRiesgo();
      return;
    }
    setNoVolverAMostrarAyuda(false);
    setModalAyudaRiesgo(true);
  };

  const autocompletarRiesgoConIA = async () => {
    if (!proyectoSel || !datos_usuario?.id) return;

    const datosBase = {
      nombre: formRiesgo.nombre.trim(),
      categoria: formRiesgo.categoria.trim(),
      descripcion: formRiesgo.descripcion.trim(),
      tratamiento: formRiesgo.tratamiento.trim(),
      probabilidad: Number(formRiesgo.probabilidad),
      impacto: Number(formRiesgo.impacto),
    };

    setAutocompletandoRiesgo(true);
    try {
      const mensaje = `Necesito que completes un formulario de riesgo para un proyecto emprendedor.

Datos disponibles del riesgo:
- Nombre: ${datosBase.nombre || "(vacío)"}
- Categoría: ${datosBase.categoria || "(vacío)"}
- Descripción inicial: ${datosBase.descripcion || "(vacío)"}
- Tratamiento inicial: ${datosBase.tratamiento || "(vacío)"}
- Probabilidad inicial: ${datosBase.probabilidad}
- Impacto inicial: ${datosBase.impacto}

Devuélveme solo un JSON válido con estas claves:
{
  "nombre": "",
  "categoria": "",
  "descripcion": "",
  "tratamiento": "",
  "probabilidad": 1,
  "impacto": 1
}

Reglas:
- Si falta información, infiere la mejor opción posible.
- Usa probabilidades e impactos entre 1 y 5.
- Mantén el texto corto, claro y práctico.
- No agregues explicación fuera del JSON.`;

      const respuesta = await enviar_mensaje_chatbot(mensaje, datos_usuario?.id);
      const texto = String(respuesta || "").trim();
      const jsonBruto = texto.startsWith("{") && texto.endsWith("}")
        ? texto
        : texto.match(/\{[\s\S]*\}/)?.[0];

      if (!jsonBruto) {
        throw new Error("La IA no devolvió un JSON válido");
      }

      const sugerencia = JSON.parse(jsonBruto);
      setFormRiesgo((actual) => ({
        nombre: actual.nombre.trim() || String(sugerencia.nombre || "").trim(),
        categoria: actual.categoria.trim() || String(sugerencia.categoria || "").trim(),
        descripcion: actual.descripcion.trim() || String(sugerencia.descripcion || "").trim(),
        tratamiento: actual.tratamiento.trim() || String(sugerencia.tratamiento || "").trim(),
        probabilidad: Math.max(1, Math.min(5, Number(sugerencia.probabilidad) || actual.probabilidad)),
        impacto: Math.max(1, Math.min(5, Number(sugerencia.impacto) || actual.impacto)),
      }));
      mostrar_notificacion?.("success", "Formulario completado con sugerencia de IA");
    } catch (err) {
      mostrar_notificacion?.("error", err.message || "No se pudo autocompletar el riesgo");
    } finally {
      setAutocompletandoRiesgo(false);
    }
  };

  const guardarRiesgoPersonalizado = async (e) => {
    e.preventDefault();
    if (!proyectoSel || !datos_usuario?.id) return;

    if (!formRiesgo.nombre.trim()) {
      mostrar_notificacion?.("error", "Escribe el nombre del riesgo");
      return;
    }

    setGuardandoRiesgo(true);
    try {
      const nuevo = await crear_riesgo_personalizado_ares({
        proyecto_id: proyectoSel.id,
        usuario_id: datos_usuario.id,
        nombre: formRiesgo.nombre.trim(),
        categoria: formRiesgo.categoria.trim() || "Usuario",
        descripcion: formRiesgo.descripcion.trim(),
        tratamiento: formRiesgo.tratamiento.trim(),
        probabilidad: Number(formRiesgo.probabilidad),
        impacto: Number(formRiesgo.impacto),
      });

      const normalizado = normalizarRiesgosPersonalizados([nuevo])[0];
      setRiesgos((actuales) => {
        const fusionados = fusionarRiesgos(actuales, [normalizado]);
        guardarCacheAres(datos_usuario.id, proyectoSel.id, fusionados);
        return fusionados;
      });
      setModalRiesgo(false);
      mostrar_notificacion?.("success", "Riesgo creado correctamente");
    } catch (err) {
      mostrar_notificacion?.("error", err.message || "No se pudo crear el riesgo");
    } finally {
      setGuardandoRiesgo(false);
    }
  };

  const eliminarRiesgoPersonalizado = async (riesgo) => {
    if (!proyectoSel || !datos_usuario?.id || !riesgo?.id) return;

    const confirmado = window.confirm(`¿Quieres eliminar el riesgo "${riesgo.nombre}"?`);
    if (!confirmado) return;

    const estadoAnterior = riesgos;
    const riesgosRestantes = riesgos.filter((item) => String(item.id) !== String(riesgo.id));

    setRiesgos(riesgosRestantes);
    guardarCacheAres(datos_usuario.id, proyectoSel.id, riesgosRestantes);
    setCeldaSel((actual) => {
      if (!actual) return actual;
      const sigueExistiendo = riesgosRestantes.some((item) => String(item.id) === String(riesgo.id));
      return sigueExistiendo ? actual : null;
    });

    try {
      await eliminar_riesgo_personalizado_ares(riesgo.id, datos_usuario.id, proyectoSel.id, riesgo);

      // Después de eliminar en backend, recargar riesgos para sincronizar cache y matriz
      await reloadRiesgos();
      // También emitir contadores para sincronizar otras vistas inmediatamente
      emitirContadores(datos_usuario?.id, proyectoSel?.id, riesgos.filter((item) => String(item.id) !== String(riesgo.id)));

      mostrar_notificacion?.("success", "Riesgo eliminado correctamente");
    } catch (err) {
      setRiesgos(estadoAnterior);
      guardarCacheAres(datos_usuario.id, proyectoSel.id, estadoAnterior);
      mostrar_notificacion?.("error", err.message || "No se pudo eliminar/ocultar el riesgo");
    }
  };

  /* Evaluación Ares */
  const evaluarConAres = async () => {
    if (!proyectoSel) return;
    setEvaluandoAres(true);
    try {
      const deteccion = await detectar_riesgos_ares(proyectoSel.id, datos_usuario?.id);
      if (Array.isArray(deteccion?.riesgos_detectados)) {
        const detectados = normalizarRiesgosDetectados(deteccion.riesgos_detectados);
        const riesgosPersonalizadosActuales = riesgos.filter((r) => r.esPersonalizado);
        const riesgosFinales = fusionarRiesgos(riesgosPersonalizadosActuales, detectados);
        setRiesgos(riesgosFinales);
        guardarCacheAres(datos_usuario?.id, proyectoSel.id, riesgosFinales);
        if (riesgosFinales.length > 0) {
          mostrar_notificacion?.("success", "Riesgos detectados exitosamente por Ares");
        } else {
          mostrar_notificacion?.("info", "Ares no detectó riesgos nuevos para este proyecto");
        }
      }
    } catch (err) {
      mostrar_notificacion?.("error", "Error al evaluar con Ares: " + err.message);
    } finally {
      setEvaluandoAres(false);
    }
  };

  /* Análisis IA */
  const analizarConIA = useCallback(async () => {
    setAnalizandoIA(true);
    setAnalisisIA("");
    setModalIA(true);
    try {
      const resumenProyecto = proyectoSel
        ? `Proyecto: "${proyectoSel.titulo || "Sin nombre"}", sector: ${proyectoSel.sector || "no especificado"}, presupuesto: ${proyectoSel.presupuesto || "no indicado"} COP.`
        : "Emprendimiento sin proyecto seleccionado.";

      const resumenRiesgos = riesgos
        .filter((r) => r.tipo === "alto")
        .map((r) => `- ${r.nombre} (prob:${r.probabilidad}, impacto:${r.impacto}): ${r.descripcion}`)
        .join("\n");

      const mensaje = `Actúa como asesor financiero senior para emprendedores latinoamericanos. 
${resumenProyecto}

Los principales riesgos identificados en la matriz de riesgos son:
${resumenRiesgos || "No hay riesgos de nivel alto registrados aún."}

Por favor proporciona:
1. Un análisis breve de los 3 riesgos más críticos para este proyecto
2. Estrategias concretas de mitigación (1-2 por riesgo)
3. Indicadores de alerta temprana que el emprendedor debe monitorear
4. Una recomendación de contingencia financiera si los riesgos se materializan

Responde en español, de forma clara y práctica, con máximo 400 palabras.`;

      const respuesta = await enviar_mensaje_chatbot(mensaje, datos_usuario?.id);
      setAnalisisIA(respuesta);
    } catch (err) {
      mostrar_notificacion?.("error", "No se pudo obtener el análisis de IA");
      setAnalisisIA("No se pudo obtener el análisis. Por favor intenta nuevamente.");
    } finally {
      setAnalizandoIA(false);
    }
  }, [proyectoSel, riesgos, datos_usuario?.id, mostrar_notificacion]);

  /* Contadores */
  const contAlto = riesgos.filter((r) => r.tipo === "alto").length;
  const contMedio = riesgos.filter((r) => r.tipo === "medio").length;
  const contBajo = riesgos.filter((r) => r.tipo === "bajo").length;

  return (
    <div className="riesgos">
      {/* ── HEADER ── */}
      <header className="riesgos__header">
        <div>
          <h2><ShieldAlert size={26} strokeWidth={2} /> Matriz de Riesgos</h2>
          <p>
            Identifica, evalúa y gestiona los riesgos de tu emprendimiento. Usa la IA
            integrada para obtener recomendaciones personalizadas y planes de contingencia.
          </p>
        </div>
        <div className="riesgos__header-right">
          {proyectos.length > 0 && (
            <select
              className="riesgos__select-proyecto"
              value={proyectoSel?.id || ""}
              onChange={(e) => setProyectoSel(proyectos.find((p) => String(p.id) === e.target.value) || null)}
            >
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo || `Proyecto #${p.id}`}</option>
              ))}
            </select>
          )}
          <button className="riesgos__btn-ia" onClick={evaluarConAres} disabled={evaluandoAres || analizandoIA} style={{ marginRight: '10px' }}>
            <Zap size={16} />
            {evaluandoAres ? "Ares Evaluando..." : "Evaluar con Ares"}
          </button>
          <button className="riesgos__btn-crear" onClick={abrirAyudaRiesgo} disabled={!proyectoSel}>
            <RefreshCw size={16} />
            Crear riesgo
          </button>
          <button className="riesgos__btn-ia" onClick={analizarConIA} disabled={analizandoIA || evaluandoAres}>
            <Bot size={16} />
            {analizandoIA ? "Analizando..." : "Analizar con IA"}
          </button>
        </div>
      </header>

      {cargando && <div className="riesgos__loading">Cargando proyectos...</div>}

      {riesgos.length === 0 && !cargando && proyectos.length > 0 && (
        <div className="riesgos__placeholder riesgos__placeholder--vacío">
          <Zap size={48} style={{ opacity: 0.5, marginBottom: "16px", color: "var(--primary-color)" }} />
          <h3>Aún no hay riesgos</h3>
          <p>Genera riesgos con IA o crea uno manualmente para empezar a construir tu matriz.</p>
          <div className="riesgos__placeholder-actions">
            <button className="riesgos__btn-ia" onClick={evaluarConAres} disabled={evaluandoAres || analizandoIA}>
              <Zap size={16} />
              {evaluandoAres ? "Ares Evaluando..." : "Evaluar con Ares"}
            </button>
            <button className="riesgos__btn-crear" onClick={abrirAyudaRiesgo} disabled={!proyectoSel}>
              Crear riesgo manual
            </button>
          </div>
        </div>
      )}

      {/* ── RESUMEN KPIs ── */}
      {riesgos.length > 0 && (
        <>
          <div className="riesgos__kpis">
        <div className="riesgos__kpi riesgos__kpi--alto" onClick={() => setFiltroNivel(filtroNivel === "alto" ? "todos" : "alto")}>
          <AlertTriangle size={22} />
          <div>
            <span className="riesgos__kpi-num">{contAlto}</span>
            <span className="riesgos__kpi-label">Riesgo Alto</span>
          </div>
        </div>
        <div className="riesgos__kpi riesgos__kpi--medio" onClick={() => setFiltroNivel(filtroNivel === "medio" ? "todos" : "medio")}>
          <Zap size={22} />
          <div>
            <span className="riesgos__kpi-num">{contMedio}</span>
            <span className="riesgos__kpi-label">Riesgo Medio</span>
          </div>
        </div>
        <div className="riesgos__kpi riesgos__kpi--bajo" onClick={() => setFiltroNivel(filtroNivel === "bajo" ? "todos" : "bajo")}>
          <ShieldCheck size={22} />
          <div>
            <span className="riesgos__kpi-num">{contBajo}</span>
            <span className="riesgos__kpi-label">Riesgo Bajo</span>
          </div>
        </div>
        <div className="riesgos__kpi riesgos__kpi--total" onClick={() => setFiltroNivel("todos")}>
          <RefreshCw size={22} />
          <div>
            <span className="riesgos__kpi-num">{riesgos.length}</span>
            <span className="riesgos__kpi-label">Total riesgos</span>
          </div>
        </div>
      </div>

      {/* ── LAYOUT PRINCIPAL ── */}
      <div className="riesgos__main">

        {/* MATRIZ PROBABILIDAD × IMPACTO */}
        <div className="riesgos__panel-matriz">
          <h3 className="riesgos__panel-titulo">Probabilidad × Impacto</h3>
          <div className="riesgos__matriz-wrap">
            {/* Eje Y (probabilidad) */}
            <div className="riesgos__eje-y">
              {[5, 4, 3, 2, 1].map((p) => (
                <div key={p} className="riesgos__eje-y-label" title={PROB_LABELS[p]}>{PROB_LABELS_CORTAS[p]}</div>
              ))}
            </div>
            <div className="riesgos__eje-y-titulo">Probabilidad</div>

            {/* Grid */}
            <div className="riesgos__matriz-grid">
              {[5, 4, 3, 2, 1].map((prob) =>
                [1, 2, 3, 4, 5].map((imp) => (
                  <MatrizCelda
                    key={`${prob}-${imp}`}
                    prob={prob}
                    imp={imp}
                    riesgos={riesgos}
                    selected={celdaSel?.prob === prob && celdaSel?.imp === imp}
                    onClick={(p, i) => setCeldaSel(celdaSel?.prob === p && celdaSel?.imp === i ? null : { prob: p, imp: i })}
                  />
                ))
              )}
            </div>

            {/* Eje X (impacto) */}
            <div className="riesgos__eje-x">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="riesgos__eje-x-label" title={IMP_LABELS[i]}>{IMP_LABELS_CORTAS[i]}</div>
              ))}
              <div className="riesgos__eje-x-titulo">Impacto</div>
            </div>
          </div>

          {/* Leyenda */}
          <div className="riesgos__leyenda">
            <span className="riesgos__leyenda-item riesgos__leyenda-item--bajo">Bajo (1–5)</span>
            <span className="riesgos__leyenda-item riesgos__leyenda-item--medio">Medio (6–11)</span>
            <span className="riesgos__leyenda-item riesgos__leyenda-item--alto">Alto (12–25)</span>
          </div>

          {/* Detalle de celda seleccionada */}
          {celdaSel && riesgosCelda.length > 0 && (
            <div className="riesgos__celda-detalle">
              <div className="riesgos__celda-detalle-title">
                Riesgos en Prob {celdaSel.prob} × Impacto {celdaSel.imp}
                <button className="riesgos__celda-cerrar" onClick={() => setCeldaSel(null)}>✕</button>
              </div>
              {riesgosCelda.map((r) => <TarjetaRiesgo key={r.id} riesgo={r} onDelete={eliminarRiesgoPersonalizado} />)}
            </div>
          )}
        </div>

        {/* LISTADO DE RIESGOS */}
        <div className="riesgos__panel-lista">
          <div className="riesgos__panel-titulo-row">
            <h3 className="riesgos__panel-titulo">
              Catálogo de riesgos
              {filtroNivel !== "todos" && (
                <span className="riesgos__filtro-activo"> · {filtroNivel}</span>
              )}
            </h3>
            <div className="riesgos__filtros">
              {["todos", "alto", "medio", "bajo"].map((f) => (
                <button
                  key={f}
                  className={`riesgos__filtro-btn ${filtroNivel === f ? "activo" : ""} riesgos__filtro-btn--${f}`}
                  onClick={() => setFiltroNivel(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="riesgos__lista">
            {riesgosFiltrados.map((r) => (
              <TarjetaRiesgo key={r.id} riesgo={r} onDelete={eliminarRiesgoPersonalizado} />
            ))}
          </div>
        </div>
      </div>
      </>
      )}

      {/* ── ALERTAS PROACTIVAS ── */}
      {riesgos.length > 0 && contAlto > 0 && (
        <div className="riesgos__alertas">
          <div className="riesgos__alertas-titulo">
            <AlertTriangle size={18} /> Alertas proactivas activas
          </div>
          <div className="riesgos__alertas-lista">
            {riesgos.filter((r) => r.tipo === "alto").map((r) => (
              <div key={r.id} className="riesgos__alerta-item">
                <span className="riesgos__alerta-dot" />
                <strong>{r.nombre}</strong> — {r.tratamiento}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL ANÁLISIS IA ── */}
      {modalIA && (
        <div className="riesgos__modal-overlay" onClick={() => !analizandoIA && setModalIA(false)}>
          <div className="riesgos__modal" onClick={(e) => e.stopPropagation()}>
            <div className="riesgos__modal-header">
              <div className="riesgos__modal-titulo">
                <Bot size={22} /> Análisis de Riesgos con IA
              </div>
              {!analizandoIA && (
                <button className="riesgos__modal-cerrar" onClick={() => setModalIA(false)}>
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="riesgos__modal-body">
              {analizandoIA ? (
                <div className="riesgos__ia-loading">
                  <div className="riesgos__ia-spinner" />
                  <p>La IA está analizando los riesgos de tu proyecto...</p>
                </div>
              ) : (
                <div className="riesgos__ia-respuesta">
                  {analisisIA.split("\n").map((linea, i) => (
                    linea.trim() ? <p key={i}>{linea}</p> : <br key={i} />
                  ))}
                </div>
              )}
            </div>
            {!analizandoIA && (
              <div className="riesgos__modal-footer">
                <button className="riesgos__btn-secundario" onClick={() => setModalIA(false)}>Cerrar</button>
                <button className="riesgos__btn-ia" onClick={analizarConIA}>
                  <RefreshCw size={14} /> Regenerar análisis
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalAyudaRiesgo && (
        <div className="riesgos__modal-overlay" onClick={() => setModalAyudaRiesgo(false)}>
          <div className="riesgos__modal riesgos__modal--ayuda" onClick={(e) => e.stopPropagation()}>
            <div className="riesgos__modal-header">
              <div className="riesgos__modal-titulo">
                <ShieldCheck size={22} /> Antes de crear el riesgo
              </div>
              <button className="riesgos__modal-cerrar" onClick={() => setModalAyudaRiesgo(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="riesgos__modal-body">
              <p className="riesgos__ayuda-intro">
                Esta ventana te explica qué debe ir en cada campo para que el riesgo quede claro y útil para el análisis.
              </p>

              <div className="riesgos__ayuda-lista">
                <div className="riesgos__ayuda-item">
                  <strong>Nombre del riesgo:</strong>
                  <span>Escribe una frase corta y específica, por ejemplo: “Dependencia de un solo proveedor”.</span>
                </div>
                <div className="riesgos__ayuda-item">
                  <strong>Categoría:</strong>
                  <span>Usa una etiqueta general como Operacional, Financiero, Tecnológico o Mercado.</span>
                </div>
                <div className="riesgos__ayuda-item">
                  <strong>Probabilidad:</strong>
                  <span>Selecciona qué tan posible es que ocurra: 1 es baja y 5 es crítica.</span>
                </div>
                <div className="riesgos__ayuda-item">
                  <strong>Impacto:</strong>
                  <span>Indica qué tanto afectaría al proyecto si sucede: 1 es mínimo y 5 es crítico.</span>
                </div>
                <div className="riesgos__ayuda-item">
                  <strong>Descripción:</strong>
                  <span>Explica cuándo aparece el riesgo y qué consecuencia genera en el proyecto.</span>
                </div>
                <div className="riesgos__ayuda-item">
                  <strong>Tratamiento:</strong>
                  <span>Describe la acción que tomarías para reducirlo o mitigarlo.</span>
                </div>
              </div>

              <div className="riesgos__escala-ajuda riesgos__escala-ajuda--info">
                <strong>Tip:</strong> si no estás seguro, usa el botón de autocompletar con IA una vez abras el formulario.
              </div>

              <label className="riesgos__checkbox-ayuda">
                <input
                  type="checkbox"
                  checked={noVolverAMostrarAyuda}
                  onChange={(e) => setNoVolverAMostrarAyuda(e.target.checked)}
                />
                <span>No volver a mostrar</span>
              </label>
            </div>

            <div className="riesgos__modal-footer">
              <button className="riesgos__btn-secundario" type="button" onClick={() => setModalAyudaRiesgo(false)}>
                Cancelar
              </button>
              <button
                className="riesgos__btn-ia"
                type="button"
                onClick={() => {
                  if (datos_usuario?.id) {
                    if (noVolverAMostrarAyuda) {
                      guardarAyudaRiesgoVista(datos_usuario.id);
                    } else {
                      borrarAyudaRiesgoVista(datos_usuario.id);
                    }
                  }
                  setModalAyudaRiesgo(false);
                  abrirModalRiesgo();
                }}
              >
                Entendido, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRiesgo && (
        <div className="riesgos__modal-overlay" onClick={() => !guardandoRiesgo && setModalRiesgo(false)}>
          <div className="riesgos__modal riesgos__modal--grande" onClick={(e) => e.stopPropagation()}>
            <div className="riesgos__modal-header">
              <div className="riesgos__modal-titulo">
                <ShieldCheck size={22} /> Crear riesgo manual
              </div>
              <button className="riesgos__modal-cerrar" onClick={() => setModalRiesgo(false)}>
                <X size={20} />
              </button>
            </div>
            <form className="riesgos__modal-body" onSubmit={guardarRiesgoPersonalizado}>
              <div className="riesgos__form-grid">
                <label className="riesgos__campo">
                  <span>Nombre del riesgo</span>
                  <input
                    className="riesgos__input"
                    value={formRiesgo.nombre}
                    onChange={(e) => setFormRiesgo((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej. Dependencia de un solo proveedor"
                    maxLength={120}
                    required
                  />
                </label>
                <label className="riesgos__campo">
                  <span>Categoría</span>
                  <input
                    className="riesgos__input"
                    value={formRiesgo.categoria}
                    onChange={(e) => setFormRiesgo((f) => ({ ...f, categoria: e.target.value }))}
                    placeholder="Ej. Operacional"
                    maxLength={80}
                  />
                </label>
                <label className="riesgos__campo">
                  <span>Probabilidad</span>
                  <select
                    className="riesgos__input"
                    value={formRiesgo.probabilidad}
                    onChange={(e) => setFormRiesgo((f) => ({ ...f, probabilidad: e.target.value }))}
                  >
                    <option value={1}>1 - Baja</option>
                    <option value={2}>2 - Media</option>
                    <option value={3}>3 - Alta</option>
                    <option value={4}>4 - Muy alta</option>
                    <option value={5}>5 - Crítica</option>
                  </select>
                </label>
                <label className="riesgos__campo">
                  <span>Impacto</span>
                  <select
                    className="riesgos__input"
                    value={formRiesgo.impacto}
                    onChange={(e) => setFormRiesgo((f) => ({ ...f, impacto: e.target.value }))}
                  >
                    <option value={1}>1 - Mínimo</option>
                    <option value={2}>2 - Menor</option>
                    <option value={3}>3 - Moderado</option>
                    <option value={4}>4 - Mayor</option>
                    <option value={5}>5 - Crítico</option>
                  </select>
                </label>
                <label className="riesgos__campo riesgos__campo--ancho">
                  <span>Descripción</span>
                  <textarea
                    className="riesgos__input riesgos__textarea"
                    value={formRiesgo.descripcion}
                    onChange={(e) => setFormRiesgo((f) => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Describe cuándo aparece el riesgo y cómo afecta el proyecto"
                    rows={4}
                  />
                </label>
                <label className="riesgos__campo riesgos__campo--ancho">
                  <span>Tratamiento</span>
                  <textarea
                    className="riesgos__input riesgos__textarea"
                    value={formRiesgo.tratamiento}
                    onChange={(e) => setFormRiesgo((f) => ({ ...f, tratamiento: e.target.value }))}
                    placeholder="Define cómo lo mitigarías o qué acción tomarías"
                    rows={4}
                  />
                </label>
              </div>

              <div className="riesgos__escala-ajuda">
                <strong>Guía rápida:</strong> 1 es bajo, 3 es alto, 5 es crítico y la descripción debe explicar cuándo aparece el riesgo y qué efecto tiene.
              </div>

              <div className="riesgos__modal-footer">
                <button className="riesgos__btn-secundario" type="button" onClick={autocompletarRiesgoConIA} disabled={autocompletandoRiesgo || guardandoRiesgo}>
                  {autocompletandoRiesgo ? "Completando..." : "Autocompletar con IA"}
                </button>
                <button className="riesgos__btn-secundario" type="button" onClick={() => setModalRiesgo(false)}>
                  Cancelar
                </button>
                <button className="riesgos__btn-ia" type="submit" disabled={guardandoRiesgo}>
                  {guardandoRiesgo ? "Guardando..." : "Guardar riesgo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
