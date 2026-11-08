// Sidebar.jsx — Barra lateral de navegación de Olympo
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Bot,
  Bell,
  UserCircle,
  Settings,
  Headphones,
  LogOut,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Ticket,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useContextoApp } from "../../context/contexto_app";
import logo from "../../image.png";
import "./Sidebar.css";

// Elementos para emprendedores
const elementos_menu_principal_emprendedor = [
  { id: "dashboard",      etiqueta: "Dashboard",       Icono: LayoutDashboard },
  { id: "proyectos",      etiqueta: "Proyectos",       Icono: FolderKanban    },
  { id: "solicitudes",    etiqueta: "Mis Solicitudes", Icono: FileText        },
  { id: "mensajes",       etiqueta: "Mensajes",        Icono: MessageSquare   },
  { id: "chatbot",        etiqueta: "Chat Bot",        Icono: Bot             },
  { id: "notificaciones", etiqueta: "Notificaciones",  Icono: Bell            },
];

// Elementos para inversionistas
const elementos_menu_principal_inversionista = [
  { id: "dashboard",      etiqueta: "Dashboard",      Icono: LayoutDashboard },
  { id: "proyectos",      etiqueta: "Proyectos",      Icono: FolderKanban    },
  { id: "solicitudes",    etiqueta: "Mis Solicitudes",Icono: FileText        },
  { id: "mensajes",       etiqueta: "Mensajes",       Icono: MessageSquare   },
  { id: "chatbot",        etiqueta: "Chat Bot",        Icono: Bot             },
  { id: "notificaciones", etiqueta: "Notificaciones", Icono: Bell            },
];

const elementos_menu_principal_admin = [
  { id: "admin",          etiqueta: "Administración", Icono: Users           },
  { id: "admin-tickets",  etiqueta: "Tickets",        Icono: Ticket          },
];

const elementos_menu_secundario = [
  { id: "cuenta",         etiqueta: "Cuenta",         Icono: UserCircle  },
  { id: "configuracion",  etiqueta: "Configuración",  Icono: Settings    },
];

const elementos_menu_inferior = [
  { id: "callcenter",     etiqueta: "Call Center",    Icono: Headphones  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cerrar_sesion,
    cerrar_sidebar,
    datos_usuario,
    sidebar_colapsado,
    sidebar_abierto,
    toggle_sidebar_colapsado,
    contador_mensajes_no_leidos,
  } = useContextoApp();

  // Determinar el rol principal
  const rol_usuario = (datos_usuario?.tipo_usuario || "").toLowerCase();
  const esAdmin = Boolean(datos_usuario?.es_admin || rol_usuario === "admin");
  const esInversionista = rol_usuario.includes("inversionista");
  const elementos_menu_principal = esAdmin
    ? elementos_menu_principal_admin
    : esInversionista 
    ? elementos_menu_principal_inversionista 
    : elementos_menu_principal_emprendedor;

  const _renderizar_item = ({ id, etiqueta, Icono }) => {
    const es_activo = location.pathname === "/" + id;
    return (
      <li
        key={id}
        className={`sidebar__item${es_activo ? " sidebar__item--activo" : ""}`}
        onClick={() => {
          navigate("/" + id);
          cerrar_sidebar();
        }}
        title={etiqueta}
      >
        <span className="sidebar__icono">
          <Icono size={18} strokeWidth={es_activo ? 2.2 : 1.8} />
        </span>
        <span className="sidebar__etiqueta">{etiqueta}</span>
        {id === 'mensajes' && contador_mensajes_no_leidos > 0 ? (
          <span className="sidebar__badge" aria-hidden="true" title={`${contador_mensajes_no_leidos} mensajes sin leer`}>
            {contador_mensajes_no_leidos > 9 ? '9+' : contador_mensajes_no_leidos}
          </span>
        ) : null}
        {es_activo && <span className="sidebar__item-pip" aria-hidden="true" />}
      </li>
    );
  };

  return (
    <aside className={`sidebar${sidebar_colapsado ? " sidebar--colapsado" : ""}${sidebar_abierto ? " sidebar--abierto" : ""}`}>

      {/* ── Logo ── */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-imagen">
          <img src={logo} alt="Olympo logo" draggable="false" />
        </div>
        <div className="sidebar__logo-texto">
          <span className="sidebar__logo-nombre">AMBROSIA</span>
          <span className="sidebar__logo-subtitulo">Engineering Innovation</span>
        </div>
        <button
          type="button"
          className="sidebar__toggle"
          onClick={toggle_sidebar_colapsado}
          aria-label={sidebar_colapsado ? "Expandir menu lateral" : "Contraer menu lateral"}
          title={sidebar_colapsado ? "Expandir" : "Contraer"}
        >
          {sidebar_colapsado ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      {/* ── Navegación ── */}
      <nav className="sidebar__nav" aria-label="Navegación principal">

        <p className="sidebar__seccion-label">Principal</p>
        <ul className="sidebar__lista">
          {elementos_menu_principal.map(_renderizar_item)}
        </ul>

        <div className="sidebar__separador" />

        <p className="sidebar__seccion-label">Cuenta</p>
        <ul className="sidebar__lista">
          {elementos_menu_secundario.map(_renderizar_item)}
        </ul>

        <div className="sidebar__separador sidebar__separador--push" />

        <ul className="sidebar__lista">
          {elementos_menu_inferior.map(_renderizar_item)}
          <li
            className="sidebar__item sidebar__item--danger"
            onClick={() => {
              cerrar_sesion();
              cerrar_sidebar();
            }}
            title="Cerrar sesión"
          >
            <span className="sidebar__icono">
              <LogOut size={18} strokeWidth={1.8} />
            </span>
            <span className="sidebar__etiqueta">Cerrar sesión</span>
          </li>
        </ul>

      </nav>
    </aside>
  );
}
