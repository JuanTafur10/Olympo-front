// LayoutPrincipal.jsx — Estructura principal de la app autenticada
import { useContextoApp } from "../../context/contexto_app";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "./LayoutPrincipal.css";

export default function LayoutPrincipal({ children }) {
  const { sidebar_abierto, cerrar_sidebar } = useContextoApp();

  return (
    <div className="layout">
      {/* Overlay para cerrar sidebar en mobile */}
      {sidebar_abierto && (
        <div 
          className="layout__overlay"
          onClick={cerrar_sidebar}
          aria-hidden="true"
        />
      )}
      
      <Sidebar />
      <div className="layout__contenido">
        <Header />
        <main className="layout__main" onClick={cerrar_sidebar}>
          {children}
        </main>
      </div>
    </div>
  );
}