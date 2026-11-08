import {
  Bell,
  CalendarDays,
  Check,
  Eye,
  Globe2,
  Languages,
  Lock,
  Moon,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  WalletCards,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useContextoApp } from "../context/contexto_app";
import "./PaginaConfiguracion.css";

const idiomas = [
  { valor: "es", etiqueta: "Español" },
  { valor: "en", etiqueta: "English" },
  { valor: "pt", etiqueta: "Portugues" },
];

const monedas = [
  { valor: "COP", etiqueta: "Peso colombiano" },
  { valor: "USD", etiqueta: "Dolar estadounidense" },
  { valor: "EUR", etiqueta: "Euro" },
];

const formatos_fecha = [
  { valor: "dd/mm/yyyy", etiqueta: "DD/MM/AAAA" },
  { valor: "mm/dd/yyyy", etiqueta: "MM/DD/AAAA" },
  { valor: "yyyy-mm-dd", etiqueta: "AAAA-MM-DD" },
];

function SwitchConfig({ activo, onChange, etiqueta }) {
  return (
    <button
      type="button"
      className={`configuracion__switch${activo ? " configuracion__switch--activo" : ""}`}
      onClick={() => onChange(!activo)}
      aria-label={etiqueta}
      aria-pressed={activo}
      title={etiqueta}
    >
      <span className="configuracion__switch-bola" />
    </button>
  );
}

function FilaToggle({ icono: Icono, titulo, descripcion, activo, onChange }) {
  return (
    <div className="configuracion__fila">
      <div className="configuracion__fila-icono">
        <Icono size={18} />
      </div>
      <div className="configuracion__fila-texto">
        <h3>{titulo}</h3>
        <p>{descripcion}</p>
      </div>
      <SwitchConfig activo={activo} onChange={onChange} etiqueta={titulo} />
    </div>
  );
}

function Selector({ id, etiqueta, valor, opciones, onChange }) {
  return (
    <label className="configuracion__selector" htmlFor={id}>
      <span>{etiqueta}</span>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)}>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function PaginaConfiguracion() {
  const {
    configuracion_global,
    actualizar_configuracion_global,
    restablecer_configuracion_global,
    mostrar_notificacion,
  } = useContextoApp();

  const [configuracion_temporal, set_configuracion_temporal] = useState(configuracion_global);

  useEffect(() => {
    set_configuracion_temporal(configuracion_global);
  }, [configuracion_global]);

  const actualizar = (clave, valor) => {
    set_configuracion_temporal((prev) => ({ ...prev, [clave]: valor }));
  };

  const guardar = () => {
    actualizar_configuracion_global(configuracion_temporal);
    mostrar_notificacion("exito", "Configuracion guardada", 2600);
  };

  const restablecer = () => {
    restablecer_configuracion_global();
    set_configuracion_temporal(configuracion_global);
    mostrar_notificacion("info", "Configuracion restablecida", 2600);
  };

  return (
    <div className="configuracion">
      <div className="configuracion__contenedor">
        <header className="configuracion__hero">
          <div>
            <span className="configuracion__eyebrow">Preferencias globales</span>
            <h2>Configuracion</h2>
            <p>
              Ajusta como se comporta Ambrosia para tu cuenta: idioma, apariencia,
              notificaciones, privacidad y valores financieros.
            </p>
          </div>
          <div className="configuracion__acciones">
            <button type="button" className="configuracion__btn configuracion__btn--secundario" onClick={restablecer}>
              <RotateCcw size={16} />
              Restablecer
            </button>
            <button type="button" className="configuracion__btn configuracion__btn--primario" onClick={guardar}>
              <Save size={16} />
              Guardar cambios
            </button>
          </div>
        </header>

        <section className="configuracion__grid">
          <article className="configuracion__panel configuracion__panel--ancho">
            <div className="configuracion__panel-header">
              <Languages size={20} />
              <div>
                <h3>Idioma y region</h3>
                <p>Define los formatos base que usara la plataforma.</p>
              </div>
            </div>
            <div className="configuracion__selectores">
              <Selector
                id="config-idioma"
                etiqueta="Idioma principal"
                valor={configuracion_temporal.idioma}
                opciones={idiomas}
                onChange={(valor) => actualizar("idioma", valor)}
              />
              <Selector
                id="config-moneda"
                etiqueta="Moneda preferida"
                valor={configuracion_temporal.moneda}
                opciones={monedas}
                onChange={(valor) => actualizar("moneda", valor)}
              />
              <Selector
                id="config-fecha"
                etiqueta="Formato de fecha"
                valor={configuracion_temporal.formato_fecha}
                opciones={formatos_fecha}
                onChange={(valor) => actualizar("formato_fecha", valor)}
              />
            </div>
          </article>

          <article className="configuracion__panel">
            <div className="configuracion__panel-header">
              <Eye size={20} />
              <div>
                <h3>Apariencia</h3>
                <p>Selecciona la lectura visual mas comoda.</p>
              </div>
            </div>
            <div className="configuracion__tema">
              {[
                { valor: "oscuro", etiqueta: "Oscura", Icono: Moon },
                { valor: "claro", etiqueta: "Clara", Icono: Sun },
                { valor: "sistema", etiqueta: "Sistema", Icono: Globe2 },
              ].map(({ valor, etiqueta, Icono }) => (
                <button
                  key={valor}
                  type="button"
                  className={`configuracion__tema-opcion${configuracion_temporal.tema === valor ? " configuracion__tema-opcion--activa" : ""}`}
                  onClick={() => actualizar("tema", valor)}
                >
                  <Icono size={18} />
                  <span>{etiqueta}</span>
                  {configuracion_temporal.tema === valor && <Check size={15} />}
                </button>
              ))}
            </div>
          </article>

          <article className="configuracion__panel">
            <div className="configuracion__panel-header">
              <Zap size={20} />
              <div>
                <h3>Experiencia</h3>
                <p>Ajustes para velocidad, densidad y movimiento.</p>
              </div>
            </div>
            <div className="configuracion__segmentado" role="group" aria-label="Densidad visual">
              {["compacta", "comoda", "amplia"].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  className={configuracion_temporal.densidad === valor ? "configuracion__segmento--activo" : ""}
                  onClick={() => actualizar("densidad", valor)}
                >
                  {valor}
                </button>
              ))}
            </div>
            <FilaToggle
              icono={Zap}
              titulo="Reducir animaciones"
              descripcion="Minimiza transiciones y movimientos en la interfaz."
              activo={configuracion_temporal.reducir_animaciones}
              onChange={(valor) => actualizar("reducir_animaciones", valor)}
            />
            <FilaToggle
              icono={Save}
              titulo="Autoguardado"
              descripcion="Conserva cambios de formularios cuando sea posible."
              activo={configuracion_temporal.autoguardado}
              onChange={(valor) => actualizar("autoguardado", valor)}
            />
          </article>

          <article className="configuracion__panel configuracion__panel--ancho">
            <div className="configuracion__panel-header">
              <Bell size={20} />
              <div>
                <h3>Notificaciones</h3>
                <p>Controla que avisos quieres recibir y donde verlos.</p>
              </div>
            </div>
            <FilaToggle
              icono={Bell}
              titulo="Notificaciones en la app"
              descripcion="Muestra avisos emergentes dentro de Olympo."
              activo={configuracion_temporal.notificaciones_push}
              onChange={(valor) => actualizar("notificaciones_push", valor)}
            />
            <FilaToggle
              icono={CalendarDays}
              titulo="Resumen semanal"
              descripcion="Recibe un resumen de actividad, solicitudes y proyectos."
              activo={configuracion_temporal.resumen_semanal}
              onChange={(valor) => actualizar("resumen_semanal", valor)}
            />
            <FilaToggle
              icono={Globe2}
              titulo="Notificaciones por correo"
              descripcion="Permite enviar novedades importantes a tu email registrado."
              activo={configuracion_temporal.notificaciones_email}
              onChange={(valor) => actualizar("notificaciones_email", valor)}
            />
          </article>

          <article className="configuracion__panel">
            <div className="configuracion__panel-header">
              <ShieldCheck size={20} />
              <div>
                <h3>Privacidad</h3>
                <p>Decide que informacion sensible se muestra por defecto.</p>
              </div>
            </div>
            <FilaToggle
              icono={WalletCards}
              titulo="Mostrar valores financieros"
              descripcion="Ensenar presupuestos y montos en vistas principales."
              activo={configuracion_temporal.mostrar_saldos}
              onChange={(valor) => actualizar("mostrar_saldos", valor)}
            />
            <div className="configuracion__nota">
              <Lock size={16} />
              <span>Los cambios de privacidad se guardan localmente para esta sesion.</span>
            </div>
          </article>

          <article className="configuracion__panel">
            <div className="configuracion__panel-header">
              <Lock size={20} />
              <div>
                <h3>Seguridad</h3>
                <p>Opciones recomendadas para proteger tu cuenta.</p>
              </div>
            </div>
            <div className="configuracion__seguridad">
              <div>
                <strong>Sesion activa</strong>
                <span>Tu token se conserva en este navegador.</span>
              </div>
              <div>
                <strong>Verificacion de perfil</strong>
                <span>Completa documentos desde la pantalla de cuenta.</span>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
