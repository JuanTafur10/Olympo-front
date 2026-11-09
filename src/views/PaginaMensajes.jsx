// PaginaMensajes.jsx — Chat realtime con usuarios
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useContextoApp } from "../context/contexto_app";
import { useNavigate } from "../hooks/useNavigate";
import { lista_inversionistas, usuario_actual } from "../data/datos_mock";
import { listar_usuarios_api } from "../services/auth_api";
import {
  construirChatId,
  escucharMensajesChat,
  escucharContadorMensajesNoLeidos,
  enviarMensajeChat,
  obtenerUsuarioFirebaseCliente,
  marcarMensajesChatComoLeidos,
  suscribirseAuthFirebaseCliente,
  refrescarMensajesChat,
} from "../services/chat_firebase";
import { obtener_usuario_por_id_api } from "../services/auth_api";
import "./PaginaMensajes.css";

const mapearContacto = (usuario, fallbackId) => {
  const contactId = String(usuario.firebase_uid ?? usuario.id ?? usuario.email ?? fallbackId);
  return {
    id_contacto: contactId,
    firebase_uid_contacto: contactId,
    id_chat: contactId,
    usuario_id_contacto: usuario.id ?? usuario.id_usuario ?? null,
    nombre_contacto: usuario.nombre_usuario || usuario.nombre || usuario.email || "Usuario",
    rol_contacto: usuario.rol || "usuario",
    estado_contacto: usuario.activo ? "activo" : "inactivo",
    detalle_contacto: usuario.ciudad || usuario.descripcion || usuario.email || "Sin información",
    foto_perfil: usuario.foto_perfil || null,
    email_contacto: usuario.email_usuario || usuario.email || null,
    telefono_contacto: usuario.telefono_usuario || usuario.telefono || null,
    website_contacto: usuario.website_usuario || usuario.website || null,
    linkedin_contacto: usuario.linkedin_usuario || usuario.linkedin || null,
    ciudad_contacto: usuario.ciudad_usuario || usuario.ciudad || null,
    descripcion_contacto: usuario.descripcion_usuario || usuario.descripcion || null,
  };
};

const mapearContactoMock = (inversionista) => {
  const contactId = `mock:${inversionista.id_inversionista}`;
  return {
    id_contacto: contactId,
    id_chat: contactId,
    firebase_uid_contacto: contactId,
    nombre_contacto: inversionista.nombre_inversionista,
    rol_contacto: "inversionista",
    estado_contacto: inversionista.estado_inversionista,
    detalle_contacto: inversionista.interes_inversionista,
  };
};

const contactoCoincide = (contacto, id) => {
  const idStr = String(id ?? "");
  return [
    contacto.id_contacto,
    contacto.id_chat,
    contacto.firebase_uid_contacto,
    contacto.usuario_id_contacto,
  ].some((valor) => String(valor ?? "") === idStr);
};

const contactoTieneChat = (contacto, chatsIds) => {
  return [contacto.id_contacto, contacto.id_chat, contacto.firebase_uid_contacto]
    .some((valor) => chatsIds.has(String(valor ?? "")));
};

export default function PaginaMensajes() {
  const { id_inversionista_activo, set_id_inversionista_activo, datos_usuario, chats_activos, datos_contacto_temporario, set_datos_contacto_temporario } = useContextoApp();
  const navigate = useNavigate();
  const esAdmin = Boolean(datos_usuario?.es_admin || String(datos_usuario?.tipo_usuario || datos_usuario?.rol || "").toLowerCase() === "admin");

  const [texto_mensaje, set_texto_mensaje] = useState("");
  const [mensajes_chat, set_mensajes_chat] = useState([]);
  const [cargando_chat, set_cargando_chat] = useState(true);
  const [error_chat, set_error_chat] = useState("");
  const [busqueda_contacto, set_busqueda_contacto] = useState("");
  const [contactos_chat, set_contactos_chat] = useState([]);
  const [cargando_contactos, set_cargando_contactos] = useState(true);
  const [error_contactos, set_error_contactos] = useState("");
  const [firebase_usuario_actual, set_firebase_usuario_actual] = useState(null);
  const [mensajes_no_leidos_por_contacto, set_mensajes_no_leidos_por_contacto] = useState({});
  const [reunion_modal_abierta, set_reunion_modal_abierta] = useState(false);
  const [formulario_reunion, set_formulario_reunion] = useState({
    titulo: "",
    fecha_inicio: "",
    duracion_minutos: 30,
    lugar: "Google Meet",
    descripcion: "",
  });

  const sincronizarContactoConUsuario = (contacto_base, usuario) => {
    if (!contacto_base || !usuario) return contacto_base;

    const contacto_actualizado = mapearContacto(usuario, contacto_base.id_contacto);

    return {
      ...contacto_base,
      ...contacto_actualizado,
      id_contacto: contacto_base.id_contacto,
      id_chat: contacto_base.id_chat || contacto_actualizado.id_chat,
      firebase_uid_contacto: contacto_base.firebase_uid_contacto || contacto_actualizado.firebase_uid_contacto,
      usuario_id_contacto: contacto_base.usuario_id_contacto ?? contacto_actualizado.usuario_id_contacto,
      detalle_contacto: contacto_base.detalle_contacto || contacto_actualizado.detalle_contacto,
    };
  };

  const formatear_fecha_local_para_input = (fecha) => {
    const ano = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    const hora = String(fecha.getHours()).padStart(2, "0");
    const minuto = String(fecha.getMinutes()).padStart(2, "0");
    return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
  };

  const inicializar_formulario_reunion = (contacto = contacto_seleccionado) => {
    const inicio = new Date();
    inicio.setHours(inicio.getHours() + 1, 0, 0, 0);

    set_formulario_reunion({
      titulo: `Reunión con ${contacto?.nombre_contacto || "contacto"}`,
      fecha_inicio: formatear_fecha_local_para_input(inicio),
      duracion_minutos: 30,
      lugar: "Google Meet",
      descripcion: `Reunión agendada desde Mensajes con ${contacto?.nombre_contacto || "el contacto"}.`,
    });
  };

  const abrir_modal_reunion = () => {
    inicializar_formulario_reunion();
    set_reunion_modal_abierta(true);
  };

  const cerrar_modal_reunion = () => {
    set_reunion_modal_abierta(false);
  };

  const actualizar_formulario_reunion = (campo, valor) => {
    set_formulario_reunion((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const crear_link_google_meet = () => {
    const token = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;

    return `https://meet.google.com/new?invite=${token}`;
  };

  const formatear_fecha_humana = (valor) => {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor || "";

    return fecha.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const manejar_creacion_reunion = async (e) => {
    e.preventDefault();

    try {
      const fecha_inicio = new Date(formulario_reunion.fecha_inicio);
      if (Number.isNaN(fecha_inicio.getTime())) {
        throw new Error("Selecciona una fecha y hora válidas");
      }

      const duracion = Number(formulario_reunion.duracion_minutos);
      if (!Number.isFinite(duracion) || duracion <= 0) {
        throw new Error("La duración debe ser mayor a 0");
      }

      if (!contacto_seleccionado) {
        throw new Error("Selecciona un contacto para enviar la invitación");
      }

      const fecha_fin = new Date(fecha_inicio.getTime() + duracion * 60000);
      const meeting_url = crear_link_google_meet();
      const texto_invite = [
        `Te invito a una reunión: ${formulario_reunion.titulo.trim()}`,
        `Fecha: ${formatear_fecha_humana(formulario_reunion.fecha_inicio)}`,
        `Duración: ${duracion} minutos`,
        formulario_reunion.descripcion.trim() ? `Detalles: ${formulario_reunion.descripcion.trim()}` : null,
        `Enlace de Google Meet: ${meeting_url}`,
      ].filter(Boolean).join("\n");

      await enviarMensajeChat({
        chatId: chat_id,
        senderId: usuario_actual_chat.id,
        senderName: usuario_actual_chat.nombre,
        senderPhoto: datos_usuario.foto_perfil,
        receiverId: contacto_seleccionado.firebase_uid_contacto || contacto_seleccionado.id_chat,
        receiverName: contacto_seleccionado.nombre_contacto,
        receiverPhoto: contacto_seleccionado.foto_perfil,
        texto: texto_invite,
        tipoMensaje: "reunion",
        meetingUrl: meeting_url,
        meetingTitle: formulario_reunion.titulo.trim(),
        meetingStart: fecha_inicio.toISOString(),
        meetingEnd: fecha_fin.toISOString(),
        meetingDetails: formulario_reunion.descripcion.trim(),
      });

      set_reunion_modal_abierta(false);
    } catch (error) {
      set_error_chat(error.message || "No se pudo preparar la reunión");
    }
  };

  const cerrarChat = () => {
    // Limpiar selección y estado del chat
    try {
      set_datos_contacto_temporario(null);
    } catch (_) {}
    try {
      set_id_inversionista_activo(null);
    } catch (_) {}
    set_mensajes_chat([]);
    set_cargando_chat(false);
    set_error_chat("");
  };

  const usuario_actual_chat = useMemo(() => {
    const id_usuario =
      firebase_usuario_actual?.uid ||
      datos_usuario.firebase_uid;

    return {
      id: String(id_usuario || "sin-id"),
      nombre: datos_usuario.nombre_usuario || datos_usuario.nombre || usuario_actual.nombre_usuario,
      firebase_uid: String(id_usuario || ""),
    };
  }, [datos_usuario, firebase_usuario_actual]);

  const contactos_filtrados = useMemo(() => {
    const busqueda = busqueda_contacto.toLowerCase().trim();

    // 1. Obtener todos los IDs de personas con las que hay un chat activo
    const ids_con_chat = new Set();
    const info_contactos_desde_chats = [];

    if (Array.isArray(chats_activos)) {
      chats_activos.forEach((chat) => {
        const otroId = (chat.participants || []).find(
          (p) => String(p) !== String(usuario_actual_chat.id)
        );
        
        if (otroId) {
          const idStr = String(otroId);
          ids_con_chat.add(idStr);
          
          // Si este usuario no está en nuestra lista de contactos_chat, 
          // creamos un contacto "fantasma" usando la info del chat
          const existeEnLista = contactos_chat.some(c => String(c.id_contacto) === idStr);
          if (!existeEnLista) {
            info_contactos_desde_chats.push({
              id_contacto: idStr,
              id_chat: idStr,
              firebase_uid_contacto: idStr,
              nombre_contacto: chat.participantNames?.[idStr] || chat.lastSenderName || "Usuario Nuevo",
              rol_contacto: "contacto",
              estado_contacto: "activo",
              detalle_contacto: "Nuevo mensaje",
              foto_perfil: chat.participantPhotos?.[idStr] || null,
            });
          }
        }
      });
    }

    // 2. Si hay una búsqueda activa, mostrar todos los de la lista global que coincidan
    if (busqueda.length > 0) {
      return contactos_chat.filter((contacto) =>
        contacto.nombre_contacto.toLowerCase().includes(busqueda) ||
        contacto.rol_contacto.toLowerCase().includes(busqueda) ||
        String(contacto.id_chat || "").toLowerCase().includes(busqueda)
      );
    }

    // 3. Si NO hay búsqueda, mostrar:
    //    - Contactos de la lista global que tienen chat
    //    - Contactos "fantasma" que vienen de chats activos pero no están en la lista global
    const contactos_con_chat_real = contactos_chat.filter((contacto) => contactoTieneChat(contacto, ids_con_chat));

    return [...contactos_con_chat_real, ...info_contactos_desde_chats].sort((a, b) => 
      a.nombre_contacto.localeCompare(b.nombre_contacto)
    );
  }, [contactos_chat, busqueda_contacto, chats_activos, usuario_actual_chat.id]);

  useEffect(() => {
    return suscribirseAuthFirebaseCliente((usuario_firebase) => {
      set_firebase_usuario_actual(usuario_firebase);
    });
  }, []);

  useEffect(() => {
    let activo = true;

    const cargar_contactos = async () => {
      set_cargando_contactos(true);
      set_error_contactos("");

      try {
        const usuarios = await listar_usuarios_api(datos_usuario.id);
        const contactos = usuarios
          .map((usuario, indice) => mapearContacto(usuario, indice + 1))
          .filter((contacto) => contacto.id_contacto !== usuario_actual_chat.id)
          .sort((a, b) => a.nombre_contacto.localeCompare(b.nombre_contacto));

        if (!activo) return;

        set_contactos_chat(contactos);
        // Eliminado: selección automática del primer contacto para mostrar pantalla de bienvenida
      } catch (error) {
        if (!activo) return;

        set_error_contactos(error.message || "No se pudieron cargar los usuarios, usando datos de respaldo");
        set_contactos_chat(lista_inversionistas.map(mapearContactoMock));
      } finally {
        if (activo) {
          set_cargando_contactos(false);
        }
      }
    };

    cargar_contactos();

    return () => {
      activo = false;
    };
  }, [datos_usuario.id, usuario_actual_chat.id, set_id_inversionista_activo, esAdmin]);

  useEffect(() => {
    if (!usuario_actual_chat.id || contactos_filtrados.length === 0) {
      return undefined;
    }

    let activo = true;
    const desuscripciones = [];

    contactos_filtrados.forEach((contacto) => {
      if (!contacto.id_chat) return;
      const chatIdContacto = construirChatId(usuario_actual_chat.id, contacto.id_chat);

      const desuscribir = escucharContadorMensajesNoLeidos(
        { chatId: chatIdContacto, receiverId: usuario_actual_chat.id },
        ({ marcas_no_leidos }) => {
          if (!activo) return;

          // No sobrescribir el contador del contacto seleccionado actualmente
          // ya que marcar_leidos se encarga de eso
          set_mensajes_no_leidos_por_contacto((prev) => {
            const id_contacto = contacto.id_contacto;
            const nuevaCantidad = (marcas_no_leidos || []).length;

            // Si el contacto está actualmente seleccionado y ya marcamos como 0,
            // no sobrescribir con datos que aún no se actualizaron en Firestore
            if (String(id_inversionista_activo) === String(id_contacto) && prev[id_contacto] === 0) {
              return prev;
            }

            return {
              ...prev,
              [id_contacto]: nuevaCantidad,
            };
          });
        }
      );

      desuscripciones.push(desuscribir);
    });

    return () => {
      activo = false;
      desuscripciones.forEach((desuscribir) => {
        if (typeof desuscribir === "function") {
          desuscribir();
        }
      });
    };
  }, [contactos_filtrados, usuario_actual_chat.id, id_inversionista_activo]);

  const contacto_seleccionado = useMemo(() => {
    // Si hay un contacto temporario cargado (ej. desde Explorar Usuarios o Soporte Admin),
    // debemos forzar su visualización. Se limpia automáticamente al seleccionar otro chat.
    if (datos_contacto_temporario) {
      return datos_contacto_temporario;
    }

    // De lo contrario, intentar encontrar el contacto seleccionado en la lista filtrada
    const seleccionado = contactos_filtrados.find((contacto) => contactoCoincide(contacto, id_inversionista_activo));
    if (seleccionado) return seleccionado;
    
    return null;
  }, [contactos_filtrados, id_inversionista_activo, datos_contacto_temporario]);

  useEffect(() => {
    if (!contacto_seleccionado?.id_contacto) return;

    set_mensajes_no_leidos_por_contacto((prev) => ({
      ...prev,
      [contacto_seleccionado.id_contacto]: 0,
    }));
  }, [contacto_seleccionado?.id_contacto]);

  useEffect(() => {
    if (!contacto_seleccionado?.id_contacto) return undefined;

    const usuario_id_contacto = contacto_seleccionado.usuario_id_contacto;
    if (!usuario_id_contacto) return undefined;

    let activo = true;

    const cargar_contacto_actualizado = async () => {
      try {
        const usuario_actualizado = await obtener_usuario_por_id_api(usuario_id_contacto);
        if (!activo || !usuario_actualizado) return;

        const contacto_actualizado = sincronizarContactoConUsuario(contacto_seleccionado, usuario_actualizado);

        set_contactos_chat((prev) =>
          prev.map((contacto) =>
            contactoCoincide(contacto, contacto_actualizado.id_contacto)
              ? contacto_actualizado
              : contacto
          )
        );

        if (datos_contacto_temporario && contactoCoincide(datos_contacto_temporario, contacto_actualizado.id_contacto)) {
          set_datos_contacto_temporario(contacto_actualizado);
        }
      } catch (error) {
        console.warn("No se pudo refrescar el perfil del contacto:", error);
      }
    };

    cargar_contacto_actualizado();

    return () => {
      activo = false;
    };
  }, [contacto_seleccionado, datos_contacto_temporario, set_datos_contacto_temporario]);

  // Limpiar mensajes cuando cambia el contacto
  useEffect(() => {
    set_mensajes_chat([]);
    set_cargando_chat(true);
  }, [contacto_seleccionado?.id_contacto]);

  const chat_id = useMemo(() => {
    if (!contacto_seleccionado?.id_chat || !usuario_actual_chat?.id) return null;
    return construirChatId(usuario_actual_chat.id, contacto_seleccionado.id_chat);
  }, [contacto_seleccionado, usuario_actual_chat.id]);

  useEffect(() => {
    if (!chat_id || !usuario_actual_chat.id) return undefined;

    let activo = true;

    const marcar_leidos = async () => {
      try {
        if (contacto_seleccionado?.id_contacto) {
          set_mensajes_no_leidos_por_contacto((prev) => ({
            ...prev,
            [contacto_seleccionado.id_contacto]: 0,
          }));
        }

        const actualizados = await marcarMensajesChatComoLeidos({
          chatId: chat_id,
          receiverId: usuario_actual_chat.id,
        });

        console.log(`[Chat] marcar_leidos completado: ${actualizados} actualizados`);

        // Forzar el estado a 0 después de la actualización exitosa
        if (activo && contacto_seleccionado?.id_contacto) {
          set_mensajes_no_leidos_por_contacto((prev) => ({
            ...prev,
            [contacto_seleccionado.id_contacto]: 0,
          }));
        }
      } catch (error) {
        if (activo) {
          console.error("No se pudieron marcar como leídos:", error);
        }
      }
    };

    marcar_leidos();

    return () => {
      activo = false;
    };
  }, [chat_id, usuario_actual_chat.id, contacto_seleccionado?.id_contacto]);

  useEffect(() => {
    if (!firebase_usuario_actual) {
      set_cargando_chat(true);
      set_error_chat("");
      return undefined;
    }

    if (!chat_id) {
      set_mensajes_chat([]);
      set_cargando_chat(false);
      return undefined;
    }

    set_cargando_chat(true);
    set_error_chat("");

    try {
      const desuscribir = escucharMensajesChat({ chatId: chat_id }, (mensajes) => {
        console.log(`[Chat ${chat_id}] Mensajes actualizados:`, mensajes.length);
        const mensajes_normalizados = mensajes.map((mensaje, indice) => ({
          id_mensaje: mensaje.id || `${chat_id}-${indice}`,
          es_del_usuario_actual: mensaje.senderId === firebase_usuario_actual.uid,
          contenido_mensaje: mensaje.texto || "",
          tipo_mensaje: mensaje.tipoMensaje || "texto",
          meeting_url: mensaje.meetingUrl || null,
          meeting_title: mensaje.meetingTitle || null,
          meeting_start: mensaje.meetingStart || null,
          meeting_end: mensaje.meetingEnd || null,
          meeting_details: mensaje.meetingDetails || null,
          hora_mensaje:
            mensaje.createdAt && typeof mensaje.createdAt.toDate === "function"
              ? mensaje.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Ahora",
          senderId: mensaje.senderId,
          senderPhoto: mensaje.senderPhoto,
          receiverId: mensaje.receiverId,
          receiverPhoto: mensaje.receiverPhoto,
        }));

        set_mensajes_chat(mensajes_normalizados);
        set_cargando_chat(false);
      });

      return () => desuscribir();
    } catch (error) {
      set_error_chat(error.message || "No se pudo cargar el chat");
      set_cargando_chat(false);
      return undefined;
    }
  }, [chat_id, firebase_usuario_actual]);

  const _enviar_mensaje = async () => {
    const mensaje_limpio = texto_mensaje.trim();
    if (!mensaje_limpio || !chat_id || !contacto_seleccionado) return;

    set_texto_mensaje("");
    set_error_chat("");

    const usuario_firebase_actual = obtenerUsuarioFirebaseCliente();
    const sender_id_actual = usuario_firebase_actual?.uid || usuario_actual_chat.id;

    try {
      await enviarMensajeChat({
        chatId: chat_id,
        senderId: sender_id_actual,
        senderName: usuario_actual_chat.nombre,
        senderPhoto: datos_usuario.foto_perfil,
        receiverId: contacto_seleccionado.firebase_uid_contacto || contacto_seleccionado.id_chat,
        receiverName: contacto_seleccionado.nombre_contacto,
        receiverPhoto: contacto_seleccionado.foto_perfil,
        texto: mensaje_limpio,
      });
      
      // Refrescar manualmente los mensajes después de enviar
      // para asegurar que el primer mensaje aparezca
      setTimeout(async () => {
        try {
          const mensajes_frescos = await refrescarMensajesChat({ chatId: chat_id });
          console.log("[Chat] Refetch manual:", mensajes_frescos.length, "mensajes");
          
          const mensajes_normalizados = mensajes_frescos.map((mensaje, indice) => ({
            id_mensaje: mensaje.id || `${chat_id}-${indice}`,
            es_del_usuario_actual: mensaje.senderId === firebase_usuario_actual.uid,
            contenido_mensaje: mensaje.texto || "",
            hora_mensaje:
              mensaje.createdAt && typeof mensaje.createdAt.toDate === "function"
                ? mensaje.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Ahora",
            senderId: mensaje.senderId,
            senderPhoto: mensaje.senderPhoto,
            receiverId: mensaje.receiverId,
            receiverPhoto: mensaje.receiverPhoto,
          }));
          
          set_mensajes_chat(mensajes_normalizados);
        } catch (err) {
          console.error("[Chat] Error en refetch manual:", err);
        }
      }, 300);
    } catch (error) {
      set_error_chat(error.message || "No se pudo enviar el mensaje");
      set_texto_mensaje(mensaje_limpio);
    }
  };

  const _obtener_clase_estado = (estado) => {
    if (estado === "activo") return "mensajes__punto--activo";
    if (estado === "negociacion") return "mensajes__punto--negociacion";
    return "mensajes__punto--inactivo";
  };

  const obtener_foto_avatar_mensaje = (mensaje) => {
    if (String(mensaje.senderId ?? "") === String(usuario_actual_chat.id)) {
      return datos_usuario.foto_perfil || mensaje.senderPhoto || null;
    }

    return contacto_seleccionado?.foto_perfil || mensaje.senderPhoto || null;
  };

  return (
    <div className="mensajes">


      {reunion_modal_abierta && (
        <div className="mensajes__modal-reunion" role="dialog" aria-modal="true" aria-labelledby="mensajes-reunion-titulo">
          <div className="mensajes__modal-reunion-contenido">
            <div className="mensajes__modal-reunion-encabezado">
              <div>
                <p className="mensajes__modal-reunion-etiqueta">Google Meet</p>
                <h3 id="mensajes-reunion-titulo">Programar reunión</h3>
              </div>
              <button type="button" className="mensajes__modal-reunion-cerrar" onClick={cerrar_modal_reunion} aria-label="Cerrar">×</button>
            </div>

            <form className="mensajes__modal-reunion-formulario" onSubmit={manejar_creacion_reunion}>
              <label>
                Título
                <input
                  type="text"
                  value={formulario_reunion.titulo}
                  onChange={(e) => actualizar_formulario_reunion("titulo", e.target.value)}
                  required
                />
              </label>

              <label>
                Fecha y hora
                <input
                  type="datetime-local"
                  value={formulario_reunion.fecha_inicio}
                  onChange={(e) => actualizar_formulario_reunion("fecha_inicio", e.target.value)}
                  required
                />
              </label>

              <label>
                Duración (minutos)
                <input
                  type="number"
                  min="15"
                  step="5"
                  value={formulario_reunion.duracion_minutos}
                  onChange={(e) => actualizar_formulario_reunion("duracion_minutos", e.target.value)}
                  required
                />
              </label>

              <label>
                Lugar / enlace
                <input
                  type="text"
                  value={formulario_reunion.lugar}
                  onChange={(e) => actualizar_formulario_reunion("lugar", e.target.value)}
                  placeholder="Google Meet, oficina, videollamada..."
                />
              </label>

              <label>
                Descripción
                <textarea
                  rows="4"
                  value={formulario_reunion.descripcion}
                  onChange={(e) => actualizar_formulario_reunion("descripcion", e.target.value)}
                />
              </label>

              <div className="mensajes__modal-reunion-acciones">
                <button type="button" className="mensajes__modal-reunion-secundario" onClick={cerrar_modal_reunion}>
                  Cancelar
                </button>
                <button type="submit" className="mensajes__modal-reunion-principal">
                  Enviar invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mensajes__buscador">
        <span className="mensajes__buscador-icono" aria-hidden="true">
          <Search size={16} strokeWidth={2.2} />
        </span>
        <input
          type="text"
          placeholder="Buscar usuarios"
          className="mensajes__buscador-input"
          value={busqueda_contacto}
          onChange={(e) => set_busqueda_contacto(e.target.value)}
        />
      </div>

      <div className="mensajes__contenido">
        <div className="mensajes__lista">
          <div className="mensajes__lista-header">
            <h3>Usuarios</h3>
            <span className="mensajes__opciones">···</span>
          </div>

          {error_contactos && <div className="mensajes__estado-vacio" style={{ margin: "16px" }}>{error_contactos}</div>}
          {cargando_contactos && !error_contactos && <div className="mensajes__estado-vacio" style={{ margin: "16px" }}>Cargando usuarios...</div>}

          {contactos_filtrados.map((contacto) => (
            <div
              key={contacto.id_contacto}
              className={`mensajes__contacto ${
                contactoCoincide(contacto, id_inversionista_activo)
                  ? "mensajes__contacto--activo"
                  : ""
              }`}
              onClick={() => {
                set_id_inversionista_activo(contacto.id_chat || contacto.id_contacto);
                set_datos_contacto_temporario(null);
                set_mensajes_no_leidos_por_contacto((prev) => ({
                  ...prev,
                  [contacto.id_contacto]: 0,
                }));
              }}
            >
              <div className="mensajes__contacto-avatar">
                {contacto.foto_perfil ? (
                  <img src={contacto.foto_perfil} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  contacto.nombre_contacto.charAt(0)
                )}
                <span className={`mensajes__punto ${_obtener_clase_estado(contacto.estado_contacto)}`} />
              </div>
              <div className="mensajes__contacto-info">
                <strong className="mensajes__contacto-nombre">{contacto.nombre_contacto}</strong>
                <span>{contacto.rol_contacto} · {contacto.detalle_contacto}</span>
              </div>
              {String(id_inversionista_activo) !== String(contacto.id_contacto) && (mensajes_no_leidos_por_contacto[contacto.id_contacto] ?? 0) > 0 && (
                <span className="mensajes__badge-no-leidos">
                  {mensajes_no_leidos_por_contacto[contacto.id_contacto]}
                </span>
              )}
            </div>
          ))}

          {!cargando_contactos && contactos_filtrados.length === 0 && (
            <div className="mensajes__estado-vacio" style={{ margin: "16px" }}>
              <p>No tienes chats activos.</p>
              <button className="mensajes__btn-explorar" onClick={() => navigate("/explorar-usuarios")}>Explorar usuarios</button>
            </div>
          )}

          <button className="mensajes__btn-explorar" onClick={() => navigate("/explorar-usuarios")}>Explorar usuarios</button>
        </div>

        {contacto_seleccionado ? (
          <div className="mensajes__chat">
            <div className="mensajes__chat-header">
              <div className="mensajes__chat-avatar">
                {contacto_seleccionado?.foto_perfil ? (
                  <img src={contacto_seleccionado.foto_perfil} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  contacto_seleccionado?.nombre_contacto?.charAt(0) || "•"
                )}
              </div>
              <div className="mensajes__chat-info">
                <strong>{contacto_seleccionado?.nombre_contacto || "Selecciona un usuario"}</strong>
                <span className="mensajes__chat-estado">
                  <span className="mensajes__punto mensajes__punto--activo" style={{ display: "inline-block", marginRight: 4 }} />
                  {firebase_usuario_actual ? (cargando_chat ? "Conectando..." : "Activo ahora") : "Esperando sesión de Firebase..."}
                </span>
              </div>
              <div className="mensajes__chat-acciones">
                <button type="button" className="mensajes__btn-reunion" onClick={abrir_modal_reunion}>📅 Invitar reunión</button>
                <button
                  className="mensajes__btn-perfil"
                  onClick={() => {
                    set_datos_contacto_temporario(contacto_seleccionado);
                    navigate("/perfil-contacto");
                  }}
                >
                  Ver perfil
                </button>
                <button
                  className="mensajes__btn-cerrar"
                  onClick={cerrarChat}
                  aria-label="Cerrar chat"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            <div className="mensajes__burbuja-contenedor">
              {error_chat && <div className="mensajes__estado-vacio">{error_chat}</div>}
              {cargando_chat && !error_chat && <div className="mensajes__estado-vacio">Cargando chat...</div>}
              {!cargando_chat && !error_chat && mensajes_chat.length === 0 && (
                <div className="mensajes__estado-vacio">Aún no hay mensajes. Escribe el primero.</div>
              )}

              {mensajes_chat.map((mensaje) => (
                <div
                  key={mensaje.id_mensaje}
                  className={`mensajes__burbuja-fila ${
                    mensaje.es_del_usuario_actual ? "mensajes__burbuja-fila--der" : "mensajes__burbuja-fila--izq"
                  }`}
                >
                  {!mensaje.es_del_usuario_actual && (
                    <div className="mensajes__bot-avatar">
                      {obtener_foto_avatar_mensaje(mensaje) ? (
                        <img src={obtener_foto_avatar_mensaje(mensaje)} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        contacto_seleccionado?.nombre_contacto?.charAt(0) || "•"
                      )}
                    </div>
                  )}

                  <div
                    className={`mensajes__burbuja ${
                      mensaje.es_del_usuario_actual
                        ? "mensajes__burbuja--usuario"
                        : "mensajes__burbuja--bot"
                    }`}
                  >
                    <p>{mensaje.contenido_mensaje}</p>
                    {mensaje.meeting_url && (
                      <a
                        className="mensajes__enlace-reunion"
                        href={mensaje.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir enlace de Google Meet
                      </a>
                    )}
                    <span className="mensajes__hora">{mensaje.hora_mensaje}</span>
                  </div>

                  {mensaje.es_del_usuario_actual && (
                    <div className="mensajes__usuario-avatar">
                      {datos_usuario.foto_perfil || mensaje.senderPhoto ? (
                        <img src={datos_usuario.foto_perfil || mensaje.senderPhoto} alt="Mí" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        usuario_actual_chat.nombre.charAt(0)
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mensajes__input-area">
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                className="mensajes__input"
                value={texto_mensaje}
                onChange={(e) => set_texto_mensaje(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && _enviar_mensaje()}
              />
              <button className="mensajes__btn-enviar" onClick={_enviar_mensaje}>
                ➤
              </button>
            </div>
          </div>
        ) : (
          <div className="mensajes__welcome">
            <div className="mensajes__welcome-content">
              {/* Imagen removida a petición del usuario; se mantiene contenido y lógica */}
              <h2>Hermes Mensajería</h2>
              <p>
                Con la velocidad y seguridad del mensajero de los olimpos. Envía mensajes seguros a tus socios e inversores. Comunicación directa y ágil con el toque de Hermes.
              </p>
              <div className="mensajes__welcome-divider" />
              <div className="mensajes__welcome-footer">
                🔒 Cifrado de extremo a extremo
              </div>
            </div>
            <div className="mensajes__welcome-line" />
          </div>
        )}
      </div>
    </div>
  );
}