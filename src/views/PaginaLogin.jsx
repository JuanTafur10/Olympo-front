// PaginaLogin.jsx — Página de inicio de sesión de Olympo
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useNavigate } from "../hooks/useNavigate";
import { useContextoApp } from "../context/contexto_app";
import logo from "../image.png";
import "./PaginaLogin.css";

export default function PaginaLogin() {
  const { iniciar_sesion, registrar_usuario } = useContextoApp();
  const pathname = usePathname() || "/";
  const navigate = useNavigate();
  const modo_ruta = pathname === "/register" ? "register" : "login";

  // Variables de estado del formulario
  const [modo, set_modo] = useState(modo_ruta); // "login" o "register"
  const [tipo_usuario_seleccionado, set_tipo_usuario_seleccionado] = useState("emprendedor");
  const [nombre_usuario_input, set_nombre_usuario_input] = useState("");
  const [descripcion_input, set_descripcion_input] = useState("");
  const [acepta_input, set_acepta_input] = useState(false);
  const [email_input, set_email_input] = useState("");
  const [contrasena_input, set_contrasena_input] = useState("");
  const [confirmar_contrasena_input, set_confirmar_contrasena_input] = useState("");
  const [mensaje_estado, set_mensaje_estado] = useState("");
  const [mensaje_estado_tipo, set_mensaje_estado_tipo] = useState("error");
  const [cargando, set_cargando] = useState(false);

  useEffect(() => {
    set_modo(modo_ruta);
  }, [modo_ruta]);

  const cambiar_modo = (nuevo_modo) => {
    set_modo(nuevo_modo);
    navigate(nuevo_modo === "register" ? "/register" : "/login");
    set_mensaje_estado("");
    if (nuevo_modo === "register" && tipo_usuario_seleccionado === "admin") {
      set_tipo_usuario_seleccionado("emprendedor");
    }
  };

  const _manejar_envio = async () => {
    if (cargando) return;
    set_mensaje_estado("");
    set_mensaje_estado_tipo("error");

    if (modo === "login") {
      if (!email_input || !contrasena_input) {
        set_mensaje_estado("Por favor completa tu correo y contraseña.");
        set_mensaje_estado_tipo("error");
        return;
      }

      set_cargando(true);
      try {
        const resultado = await iniciar_sesion(email_input, contrasena_input, tipo_usuario_seleccionado);
        if (!resultado.exitoso) {
          set_mensaje_estado(resultado.mensaje);
          set_mensaje_estado_tipo("error");
        }
      } catch (error) {
        set_mensaje_estado(error.message || "No fue posible iniciar sesión.");
        set_mensaje_estado_tipo("error");
      } finally {
        set_cargando(false);
      }
      return;
    }

    if (!nombre_usuario_input || !email_input || !contrasena_input || !confirmar_contrasena_input) {
      set_mensaje_estado("Por favor completa todos los campos.");
      set_mensaje_estado_tipo("error");
      return;
    }

    if (!acepta_input) {
      set_mensaje_estado("Debes aceptar los términos y condiciones para registrarte");
      set_mensaje_estado_tipo("error");
      return;
    }

    set_cargando(true);
    let resultado;
    try {
      resultado = await registrar_usuario(
        tipo_usuario_seleccionado,
        nombre_usuario_input,
        email_input,
        contrasena_input,
        confirmar_contrasena_input,
        { descripcion: descripcion_input || undefined, acepta_terminos: acepta_input }
      );
    } catch (error) {
      resultado = { exitoso: false, mensaje: error.message || "No fue posible crear la cuenta." };
    } finally {
      set_cargando(false);
    }

    if (!resultado.exitoso) {
      set_mensaje_estado(resultado.mensaje);
      set_mensaje_estado_tipo("error");
      return;
    }

    if (resultado.requiere_aprobacion) {
      set_mensaje_estado(resultado.mensaje || "Tu cuenta quedó pendiente de aprobación.");
      set_mensaje_estado_tipo("success");
      return;
    }

    set_mensaje_estado(resultado.mensaje || "Registro completado.");
    set_mensaje_estado_tipo("success");
  };

  // Función auxiliar para manejar eventos al seleccionar tipo de usuario
  const _enviar_tipo_seleccionado = (tipo) => {
    // actualmente no hace nada, queda aquí para evitar errores de ESLint
    // en el futuro se puede usar para analytics o para sincronizar con el backend
    return;
  };

  const _manejar_tecla = (e) => {
    if (e.key === "Enter") _manejar_envio();
  };

  return (
    <div className="login">
      {/* Overlay de carga a pantalla completa */}
      {cargando && (
        <div className="login__carga-overlay" aria-live="polite" role="status" aria-label={modo === "login" ? "Iniciando sesión" : "Creando tu cuenta"}>
          {/* Partículas de fondo */}
          <div className="login__carga-particulas" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="login__carga-particula" style={{
                left: `${8 + i * 7.5}%`,
                animationDelay: `${i * 0.18}s`,
                animationDuration: `${2.2 + (i % 3) * 0.4}s`,
              }} />
            ))}
          </div>

          {/* Centro del overlay */}
          <div className="login__carga-centro">
            {/* Anillo giratorio exterior */}
            <div className="login__carga-anillo" aria-hidden="true" />
            {/* Anillo secundario */}
            <div className="login__carga-anillo login__carga-anillo--2" aria-hidden="true" />
            {/* Logo pulsando en el centro */}
            <img src={logo.src} alt="" className="login__carga-logo" aria-hidden="true" />
          </div>

          {/* Texto de estado */}
          <p className="login__carga-texto">
            {modo === "login" ? "Iniciando sesión" : "Creando tu cuenta"}
            <span className="login__carga-puntos" aria-hidden="true">...</span>
          </p>

          {/* Barra de progreso indeterminada */}
          <div className="login__carga-barra" aria-hidden="true">
            <div className="login__carga-barra-fill" />
          </div>
        </div>
      )}

      {/* Fondo con overlay griego */}
      <div className="login__fondo" />

      {/* Barra de páginas superior */}
      <nav className="login__nav-superior">
        {["Página 1","Página 2","Página 3","Página 4","Página 5","Página 6","Página 7"].map(
          (pagina, indice) => (
            <span key={indice} className={`login__nav-item ${indice === 0 ? "login__nav-item--activo" : ""}`}>
              {pagina}
            </span>
          )
        )}
      </nav>

      {/* Logo esquina superior izquierda */}
      <div className="login__logo-esquina">AMBROSIA</div>

      {/* Tarjeta central de login */}
      <div className="login__tarjeta">

        {/* Logo central */}
        <div className="login__logo-central">
          <img src={logo.src} alt="Ambrosia logo" className="login__logo-imagen" />
          <div className="login__logo-textos">
            <span className="login__logo-texto-olympo">AMBROSIA</span>
            <span className="login__logo-texto-eng">ENGINEERING INNOVATION</span>
          </div>
        </div>

        {/* Selector de tipo de usuario */}
        <div className="login__tipo-selector">
          <button
            className={`login__tipo-btn ${tipo_usuario_seleccionado === "emprendedor" ? "login__tipo-btn--activo" : ""}`}
            onClick={() => {
              set_tipo_usuario_seleccionado("emprendedor");
              _enviar_tipo_seleccionado("emprendedor");
            }}
          >
            EMPRENDEDOR
          </button>
          <button
            className={`login__tipo-btn ${tipo_usuario_seleccionado === "inversionista" ? "login__tipo-btn--activo" : ""}`}
            onClick={() => {
              set_tipo_usuario_seleccionado("inversionista");
              _enviar_tipo_seleccionado("inversionista");
            }}
          >
            INVERSIONISTA
          </button>
        </div>

        {/* Toggle login/register */}
        <div className="login__modo-selector">
          <button
            className={`login__modo-btn ${modo === "login" ? "login__modo-btn--activo" : ""}`}
            onClick={() => cambiar_modo("login")}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={`login__modo-btn ${modo === "register" ? "login__modo-btn--activo" : ""}`}
            onClick={() => cambiar_modo("register")}
          >
            REGISTRARSE
          </button>
        </div>

        {/* Campos del formulario */}
        {modo === "register" && (
          <div className="login__campo">
            <svg className="login__campo-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input
              type="text"
              placeholder="Nombre de usuario"
              className="login__input"
              value={nombre_usuario_input}
              onChange={(e) => set_nombre_usuario_input(e.target.value)}
              onKeyDown={_manejar_tecla}
            />
          </div>
        )}

        {modo === "register" && (
          <>
            <div className="login__campo">
              <input
                type="email"
                placeholder="Correo"
                className="login__input"
                value={email_input}
                onChange={(e) => set_email_input(e.target.value)}
                onKeyDown={_manejar_tecla}
              />
            </div>

            <div className="login__campo">
              <input
                type="password"
                placeholder="Contraseña"
                className="login__input"
                value={contrasena_input}
                onChange={(e) => set_contrasena_input(e.target.value)}
                onKeyDown={_manejar_tecla}
              />
            </div>

            <div className="login__campo">
              <input
                type="password"
                placeholder="Confirmar contraseña"
                className="login__input"
                value={confirmar_contrasena_input}
                onChange={(e) => set_confirmar_contrasena_input(e.target.value)}
                onKeyDown={_manejar_tecla}
              />
            </div>

            <div className="login__campo">
              <textarea
                placeholder="Biografía"
                className="login__input"
                value={descripcion_input}
                onChange={(e) => set_descripcion_input(e.target.value)}
                style={{ minHeight: 80 }}
              />
            </div>
            <div className="login__campo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={acepta_input}
                  onChange={(e) => set_acepta_input(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span>Acepto términos y condiciones</span>
              </label>
            </div>
          </>
        )}

        {modo === "login" && (
          <>
            <div className="login__campo">
              <svg className="login__campo-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                type="email"
                placeholder="Correo electrónico"
                className="login__input"
                value={email_input}
                onChange={(e) => set_email_input(e.target.value)}
                onKeyDown={_manejar_tecla}
              />
            </div>

            <div className="login__campo">
              <svg className="login__campo-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                placeholder="Contraseña"
                className="login__input"
                value={contrasena_input}
                onChange={(e) => set_contrasena_input(e.target.value)}
                onKeyDown={_manejar_tecla}
              />
            </div>
          </>
        )}

        {mensaje_estado && (
          <p className={`login__error${mensaje_estado_tipo === "success" ? " login__error--success" : ""}`} role="alert">
            {mensaje_estado}
          </p>
        )}

        <button
          className={`login__boton-empezar${cargando ? " login__boton-empezar--cargando" : ""}`}
          onClick={_manejar_envio}
          disabled={cargando}
          aria-busy={cargando}
        >
          {cargando ? (
            <span className="login__btn-spinner" aria-hidden="true" />
          ) : (
            modo === "login" ? "EMPEZAR!" : "REGISTRARSE"
          )}
        </button>
      </div>

      <div className="login__hamburguesa">
        <span />
        <span />
        <span />
      </div>

    </div>
  );
}
