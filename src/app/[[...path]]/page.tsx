import { notFound } from "next/navigation";
import App from "../../App";

const rutas_de_la_aplicacion = new Set([
  "", "login", "register", "dashboard", "admin", "admin-tickets", "proyectos",
  "solicitudes", "mensajes", "explorar-usuarios", "chatbot", "notificaciones",
  "cuenta", "perfil-contacto", "configuracion", "callcenter", "proyecciones",
  "analiticas", "riesgos",
]);

export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  if (!rutas_de_la_aplicacion.has(path.join("/"))) notFound();
  return <App />;
}
