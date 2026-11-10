import React, { useEffect, useState, useMemo } from "react";
import { TrendingUp, PencilLine } from "lucide-react";
import { obtenerProyeccionProyecto } from "../services/analytics_api.js";
import { listar_proyectos_api } from "../services/proyectos_api";
import { useContextoApp } from "../context/contexto_app";
import { useNavigate } from "../hooks/useNavigate";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import "./PaginaProyecciones.css";

export default function PaginaProyecciones() {
  const { datos_usuario, mostrar_notificacion } = useContextoApp();
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [proyeccionOpen, setProyeccionOpen] = useState(false);
  const [proyeccionData, setProyeccionData] = useState(null);
  const [cargandoProyeccion, setCargandoProyeccion] = useState(false);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setCargando(true);
      setError("");
      try {
        const lista = await listar_proyectos_api(datos_usuario?.id, datos_usuario?.email);
        if (!activo) return;
        setProyectos(Array.isArray(lista) ? lista : []);
      } catch (e) {
        if (!activo) return;
        setError(e.message || "No se pudo cargar proyectos");
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [datos_usuario?.id, datos_usuario?.email]);

  const verProyeccion = async (proyectoId) => {
    setCargandoProyeccion(true);
    try {
      const js = await obtenerProyeccionProyecto(proyectoId);
      if (!js.ok) {
        setProyeccionData(null);
      } else {
        setProyeccionData(js.proyeccion);
        setProyeccionOpen(true);
      }
    } catch (e) {
      console.error(e);
      mostrar_notificacion?.("error", e.message || "No fue posible cargar la proyección.");
      setProyeccionData(null);
    } finally {
      setCargandoProyeccion(false);
    }
  };

  return (
    <div className="proyecciones">
      <div className="proyecciones__hero">
        <div className="proyecciones__hero-icon">
          <TrendingUp size={28} strokeWidth={1.8} />
        </div>
        <div>
          <h1>Proyecciones</h1>
          <p>Análisis de crecimiento estimado por proyecto.</p>
        </div>
      </div>

      {cargando && <p>Cargando proyectos...</p>}
      {error && <p className="error">{error}</p>}

      <div className="proyecciones__grid">
        {proyectos.map((p) => (
          <div key={p.id} className="proyecciones__card">
            <div className="proyecciones__card-body">
              <h3>{p.titulo}</h3>
              <p className="proyecciones__descripcion">{(p.descripcion || "").slice(0, 160)}</p>
            </div>
            <div className="proyecciones__card-actions">
              <button className="boton boton--secundario" onClick={() => verProyeccion(p.id)}>Ver proyección</button>
              <button className="boton" onClick={() => { navigate('/proyectos'); }} aria-label={`Editar proyecto ${p.titulo}`}>
                <PencilLine size={16} strokeWidth={2} />
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {proyeccionOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Proyección</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="boton boton--secundario" onClick={() => exportProyeccionCSV(proyeccionData)}>Exportar CSV</button>
                <button className="boton boton--peque" onClick={() => setProyeccionOpen(false)}>Cerrar</button>
              </div>
            </div>
            <div className="modal-body">
              {cargandoProyeccion && <p>Cargando proyección...</p>}
              {!cargandoProyeccion && !proyeccionData && <p>No hay datos disponibles.</p>}
              {!cargandoProyeccion && proyeccionData && (
                <div>
                  {/* Preparar datos para gráficos */}
                  <ProyeccionCharts proyeccion={proyeccionData} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function exportProyeccionCSV(proyeccion) {
  if (!proyeccion) return;
  const rows = [];
  rows.push(["series"]);
  rows.push(["mes","solicitudes","inversiones_monto","proyectado"]);
  const series = proyeccion.series || [];
  for (const s of series) {
    rows.push([s.mes, String(s.solicitudes ?? ""), String(s.inversiones_monto ?? ""), s.proyectado ? "1" : "0"]);
  }
  rows.push([""]);
  rows.push(["mensajes"]);
  rows.push(["mes","mensajes"]);
  const msgs = proyeccion.mensajes && proyeccion.mensajes.por_mes ? proyeccion.mensajes.por_mes : {};
  for (const k of Object.keys(msgs).sort()) rows.push([k, String(msgs[k] ?? 0)]);

  const csv = rows.map(r => r.map(c => String(c).replace(/"/g, '""')).map(c => '"' + c + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proyeccion_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


function ProyeccionCharts({ proyeccion }) {
  const chartData = useMemo(() => {
    const series = proyeccion.series || [];
    return series.map((item) => ({
      mes: item.mes,
      solicitudes_hist: item.proyectado ? null : item.solicitudes,
      solicitudes_proj: item.proyectado ? item.solicitudes : null,
      inversiones_hist: item.proyectado ? null : item.inversiones_monto,
      inversiones_proj: item.proyectado ? item.inversiones_monto : null,
    }));
  }, [proyeccion.series]);

  const mensajesData = useMemo(() => {
    const by = proyeccion.mensajes && proyeccion.mensajes.por_mes ? proyeccion.mensajes.por_mes : {};
    return Object.keys(by).sort().map((k) => ({ mes: k, mensajes: by[k] }));
  }, [proyeccion]);

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Proyección: solicitudes e inversiones</h3>
      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6b35" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#ff6b35" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />

            {/* Solicitudes: histórico (sólido) y proyectado (punteado) */}
            <Line yAxisId="left" type="monotone" dataKey="solicitudes_hist" stroke="#1d86ee" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="left" type="monotone" dataKey="solicitudes_proj" stroke="#1d86ee" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="6 6" />

            {/* Inversiones: área para histórico y proyectado (sombreado) */}
            <Area yAxisId="right" type="monotone" dataKey="inversiones_hist" stroke="#ff6b35" fill="url(#gradInv)" fillOpacity={0.16} />
            <Area yAxisId="right" type="monotone" dataKey="inversiones_proj" stroke="#ff6b35" fill="url(#gradInv)" fillOpacity={0.06} strokeDasharray="6 6" />
            </ComposedChart>
        </ResponsiveContainer>
      </div>

      <h4 style={{ marginTop: 16 }}>Mensajes (últimos meses)</h4>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <BarChart data={mensajesData} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="mensajes" fill="#6b7280" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Últimas solicitudes:</strong> {proyeccion.metrica?.ultima_solicitudes ?? 0} &nbsp;•&nbsp;
        <strong>Último monto invertido:</strong> {proyeccion.metrica?.ultima_inversiones_monto ?? 0}
        {proyeccion.mensajes && (
          <>
            &nbsp;•&nbsp; <strong>Mensajes totales:</strong> {proyeccion.mensajes.total ?? 0}
          </>
        )}
      </div>
    </div>
  );
}
