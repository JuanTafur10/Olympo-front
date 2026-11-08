// PaginaChatBot.jsx — Chat con el asistente Atenea de Olympo
import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { useContextoApp } from "../context/contexto_app";
import { usuario_actual } from "../data/datos_mock";
import logoAtenea from "../logoa.avif";
import "./PaginaChatBot.css";

export default function PaginaChatBot() {
  const { mensajes_bot, agregar_mensaje_bot } = useContextoApp();
  const contenedor_mensajes = useRef(null);
  const [carga_inicial_chat, set_carga_inicial_chat] = useState(false);
  const [texto_input, set_texto_input] = useState("");

  useEffect(() => {
    if (contenedor_mensajes.current) {
      contenedor_mensajes.current.scrollTop = contenedor_mensajes.current.scrollHeight;
    }
    if (!carga_inicial_chat && mensajes_bot.length >= 0) {
      set_carga_inicial_chat(true);
    }
  }, [mensajes_bot, carga_inicial_chat]);

  const _enviar_mensaje_bot = async () => {
    if (!texto_input.trim()) return;
    await agregar_mensaje_bot(texto_input);
    set_texto_input("");
  };

  return (
    <div className="chatbot">
      <div className="chatbot__ventana">

        {/* ── Barra de título ── */}
        <div className="chatbot__titulo-bar">
          <div className="chatbot__titulo-izq">
            <img
              src={logoAtenea}
              alt="Atenea logo"
              className="chatbot__titulo-logo"
            />
            <span className="chatbot__titulo-olympo">ATENEA</span>
            <span className="chatbot__titulo-texto">Chat Bot</span>
          </div>
          {/* Controles de ventana eliminados por diseño */}
        </div>

        {/* ── Cabecera del bot ── */}
        <div className="chatbot__subtitulo">
          <div className="chatbot__bot-icono">
            <img src={logoAtenea} alt="Atenea" />
          </div>
          <div className="chatbot__bot-info">
            <strong>Chat Bot · Atenea</strong>
            <span>Asistente de Olympo online</span>
          </div>
        </div>

        {/* ── Mensajes ── */}
        <div className="chatbot__mensajes" ref={contenedor_mensajes}>
          {mensajes_bot.map((mensaje) => (
            <div
              key={mensaje.id_mensaje_bot}
              className={`chatbot__fila ${
                mensaje.es_del_usuario ? "chatbot__fila--der" : "chatbot__fila--izq"
              }`}
            >
              {!mensaje.es_del_usuario && (
                <div className="chatbot__avatar-bot">
                  <img src={logoAtenea} alt="Atenea" />
                </div>
              )}

              <div
                className={`chatbot__burbuja ${
                  mensaje.es_del_usuario
                    ? "chatbot__burbuja--usuario"
                    : "chatbot__burbuja--bot"
                }`}
              >
                <p>{mensaje.contenido_mensaje_bot}</p>
                <span className="chatbot__hora">{mensaje.hora_mensaje_bot}</span>
              </div>

              {mensaje.es_del_usuario && (
                <div className="chatbot__avatar-usuario">
                  {usuario_actual.nombre_usuario.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Input ── */}
        <div className="chatbot__input-area">
          <div className="chatbot__input-wrap">
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              className="chatbot__input"
              value={texto_input}
              onChange={(e) => set_texto_input(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && _enviar_mensaje_bot()}
            />
          </div>
          <button className="chatbot__btn-enviar" onClick={_enviar_mensaje_bot}>
            <Send size={16} strokeWidth={2.2} />
          </button>
        </div>

      </div>
    </div>
  );
}