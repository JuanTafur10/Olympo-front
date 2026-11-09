// contexto_app.js — Estado global de la aplicación Ambriosa
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { usuario_actual } from "../data/datos_mock";
import { actualizar_foto_perfil_api, actualizar_usuario_api, establecer_token_sesion, login_usuario_api, obtener_usuario_actual_api, registrar_usuario_api } from "../services/auth_api";
import { enviar_mensaje_chatbot, obtener_historial_chatbot } from "../services/chatbot_api";
import { cerrarSesionFirebaseCliente, iniciarSesionFirebaseCliente, escucharChatsUsuario, suscribirseAuthFirebaseCliente, escucharContadorMensajesNoLeidos } from "../services/chat_firebase";
import { escucharNotificacionesUsuario } from "../services/notificaciones_firebase";

const ContextoApp = createContext(null);

const normalizar_tipo_usuario = (rol) => {
  const rol_normalizado = String(rol ?? "").toUpperCase();
  if (rol_normalizado === "OWNER") return "emprendedor";
  if (rol_normalizado === "USER") return "inversionista";
  if (rol_normalizado === "ADMIN") return "admin";
  return rol;
};

const normalizar_usuario = (usuario = {}) => ({
  ...usuario_actual,
  ...usuario,
  id: usuario.id ?? usuario.id_usuario,
  nombre_usuario: usuario.nombre_usuario ?? usuario.nombre ?? usuario_actual.nombre_usuario,
  email_usuario: usuario.email_usuario ?? usuario.email,
  tipo_usuario: normalizar_tipo_usuario(usuario.tipo_usuario ?? usuario.role ?? usuario.rol) ?? usuario_actual.tipo_usuario,
  es_admin: typeof usuario.es_admin === "boolean" ? usuario.es_admin : String(usuario.role ?? usuario.tipo_usuario ?? usuario.rol ?? "").toUpperCase() === "ADMIN",
  esta_activo: typeof usuario.activo === "boolean" ? usuario.activo : usuario.status ? usuario.status === "ACTIVE" : usuario_actual.esta_activo,
  pendiente_aprobacion: typeof usuario.pendiente_aprobacion === "boolean" ? usuario.pendiente_aprobacion : false,
  descripcion_usuario:
    usuario.descripcion_usuario ??
    usuario.descripcion ??
    usuario.biografia_emprendedor ??
    usuario.biografia_inversionista ??
    usuario_actual.descripcion_usuario,
  telefono_usuario: usuario.telefono_usuario ?? usuario.telefono ?? "No registrado",
  website_usuario: usuario.website_usuario ?? usuario.website ?? "No registrado",
  linkedin_usuario: usuario.linkedin_usuario ?? usuario.linkedin ?? "No registrado",
  ciudad_usuario: usuario.ciudad_usuario ?? usuario.ciudad ?? "No registrado",
  verificacion: usuario.verificacion ?? usuario_actual.verificacion,
  foto_perfil: usuario.foto_perfil || null,
});

const configuracion_predeterminada = {
  idioma: "es",
  tema: "oscuro",
  notificaciones_push: true,
  notificaciones_email: true,
  resumen_semanal: true,
  moneda: "COP",
  formato_fecha: "dd/mm/yyyy",
  densidad: "comoda",
  reducir_animaciones: false,
  mostrar_saldos: true,
  autoguardado: true,
};

const normalizar_configuracion = (configuracion = {}) => ({
  ...configuracion_predeterminada,
  ...configuracion,
});

export function ProveedorApp({ children }) {
  const usuario_guardado = localStorage.getItem("olympo_usuario");
  const token_guardado = localStorage.getItem("olympo_token");
  const configuracion_guardada = localStorage.getItem("olympo_configuracion");

  // Estado de sesión
  const [esta_autenticado, set_esta_autenticado] = useState(Boolean(token_guardado));
  const [datos_usuario, set_datos_usuario] = useState(() => {
    if (!usuario_guardado) return {};
    try {
      return normalizar_usuario(JSON.parse(usuario_guardado));
    } catch (_) {
      return {};
    }
  });

  const [configuracion_global, set_configuracion_global] = useState(() => {
    if (!configuracion_guardada) return configuracion_predeterminada;
    try {
      return normalizar_configuracion(JSON.parse(configuracion_guardada));
    } catch (_) {
      return configuracion_predeterminada;
    }
  });

  useEffect(() => {
    const tema_aplicado =
      configuracion_global.tema === "sistema"
        ? (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "claro" : "oscuro")
        : configuracion_global.tema;

    document.body.classList.toggle("tema-claro", tema_aplicado === "claro");
    document.body.classList.toggle("tema-oscuro", tema_aplicado !== "claro");
    document.body.dataset.densidad = configuracion_global.densidad;
    document.body.dataset.reducirAnimaciones = String(configuracion_global.reducir_animaciones);
    document.documentElement.lang = configuracion_global.idioma;
  }, [configuracion_global]);

  const actualizar_configuracion_global = (cambios) => {
    set_configuracion_global((prev) => {
      const actualizada = normalizar_configuracion({
        ...prev,
        ...(typeof cambios === "function" ? cambios(prev) : cambios),
      });
      localStorage.setItem("olympo_configuracion", JSON.stringify(actualizada));
      return actualizada;
    });
  };

  const restablecer_configuracion_global = () => {
    set_configuracion_global(configuracion_predeterminada);
    localStorage.setItem("olympo_configuracion", JSON.stringify(configuracion_predeterminada));
  };

  // Estado del sidebar
  const [sidebar_abierto, set_sidebar_abierto] = useState(false);
  const [sidebar_colapsado, set_sidebar_colapsado] = useState(false);
  const toggle_sidebar = () => set_sidebar_abierto(!sidebar_abierto);
  const toggle_sidebar_colapsado = () => set_sidebar_colapsado((prev) => !prev);
  const cerrar_sidebar = () => set_sidebar_abierto(false);

  // Estado del chat bot
  const [mensajes_bot, set_mensajes_bot] = useState([]);
  const [historial_cargado, set_historial_cargado] = useState(false);

  // Resetear chat cuando cambia el usuario
  useEffect(() => {
    set_mensajes_bot([]);
    set_historial_cargado(false);
  }, [datos_usuario.id]);

  const [usuario_firebase_actual, set_usuario_firebase_actual] = useState(null);

  // Cargar historial cuando entra al chat (solo la primera vez)
  useEffect(() => {
    // Solo cargar si aún no se ha cargado
    if (historial_cargado) {
      return;
    }

    let activo = true;

    const cargarHistorial = async () => {
      if (!datos_usuario.id) return;
      set_mensajes_bot([]); // Limpiar antes de cargar para evitar ver mensajes previos
      try {
        console.debug(`[Chatbot] Cargando historial para usuario ID: ${datos_usuario.id}`);
        const historial = await obtener_historial_chatbot(datos_usuario.id, 200);
        console.debug("Historial chatbot obtenido:", historial);
        if (!activo || !historial) {
          if (activo) set_historial_cargado(true);
          return;
        }

        // Mapear historial a la estructura de mensajes que usa la UI
        const mensajesFormateados = [];
        historial.forEach((item) => {
          // El backend devuelve createdAt como ISO string o timestamp
          let fechaObj = null;
          if (item.createdAt) {
            if (typeof item.createdAt === "string") {
              fechaObj = new Date(item.createdAt);
            } else if (typeof item.createdAt.toDate === "function") {
              fechaObj = item.createdAt.toDate();
            } else if (item.createdAt.seconds || item.createdAt._seconds) {
              const secs = item.createdAt.seconds ?? item.createdAt._seconds;
              fechaObj = new Date(secs * 1000);
            } else {
              fechaObj = new Date(item.createdAt);
            }
          }

          const hora = fechaObj && !isNaN(fechaObj.getTime())
            ? fechaObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "";

          if (item.userMessage) {
            mensajesFormateados.push({
              id_mensaje_bot: mensajesFormateados.length + 1,
              es_del_usuario: true,
              contenido_mensaje_bot: item.userMessage,
              hora_mensaje_bot: hora,
            });
          }

          if (item.botResponse) {
            mensajesFormateados.push({
              id_mensaje_bot: mensajesFormateados.length + 1,
              es_del_usuario: false,
              contenido_mensaje_bot: item.botResponse,
              hora_mensaje_bot: hora,
            });
          }
        });

        console.debug("Mensajes formateados chatbot:", mensajesFormateados);
        // Actualizar aunque esté vacío (para limpiar estado previo)
        if (activo) {
          set_mensajes_bot(mensajesFormateados);
          set_historial_cargado(true);
        }
      } catch (error) {
        console.error("No se pudo cargar historial chatbot:", error);
        if (activo) set_historial_cargado(true);
      }
    };

    cargarHistorial();

    return () => {
      activo = false;
    };
  }, [historial_cargado, datos_usuario.id]);

  // Estado de mensajes con inversionistas
  const [id_inversionista_activo, set_id_inversionista_activo] = useState(null);
  const [datos_contacto_temporario, set_datos_contacto_temporario] = useState(null);
  const [chats_activos, set_chats_activos] = useState([]);
  const [notificaciones_no_leidas_mensajes, set_notificaciones_no_leidas_mensajes] = useState(0);

  // Estado de notificaciones
  const [notificaciones_activas, set_notificaciones_activas] = useState([]);
  const [notificaciones_persistentes, set_notificaciones_persistentes] = useState([]);
  const [notificaciones_sin_leer, set_notificaciones_sin_leer] = useState(0);
  const contador_notificacion_id = useRef(0);
  const ultimos_tiempos_chats = useRef(new Map());
  const ids_notificaciones_vistas = useRef(new Set());
  const notificaciones_inicializadas = useRef(false);
  const _unread_subs = useRef(new Map());
  const _unread_counts = useRef(new Map());

  const mostrar_notificacion = useCallback((tipo = "info", mensaje = "", duracion = 4000, meta = null) => {
    if (!configuracion_global.notificaciones_push) {
      return null;
    }

    const id_notif = contador_notificacion_id.current + 1;
    contador_notificacion_id.current = id_notif;
    const nueva_notif = { id: id_notif, tipo, mensaje, duracion, meta };
    set_notificaciones_activas((notifs) => [...notifs, nueva_notif]);
    if (duracion > 0) {
      setTimeout(() => {
        set_notificaciones_activas((notifs) => notifs.filter((n) => n.id !== id_notif));
      }, duracion);
    }
    return id_notif;
  }, [configuracion_global.notificaciones_push]);

  const remover_notificacion = (id) => {
    set_notificaciones_activas((prev) => prev.filter((n) => n.id !== id));
  };

  useEffect(() => {
    ids_notificaciones_vistas.current = new Set();
    notificaciones_inicializadas.current = false;
    set_notificaciones_persistentes([]);
    set_notificaciones_sin_leer(0);
  }, [datos_usuario.id]);

  useEffect(() => {
    const usuario_id = datos_usuario.id;

    if (!esta_autenticado || !usuario_id) {
      return undefined;
    }

    let activo = true;

    const desuscribir = escucharNotificacionesUsuario({ userId: usuario_id }, (items) => {
      if (!activo || !Array.isArray(items)) return;

      set_notificaciones_persistentes(items);
      set_notificaciones_sin_leer(items.filter((n) => !n.leida).length);

      if (!notificaciones_inicializadas.current) {
        ids_notificaciones_vistas.current = new Set(items.map((n) => String(n.id)));
        notificaciones_inicializadas.current = true;
        return;
      }

      const ids_anteriores = ids_notificaciones_vistas.current;
      const nuevos_items = items.filter((n) => !ids_anteriores.has(String(n.id)));

      ids_notificaciones_vistas.current = new Set(items.map((n) => String(n.id)));

      nuevos_items.forEach((notif) => {
        const tipo_toast = notif.tipo === "ia_scoring" || notif.tipo === "proyecto" ? "exito" : "info";
        const mensaje_toast = notif.mensaje ? `${notif.titulo || "Notificación"} · ${notif.mensaje}` : (notif.titulo || "Nueva notificación");
        mostrar_notificacion(tipo_toast, mensaje_toast, 5000, {
          notificationId: notif.id,
          rutaDestino: notif.ruta_destino,
          metadata: notif.metadata,
        });
      });
    });

    // Copiar referencias a los objetos Map desde los refs para usarlas en el cleanup
    const __unread_subs = _unread_subs.current;
    const __unread_counts = _unread_counts.current;

    return () => {
      activo = false;
      if (typeof desuscribir === "function") {
        desuscribir();
      }
      // limpiar subscripciones de contador de no leídos usando las refs capturadas
      try {
        for (const [, unsub] of Array.from(__unread_subs.entries())) {
          try { unsub(); } catch (_) {}
        }
      } catch (_) {}
      try { __unread_subs.clear(); } catch (_) {}
      try { __unread_counts.clear(); } catch (_) {}
    };
  }, [esta_autenticado, datos_usuario.id, mostrar_notificacion]);

  useEffect(() => {
    const desuscribir = suscribirseAuthFirebaseCliente((usuario_firebase) => {
      set_usuario_firebase_actual(usuario_firebase);
    });

    return () => {
      if (typeof desuscribir === "function") {
        desuscribir();
      }
    };
  }, []);

  useEffect(() => {
    const receiverId = usuario_firebase_actual?.uid || datos_usuario.firebase_uid;

    if (!esta_autenticado || !receiverId) {
      return undefined;
    }

    let activo = true;

    const desuscribir = escucharChatsUsuario({
      userId: receiverId,
    }, (chats) => {
      if (!activo || !Array.isArray(chats)) return;

      set_chats_activos(chats);

      // Gestionar subscripciones para conteo de mensajes no leídos por chat
      try {
        const chatIds = new Set((chats || []).map((c) => c.id));

        // Eliminar subscripciones a chats que ya no existen
        for (const [chatId, unsub] of Array.from(_unread_subs.current.entries())) {
          if (!chatIds.has(chatId)) {
            try { unsub(); } catch (_) {}
            _unread_subs.current.delete(chatId);
            _unread_counts.current.delete(chatId);
          }
        }

        // Agregar subscripciones nuevas
        (chats || []).forEach((chat) => {
          if (!chat || !chat.id) return;
          if (_unread_subs.current.has(chat.id)) return;

          const unsub = escucharContadorMensajesNoLeidos({ chatId: chat.id, receiverId: receiverId }, ({ marcas_no_leidos }) => {
            try {
              const count = Array.isArray(marcas_no_leidos) ? marcas_no_leidos.length : 0;
              _unread_counts.current.set(chat.id, count);
              const total = Array.from(_unread_counts.current.values()).reduce((a, b) => a + (Number(b) || 0), 0);
              set_notificaciones_no_leidas_mensajes(total);
            } catch (e) {
              console.error('[Chat] Error actualizando contador no leídos:', e);
            }
          });

          if (typeof unsub === 'function') {
            _unread_subs.current.set(chat.id, unsub);
          }
        });
      } catch (e) {
        console.warn('[Chat] Error gestionando subscripciones de no leídos', e);
      }

      chats.forEach(async (chat) => {
        const lastMessageAt = chat.lastMessageAt?.toDate ? chat.lastMessageAt.toDate().getTime() : new Date(chat.lastMessageAt || 0).getTime();
        const previous = ultimos_tiempos_chats.current.get(chat.id);

        if (previous == null) {
          ultimos_tiempos_chats.current.set(chat.id, lastMessageAt);
          return;
        }

        if (lastMessageAt <= previous) {
          return;
        }

        ultimos_tiempos_chats.current.set(chat.id, lastMessageAt);

        if (String(chat.lastSenderId || "") === String(receiverId)) {
          return;
        }

        const nombre_remitente = chat.lastSenderName || chat.participantNames?.[chat.lastSenderId] || "un contacto";
        // Intentar determinar el id del contacto (otro participante distinto al receiver)
        let contactId = null;
        try {
          const participantKeys = chat.participantNames ? Object.keys(chat.participantNames) : [];
          contactId = participantKeys.find((k) => String(k) !== String(receiverId)) || chat.lastSenderId || null;
        } catch (_) {
          contactId = chat.lastSenderId || null;
        }

        mostrar_notificacion("mensaje", `Nuevo mensaje de ${nombre_remitente}`, 4000, { chatId: chat.id, contactId });
      });
    });

    return () => {
      activo = false;
      if (typeof desuscribir === "function") {
        desuscribir();
      }
    };
  }, [esta_autenticado, datos_usuario.firebase_uid, datos_usuario.id, usuario_firebase_actual?.uid, mostrar_notificacion]);

  useEffect(() => {
    if (!esta_autenticado) return undefined;

    let activo = true;

    const cargar_usuario_db = async () => {
      try {
        const usuario_db = await obtener_usuario_actual_api();
        const usuario_normalizado = normalizar_usuario(usuario_db);

        if (!activo) return;

        set_datos_usuario(usuario_normalizado);
        try { localStorage.setItem("olympo_usuario", JSON.stringify(usuario_normalizado)); } catch(_) {}
      } catch (err) {
        console.warn("No se pudo recargar usuario desde DB:", err);
      }
    };

    cargar_usuario_db();

    return () => {
      activo = false;
    };
  }, [esta_autenticado, datos_usuario.id]);

  // Inicia sesión contra el backend y actualiza el estado global.
  const iniciar_sesion = async (email, contrasena, tipo_usuario) => {
    try {
      const respuesta_login = await login_usuario_api({
        email,
        password: contrasena,
        tipo_usuario,
      });

      const usuario_backend = respuesta_login.usuario;
      if (!usuario_backend || !respuesta_login.token) {
        throw new Error("La API no devolvió un usuario y token válidos.");
      }
      const rol_backend = usuario_backend.role || usuario_backend.rol || tipo_usuario;
      const datos_usuario_sesion = normalizar_usuario({
        ...usuario_backend,
        email,
        tipo_usuario: rol_backend,
        es_admin: Boolean(respuesta_login.es_admin ?? String(rol_backend).toUpperCase() === "ADMIN"),
      });

      localStorage.setItem("olympo_token", respuesta_login.token);
      establecer_token_sesion(respuesta_login.token);
      set_datos_usuario(datos_usuario_sesion);
      set_esta_autenticado(true);

      try {
        await iniciarSesionFirebaseCliente(email, contrasena);
      } catch (_) {
        // Si falla Firebase Auth el backend sigue funcionando, pero Firestore no tendrá permisos.
      }
      localStorage.setItem("olympo_usuario", JSON.stringify(datos_usuario_sesion));

      return { exitoso: true, mensaje: respuesta_login.mensaje || "Sesión iniciada" };
    } catch (error) {
      return { exitoso: false, mensaje: error.message || "No se pudo iniciar sesión" };
    }
  };

  // Función para registrar usuario
  const registrar_usuario = async (tipo_usuario, nombre_usuario, email, password, confirm_password, extras = {}) => {
    if (password !== confirm_password) {
      return { exitoso: false, mensaje: "Las contraseñas no coinciden" };
    }
    try {
      const respuesta_registro = await registrar_usuario_api({
        tipo_usuario,
        nombre_usuario,
        nombre: nombre_usuario,
        email,
        password,
        confirm_password,
        telefono: extras.telefono,
        website: extras.website,
        linkedin: extras.linkedin,
        ciudad: extras.ciudad,
        descripcion: extras.descripcion,
        acepta_terminos: extras.acepta_terminos,
      });

      if (respuesta_registro.requiere_aprobacion) {
        return {
          exitoso: true,
          requiere_aprobacion: true,
          mensaje: respuesta_registro.mensaje || "Tu cuenta quedó pendiente de aprobación",
        };
      }

      const respuesta_login = await iniciar_sesion(email, password, tipo_usuario);

      if (!respuesta_login.exitoso) {
        return {
          exitoso: false,
          mensaje: respuesta_login.mensaje || respuesta_registro.mensaje || "Usuario registrado, pero no se pudo iniciar sesión",
        };
      }

      return {
        exitoso: true,
        requiere_aprobacion: false,
        mensaje: respuesta_registro.mensaje || "Registro exitoso",
      };
    } catch (error) {
      return { exitoso: false, mensaje: error.message || "Error de conexión" };
    }
  };

  const cerrar_sesion = useCallback(() => {
    cerrarSesionFirebaseCliente().catch(() => {});
    set_esta_autenticado(false);
    localStorage.removeItem("olympo_token");
    establecer_token_sesion(null);
    localStorage.removeItem("olympo_usuario");
    set_datos_usuario(normalizar_usuario(usuario_actual));
  }, []);

  useEffect(() => {
    window.addEventListener("olympo:session-expired", cerrar_sesion);
    return () => window.removeEventListener("olympo:session-expired", cerrar_sesion);
  }, [cerrar_sesion]);

  const actualizar_perfil_usuario = async (datos_perfil) => {
    const usuario_id = datos_usuario.id;

    if (!usuario_id) {
      return { exitoso: false, mensaje: "No hay un usuario activo para actualizar" };
    }

    try {
      const usuario_actualizado = await actualizar_usuario_api(usuario_id, datos_perfil);
      const usuario_normalizado = normalizar_usuario({
        ...datos_usuario,
        ...usuario_actualizado,
      });

      set_datos_usuario(usuario_normalizado);
      localStorage.setItem("olympo_usuario", JSON.stringify(usuario_normalizado));

      return { exitoso: true, mensaje: "Perfil actualizado" };
    } catch (error) {
      return { exitoso: false, mensaje: error.message || "No se pudo actualizar el perfil" };
    }
  };
  
  const actualizar_foto_perfil = async (archivo) => {
    const usuario_id = datos_usuario.id;
    if (!usuario_id) return { exitoso: false, mensaje: "No hay un usuario activo" };

    try {
      const url_foto = await actualizar_foto_perfil_api(usuario_id, archivo);
      const usuario_normalizado = normalizar_usuario({
        ...datos_usuario,
        foto_perfil: url_foto,
      });
      set_datos_usuario(usuario_normalizado);
      localStorage.setItem("olympo_usuario", JSON.stringify(usuario_normalizado));
      return { exitoso: true, url: url_foto };
    } catch (error) {
      return { exitoso: false, mensaje: error.message || "No se pudo subir la foto" };
    }
  };

  const agregar_mensaje_bot = async (contenido_mensaje_bot) => {
    // Generar ID único para cada mensaje
    const id_usuario_msg = Date.now() + Math.random();
    
    const nuevo_mensaje = {
      id_mensaje_bot: id_usuario_msg,
      es_del_usuario: true,
      contenido_mensaje_bot,
      hora_mensaje_bot: "Ahora",
    };
    set_mensajes_bot((prev) => [...prev, nuevo_mensaje]);

    try {
      const respuesta_bot = await enviar_mensaje_chatbot(contenido_mensaje_bot, datos_usuario.id);
      
      const id_bot_msg = Date.now() + Math.random();
      set_mensajes_bot((prev) => [
        ...prev,
        {
          id_mensaje_bot: id_bot_msg,
          es_del_usuario: false,
          contenido_mensaje_bot: respuesta_bot,
          hora_mensaje_bot: "Ahora",
        },
      ]);
    } catch (error) {
      const id_error_msg = Date.now() + Math.random();
      set_mensajes_bot((prev) => [
        ...prev,
        {
          id_mensaje_bot: id_error_msg,
          es_del_usuario: false,
          contenido_mensaje_bot: "Disculpa, tuve un problema al procesar tu mensaje. Intenta de nuevo.",
          hora_mensaje_bot: "Ahora",
        },
      ]);
    }
  };

  const valor_contexto = {
    esta_autenticado,
    datos_usuario,
    mensajes_bot,
    establecer_mensajes_bot: (msgs) => set_mensajes_bot(msgs),
    id_inversionista_activo,
    set_id_inversionista_activo,
    datos_contacto_temporario,
    set_datos_contacto_temporario,
    chats_activos,
    contador_mensajes_no_leidos: notificaciones_no_leidas_mensajes,
    contador_notificaciones: notificaciones_sin_leer,
    notificaciones_persistentes,
    set_notificaciones_persistentes,
    notificaciones_sin_leer,
    set_notificaciones_sin_leer,
    iniciar_sesion,
    registrar_usuario,
    cerrar_sesion,
    actualizar_perfil_usuario,
    actualizar_foto_perfil,
    agregar_mensaje_bot,
    configuracion_global,
    actualizar_configuracion_global,
    restablecer_configuracion_global,
    notificaciones_activas,
    mostrar_notificacion,
    remover_notificacion,
    sidebar_abierto,
    sidebar_colapsado,
    toggle_sidebar,
    toggle_sidebar_colapsado,
    cerrar_sidebar,
  };

  return (
    <ContextoApp.Provider value={valor_contexto}>
      {children}
    </ContextoApp.Provider>
  );
}

export const useContextoApp = () => {
  const contexto = useContext(ContextoApp);
  if (!contexto) throw new Error("useContextoApp must be used within ProveedorApp");
  return contexto;
};
