// NotificacionesGlobales.jsx — Contenedor global de notificaciones
import { useContextoApp } from "../context/contexto_app";
import { useNavigate } from "../hooks/useNavigate";
import Notificacion from "./Notificacion";

export default function NotificacionesGlobales() {
  const { notificaciones_activas, remover_notificacion, set_id_inversionista_activo } = useContextoApp();
  const navigate = useNavigate();

  const handleClickNotif = (notif) => {
    console.debug('[Notificaciones] click notif', notif);
    // Si la notificación incluye meta con contactId, navegar al chat correspondiente
    const contactId = notif?.meta?.contactId || null;
    if (contactId) {
      // Primero aseguramos que la página de mensajes esté activa
      navigate("/mensajes");
      // Luego seleccionamos el contacto
      setTimeout(() => {
        set_id_inversionista_activo(String(contactId));
      }, 50);
    } else if (notif?.meta?.rutaDestino) {
      navigate("/" + String(notif.meta.rutaDestino));
    }
    remover_notificacion(notif.id);
  };

  return (
    <div className="notificaciones-globales">
      {notificaciones_activas.map((notif) => (
        <Notificacion
          key={notif.id}
          tipo={notif.tipo}
          mensaje={notif.mensaje}
          duracion={notif.duracion}
          onClose={() => remover_notificacion(notif.id)}
          onClick={() => handleClickNotif(notif)}
        />
      ))}
    </div>
  );
}
