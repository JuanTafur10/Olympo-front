import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "../hooks/useNavigate";
import { useContextoApp } from "../context/contexto_app";
import {
  admin_listar_tickets_api,
  admin_actualizar_ticket_api,
} from "../services/tickets_api";
import { escucharTicketsSoporte } from "../services/tickets_firebase";
import {
  listar_todos_los_usuarios_admin_api,
  obtener_usuario_por_id_api,
} from "../services/auth_api";
import {
  Ticket,
  User,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Calendar,
  MessageSquare,
  FileText,
  UserCheck,
  Mail,
} from "lucide-react";
import "./PaginaSoporteAdmin.css";

const CATEGORIAS = [
  "Cuenta y acceso",
  "Proyectos",
  "Solicitudes de inversion",
  "Mensajes y notificaciones",
  "Pagos o informacion financiera",
  "Problema tecnico",
];

const ESTADOS = [
  { valor: "nuevo", etiqueta: "Nuevo" },
  { valor: "abierto", etiqueta: "Abierto" },
  { valor: "en seguimiento", etiqueta: "En Seguimiento" },
  { valor: "resuelto", etiqueta: "Resuelto" },
  { valor: "cerrado", etiqueta: "Cerrado" },
];

const PRIORIDADES = [
  { valor: "normal", etiqueta: "Normal" },
  { valor: "alta", etiqueta: "Alta" },
  { valor: "urgente", etiqueta: "Urgente" },
];

const normalizar_estado_ticket = (estado) => {
  const valor = String(estado || "").trim().toLowerCase().replace(/[_\s-]+/g, " ");

  if (["nuevo", "nueva"].includes(valor)) return "nuevo";
  if (["abierto", "abierta"].includes(valor)) return "abierto";
  if (valor === "en seguimiento") return "en seguimiento";
  if (["en proceso", "en proceso", "en progreso", "pendiente"].includes(valor)) return "en seguimiento";
  if (["resuelto", "solucionado", "resuelta", "solucionada"].includes(valor)) return "resuelto";
  if (["cerrado", "cerrada", "cerrado/a"].includes(valor)) return "cerrado";
  return valor || "nuevo";
};

const etiqueta_estado_ticket = (estado) => {
  const normalizado = normalizar_estado_ticket(estado);
  return ESTADOS.find((item) => item.valor === normalizado)?.etiqueta || String(estado || "Nuevo");
};

export default function PaginaSoporteAdmin() {
  const {
    mostrar_notificacion,
    set_datos_contacto_temporario,
    set_id_inversionista_activo,
  } = useContextoApp();
  const navigate = useNavigate();
  const [tickets, set_tickets] = useState([]);
  const [admins, set_admins] = useState([]);
  const [cargando, set_cargando] = useState(true);
  const [guardando, set_guardando] = useState(false);
  const [seleccionado, set_seleccionado] = useState(null);
  
  // Datos del cliente del ticket seleccionado
  const [datos_cliente, set_datos_cliente] = useState(null);
  const [cargando_cliente, set_cargando_cliente] = useState(false);

  // Filtros
  const [busqueda, set_busqueda] = useState("");
  const [filtro_estado, set_filtro_estado] = useState("");
  const [filtro_prioridad, set_filtro_prioridad] = useState("");
  const [filtro_categoria, set_filtro_categoria] = useState("");

  // Formulario de edición
  const [form_estado, set_form_estado] = useState("nuevo");
  const [form_prioridad, set_form_prioridad] = useState("normal");
  const [form_asignado, set_form_asignado] = useState("");
  const [form_notas, set_form_notas] = useState("");

  // Cargar tickets y admins
  const cargar_datos = async () => {
    set_cargando(true);
    try {
      const lista_tickets = await admin_listar_tickets_api();
      set_tickets(lista_tickets);

      const lista_usuarios = await listar_todos_los_usuarios_admin_api();
      const lista_admins = lista_usuarios.filter(
        (u) => String(u?.rol || "").toLowerCase() === "admin"
      );
      set_admins(lista_admins);
    } catch (error) {
      mostrar_notificacion?.(
        "error",
        error.message || "No se pudieron cargar los datos de soporte",
        4500
      );
    } finally {
      set_cargando(false);
    }
  };

  useEffect(() => {
    cargar_datos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const detener = escucharTicketsSoporte((tickets_firestore) => {
      if (!Array.isArray(tickets_firestore)) return;
      set_tickets(tickets_firestore);
    });

    return () => {
      if (typeof detener === "function") detener();
    };
  }, []);

  // Cargar datos de cliente al seleccionar un ticket
  useEffect(() => {
    if (!seleccionado) {
      set_datos_cliente(null);
      return;
    }

    // Cargar los campos del formulario con los valores del ticket seleccionado
    set_form_estado(seleccionado.estado || "nuevo");
    set_form_prioridad(seleccionado.prioridad || "normal");
    set_form_asignado(seleccionado.asignado_a || "");
    set_form_notas(seleccionado.notas_internas || "");

    if (!seleccionado.usuario_id) {
      set_datos_cliente(null);
      return;
    }

    async function cargar_cliente() {
      set_cargando_cliente(true);
      try {
        const cliente = await obtener_usuario_por_id_api(seleccionado.usuario_id);
        set_datos_cliente(cliente);
      } catch (error) {
        console.warn("No se pudo cargar el perfil del creador del ticket", error);
        set_datos_cliente(null);
      } finally {
        set_cargando_cliente(false);
      }
    }

    cargar_cliente();
  }, [seleccionado]);

  // Actualizar ticket
  const manejar_actualizar = async (e) => {
    e.preventDefault();
    if (!seleccionado) return;

    set_guardando(true);
    try {
      const ticket_actualizado = await admin_actualizar_ticket_api(seleccionado.id, {
        estado: form_estado,
        prioridad: form_prioridad,
        asignado_a: form_asignado || null,
        notas_internas: form_notas,
      });

      mostrar_notificacion?.("exito", `Ticket ${seleccionado.id} actualizado correctamente`, 3500);
      
      // Actualizar en el estado local
      set_tickets((prev) =>
        prev.map((t) => (t.id === seleccionado.id ? { ...t, ...ticket_actualizado } : t))
      );
      set_seleccionado((prev) => ({ ...prev, ...ticket_actualizado }));
    } catch (error) {
      mostrar_notificacion?.("error", error.message || "Error al actualizar el ticket", 4500);
    } finally {
      set_guardando(false);
    }
  };

  // Marcar como resuelto directamente (Resolver Rápido)
  const manejar_resolver_rapido = async () => {
    if (!seleccionado) return;

    set_guardando(true);
    try {
      const ticket_actualizado = await admin_actualizar_ticket_api(seleccionado.id, {
        estado: "resuelto",
      });

      mostrar_notificacion?.("exito", `Ticket ${seleccionado.id} marcado como Resuelto`, 3500);
      
      // Actualizar en el estado local
      set_tickets((prev) =>
        prev.map((t) => (t.id === seleccionado.id ? { ...t, ...ticket_actualizado } : t))
      );
      set_seleccionado((prev) => ({ ...prev, ...ticket_actualizado }));
      set_form_estado("resuelto");
    } catch (error) {
      mostrar_notificacion?.("error", error.message || "Error al resolver el ticket", 4500);
    } finally {
      set_guardando(false);
    }
  };

  // Iniciar conversación por chat
  const iniciarChatConCliente = () => {
    if (!datos_cliente) return;
    const contactId = String(
      datos_cliente.firebase_uid ??
      datos_cliente.id ??
      datos_cliente.id_usuario ??
      datos_cliente.email ??
      ""
    );

    if (!contactId) {
      mostrar_notificacion?.("error", "No se pudo iniciar el chat: falta el identificador del usuario", 4000);
      return;
    }
    
    if (set_datos_contacto_temporario) {
      set_datos_contacto_temporario({
        id_contacto: String(contactId),
        id_chat: String(contactId),
        firebase_uid_contacto: String(contactId),
        usuario_id_contacto: datos_cliente.id || null,
        nombre_contacto: datos_cliente.nombre_usuario || datos_cliente.nombre || datos_cliente.email || "Usuario",
        rol_contacto: datos_cliente.rol || datos_cliente.tipo_usuario || "usuario",
        estado_contacto: datos_cliente.esta_activo ? "activo" : "inactivo",
        detalle_contacto: datos_cliente.ciudad || datos_cliente.descripcion || null,
        foto_perfil: datos_cliente.foto_perfil || null,
      });
    }

    navigate("/mensajes");
    if (set_id_inversionista_activo) {
      setTimeout(() => set_id_inversionista_activo(String(contactId)), 50);
    }
    mostrar_notificacion?.("exito", `Abriendo chat con ${datos_cliente.nombre_usuario || datos_cliente.nombre || "usuario"}...`, 3000);
  };

  // Filtrar tickets localmente
  const tickets_filtrados = useMemo(() => {
    return tickets.filter((t) => {
      const estadoNormalizado = normalizar_estado_ticket(t.estado);
      const matchBusqueda =
        busqueda.trim() === "" ||
        t.id.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.descripcion.toLowerCase().includes(busqueda.toLowerCase());

      const matchEstado = filtro_estado === "" || estadoNormalizado === filtro_estado;
      const matchPrioridad = filtro_prioridad === "" || t.prioridad === filtro_prioridad;
      const matchCategoria = filtro_categoria === "" || t.categoria === filtro_categoria;

      return matchBusqueda && matchEstado && matchPrioridad && matchCategoria;
    });
  }, [tickets, busqueda, filtro_estado, filtro_prioridad, filtro_categoria]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const total = tickets.length;
    const nuevos = tickets.filter((t) => normalizar_estado_ticket(t.estado) === "nuevo").length;
    const abiertos = tickets.filter((t) => normalizar_estado_ticket(t.estado) === "abierto" || normalizar_estado_ticket(t.estado) === "en seguimiento").length;
    const resueltos = tickets.filter((t) => normalizar_estado_ticket(t.estado) === "resuelto" || normalizar_estado_ticket(t.estado) === "cerrado").length;
    return { total, nuevos, abiertos, resueltos };
  }, [tickets]);

  return (
    <section className="soporte-admin">
      <header className="soporte-admin__hero">
        <div>
          <p className="soporte-admin__eyebrow">Módulo de Soporte Técnico</p>
          <h2>Gestión de Tickets y Casos</h2>
          <p>
            Visualiza los requerimientos de los usuarios, asígnalos a los agentes correspondientes y realiza el seguimiento hasta su resolución.
          </p>
        </div>

        <div className="soporte-admin__stats">
          <article>
            <span>Total Casos</span>
            <strong>{estadisticas.total}</strong>
          </article>
          <article className="soporte-admin__stat-nuevo">
            <span>Nuevos</span>
            <strong>{estadisticas.nuevos}</strong>
          </article>
          <article className="soporte-admin__stat-abierto">
            <span>En Proceso</span>
            <strong>{estadisticas.abiertos}</strong>
          </article>
          <article className="soporte-admin__stat-resuelto">
            <span>Resueltos</span>
            <strong>{estadisticas.resueltos}</strong>
          </article>
        </div>
      </header>

      {/* Barra de Filtros */}
      <section className="soporte-admin__filtros-card">
        <div className="soporte-admin__filtros-header">
          <SlidersHorizontal size={18} />
          <h3>Filtros y Búsqueda</h3>
        </div>
        <div className="soporte-admin__filtros-grid">
          <label className="soporte-admin__filtro-campo">
            <span>Buscar por ID, Asunto o Descripción</span>
            <div className="soporte-admin__busqueda-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Ej: Acceso, AMB-..."
                value={busqueda}
                onChange={(e) => set_busqueda(e.target.value)}
              />
            </div>
          </label>

          <label className="soporte-admin__filtro-campo">
            <span>Estado</span>
            <select
              value={filtro_estado}
              onChange={(e) => set_filtro_estado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="soporte-admin__filtro-campo">
            <span>Prioridad</span>
            <select
              value={filtro_prioridad}
              onChange={(e) => set_filtro_prioridad(e.target.value)}
            >
              <option value="">Todas las prioridades</option>
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label className="soporte-admin__filtro-campo">
            <span>Categoría</span>
            <select
              value={filtro_categoria}
              onChange={(e) => set_filtro_categoria(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Contenido Principal Grid */}
      <div className="soporte-admin__grid">
        {/* Listado de Tickets */}
        <div className="soporte-admin__listado-card">
          <div className="soporte-admin__card-head">
            <h3>Bandeja de Entrada ({tickets_filtrados.length})</h3>
            <p>Selecciona un caso para ver el detalle y aplicar acciones.</p>
          </div>

          {cargando ? (
            <div className="soporte-admin__estado-vacio">Cargando tickets...</div>
          ) : tickets_filtrados.length === 0 ? (
            <div className="soporte-admin__estado-vacio">
              <Inbox size={40} />
              <p>No se encontraron tickets con los filtros actuales.</p>
            </div>
          ) : (
            <div className="soporte-admin__lista">
              {tickets_filtrados.map((ticket) => {
                const esActivo = seleccionado?.id === ticket.id;
                return (
                  <article
                    key={ticket.id}
                    className={`soporte-admin__item ${
                      esActivo ? "soporte-admin__item--activo" : ""
                    }`}
                    onClick={() => set_seleccionado(ticket)}
                  >
                    <div className="soporte-admin__item-header">
                      <strong>{ticket.id}</strong>
                      <span
                        className={`soporte-admin__badge-prioridad soporte-admin__badge-prioridad--${ticket.prioridad}`}
                      >
                        {ticket.prioridad}
                      </span>
                    </div>

                    <h4 className="soporte-admin__item-asunto">{ticket.asunto}</h4>

                    <div className="soporte-admin__item-footer">
                      <span className="soporte-admin__item-categoria">
                        {ticket.categoria}
                      </span>
                      <span
                        className={`soporte-admin__badge-estado soporte-admin__badge-estado--${normalizar_estado_ticket(ticket.estado).replace(/\s+/g, "-")}`}
                      >
                        {etiqueta_estado_ticket(ticket.estado)}
                      </span>
                    </div>
                    <ChevronRight className="soporte-admin__item-flecha" size={16} />
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Detalle y Gestión del Ticket Seleccionado */}
        <div className="soporte-admin__detalle-card">
          {!seleccionado ? (
            <div className="soporte-admin__detalle-vacio">
              <Ticket size={48} />
              <h3>Ningún ticket seleccionado</h3>
              <p>Elige un ticket del listado lateral para ver su información y solucionarlo.</p>
            </div>
          ) : (
            <div className="soporte-admin__detalle-contenido">
              {/* Encabezado del Detalle */}
              <div className="soporte-admin__detalle-header">
                <div>
                  <div className="soporte-admin__detalle-meta-id">
                    <span>Caso de Soporte</span>
                    <h2>{seleccionado.id}</h2>
                  </div>
                  <h3 className="soporte-admin__detalle-asunto">{seleccionado.asunto}</h3>
                </div>
                <div className="soporte-admin__detalle-meta-badges">
                  {normalizar_estado_ticket(seleccionado.estado) !== "resuelto" && normalizar_estado_ticket(seleccionado.estado) !== "cerrado" && (
                    <button
                      type="button"
                      className="soporte-admin__boton-resolver-rapido"
                      onClick={manejar_resolver_rapido}
                      disabled={guardando}
                    >
                      <CheckCircle2 size={15} style={{ marginRight: "6px" }} />
                      Marcar Solucionado
                    </button>
                  )}
                  <span className={`soporte-admin__badge-estado-lg soporte-admin__badge-estado--${normalizar_estado_ticket(seleccionado.estado).replace(/\s+/g, "-")}`}>
                    {etiqueta_estado_ticket(seleccionado.estado)}
                  </span>
                  <span
                    className={`soporte-admin__badge-prioridad-lg soporte-admin__badge-prioridad--${seleccionado.prioridad}`}
                  >
                    Prioridad {seleccionado.prioridad}
                  </span>
                </div>
              </div>

              {/* Información del Cliente */}
              <div className="soporte-admin__info-usuario">
                <div className="soporte-admin__info-usuario-titulo">
                  <User size={16} />
                  <h4>Información del Usuario Solicitante</h4>
                </div>

                {cargando_cliente ? (
                  <div className="soporte-admin__cliente-cargando">Cargando perfil de usuario...</div>
                ) : datos_cliente ? (
                  <>
                    <div className="soporte-admin__cliente-grid">
                      <div>
                        <strong>Nombre:</strong>
                        <span>{datos_cliente.nombre || datos_cliente.nombre_usuario || "Sin nombre"}</span>
                      </div>
                      <div>
                        <strong>Email:</strong>
                        <span>{datos_cliente.email}</span>
                      </div>
                      <div>
                        <strong>Rol:</strong>
                        <span className="soporte-admin__cliente-rol">{datos_cliente.rol || "Usuario"}</span>
                      </div>
                      <div>
                        <strong>Ciudad:</strong>
                        <span>{datos_cliente.ciudad || "No registrada"}</span>
                      </div>
                    </div>
                    <div className="soporte-admin__cliente-contacto-acciones">
                      <a
                        href={`mailto:${datos_cliente.email}?subject=Soporte%20Olympo%3A%20Caso%20${seleccionado.id}&body=Hola%20${encodeURIComponent(datos_cliente.nombre || datos_cliente.nombre_usuario || "Usuario")}%2C%20te%20contactamos%20en%20relaci%C3%B3n%20a%20tu%20ticket%20%23${seleccionado.id}%3A%20%22${encodeURIComponent(seleccionado.asunto)}%22...`}
                        className="soporte-admin__btn-contacto soporte-admin__btn-contacto--correo"
                      >
                        <Mail size={14} />
                        Contactar por Correo
                      </a>
                      <button
                        type="button"
                        onClick={iniciarChatConCliente}
                        className="soporte-admin__btn-contacto soporte-admin__btn-contacto--chat"
                      >
                        <MessageSquare size={14} />
                        Contactar por Chat
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="soporte-admin__cliente-no-encontrado">
                    <AlertCircle size={14} />
                    <span>Usuario id: {seleccionado.usuario_id || "Anónimo / No registrado"}</span>
                  </div>
                )}
              </div>

              {/* Contenido / Descripción del Ticket */}
              <div className="soporte-admin__detalle-seccion">
                <div className="soporte-admin__detalle-seccion-titulo">
                  <FileText size={16} />
                  <h4>Descripción del Caso</h4>
                </div>
                <div className="soporte-admin__descripcion-caja">
                  {seleccionado.descripcion}
                </div>
                <div className="soporte-admin__detalle-meta-canal">
                  <strong>Canal de contacto preferido:</strong>
                  <span>{seleccionado.canal === "chat" ? "Chat dentro de la app" : seleccionado.canal === "correo" ? "Correo electrónico" : "Llamada telefónica"}</span>
                </div>
                <div className="soporte-admin__detalle-meta-fecha">
                  <Calendar size={12} />
                  <span>Creado en: {seleccionado.creado_en ? new Date(seleccionado.creado_en).toLocaleString("es-CO") : "N/A"}</span>
                </div>
              </div>

              {/* Formulario de Solución */}
              <form onSubmit={manejar_actualizar} className="soporte-admin__formulario-solucion">
                <div className="soporte-admin__detalle-seccion-titulo">
                  <UserCheck size={16} />
                  <h4>Solucionar y Actualizar Ticket</h4>
                </div>

                <div className="soporte-admin__form-grid">
                  <label className="soporte-admin__form-campo">
                    <span>Estado del Ticket</span>
                    <select
                      value={form_estado}
                      onChange={(e) => set_form_estado(e.target.value)}
                    >
                      {ESTADOS.map((est) => (
                        <option key={est.valor} value={est.valor}>
                          {est.etiqueta}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="soporte-admin__form-campo">
                    <span>Prioridad</span>
                    <select
                      value={form_prioridad}
                      onChange={(e) => set_form_prioridad(e.target.value)}
                    >
                      {PRIORIDADES.map((prio) => (
                        <option key={prio.valor} value={prio.valor}>
                          {prio.etiqueta}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="soporte-admin__form-campo soporte-admin__form-campo--completo">
                    <span>Asignar Agente de Soporte</span>
                    <select
                      value={form_asignado}
                      onChange={(e) => set_form_asignado(e.target.value)}
                    >
                      <option value="">Sin Asignar (Disponible)</option>
                      {admins.map((ad) => (
                        <option key={ad.id} value={ad.id}>
                          {ad.nombre || ad.nombre_usuario || ad.email} (Admin)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="soporte-admin__form-campo soporte-admin__form-campo--completo">
                    <span>Notas Internas (Historial de solución)</span>
                    <textarea
                      rows={5}
                      placeholder="Escribe aquí las acciones realizadas, detalles del problema, o notas de seguimiento..."
                      value={form_notas}
                      onChange={(e) => set_form_notas(e.target.value)}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="soporte-admin__boton-guardar"
                  disabled={guardando}
                >
                  {guardando ? "Guardando Cambios..." : "Guardar y Actualizar Caso"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
