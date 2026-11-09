// PaginaPerfilContacto.jsx — Perfil solo lectura del contacto seleccionado
import { useContextoApp } from "../context/contexto_app";
import { useNavigate } from "../hooks/useNavigate";
import { CheckCircle2, Globe2, Info, Link, Mail, MapPin, Phone, UserRound } from "lucide-react";
import "./PaginaCuenta.css";

export default function PaginaPerfilContacto() {
  const { datos_contacto_temporario, set_datos_contacto_temporario } = useContextoApp();
  const navigate = useNavigate();

  const contacto = datos_contacto_temporario || {};
  const nombre = contacto.nombre_contacto || contacto.nombre_usuario || contacto.nombre || "Contacto";
  const email = contacto.email_contacto || contacto.email_usuario || contacto.email || "No registrado";
  const tipo = contacto.rol_contacto || contacto.tipo_usuario || contacto.rol || "contacto";
  const descripcion = contacto.descripcion_contacto ?? contacto.descripcion_usuario ?? contacto.descripcion ?? "Sin biografía registrada";
  const telefono = contacto.telefono_contacto || contacto.telefono_usuario || contacto.telefono || "No registrado";
  const website = contacto.website_contacto || contacto.website_usuario || contacto.website || "No registrado";
  const linkedin = contacto.linkedin_contacto || contacto.linkedin_usuario || contacto.linkedin || "No registrado";
  const ciudad = contacto.ciudad_contacto || contacto.ciudad_usuario || contacto.ciudad || "No registrado";
  const foto_perfil = contacto.foto_perfil || null;
  const inicial = nombre.charAt(0).toUpperCase();

  const volver_a_mensajes = () => {
    set_datos_contacto_temporario(null);
    navigate("/mensajes");
  };

  return (
    <div className="cuenta">
      <div className="cuenta__contenedor">
        <h2 className="cuenta__seccion-titulo"><UserRound size={18} /> Perfil del contacto</h2>

        <div style={{ marginBottom: 16 }}>
          <button className="cuenta__btn-contrasena" onClick={volver_a_mensajes}>
            ← Volver a mensajes
          </button>
        </div>

        <div className="cuenta__grid">
          <div className="cuenta__perfil">
            <div className="cuenta__avatar-grande" style={{ position: "relative", overflow: "hidden" }}>
              {foto_perfil ? (
                <img src={foto_perfil} alt="Perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                inicial
              )}
            </div>

            <div className="cuenta__info-nombre">
              <h2>{nombre}</h2>
              <span className="cuenta__badge-tipo">{tipo.toString().toUpperCase()}</span>
              <p className="cuenta__ciudad"><MapPin size={14} /> {ciudad}</p>
            </div>

            <p className="cuenta__descripcion">{descripcion}</p>

            <div className="cuenta__datos-contacto">
              <div className="cuenta__dato-fila">
                <span className="cuenta__dato-icono"><Mail size={16} /></span>
                <span className="cuenta__dato-label">Correo electrónico</span>
                <span className="cuenta__dato-valor texto-azul">{email}</span>
              </div>
              <div className="cuenta__dato-fila">
                <span className="cuenta__dato-icono"><Phone size={16} /></span>
                <span className="cuenta__dato-label">Teléfono</span>
                <span className="cuenta__dato-valor">{telefono}</span>
              </div>
              <div className="cuenta__dato-fila">
                <span className="cuenta__dato-icono"><Globe2 size={16} /></span>
                <span className="cuenta__dato-label">Website</span>
                <span className="cuenta__dato-valor">{website}</span>
              </div>
              <div className="cuenta__dato-fila">
                <span className="cuenta__dato-icono"><Link size={16} /></span>
                <span className="cuenta__dato-label">Linkedin</span>
                <span className="cuenta__dato-valor texto-azul">{linkedin}</span>
              </div>
            </div>
          </div>

          <div className="cuenta__verificacion">
            <div className="cuenta__verificacion-titulo">
              <span><Info size={20} /></span>
              <h3>Información</h3>
            </div>

            <div className="cuenta__verificacion-item cuenta__verificacion-item--ok">
              <span><CheckCircle2 size={17} /></span>
              <span>Perfil disponible</span>
            </div>

            <div className="cuenta__verificacion-item cuenta__verificacion-item--ok">
              <span><CheckCircle2 size={17} /></span>
              <span>Contacto activo en mensajes</span>
            </div>

            <div className="cuenta__verificacion-alerta">
              <div className="cuenta__alerta-header">
                <span><Info size={17} /></span>
                <strong>Vista de solo lectura</strong>
              </div>
              <p>No puedes editar este perfil porque pertenece al contacto seleccionado.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
