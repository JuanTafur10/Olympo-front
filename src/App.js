// App.js — Punto de entrada principal de la aplicación Ambriosa
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ProveedorApp, useContextoApp } from "./context/contexto_app";
import LayoutPrincipal from "./components/layout/LayoutPrincipal";
import NotificacionesGlobales from "./components/NotificacionesGlobales";
import TraductorGlobal from "./i18n/TraductorGlobal";
import PaginaLogin from "./pages/PaginaLogin";

// Páginas comunes
import PaginaMensajes from "./pages/PaginaMensajes";
import PaginaExplorarUsuarios from "./pages/PaginaExplorarUsuarios";
import PaginaChatBot from "./pages/PaginaChatBot";
import PaginaNotificaciones from "./pages/PaginaNotificaciones";
import PaginaCuenta from "./pages/PaginaCuenta";
import PaginaPerfilContacto from "./pages/PaginaPerfilContacto";
import PaginaConfiguracion from "./pages/PaginaConfiguracion";
import PaginaCallCenter from "./pages/PaginaCallCenter";
import PaginaAdministracion from "./pages/PaginaAdministracion";
import PaginaSoporteAdmin from "./pages/PaginaSoporteAdmin";

// Páginas para emprendedor
import PaginaDashboard from "./pages/PaginaDashboard";
import PaginaProyectos from "./pages/PaginaProyectos";
import PaginaMisSolicitudes from "./pages/PaginaMisSolicitudes";
import PaginaAnaliticas from "./pages/PaginaAnaliticas";
import PaginaProyecciones from "./pages/PaginaProyecciones";
import PaginaRiesgos from "./pages/PaginaRiesgos";

// Páginas para inversionista
import PaginaDashboardInversionista from "./pages/PaginaDashboardInversionista";
import PaginaProyectosInversionista from "./pages/PaginaProyectosInversionista";
import PaginaSolicitudesInversionista from "./pages/PaginaSolicitudesInversionista";

import "./estilos_globales.css";

function ContenidoApp() {
  const { esta_autenticado, datos_usuario } = useContextoApp();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const manejar_sesion_expirada = () => navigate("/login", { replace: true });
    window.addEventListener("olympo:session-expired", manejar_sesion_expirada);
    return () => window.removeEventListener("olympo:session-expired", manejar_sesion_expirada);
  }, [navigate]);

  useEffect(() => {
    document.body.classList.toggle("pagina-admin-activa", location.pathname.startsWith("/admin"));
  }, [location.pathname]);

  if (!esta_autenticado) {
    return (
      <>
        <TraductorGlobal />
        <Routes>
          <Route path="/login" element={<PaginaLogin />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    );
  }

  // Seleccionar mapa según rol
  const rol_usuario = (datos_usuario?.tipo_usuario || "").toLowerCase();
  const esAdmin = Boolean(datos_usuario?.es_admin || rol_usuario === "admin");
  const esInversionista = rol_usuario.includes("inversionista");

  return (
    <>
      <TraductorGlobal />
      <NotificacionesGlobales />
      <LayoutPrincipal>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/" element={<Navigate to={esAdmin ? "/admin" : "/dashboard"} replace />} />
          <Route path="/admin" element={esAdmin ? <PaginaAdministracion /> : <Navigate to="/dashboard" replace />} />
          <Route path="/admin-tickets" element={esAdmin ? <PaginaSoporteAdmin /> : <Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={esAdmin ? <PaginaAdministracion /> : (esInversionista ? <PaginaDashboardInversionista /> : <PaginaDashboard />)} />
          <Route path="/proyectos" element={esInversionista ? <PaginaProyectosInversionista /> : <PaginaProyectos />} />
          <Route path="/solicitudes" element={esInversionista ? <PaginaSolicitudesInversionista /> : <PaginaMisSolicitudes />} />
          <Route path="/mensajes" element={<PaginaMensajes />} />
          <Route path="/explorar-usuarios" element={<PaginaExplorarUsuarios />} />
          <Route path="/chatbot" element={<PaginaChatBot />} />
          <Route path="/notificaciones" element={<PaginaNotificaciones />} />
          <Route path="/cuenta" element={<PaginaCuenta />} />
          <Route path="/perfil-contacto" element={<PaginaPerfilContacto />} />
          <Route path="/configuracion" element={<PaginaConfiguracion />} />
          <Route path="/callcenter" element={<PaginaCallCenter />} />
          {!esInversionista && <Route path="/proyecciones" element={<PaginaProyecciones />} />}
          {!esInversionista && <Route path="/analiticas" element={<PaginaAnaliticas />} />}
          {!esInversionista && !esAdmin && <Route path="/riesgos" element={<PaginaRiesgos />} />}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </LayoutPrincipal>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ProveedorApp>
        <ContenidoApp />
      </ProveedorApp>
    </BrowserRouter>
  );
}
