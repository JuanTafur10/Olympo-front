"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, CircleDollarSign, UserRound } from "lucide-react";
import { useContextoApp } from "../../context/contexto_app";
import { crearSolicitudInversion, obtenerProyecto } from "../../services/marketplace_api";
import "./ProjectDetailPage.css";

const money = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function ProjectDetailPage({ projectId }) {
  const { esta_autenticado, datos_usuario } = useContextoApp();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    obtenerProyecto(projectId).then((item) => {
      if (active) setProject(item);
    }).catch((err) => { if (active) setError(err.message || "No encontramos este proyecto."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  const sendRequest = async (event) => {
    event.preventDefault();
    const investment = Number(amount);
    if (!Number.isFinite(investment) || investment <= 0) { setError("Escribe un valor de inversión válido."); return; }
    setSending(true);
    setError("");
    try {
      await crearSolicitudInversion({ projectId, amount: investment, ...(message.trim() ? { message: message.trim() } : {}) });
      setShowForm(false);
      setAmount("");
      setMessage("");
      setNotice("Tu solicitud de inversión se envió correctamente.");
    } catch (err) {
      setError(err.message || "No fue posible enviar la solicitud.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <main className="project-detail project-detail__state" role="status" aria-busy="true">Cargando el proyecto…</main>;
  if (error && !project) return <main className="project-detail project-detail__state"><div className="project-detail__error" role="alert">{error}</div><Link className="project-detail__back" href="/proyectos"><ArrowLeft size={17} /> Volver a proyectos</Link></main>;
  if (!project) return null;

  const isOwner = String(project.ownerId) === String(datos_usuario?.id);
  const isAdmin = Boolean(datos_usuario?.es_admin || String(datos_usuario?.role || "").toUpperCase() === "ADMIN");
  const canInvest = project.status === "PUBLISHED" && esta_autenticado && !isOwner && !isAdmin && String(datos_usuario?.role || "").toUpperCase() === "USER";
  const progress = Number(project.targetAmount) > 0 ? Math.min(100, Math.round(Number(project.raisedAmount || 0) / Number(project.targetAmount) * 100)) : 0;

  return (
    <main className="project-detail">
      <Link className="project-detail__back" href="/proyectos"><ArrowLeft size={17} /> Volver a proyectos</Link>
      {notice && <p className="project-detail__notice" role="status">{notice}</p>}
      <article className="project-detail__layout">
        <div className="project-detail__main">
          <div className="project-detail__cover">
            {project.imageUrl ? <img src={project.imageUrl} alt={`Imagen de ${project.title}`} /> : <div className="project-detail__cover-empty">OLYMPO · PROYECTO</div>}
          </div>
          <div className="project-detail__copy">
            <div className="project-detail__chips"><span>{project.category?.name || "Proyecto"}</span><span>{project.status === "PUBLISHED" ? "Publicado" : project.status === "CLOSED" ? "Cerrado" : "Borrador"}</span></div>
            <h1>{project.title}</h1>
            <div className="project-detail__meta"><span><UserRound size={16} /> {project.owner?.name || "Equipo del proyecto"}</span><span><CalendarDays size={16} /> {new Date(project.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</span></div>
            <h2>Acerca del proyecto</h2><p className="project-detail__description">{project.description}</p>
          </div>
        </div>
        <aside className="project-detail__aside">
          <span className="project-detail__aside-label">Meta de financiación</span>
          <strong className="project-detail__target">{money(project.targetAmount)}</strong>
          <div className="project-detail__raised"><span>Recaudado</span><strong>{money(project.raisedAmount)}</strong></div>
          <div className="project-detail__progress" role="progressbar" aria-label={`Financiación: ${progress}%`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
          <p className="project-detail__progress-label">{progress}% de la meta alcanzada</p>
          {canInvest ? <button className="project-detail__invest" type="button" onClick={() => { setError(""); setShowForm(true); }}><CircleDollarSign size={18} /> Enviar solicitud de inversión</button>
            : !esta_autenticado && project.status === "PUBLISHED" ? <Link className="project-detail__invest" href="/login">Inicia sesión para invertir <ArrowUpRight size={17} /></Link>
              : isOwner ? <p className="project-detail__hint">Este proyecto pertenece a tu equipo. Puedes gestionarlo desde tus proyectos.</p>
                : isAdmin ? <p className="project-detail__hint">Vista de administración del proyecto.</p>
                  : <p className="project-detail__hint">Este proyecto no recibe solicitudes de inversión.</p>}
          {error && <p className="project-detail__error" role="alert">{error}</p>}
        </aside>
      </article>

      {showForm && <div className="project-detail__backdrop"><section className="project-detail__dialog" role="dialog" aria-modal="true" aria-labelledby="investment-title"><div className="project-detail__dialog-head"><div><span className="project-detail__aside-label">{project.title}</span><h2 id="investment-title">Solicitar inversión</h2></div><button type="button" aria-label="Cerrar" disabled={sending} onClick={() => setShowForm(false)}>×</button></div><form onSubmit={sendRequest} className="project-detail__form"><label htmlFor="investment-amount">Valor de inversión (COP)<input id="investment-amount" type="number" min="1000" max="999999999999" step="1000" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label htmlFor="investment-message">Mensaje para el equipo <span>(opcional)</span><textarea id="investment-message" maxLength={2000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} /></label>{error && <p className="project-detail__error" role="alert">{error}</p>}<div className="project-detail__dialog-actions"><button type="button" disabled={sending} onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar solicitud"}</button></div></form></section></div>}
    </main>
  );
}
