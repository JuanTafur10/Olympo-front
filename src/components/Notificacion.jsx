// Notificacion.jsx — Componente de notificación flotante
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./Notificacion.css";

export default function Notificacion({ tipo = "info", mensaje = "", duracion = 4000, onClose = () => {}, onClick = null }) {
  const [visible, set_visible] = useState(true);

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      set_visible(false);
      onClose();
    }, duracion);

    return () => clearTimeout(timer);
  }, [visible, duracion, onClose]);

  if (!visible) return null;

  const handleClose = () => {
    set_visible(false);
    try { onClose(); } catch (_) {}
  };

  const handleClick = (e) => {
    // Prevent the close button from triggering the click action
    if (e.target.closest('.notificacion__cerrar')) return;
    if (typeof onClick === 'function') {
      try { onClick(); } catch (_) {}
    }
  };

  const contenido = (
    <div className={`notificacion notificacion--${tipo}`} onClick={handleClick} style={{cursor: onClick ? 'pointer' : 'default'}}>
      <div className="notificacion__contenido">
        <span className="notificacion__icono">
          {tipo === "mensaje" && "💬"}
          {tipo === "exito" && "✓"}
          {tipo === "error" && "✕"}
          {tipo === "info" && "ℹ"}
        </span>
        <span className="notificacion__texto">{mensaje}</span>
      </div>
      <button
        className="notificacion__cerrar"
        onClick={handleClose}
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );

  // Renderizar en el body usando createPortal
  return createPortal(contenido, document.body);
}
