import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import "./PaginaNoEncontrada.css";

export default function PaginaNoEncontrada() {
  return (
    <main className="pagina-404">
      <section className="pagina-404__contenido" aria-labelledby="titulo-404">
        <span className="pagina-404__icono" aria-hidden="true"><Compass size={30} /></span>
        <p className="pagina-404__codigo">Error 404</p>
        <h1 id="titulo-404">Esta página no existe</h1>
        <p className="pagina-404__descripcion">
          Puede que la dirección haya cambiado o que el enlace esté incompleto.
        </p>
        <Link className="pagina-404__enlace" to="/">
          <ArrowLeft size={17} aria-hidden="true" /> Volver al inicio
        </Link>
      </section>
    </main>
  );
}
