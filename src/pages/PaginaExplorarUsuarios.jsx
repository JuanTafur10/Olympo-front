import { useEffect, useMemo, useState } from "react";
import { useContextoApp } from "../context/contexto_app";
import { useNavigate } from "react-router-dom";
import { listar_usuarios_api, obtener_usuario_por_id_api } from "../services/auth_api";
import "./PaginaExplorarUsuarios.css";

function extraerPais(ciudad) {
  if (!ciudad) return "Sin país";
  const partes = String(ciudad).split(",");
  return partes.length > 1 ? partes[partes.length - 1].trim() : "Sin país";
}

export default function PaginaExplorarUsuarios() {
  const { datos_usuario, set_datos_contacto_temporario, mostrar_notificacion, set_id_inversionista_activo } = useContextoApp();
  const navigate = useNavigate();
  const esAdmin = Boolean(datos_usuario?.es_admin || String(datos_usuario?.tipo_usuario || datos_usuario?.rol || "").toLowerCase() === "admin");
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [paisSeleccionado, setPaisSeleccionado] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [muestraSeed, setMuestraSeed] = useState(0);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setCargando(true);
      setError("");
      try {
        const lista = await listar_usuarios_api(datos_usuario?.id);
        if (!activo) return;
        setUsuarios(lista || []);
        // preseleccionar país del usuario actual si existe
        const ciudadUsuario = datos_usuario?.ciudad_usuario || datos_usuario?.ciudad || "";
        const pais = extraerPais(ciudadUsuario);
        if (pais && pais !== "Sin país") setPaisSeleccionado(pais);
      } catch (err) {
        setError(err.message || "No fue posible cargar usuarios");
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargar();
    return () => { activo = false; };
  }, [datos_usuario]);

  const paises = useMemo(() => {
    const s = new Set();
    usuarios.forEach((u) => s.add(extraerPais(u.ciudad || u.ciudad_usuario)));
    return Array.from(s).filter((p) => p && p !== "Sin país").sort();
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    if (!paisSeleccionado) return usuarios;
    return usuarios.filter((u) => (u.ciudad || u.ciudad_usuario || "").includes(paisSeleccionado));
  }, [usuarios, paisSeleccionado]);

  const verPerfil = async (usuario) => {
    if (esAdmin) {
      mostrar_notificacion("error", "Los usuarios administradores no pueden contactar ni abrir perfiles de conversación.");
      return;
    }

    try {
      const usuarioDb = usuario.id ? await obtener_usuario_por_id_api(usuario.id) : usuario;
      const contactId = String(usuarioDb.firebase_uid ?? usuarioDb.id ?? usuarioDb.email ?? "");
      set_datos_contacto_temporario({
        id_contacto: contactId,
        id_chat: contactId,
        firebase_uid_contacto: contactId,
        usuario_id_contacto: usuarioDb.id || null,
        nombre_contacto: usuarioDb.nombre_usuario || usuarioDb.nombre || usuarioDb.email || "Usuario",
        foto_perfil: usuarioDb.foto_perfil || null,
        ciudad_contacto: usuarioDb.ciudad_usuario || usuarioDb.ciudad || null,
        descripcion_contacto: usuarioDb.descripcion_usuario || usuarioDb.descripcion || null,
      });
      navigate("/perfil-contacto");
    } catch (err) {
      mostrar_notificacion("error", err.message || "No fue posible abrir el perfil");
    }
  };

  const iniciarConversacion = async (usuario) => {
    if (esAdmin) {
      mostrar_notificacion("error", "Los usuarios administradores no pueden contactar inversionistas ni emprendedores.");
      return;
    }

    try {
      const usuarioDb = usuario.id ? await obtener_usuario_por_id_api(usuario.id) : usuario;
      const contactId = String(usuarioDb.firebase_uid ?? usuarioDb.id ?? usuarioDb.email ?? "");

      set_datos_contacto_temporario({
        id_contacto: contactId,
        id_chat: contactId,
        firebase_uid_contacto: contactId,
        usuario_id_contacto: usuarioDb.id || null,
        nombre_contacto: usuarioDb.nombre_usuario || usuarioDb.nombre || usuarioDb.email || "Usuario",
        rol_contacto: usuarioDb.rol || usuarioDb.tipo_usuario || "usuario",
        estado_contacto: usuarioDb.esta_activo ? "activo" : "inactivo",
        detalle_contacto: usuarioDb.ciudad || usuarioDb.descripcion || null,
        foto_perfil: usuarioDb.foto_perfil || null,
      });

      set_id_inversionista_activo(usuario.id);
      navigate("/mensajes");
      mostrar_notificacion("success", `Abriendo chat con ${usuarioDb.nombre_usuario || usuarioDb.nombre || "usuario"}...`);
    } catch (err) {
      mostrar_notificacion("error", err.message || "No se pudo iniciar la conversación");
    }
  };

  return (
    <div className="proyectos">
      <div className="proyectos__contenedor">
        <h2 className="proyectos__titulo">Explorar usuarios</h2>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <label style={{ fontSize: 14 }}>Filtrar por país:</label>
          <select value={paisSeleccionado} onChange={(e) => setPaisSeleccionado(e.target.value)} style={{ padding: 8 }}>
            <option value="">Todos los países</option>
            {paises.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <div style={{ flex: "1 1 260px", display: "flex", gap: 8, alignItems: "center" }}>
            <input
              placeholder="Buscar usuarios por nombre, rol o ciudad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", background: "transparent", color: "#eef2ff" }}
            />
            <button className="proyectos__btn" onClick={() => setMuestraSeed((s) => s + 1)}>Actualizar muestra</button>
          </div>
        </div>

        {error && <div style={{ color: "#b33", marginBottom: 12 }}>{error}</div>}
        {cargando && <div style={{ marginBottom: 12 }}>Cargando usuarios...</div>}

        {searchQuery ? (
          <div className="explorar-grid">
            {usuariosFiltrados.filter((uu) => {
              const q = searchQuery.toLowerCase();
              return (
                (uu.nombre_usuario || uu.nombre || "").toLowerCase().includes(q) ||
                (uu.email || "").toLowerCase().includes(q) ||
                (uu.rol || "").toLowerCase().includes(q) ||
                (uu.ciudad || uu.ciudad_usuario || "").toLowerCase().includes(q)
              );
            }).map((u) => (
              <div key={u.id || u.email || u.firebase_uid} className="explorar-card">
                <div className="explorar-card-top" />

                <div className="explorar-avatar">
                  {u.foto_perfil ? (
                    <img src={u.foto_perfil} alt={`${u.nombre_usuario || u.nombre || u.email} avatar`} />
                  ) : (
                    <span className="explorar-avatar-inicial">{(u.nombre_usuario || u.nombre || u.email || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="explorar-card-content">
                  <strong className="explorar-nombre">{u.nombre_usuario || u.nombre || u.email}</strong>
                  <div className="explorar-rol">{u.rol || u.rol_usuario || "Usuario"}</div>
                  <p className="explorar-descripcion">{(u.descripcion_usuario || u.descripcion || u.ciudad || "-").slice(0, 120)}</p>
                  <div className="explorar-meta">
                    <small className="explorar-ciudad">{u.ciudad || u.ciudad_usuario || "-"}</small>
                  </div>
                </div>

                {!esAdmin && (
                  <div className="explorar-card-actions">
                    <button className="proyectos__btn" onClick={() => verPerfil(u)}>Ver perfil</button>
                    <button className="explorar-btn-conectar" onClick={() => iniciarConversacion(u)}>Conversar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="explorar-notice">Mostrando 20 usuarios al azar. Usa la búsqueda si necesitas a alguien en particular.</div>
            <div className="explorar-grid">
              {(() => {
                const source = usuariosFiltrados || [];
                if (source.length <= 20) {
                  return source.map((u) => (
                    <div key={u.id || u.email || u.firebase_uid} className="explorar-card">
                      <div className="explorar-card-top" />

                      <div className="explorar-avatar">
                        {u.foto_perfil ? (
                          <img src={u.foto_perfil} alt={`${u.nombre_usuario || u.nombre || u.email} avatar`} />
                        ) : (
                          <span className="explorar-avatar-inicial">{(u.nombre_usuario || u.nombre || u.email || "U").charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="explorar-card-content">
                        <strong className="explorar-nombre">{u.nombre_usuario || u.nombre || u.email}</strong>
                        <div className="explorar-rol">{u.rol || u.rol_usuario || "Usuario"}</div>
                        <p className="explorar-descripcion">{(u.descripcion_usuario || u.descripcion || u.ciudad || "-").slice(0, 120)}</p>
                        <div className="explorar-meta">
                          <small className="explorar-ciudad">{u.ciudad || u.ciudad_usuario || "-"}</small>
                        </div>
                      </div>

                      {!esAdmin && (
                        <div className="explorar-card-actions">
                          <button className="proyectos__btn" onClick={() => verPerfil(u)}>Ver perfil</button>
                          <button className="explorar-btn-conectar" onClick={() => iniciarConversacion(u)}>Conversar</button>
                        </div>
                      )}
                    </div>
                  ));
                }
                // seeded shuffle using muestraSeed to allow regenerar
                const arr = source.slice();
                let seed = muestraSeed || Date.now();
                const rnd = () => {
                  seed = (seed * 9301 + 49297) % 233280;
                  return seed / 233280;
                };
                for (let i = arr.length - 1; i > 0; i--) {
                  const j = Math.floor(rnd() * (i + 1));
                  const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
                }
                return arr.slice(0, 20).map((u) => (
                  <div key={u.id || u.email || u.firebase_uid} className="explorar-card">
                    <div className="explorar-card-top" />

                    <div className="explorar-avatar">
                      {u.foto_perfil ? (
                        <img src={u.foto_perfil} alt={`${u.nombre_usuario || u.nombre || u.email} avatar`} />
                      ) : (
                        <span className="explorar-avatar-inicial">{(u.nombre_usuario || u.nombre || u.email || "U").charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="explorar-card-content">
                      <strong className="explorar-nombre">{u.nombre_usuario || u.nombre || u.email}</strong>
                      <div className="explorar-rol">{u.rol || u.rol_usuario || "Usuario"}</div>
                      <p className="explorar-descripcion">{(u.descripcion_usuario || u.descripcion || u.ciudad || "-").slice(0, 120)}</p>
                      <div className="explorar-meta">
                        <small className="explorar-ciudad">{u.ciudad || u.ciudad_usuario || "-"}</small>
                      </div>
                    </div>

                    {!esAdmin && (
                      <div className="explorar-card-actions">
                        <button className="proyectos__btn" onClick={() => verPerfil(u)}>Ver perfil</button>
                        <button className="explorar-btn-conectar" onClick={() => iniciarConversacion(u)}>Conversar</button>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
