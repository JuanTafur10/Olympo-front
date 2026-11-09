"use client";

import Link from "next/link";
import { useContextoApp } from "../../context/contexto_app";
import "./MarketplaceHeader.css";

export default function MarketplaceHeader() {
  const { esta_autenticado } = useContextoApp();
  return <header className="market-header"><Link className="market-header__brand" href="/"><span>O</span> OLYMPO</Link><nav aria-label="Navegación del marketplace"><Link href="/proyectos">Proyectos</Link>{esta_autenticado ? <Link className="market-header__cta" href="/dashboard">Ir a mi panel</Link> : <><Link href="/login">Iniciar sesión</Link><Link className="market-header__cta" href="/register">Crear cuenta</Link></>}</nav></header>;
}
