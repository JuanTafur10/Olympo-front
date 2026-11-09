"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import ProjectCard from "./ProjectCard";
import { listarProyectos } from "../../services/marketplace_api";
import "./LandingPage.css";

export default function LandingPage() {
  const [projects, setProjects] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let active = true;
    listarProyectos({ limit: 3 }).then(({ data }) => {
      if (!active) return;
      setProjects(data);
      setState(data.length ? "ready" : "empty");
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, []);

  return (
    <main className="landing">
      <header className="landing__nav">
        <Link className="landing__brand" href="/" aria-label="Olympo, inicio"><span className="landing__brand-mark">O</span> OLYMPO</Link>
        <nav aria-label="Navegación principal">
          <Link href="/proyectos">Explorar proyectos</Link>
          <Link className="landing__login" href="/login">Iniciar sesión</Link>
          <Link className="landing__register" href="/register">Crear cuenta <ArrowRight size={16} /></Link>
        </nav>
      </header>

      <section className="landing__hero">
        <div className="landing__hero-copy">
          <span className="landing__eyebrow"><Sparkles size={15} /> Ideas que encuentran impulso</span>
          <h1>El próximo gran proyecto <em>puede empezar aquí.</em></h1>
          <p>Olympo conecta a emprendedores con inversionistas para convertir ideas con propósito en proyectos que crecen.</p>
          <div className="landing__hero-actions">
            <Link className="landing__primary" href="/proyectos">Explorar proyectos <ArrowRight size={18} /></Link>
            <Link className="landing__secondary" href="/register">Presentar mi proyecto</Link>
          </div>
          <div className="landing__trust"><ShieldCheck size={17} /> Perfiles y proyectos gestionados por sus equipos</div>
        </div>
        <div className="landing__hero-art" aria-label="Conexión entre ideas y oportunidades">
          <div className="landing__orbit landing__orbit--one" /><div className="landing__orbit landing__orbit--two" />
          <div className="landing__art-core"><span>O</span><small>IDEAS EN MOVIMIENTO</small></div>
          <div className="landing__art-chip landing__art-chip--one"><TrendingUp size={18} /><span>Innovación</span></div>
          <div className="landing__art-chip landing__art-chip--two"><Compass size={18} /><span>Nuevas oportunidades</span></div>
          <div className="landing__art-dot landing__art-dot--one" /><div className="landing__art-dot landing__art-dot--two" />
        </div>
      </section>

      <section className="landing__benefits" aria-label="Cómo funciona Olympo">
        <article><span>01</span><h2>Descubre</h2><p>Explora propuestas de distintas categorías y encuentra ideas que te interesen.</p></article>
        <article><span>02</span><h2>Conecta</h2><p>Conoce el equipo, la meta y el avance de cada iniciativa.</p></article>
        <article><span>03</span><h2>Impulsa</h2><p>Presenta tu proyecto o envía una propuesta de inversión.</p></article>
      </section>

      <section className="landing__featured">
        <div className="landing__section-heading"><div><span className="landing__eyebrow">Ideas para conocer</span><h2>Proyectos destacados</h2></div><Link href="/proyectos">Ver todos <ArrowRight size={16} /></Link></div>
        {state === "loading" && <div className="landing__status" role="status" aria-busy="true">Cargando proyectos…</div>}
        {state === "error" && <div className="landing__status landing__status--error" role="alert">No pudimos cargar los proyectos en este momento. Puedes volver a intentarlo desde el listado.</div>}
        {state === "empty" && <div className="landing__status">Pronto encontrarás nuevos proyectos aquí. Mientras tanto, conoce cómo funciona Olympo.</div>}
        {state === "ready" && <div className="landing__grid">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>}
      </section>
      <footer className="landing__footer"><Link className="landing__brand" href="/"><span className="landing__brand-mark">O</span> OLYMPO</Link><span>Ideas, equipo y oportunidades para crecer.</span><Link href="/proyectos">Explorar proyectos</Link></footer>
    </main>
  );
}
