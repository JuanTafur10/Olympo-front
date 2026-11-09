"use client";

import Link from "next/link";
import { ArrowUpRight, Image as ImageIcon, Pencil, Trash2 } from "lucide-react";
import "./ProjectCard.css";

const money = (value) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value || 0));
const statusLabel = { PUBLISHED: "Publicado", DRAFT: "Borrador", CLOSED: "Cerrado" };

export default function ProjectCard({ project, canManage = false, onEdit, onDelete }) {
  const target = Number(project.targetAmount || 0);
  const raised = Number(project.raisedAmount || 0);
  const progress = target > 0 ? Math.min(100, Math.round(raised / target * 100)) : 0;
  return (
    <article className="market-project-card">
      <Link href={`/proyectos/${project.id}`} className="market-project-card__cover-link" aria-label={`Ver detalle de ${project.title}`}>
        <div className="market-project-card__cover">
          {project.imageUrl ? <img src={project.imageUrl} alt={`Imagen del proyecto ${project.title}`} loading="lazy" /> : <div className="market-project-card__placeholder"><ImageIcon size={34} aria-hidden="true" /><span>Olympo</span></div>}
          <span className={`market-project-card__status market-project-card__status--${String(project.status).toLowerCase()}`}>{statusLabel[project.status] || project.status}</span>
        </div>
      </Link>
      <div className="market-project-card__body">
        <div className="market-project-card__meta"><span>{project.category?.name || "Proyecto"}</span>{project.owner?.name && <span>Por {project.owner.name}</span>}</div>
        <h3><Link href={`/proyectos/${project.id}`}>{project.title}</Link></h3>
        <p className="market-project-card__description">{project.description}</p>
        <div className="market-project-card__funding">
          <div className="market-project-card__funding-labels"><span>Meta de financiación</span><strong>{money(project.targetAmount)}</strong></div>
          <div className="market-project-card__progress" role="progressbar" aria-label={`Financiación: ${progress}%`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
          <small>{money(project.raisedAmount)} recaudados · {progress}%</small>
        </div>
        <div className="market-project-card__footer">
          <Link className="market-project-card__detail" href={`/proyectos/${project.id}`}>Ver proyecto <ArrowUpRight size={16} aria-hidden="true" /></Link>
          {canManage && <div className="market-project-card__actions" aria-label={`Acciones para ${project.title}`}>
            <button type="button" onClick={() => onEdit(project)} aria-label={`Editar ${project.title}`} title="Editar proyecto"><Pencil size={17} aria-hidden="true" /></button>
            <button type="button" onClick={() => onDelete(project)} aria-label={`Eliminar ${project.title}`} title="Eliminar proyecto"><Trash2 size={17} aria-hidden="true" /></button>
          </div>}
        </div>
      </div>
    </article>
  );
}
