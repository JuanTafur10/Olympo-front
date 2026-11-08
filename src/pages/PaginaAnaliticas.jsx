import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { useContextoApp } from "../context/contexto_app";
import { API_BASE_URL } from "../services/api_config";
import "./PaginaAnaliticas.css";

const COLORS_ESTADO = ["#1d86ee", "#34d399", "#f97316", "#94a3b8"];
const COLORS_TOP = ["#1d86ee", "#5b74e6", "#7c8ff5", "#ff8f56", "#f97316"];

export default function PaginaAnaliticas() {
  const { datos_usuario, mostrar_notificacion } = useContextoApp();
  const [cargando, setCargando] = useState(true);
  const [analiticas, setAnaliticas] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError("");
      try {
        const propietario_id = datos_usuario?.id;
        if (!propietario_id) {
          setAnaliticas(null);
          setCargando(false);
          return;
        }

        const resp = await fetch(`${API_BASE_URL}/api/v1/analytics/proyectos?propietario_id=${propietario_id}`);
        const body = await resp.json();
        if (!body.ok) {
          throw new Error(body.mensaje || "Error al obtener analíticas");
        }
        setAnaliticas(body.analiticas || null);
      } catch (e) {
        console.error("Error cargando analíticas:", e);
        setError(e.message || "Error al cargar analíticas");
        mostrar_notificacion?.("error", e.message || "Error al cargar analíticas");
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [datos_usuario?.id, mostrar_notificacion]);

  if (cargando) {
    return (
      <div className="analiticas">
        <div className="analiticas__loading">Cargando analíticas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analiticas">
        <div className="analiticas__error">Error: {error}</div>
      </div>
    );
  }

  if (!analiticas) {
    return (
      <div className="analiticas">
        <div className="analiticas__empty">No hay datos para mostrar.</div>
      </div>
    );
  }

  const series = analiticas.series || [];
  const solicitudesPorEstado = analiticas.solicitudes_por_estado || {};
  const pieSolicitudes = [
    { name: "Pendientes", value: solicitudesPorEstado.pendientes || 0 },
    { name: "Aceptadas", value: solicitudesPorEstado.aceptadas || 0 },
    { name: "Rechazadas", value: solicitudesPorEstado.rechazadas || 0 },
    { name: "Retiradas", value: solicitudesPorEstado.retiradas || 0 },
  ].filter((item) => item.value > 0);

  const topSolicitudes = [...(analiticas.top_proyectos_solicitudes || [])].reverse();
  const topInversiones = [...(analiticas.top_proyectos_inversiones || [])].reverse();

  return (
    <div className="analiticas">
      <header className="analiticas__header">
        <div>
          <h2>Analíticas de Proyectos</h2>
          <p>
            Resumen visual del desempeño de tus proyectos: solicitudes, inversiones,
            presupuesto consolidado y evolución reciente para tomar decisiones más claras.
          </p>
        </div>
        <div className="analiticas__badge">Ambrosia Insight Center</div>
      </header>

      <div className="analiticas__grid">
        <div className="analiticas__card">
          <h4>Proyectos</h4>
          <div className="analiticas__valor">{analiticas.total_proyectos}</div>
          <small>{analiticas.proyectos_activos} activos • {analiticas.proyectos_inactivos} inactivos</small>
        </div>

        <div className="analiticas__card">
          <h4>Solicitudes</h4>
          <div className="analiticas__valor">{analiticas.solicitudes_totales}</div>
          <small>Solicitudes recibidas</small>
        </div>

        <div className="analiticas__card">
          <h4>Inversiones</h4>
          <div className="analiticas__valor">{analiticas.inversiones_totales}</div>
          <small>Monto total: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(analiticas.inversiones_monto_total)}</small>
        </div>

        <div className="analiticas__card">
          <h4>Presupuesto total</h4>
          <div className="analiticas__valor">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(analiticas.presupuesto_total)}</div>
          <small>Suma de presupuestos publicados</small>
        </div>
      </div>

      <div className="analiticas__charts">
        <div className="analiticas__chart">
          <h4>Solicitudes por mes</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="solicitudes" fill="#1d86ee" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analiticas__chart">
          <h4>Monto invertido por mes</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="inversiones_monto" stroke="#ff6b35" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="analiticas__chart">
          <h4>Estado de solicitudes</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieSolicitudes.length ? pieSolicitudes : [{ name: "Sin datos", value: 1 }]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
              >
                {(pieSolicitudes.length ? pieSolicitudes : [{ name: "Sin datos", value: 1 }]).map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS_ESTADO[index % COLORS_ESTADO.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analiticas__chart">
          <h4>Top proyectos por solicitudes</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topSolicitudes} layout="vertical" margin={{ top: 8, right: 16, left: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="titulo" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="solicitudes" fill="#1d86ee">
                {topSolicitudes.map((entry, index) => (
                  <Cell key={entry.id || entry.titulo} fill={COLORS_TOP[index % COLORS_TOP.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="analiticas__chart analiticas__chart--full">
          <h4>Top proyectos por monto invertido</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topInversiones} layout="vertical" margin={{ top: 8, right: 16, left: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="titulo" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0))} />
              <Bar dataKey="monto_total" fill="#ff6b35">
                {topInversiones.map((entry, index) => (
                  <Cell key={entry.id || entry.titulo} fill={COLORS_TOP[(index + 2) % COLORS_TOP.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
