import { useEffect, useMemo, useRef, useState } from "react";
import { useContextoApp } from "../context/contexto_app";
import {
  actualizar_estado_usuario_admin_api,
  actualizar_config_registro_libre_api,
  crear_admin_api,
  obtener_config_registro_libre_api,
  listar_usuarios_admin_api,
  rechazar_registro_usuario_admin_api,
} from "../services/auth_api";
import "./PaginaAdministracion.css";

const estadoEtiqueta = (activo) => (activo ? "Activo" : "Bloqueado");

export default function PaginaAdministracion() {
  const { datos_usuario, mostrar_notificacion } = useContextoApp();
  const [usuarios, set_usuarios] = useState([]);
  const [cargando, set_cargando] = useState(true);
  const [cargando_config, set_cargando_config] = useState(true);
  const [busqueda, set_busqueda] = useState("");
  const [mensaje_error, set_mensaje_error] = useState("");
  const [guardando, set_guardando] = useState(false);
  const [registro_libre, set_registro_libre] = useState(true);
  const aviso_pendientes_mostrado = useRef(false);
  const [formulario, set_formulario] = useState({
    nombre_usuario: "",
    nombre: "",
    email: "",
    password: "",
    confirm_password: "",
    descripcion: "",
  });

  const cargar_usuarios = async () => {
    set_cargando(true);
    set_mensaje_error("");

    try {
      const lista = await listar_usuarios_admin_api(datos_usuario?.id);
      set_usuarios(lista);
    } catch (error) {
      const mensaje = error.message || "No se pudieron cargar los usuarios";
      set_mensaje_error(mensaje);
      mostrar_notificacion?.("error", mensaje, 4500);
    } finally {
      set_cargando(false);
    }
  };

  const cargar_configuracion = async () => {
    set_cargando_config(true);
    try {
      const config = await obtener_config_registro_libre_api();
      set_registro_libre(Boolean(config.registro_libre));
    } catch (error) {
      const mensaje = error.message || "No se pudo cargar la configuración de registro";
      set_mensaje_error(mensaje);
      mostrar_notificacion?.("error", mensaje, 4500);
    } finally {
      set_cargando_config(false);
    }
  };

  useEffect(() => {
    cargar_configuracion();
    cargar_usuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos_usuario?.id]);

  const usuarios_filtrados = useMemo(() => {
    const filtro = busqueda.trim().toLowerCase();
    if (!filtro) return usuarios;
    return usuarios.filter((usuario) => {
      const texto = [usuario.nombre, usuario.email, usuario.rol].filter(Boolean).join(" ").toLowerCase();
      return texto.includes(filtro);
    });
  }, [busqueda, usuarios]);

  const resumen = useMemo(() => {
    const admins = usuarios.filter((usuario) => (usuario.rol || "").toLowerCase() === "admin").length;
    const activos = usuarios.filter((usuario) => usuario.activo).length;
    const bloqueados = usuarios.length - activos;
    const pendientes = usuarios.filter((usuario) => usuario.pendiente_aprobacion).length;
    return { total: usuarios.length, admins, activos, bloqueados, pendientes };
  }, [usuarios]);

  const usuarios_pendientes = useMemo(
    () => usuarios.filter((usuario) => usuario.pendiente_aprobacion),
    [usuarios],
  );

  useEffect(() => {
    if (cargando) {
      return;
    }

    if (usuarios_pendientes.length > 0 && !aviso_pendientes_mostrado.current) {
      mostrar_notificacion?.(
        "info",
        `Tienes ${usuarios_pendientes.length} usuario${usuarios_pendientes.length === 1 ? "" : "s"} por aceptar o rechazar`,
        6000,
      );
      aviso_pendientes_mostrado.current = true;
    }

    if (usuarios_pendientes.length === 0) {
      aviso_pendientes_mostrado.current = false;
    }
  }, [cargando, usuarios_pendientes.length, mostrar_notificacion]);

  const manejar_switch_registro = async () => {
    const siguiente_valor = !registro_libre;
    set_guardando(true);
    set_mensaje_error("");

    try {
      const respuesta = await actualizar_config_registro_libre_api(siguiente_valor);
      set_registro_libre(Boolean(respuesta.registro_libre));
      mostrar_notificacion?.(
        "exito",
        respuesta.registro_libre ? "Registro libre activado" : "Registro libre desactivado",
        3500,
      );
    } catch (error) {
      const mensaje = error.message || "No se pudo actualizar el estado del registro";
      set_mensaje_error(mensaje);
      mostrar_notificacion?.("error", mensaje, 4500);
    } finally {
      set_guardando(false);
    }
  };

  const manejar_creacion_admin = async (event) => {
    event.preventDefault();
    set_guardando(true);
    set_mensaje_error("");

    try {
      await crear_admin_api({
        ...formulario,
        acepta_terminos: true,
      });

      set_formulario({
        nombre_usuario: "",
        nombre: "",
        email: "",
        password: "",
        confirm_password: "",
        descripcion: "",
      });

      await cargar_usuarios();
      mostrar_notificacion?.("exito", "Administrador creado correctamente", 4000);
    } catch (error) {
      const mensaje = error.message || "No se pudo crear el administrador";
      set_mensaje_error(mensaje);
      mostrar_notificacion?.("error", mensaje, 5000);
    } finally {
      set_guardando(false);
    }
  };

  const manejar_estado = async (usuario) => {
    const activar = !usuario.activo;
    set_guardando(true);

    try {
      await actualizar_estado_usuario_admin_api(usuario.id, activar);
      await cargar_usuarios();
      mostrar_notificacion?.("exito", activar ? "Usuario activado" : "Usuario bloqueado", 3500);
    } catch (error) {
      const mensaje = error.message || "No se pudo actualizar el usuario";
      set_mensaje_error(mensaje);
      mostrar_notificacion?.("error", mensaje, 4500);
    } finally {
      set_guardando(false);
    }
  };

  const manejar_rechazo = async (usuario) => {
    set_guardando(true);
    set_mensaje_error("");

    try {
      await rechazar_registro_usuario_admin_api(usuario.id);
      await cargar_usuarios();
      mostrar_notificacion?.("exito", "Registro rechazado y usuario eliminado", 4000);
    } catch (error) {
      const mensaje = error.message || "No se pudo rechazar el registro";
      set_mensaje_error(mensaje);
      mostrar_notificacion?.("error", mensaje, 4500);
    } finally {
      set_guardando(false);
    }
  };

  return (
    <section className="admin-panel">
      <header className="admin-panel__hero">
        <div>
          <p className="admin-panel__eyebrow">Panel de administración</p>
          <h2>Control de cuentas, roles y bloqueos</h2>
          <p>
            Gestiona administradores y bloquea cuentas desde un solo lugar. El acceso está restringido a usuarios con rol admin.
          </p>
        </div>

        <div className="admin-panel__stats">
          <article>
            <span>Total</span>
            <strong>{resumen.total}</strong>
          </article>
          <article>
            <span>Admins</span>
            <strong>{resumen.admins}</strong>
          </article>
          <article>
            <span>Activos</span>
            <strong>{resumen.activos}</strong>
          </article>
          <article>
            <span>Bloqueados</span>
            <strong>{resumen.bloqueados}</strong>
          </article>
          <article>
            <span>Pendientes</span>
            <strong>{resumen.pendientes}</strong>
          </article>
        </div>
      </header>

      <section className="admin-panel__card admin-panel__config">
        <div className="admin-panel__card-head admin-panel__card-head--row">
          <div>
            <h3>Registro y aprobaciones</h3>
            <p>Activa o desactiva el libre registro. Cuando está apagado, los nuevos usuarios quedan pendientes hasta que los apruebes.</p>
          </div>

          <button
            type="button"
            className={`admin-panel__switch ${registro_libre ? "admin-panel__switch--on" : "admin-panel__switch--off"}`}
            onClick={manejar_switch_registro}
            disabled={guardando || cargando_config}
            aria-pressed={registro_libre}
          >
            <span className="admin-panel__switch-text">
              <strong>{registro_libre ? "Registro libre" : "Registro con aprobación"}</strong>
              <small>{cargando_config ? "Cargando estado..." : registro_libre ? "Cualquiera puede registrarse" : "Los nuevos usuarios esperan confirmación"}</small>
            </span>
            <span className="admin-panel__switch-track" aria-hidden="true">
              <span className="admin-panel__switch-thumb" />
            </span>
          </button>
        </div>

        <div className="admin-panel__pendientes">
          <div className="admin-panel__pendientes-head">
            <h4>Cuentas pendientes</h4>
            <p>{usuarios_pendientes.length} usuario{usuarios_pendientes.length === 1 ? "" : "s"} esperando aprobación</p>
          </div>

          {usuarios_pendientes.length === 0 ? (
            <div className="admin-panel__estado">No hay cuentas pendientes en este momento.</div>
          ) : (
            <div className="admin-panel__pendientes-lista">
              {usuarios_pendientes.map((usuario) => (
                <article className="admin-panel__pendiente" key={usuario.id}>
                  <div>
                    <strong>{usuario.nombre || "Sin nombre"}</strong>
                    <span>{usuario.email}</span>
                    <span>{usuario.rol}</span>
                  </div>
                  <div className="admin-panel__pendiente-acciones">
                    <button
                      type="button"
                      className="admin-panel__accion admin-panel__accion--ok"
                      onClick={() => manejar_estado(usuario)}
                      disabled={guardando}
                    >
                      Aprobar y enviar correo
                    </button>
                    <button
                      type="button"
                      className="admin-panel__accion admin-panel__accion--danger"
                      onClick={() => manejar_rechazo(usuario)}
                      disabled={guardando}
                    >
                      Rechazar registro
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="admin-panel__grid">
        <form className="admin-panel__card admin-panel__form" onSubmit={manejar_creacion_admin}>
          <div className="admin-panel__card-head">
            <h3>Crear administrador</h3>
            <p>Solo un usuario admin autenticado puede ejecutar esta acción.</p>
          </div>

          <div className="admin-panel__campos">
            <label>
              <span>Nombre de usuario</span>
              <input
                value={formulario.nombre_usuario}
                onChange={(e) => set_formulario((prev) => ({ ...prev, nombre_usuario: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>Nombre</span>
              <input
                value={formulario.nombre}
                onChange={(e) => set_formulario((prev) => ({ ...prev, nombre: e.target.value }))}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={formulario.email}
                onChange={(e) => set_formulario((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>Contraseña</span>
              <input
                type="password"
                value={formulario.password}
                onChange={(e) => set_formulario((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>Confirmar contraseña</span>
              <input
                type="password"
                value={formulario.confirm_password}
                onChange={(e) => set_formulario((prev) => ({ ...prev, confirm_password: e.target.value }))}
                required
              />
            </label>
            <label className="admin-panel__textarea">
              <span>Descripción</span>
              <textarea
                value={formulario.descripcion}
                onChange={(e) => set_formulario((prev) => ({ ...prev, descripcion: e.target.value }))}
                rows={4}
              />
            </label>
          </div>

          {mensaje_error && <p className="admin-panel__error">{mensaje_error}</p>}

          <button className="admin-panel__submit" type="submit" disabled={guardando}>
            {guardando ? "Procesando..." : "Crear administrador"}
          </button>
        </form>

        <div className="admin-panel__card admin-panel__listado">
          <div className="admin-panel__card-head admin-panel__card-head--row">
            <div>
              <h3>Usuarios</h3>
              <p>Bloquea o reactiva cuentas sin salir del panel.</p>
            </div>

            <label className="admin-panel__buscador">
              <span>Buscar</span>
              <input
                type="search"
                placeholder="Nombre, email o rol"
                value={busqueda}
                onChange={(e) => set_busqueda(e.target.value)}
              />
            </label>
          </div>

          {cargando ? (
            <div className="admin-panel__estado">Cargando usuarios...</div>
          ) : usuarios_filtrados.length === 0 ? (
            <div className="admin-panel__estado">No hay usuarios para mostrar.</div>
          ) : (
            <div className="admin-panel__tabla-wrapper">
              <table className="admin-panel__tabla">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios_filtrados.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>
                        <strong>{usuario.nombre || "Sin nombre"}</strong>
                        <span>{usuario.email}</span>
                      </td>
                      <td>{usuario.rol}</td>
                      <td>
                        <span className={`admin-panel__badge ${usuario.activo ? "admin-panel__badge--ok" : "admin-panel__badge--warn"}`}>
                          {usuario.pendiente_aprobacion ? "Pendiente" : estadoEtiqueta(usuario.activo)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`admin-panel__accion ${usuario.activo ? "admin-panel__accion--danger" : "admin-panel__accion--ok"}`}
                          onClick={() => manejar_estado(usuario)}
                          disabled={guardando}
                        >
                          {usuario.pendiente_aprobacion ? "Aprobar" : usuario.activo ? "Bloquear" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}