import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Headphones,
  HelpCircle,
  Mail,
  MessageCircle,
  PhoneCall,
  Send,
  ShieldQuestion,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { useContextoApp } from "../context/contexto_app";
import { crear_ticket_api, listar_mis_tickets_api } from "../services/tickets_api";
import "./PaginaCallCenter.css";

const categorias_soporte = [
  "Cuenta y acceso",
  "Proyectos",
  "Solicitudes de inversion",
  "Mensajes y notificaciones",
  "Pagos o informacion financiera",
  "Problema tecnico",
];

const prioridades = [
  { valor: "normal", etiqueta: "Normal", tiempo: "24 h" },
  { valor: "alta", etiqueta: "Alta", tiempo: "8 h" },
  { valor: "urgente", etiqueta: "Urgente", tiempo: "2 h" },
];

const preguntas_frecuentes = [
  {
    pregunta: "No puedo iniciar sesion",
    respuesta: "Verifica tu correo, contrasena y rol seleccionado. Si el problema continua, crea un caso con prioridad alta.",
  },
  {
    pregunta: "No aparecen mis proyectos",
    respuesta: "Actualiza la pagina y revisa que estes usando la cuenta correcta. Soporte puede validar tu perfil y permisos.",
  },
  {
    pregunta: "Las notificaciones no llegan",
    respuesta: "Revisa Configuracion > Notificaciones y confirma que los avisos en la app esten activos.",
  },
];

export default function PaginaCallCenter() {
  const { datos_usuario, mostrar_notificacion } = useContextoApp();
  const nombre_usuario = datos_usuario?.nombre_usuario || datos_usuario?.nombre || "Usuario";
  const email_usuario = datos_usuario?.email_usuario || datos_usuario?.email || "";
  const foto_perfil_usuario = datos_usuario?.foto_perfil || null;

  const [formulario, set_formulario] = useState({
    categoria: categorias_soporte[0],
    prioridad: "normal",
    canal: "chat",
    asunto: "",
    descripcion: "",
    adjuntar_contexto: true,
  });
  const [tickets, set_tickets] = useState([]);
  const [cargando_tickets, set_cargando_tickets] = useState(true);
  const [ticket_creado, set_ticket_creado] = useState(null);
  const [enviando, set_enviando] = useState(false);

  // Cargar tickets del usuario al montar el componente
  useEffect(() => {
    async function cargar_tickets() {
      try {
        const respuesta = await listar_mis_tickets_api();
        set_tickets(respuesta);
      } catch (error) {
        console.error("Error al cargar tickets:", error);
      } finally {
        set_cargando_tickets(false);
      }
    }
    cargar_tickets();
  }, []);

  const prioridad_actual = useMemo(
    () => prioridades.find((item) => item.valor === formulario.prioridad) || prioridades[0],
    [formulario.prioridad]
  );

  const actualizar_campo = (campo, valor) => {
    set_formulario((prev) => ({ ...prev, [campo]: valor }));
  };

  const enviar_solicitud = async (evento) => {
    evento.preventDefault();

    if (!formulario.asunto.trim() || !formulario.descripcion.trim()) {
      mostrar_notificacion("error", "Completa el asunto y la descripción del caso", 3200);
      return;
    }

    set_enviando(true);
    try {
      const nuevo_ticket = await crear_ticket_api(formulario);
      set_ticket_creado(nuevo_ticket.id);
      set_tickets((prev) => [nuevo_ticket, ...prev]);
      mostrar_notificacion("exito", `Caso ${nuevo_ticket.id} enviado a soporte`, 3600);
      set_formulario((prev) => ({
        ...prev,
        asunto: "",
        descripcion: "",
        prioridad: "normal",
      }));
    } catch (error) {
      mostrar_notificacion("error", error.message || "No se pudo enviar el ticket de soporte", 4500);
    } finally {
      set_enviando(false);
    }
  };

  return (
    <div className="callcenter">
      <div className="callcenter__contenedor">
        <header className="callcenter__hero">
          <div className="callcenter__hero-texto">
            <span className="callcenter__eyebrow">Servicio al cliente</span>
            <h2>Call Center Ambrosia</h2>
            <p>
              Contacta al equipo de soporte para resolver dudas, reportar problemas
              de la plataforma o recibir acompanamiento con tus procesos.
            </p>
          </div>
          <div className="callcenter__estado">
            <div className="callcenter__estado-icono">
              <Headphones size={24} />
            </div>
            <div>
              <span>Equipo disponible</span>
              <strong>Lun - Vie, 8:00 a.m. - 6:00 p.m.</strong>
            </div>
          </div>
        </header>

        <section className="callcenter__canales" aria-label="Canales de contacto">
          <article className="callcenter__canal">
            <PhoneCall size={20} />
            <div>
              <h3>Linea telefonica</h3>
              <p>+57 601 000 0000</p>
            </div>
          </article>
          <article className="callcenter__canal">
            <MessageCircle size={20} />
            <div>
              <h3>Chat de soporte</h3>
              <p>Respuesta estimada: {prioridad_actual.tiempo}</p>
            </div>
          </article>
          <article className="callcenter__canal">
            <Mail size={20} />
            <div>
              <h3>Correo</h3>
              <p>ambrosia.olympo.support@gmail.com</p>
            </div>
          </article>
        </section>

        <section className="callcenter__grid">
          <form className="callcenter__panel callcenter__formulario" onSubmit={enviar_solicitud}>
            <div className="callcenter__panel-header">
              <UserRoundCheck size={20} />
              <div>
                <h3>Crear caso de soporte</h3>
                <p>Cuéntanos que ocurre para asignarlo al equipo adecuado.</p>
              </div>
            </div>

            <div className="callcenter__usuario">
              <div className="callcenter__avatar">
                {foto_perfil_usuario ? (
                  <img src={foto_perfil_usuario} alt="Foto de perfil" className="callcenter__avatar-imagen" />
                ) : (
                  <span>{nombre_usuario.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <strong>{nombre_usuario}</strong>
                <span>{email_usuario || "Correo no registrado"}</span>
              </div>
            </div>

            <div className="callcenter__campos-dobles">
              <label className="callcenter__campo">
                <span>Categoria</span>
                <select value={formulario.categoria} onChange={(e) => actualizar_campo("categoria", e.target.value)}>
                  {categorias_soporte.map((categoria) => (
                    <option key={categoria} value={categoria}>{categoria}</option>
                  ))}
                </select>
              </label>

              <label className="callcenter__campo">
                <span>Canal preferido</span>
                <select value={formulario.canal} onChange={(e) => actualizar_campo("canal", e.target.value)}>
                  <option value="chat">Chat dentro de la app</option>
                  <option value="correo">Correo electronico</option>
                  <option value="telefono">Llamada telefonica</option>
                </select>
              </label>
            </div>

            <div className="callcenter__prioridades" role="group" aria-label="Prioridad del caso">
              {prioridades.map((prioridad) => (
                <button
                  key={prioridad.valor}
                  type="button"
                  className={formulario.prioridad === prioridad.valor ? "callcenter__prioridad--activa" : ""}
                  onClick={() => actualizar_campo("prioridad", prioridad.valor)}
                >
                  <span>{prioridad.etiqueta}</span>
                  <small>{prioridad.tiempo}</small>
                </button>
              ))}
            </div>

            <label className="callcenter__campo">
              <span>Asunto</span>
              <input
                value={formulario.asunto}
                onChange={(e) => actualizar_campo("asunto", e.target.value)}
                placeholder="Ej: No puedo ver mis solicitudes"
                maxLength={90}
              />
            </label>

            <label className="callcenter__campo">
              <span>Descripcion del problema</span>
              <textarea
                value={formulario.descripcion}
                onChange={(e) => actualizar_campo("descripcion", e.target.value)}
                placeholder="Describe que estabas intentando hacer, que paso y desde cuando ocurre."
                rows={6}
              />
            </label>

            <label className="callcenter__check">
              <input
                type="checkbox"
                checked={formulario.adjuntar_contexto}
                onChange={(e) => actualizar_campo("adjuntar_contexto", e.target.checked)}
              />
              <span>Adjuntar contexto basico de mi cuenta y pagina actual</span>
            </label>

            <div className="callcenter__acciones">
              {ticket_creado && (
                <span className="callcenter__ticket">
                  <CheckCircle2 size={16} />
                  Ultimo caso: {ticket_creado}
                </span>
              )}
              <button type="submit" className="callcenter__btn" disabled={enviando}>
                <Send size={16} />
                {enviando ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </form>

          <aside className="callcenter__lateral">
            <article className="callcenter__panel">
              <div className="callcenter__panel-header">
                <Clock3 size={20} />
                <div>
                  <h3>Seguimiento</h3>
                  <p>Casos recientes asociados a tu cuenta.</p>
                </div>
              </div>
              <div className="callcenter__tickets">
                {cargando_tickets ? (
                  <div className="callcenter__cargando" style={{ padding: "14px", opacity: 0.7 }}>Cargando casos...</div>
                ) : tickets.length === 0 ? (
                  <div className="callcenter__sin-casos" style={{ padding: "14px", opacity: 0.7 }}>No tienes casos registrados.</div>
                ) : (
                  tickets.map((ticket) => (
                    <div key={ticket.id} className="callcenter__ticket-fila">
                      <div>
                        <strong>{ticket.id}</strong>
                        <span>{ticket.asunto}</span>
                      </div>
                      <em className={`callcenter__estado-badge callcenter__estado-badge--${(ticket.estado || "nuevo").toLowerCase().replace(" ", "-")}`}>
                        {ticket.estado}
                      </em>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="callcenter__panel callcenter__panel--alerta">
              <AlertCircle size={20} />
              <div>
                <h3>Incidente critico</h3>
                <p>Si hay bloqueo de acceso, perdida de datos o un pago sensible, usa prioridad urgente.</p>
              </div>
            </article>
          </aside>
        </section>

        <section className="callcenter__faq">
          <div className="callcenter__faq-header">
            <ShieldQuestion size={20} />
            <div>
              <h3>Ayuda rapida</h3>
              <p>Soluciones comunes antes de abrir un caso.</p>
            </div>
          </div>
          <div className="callcenter__faq-grid">
            {preguntas_frecuentes.map((item) => (
              <article key={item.pregunta} className="callcenter__faq-item">
                <HelpCircle size={18} />
                <h4>{item.pregunta}</h4>
                <p>{item.respuesta}</p>
              </article>
            ))}
            <article className="callcenter__faq-item callcenter__faq-item--destacado">
              <Sparkles size={18} />
              <h4>Tip de soporte</h4>
              <p>Incluye capturas, el nombre de la pantalla y el momento exacto del error para acelerar la respuesta.</p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
