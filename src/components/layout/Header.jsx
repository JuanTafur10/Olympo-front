// Header.jsx — Encabezado superior de la app Ambriosa
import { useContextoApp } from "../../context/contexto_app";
import { useNavigate } from "../../hooks/useNavigate";
import { Menu, X, Bell } from "lucide-react";
import "./Header.css";

export default function Header() {
  const { datos_usuario, sidebar_abierto, toggle_sidebar, contador_notificaciones } = useContextoApp();
  const navigate = useNavigate();

  const nombre_saludo = datos_usuario.nombre_usuario.toUpperCase();
  const tipo_usuario = datos_usuario.tipo_usuario.toUpperCase();
  const hora_actual = new Date().getHours();
  const saludo =
    hora_actual < 12
      ? "Buenos dias"
      : hora_actual < 19
      ? "Buenas tardes"
      : "Buenas noches";

  const handleClickNotificaciones = () => {
    navigate("/notificaciones");
  };

  const handleClickPerfil = () => {
    navigate("/cuenta");
  };

  return (
    <header className="header">
      {/* Botón hamburguesa - solo visible en mobile */}
      <button
        className="header__menu-toggle"
        onClick={toggle_sidebar}
        aria-label="Abrir menú"
        title="Menú"
      >
        {sidebar_abierto ? (
          <X size={24} />
        ) : (
          <Menu size={24} />
        )}
      </button>

      <h1 className="header__titulo">
        {saludo}, {datos_usuario.nombre_usuario}
      </h1>

      <div className="header__acciones">
        {/* Ícono de notificaciones con badge */}
        <button
          className="header__notificaciones"
          onClick={handleClickNotificaciones}
          aria-label="Notificaciones"
          title={`${contador_notificaciones} notificaciones sin leer`}
        >
          <Bell size={20} />
          {contador_notificaciones > 0 && (
            <span className="header__notificaciones-badge">{contador_notificaciones}</span>
          )}
        </button>
      </div>

      <div
        className="header__perfil"
        role="button"
        tabIndex={0}
        onClick={handleClickPerfil}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClickPerfil(); }}
        title="Cuenta"
      >
        <div className="header__perfil-info">
          <span className="header__perfil-nombre">{nombre_saludo}</span>
          <span className="header__perfil-tipo">{tipo_usuario}</span>
        </div>
        <div className="header__avatar">
          {datos_usuario.foto_perfil ? (
            <img 
              src={datos_usuario.foto_perfil} 
              alt="Avatar" 
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
            />
          ) : (
            datos_usuario.nombre_usuario.charAt(0)
          )}
        </div>
      </div>
    </header>
  );
}
