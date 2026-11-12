"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useContextoApp } from "./context/contexto_app";
import LayoutPrincipal from "./components/layout/LayoutPrincipal";
import NotificacionesGlobales from "./components/NotificacionesGlobales";
import TraductorGlobal from "./i18n/TraductorGlobal";
import PaginaLogin from "./views/PaginaLogin";
import PaginaMensajes from "./views/PaginaMensajes";
import PaginaExplorarUsuarios from "./views/PaginaExplorarUsuarios";
import PaginaChatBot from "./views/PaginaChatBot";
import PaginaNotificaciones from "./views/PaginaNotificaciones";
import PaginaCuenta from "./views/PaginaCuenta";
import PaginaPerfilContacto from "./views/PaginaPerfilContacto";
import PaginaConfiguracion from "./views/PaginaConfiguracion";
import PaginaCallCenter from "./views/PaginaCallCenter";
import PaginaAdministracion from "./views/PaginaAdministracion";
import PaginaSoporteAdmin from "./views/PaginaSoporteAdmin";
import PaginaDashboard from "./views/PaginaDashboard";
import PaginaProyectos from "./views/PaginaProyectos";
import PaginaMisSolicitudes from "./views/PaginaMisSolicitudes";
import PaginaAnaliticas from "./views/PaginaAnaliticas";
import PaginaProyecciones from "./views/PaginaProyecciones";
import PaginaRiesgos from "./views/PaginaRiesgos";
import PaginaDashboardInversionista from "./views/PaginaDashboardInversionista";
import PaginaProyectosInversionista from "./views/PaginaProyectosInversionista";
import PaginaSolicitudesInversionista from "./views/PaginaSolicitudesInversionista";

const rutas_privadas = new Set([
  "/dashboard", "/admin", "/admin-tickets", "/proyectos", "/solicitudes",
  "/mensajes", "/explorar-usuarios", "/chatbot", "/notificaciones", "/cuenta",
  "/perfil-contacto", "/configuracion", "/callcenter", "/proyecciones",
  "/analiticas", "/riesgos",
]);

function esRolAdmin(usuario) {
  const rol = String(usuario?.role || usuario?.rol || usuario?.tipo_usuario || "").toLowerCase();
  return Boolean(usuario?.es_admin || rol === "admin");
}

export default function App() {
  const { esta_autenticado, sesion_cargando, datos_usuario } = useContextoApp();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const es_admin = esRolAdmin(datos_usuario);
  const rol_usuario = String(datos_usuario?.tipo_usuario || "").toLowerCase();
  const es_inversionista = rol_usuario.includes("inversionista");

  useEffect(() => {
    const manejar_sesion_expirada = () => router.replace("/login");
    window.addEventListener("olympo:session-expired", manejar_sesion_expirada);
    return () => window.removeEventListener("olympo:session-expired", manejar_sesion_expirada);
  }, [router]);

  useEffect(() => {
    document.body.classList.toggle("pagina-admin-activa", pathname.startsWith("/admin"));
  }, [pathname]);

  useEffect(() => {
    if (sesion_cargando) return;

    const es_ruta_acceso = pathname === "/login" || pathname === "/register";
    if (es_ruta_acceso && esta_autenticado) {
      router.replace(es_admin ? "/admin" : "/dashboard");
      return;
    }
    if (pathname === "/" && esta_autenticado) {
      router.replace(es_admin ? "/admin" : "/dashboard");
      return;
    }
    if (!rutas_privadas.has(pathname) && !["/", "/login", "/register"].includes(pathname)) {
      router.replace(esta_autenticado ? "/dashboard" : "/login");
      return;
    }
    if (rutas_privadas.has(pathname) && !esta_autenticado) {
      router.replace("/login");
      return;
    }
    if ((pathname === "/admin" || pathname === "/admin-tickets") && esta_autenticado && !es_admin) {
      router.replace("/dashboard");
      return;
    }
    if (["/proyecciones", "/analiticas", "/riesgos"].includes(pathname)
      && esta_autenticado && (es_inversionista || es_admin)) {
      router.replace("/dashboard");
      return;
    }
  }, [esta_autenticado, es_admin, es_inversionista, pathname, router, sesion_cargando]);

  if (sesion_cargando) {
    return <div className="app-verificando-sesion" role="status">Verificando tu sesión…</div>;
  }

  if (pathname === "/login" || pathname === "/register") {
    if (esta_autenticado) return null;
    return <><TraductorGlobal /><PaginaLogin /></>;
  }

  if (pathname === "/") {
    if (esta_autenticado) return null;
    return <><TraductorGlobal /><PaginaLogin /></>;
  }

  if (!rutas_privadas.has(pathname)) return null;
  if (!esta_autenticado) return null;
  if ((pathname === "/admin" || pathname === "/admin-tickets") && !es_admin) return null;
  if (pathname === "/") return null;

  let pagina;
  switch (pathname) {
    case "/admin": pagina = <PaginaAdministracion />; break;
    case "/admin-tickets": pagina = <PaginaSoporteAdmin />; break;
    case "/dashboard": pagina = es_admin ? <PaginaAdministracion /> : (es_inversionista ? <PaginaDashboardInversionista /> : <PaginaDashboard />); break;
    case "/proyectos": pagina = es_inversionista ? <PaginaProyectosInversionista /> : <PaginaProyectos />; break;
    case "/solicitudes": pagina = es_inversionista ? <PaginaSolicitudesInversionista /> : <PaginaMisSolicitudes />; break;
    case "/mensajes": pagina = <PaginaMensajes />; break;
    case "/explorar-usuarios": pagina = <PaginaExplorarUsuarios />; break;
    case "/chatbot": pagina = <PaginaChatBot />; break;
    case "/notificaciones": pagina = <PaginaNotificaciones />; break;
    case "/cuenta": pagina = <PaginaCuenta />; break;
    case "/perfil-contacto": pagina = <PaginaPerfilContacto />; break;
    case "/configuracion": pagina = <PaginaConfiguracion />; break;
    case "/callcenter": pagina = <PaginaCallCenter />; break;
    case "/proyecciones": pagina = es_inversionista || es_admin ? null : <PaginaProyecciones />; break;
    case "/analiticas": pagina = es_inversionista || es_admin ? null : <PaginaAnaliticas />; break;
    case "/riesgos": pagina = es_inversionista || es_admin ? null : <PaginaRiesgos />; break;
    default: pagina = null;
  }

  if (!pagina) {
    return null;
  }

  return <><TraductorGlobal /><NotificacionesGlobales /><LayoutPrincipal>{pagina}</LayoutPrincipal></>;
}
