// PaginaCuenta.jsx — Perfil del usuario
import { useContextoApp } from "../context/contexto_app";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Globe2, Link, Mail, MapPin, Phone, ShieldCheck, UserRound, Upload, Camera } from "lucide-react";
import "./PaginaCuenta.css";

export default function PaginaCuenta() {
  const { datos_usuario, actualizar_perfil_usuario, actualizar_foto_perfil } = useContextoApp();
  const nombre_usuario = datos_usuario.nombre_usuario || datos_usuario.nombre || "Usuario";
  const email_usuario = datos_usuario.email_usuario || datos_usuario.email || "No registrado";
  const tipo_usuario = datos_usuario.tipo_usuario || datos_usuario.rol || "usuario";
  const descripcion_usuario = datos_usuario.descripcion_usuario ?? datos_usuario.descripcion ?? "Sin biografía registrada";
  const telefono_usuario = datos_usuario.telefono_usuario || datos_usuario.telefono || "No registrado";
  const website_usuario = datos_usuario.website_usuario || datos_usuario.website || "No registrado";
  const linkedin_usuario = datos_usuario.linkedin_usuario || datos_usuario.linkedin || "No registrado";
  const ciudad_usuario = datos_usuario.ciudad_usuario || datos_usuario.ciudad || "No registrado";
  const inicial_usuario = nombre_usuario.charAt(0).toUpperCase();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    telefono: "",
    website: "",
    linkedin: "",
    ciudad: "",
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [uploading, setUploading] = useState(false);

  const openModal = () => {
    setForm({
      telefono: datos_usuario.telefono_usuario ?? datos_usuario.telefono ?? "",
      website: datos_usuario.website_usuario ?? datos_usuario.website ?? "",
      linkedin: datos_usuario.linkedin_usuario ?? datos_usuario.linkedin ?? "",
      ciudad: datos_usuario.ciudad_usuario ?? datos_usuario.ciudad ?? "",
      descripcion: datos_usuario.descripcion_usuario ?? datos_usuario.descripcion ?? "",
    });
    setMensaje(null);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMensaje(null);
    try {
      const res = await actualizar_perfil_usuario({
        telefono: form.telefono || null,
        website: form.website || null,
        linkedin: form.linkedin || null,
        ciudad: form.ciudad || null,
        descripcion: form.descripcion || null,
      });

      if (res.exitoso) {
        setMensaje("Perfil actualizado");
        setModalOpen(false);
        // No recargamos la página: el contexto global ya actualiza `datos_usuario`
        // y la UI se volverá a renderizar automáticamente.
      } else {
        setMensaje(res.mensaje || "Error al actualizar");
      }
    } catch (err) {
      setMensaje(err.message || "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMensaje(null);
    try {
      const res = await actualizar_foto_perfil(file);
      if (res.exitoso) {
        setMensaje("Foto actualizada");
      } else {
        setMensaje(res.mensaje);
      }
    } catch (err) {
      setMensaje("Error al subir foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="cuenta">
      <div className="cuenta__contenedor">
        <div className="cuenta__hero">
          <div className="cuenta__hero-texto">
            <p className="cuenta__hero-kicker">Perfil y verificación</p>
            <h2 className="cuenta__hero-titulo">Cuenta</h2>
            <p className="cuenta__hero-subtitulo">
              Gestiona tu información personal, foto de perfil y estado de verificación desde un espacio más limpio y consistente.
            </p>
          </div>
          <div className="cuenta__hero-chip">
            <UserRound size={14} />
            {tipo_usuario.toString().toUpperCase()}
          </div>
        </div>

        <div className="cuenta__grid">
          {/* Tarjeta de perfil */}
          <div className="cuenta__perfil">
            <div className="cuenta__perfil-cabecera">
              <span className="cuenta__perfil-etiqueta">Datos personales</span>
              <span className="cuenta__perfil-marca">AMBROSIA</span>
            </div>

            <div className="cuenta__avatar-grande">
              {datos_usuario.foto_perfil ? (
                <img src={datos_usuario.foto_perfil} alt="Perfil" className="cuenta__avatar-imagen" />
              ) : (
                inicial_usuario
              )}
              {uploading && (
                <div className="cuenta__avatar-cargando">
                  <span className="cuenta__avatar-cargando-spinner" aria-hidden="true" />
                  <span>Actualizando</span>
                </div>
              )}
              <label className="cuenta__btn-subir-foto">
                <Camera size={13} />
                <span>Cambiar foto</span>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
              </label>
            </div>
            <div className="cuenta__info-nombre">
              <h2>{nombre_usuario}</h2>
              <div className="cuenta__meta-row">
                <span className="cuenta__badge-tipo">{tipo_usuario.toString().toUpperCase()}</span>
                <span className="cuenta__estado-localidad">
                  <MapPin size={13} /> {ciudad_usuario}
                </span>
              </div>
              <p className="cuenta__ciudad"><MapPin size={14} /> {ciudad_usuario}</p>
            </div>

            <p className="cuenta__descripcion">{descripcion_usuario}</p>

            <div className="cuenta__datos-contacto">
              <div className="cuenta__dato-fila">
                <span className="cuenta__dato-icono"><Mail size={16} /></span>
                <span className="cuenta__dato-label">Correo electrónico</span>
                <span className="cuenta__dato-valor texto-azul">{email_usuario}</span>
              </div>
              <div className="cuenta__dato-fila">
                  <span className="cuenta__dato-icono"><Phone size={16} /></span>
                  <span className="cuenta__dato-label">Teléfono</span>
                  <span className="cuenta__dato-valor">{telefono_usuario}</span>
                </div>
              <div className="cuenta__dato-fila">
                <span className="cuenta__dato-icono"><Globe2 size={16} /></span>
                <span className="cuenta__dato-label">Website</span>
                <span className="cuenta__dato-valor">{website_usuario}</span>
              </div>
              <div className="cuenta__dato-fila">
                <span className="cuenta__dato-icono"><Link size={16} /></span>
                <span className="cuenta__dato-label">Linkedin</span>
                <span className="cuenta__dato-valor texto-azul">{linkedin_usuario}</span>
              </div>
            </div>

            <div className="cuenta__acciones">
              <button className="cuenta__btn-actualizar" onClick={openModal}>Actualizar mi perfil</button>
              <button className="cuenta__btn-contrasena" type="button">Cambiar contraseña</button>
            </div>
          </div>

          {/* Panel de verificación */}
          <div className="cuenta__verificacion">
            <div className="cuenta__verificacion-titulo">
              <span><ShieldCheck size={20} /></span>
              <h3>Verificación</h3>
            </div>

            <div className="cuenta__verificacion-item cuenta__verificacion-item--ok">
              <span><CheckCircle2 size={17} /></span>
              <span>Correo verificado</span>
            </div>

            <div className="cuenta__verificacion-item cuenta__verificacion-item--ok">
              <span><CheckCircle2 size={17} /></span>
              <span>Teléfono verificado</span>
            </div>

            <div className="cuenta__verificacion-alerta">
              <div className="cuenta__alerta-header">
                <span><AlertTriangle size={17} /></span>
                <strong>Documento pendiente</strong>
              </div>
              <p>Sube tu documentación oficial para completar la verificación.</p>
              <button className="cuenta__btn-subir" type="button">
                <Upload size={14} />
                <span>Subir documentación</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="cuenta__modal-overlay">
          <div className="cuenta__modal">
            <div className="cuenta__modal-header">
              <div>
                <p className="cuenta__modal-kicker">Edición rápida</p>
                <h3>Editar perfil</h3>
              </div>
              <button className="cuenta__modal-cerrar" onClick={closeModal} aria-label="Cerrar edición">
                ×
              </button>
            </div>

            <div className="cuenta__modal-cuerpo">
              <label>
                Teléfono
                <input name="telefono" value={form.telefono} onChange={handleChange} />
              </label>
              <label>
                Website
                <input name="website" value={form.website} onChange={handleChange} />
              </label>
              <label>
                LinkedIn
                <input name="linkedin" value={form.linkedin} onChange={handleChange} />
              </label>
              <label>
                Ciudad
                <input name="ciudad" value={form.ciudad} onChange={handleChange} />
              </label>
              <label className="cuenta__modal-bio">
                Biografía
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} />
              </label>

              {mensaje && <div className="cuenta__modal-mensaje">{mensaje}</div>}

              <div className="cuenta__modal-acciones">
                <button onClick={closeModal} disabled={saving} className="cuenta__btn-contrasena">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="cuenta__btn-actualizar">{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
