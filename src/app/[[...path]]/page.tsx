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
  const joinedPath = path.join("/");
  const isProjectDetail = path.length === 2 && path[0] === "proyectos" && Boolean(path[1]);
  if (!rutas_de_la_aplicacion.has(joinedPath) && !isProjectDetail) notFound();
  return <App />;
}
