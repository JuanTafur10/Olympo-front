// datos_mock.js — Datos de prueba para el frontend de Ambriosa

// ─── USUARIO ACTUAL ────────────────────────────────────────────────
export const usuario_actual = {
  id_usuario: 1,
  nombre_usuario: "Bell Manrique",
  email_usuario: "bellmanrique@email.com",
  tipo_usuario: "emprendedor",        // "emprendedor" | "inversionista"
  esta_activo: true,
  foto_perfil: null,
  telefono_usuario: "+57 312 5555655",
  website_usuario: "www.mistartup.edu.con",
  linkedin_usuario: "https://linkedin.com/in/bmanrique",
  ciudad_usuario: "Medellín, Colombia",
  descripcion_usuario: null,
  verificacion: {
    correo_verificado: true,
    telefono_verificado: true,
    documento_verificado: false,
  },
};

// ─── PROYECTOS ─────────────────────────────────────────────────────
export const lista_proyectos = [
  {
    id_proyecto: 1,
    nombre_proyecto: "Fauget Cafe",
    descripcion_proyecto: "Coffee Shop",
    fecha_proyecto: "Today",
    hora_proyecto: "2m ago",
    solicitudes_proyecto: 45,
    estado_proyecto: "pendiente",
  },
  {
    id_proyecto: 2,
    nombre_proyecto: "Claudia Store",
    descripcion_proyecto: "Accessories",
    fecha_proyecto: "Today",
    hora_proyecto: "5m ago",
    solicitudes_proyecto: 30,
    estado_proyecto: "completado",
  },
  {
    id_proyecto: 3,
    nombre_proyecto: "Chidi Barber",
    descripcion_proyecto: "Barber Shop",
    fecha_proyecto: "Today",
    hora_proyecto: "1h ago",
    solicitudes_proyecto: 56,
    estado_proyecto: "pendiente",
  },
  {
    id_proyecto: 4,
    nombre_proyecto: "Cahaya Dewi",
    descripcion_proyecto: "Bank Account",
    fecha_proyecto: "Today",
    hora_proyecto: "2h ago",
    solicitudes_proyecto: 10,
    estado_proyecto: "pendiente",
  },
  {
    id_proyecto: 5,
    nombre_proyecto: "Yael Amari",
    descripcion_proyecto: "Bank Account",
    fecha_proyecto: "Yesterday",
    hora_proyecto: "09:00 AM",
    solicitudes_proyecto: 100,
    estado_proyecto: "completado",
  },
  {
    id_proyecto: 6,
    nombre_proyecto: "Larana, Inc.",
    descripcion_proyecto: "Hotel",
    fecha_proyecto: "Yesterday",
    hora_proyecto: "08:00 AM",
    solicitudes_proyecto: 122,
    estado_proyecto: "completado",
  },
];

export const proyecto_principal = {
  id_proyecto: 99,
  nombre_proyecto: "Mi Proyecto",
  descripcion_proyecto: "PROYECTO DESCRIPCIÓN",
  fecha_proyecto: "12/09/2006",
  solicitudes_proyecto: 3,
  comentarios_proyecto: "Comentarios",
  vistas_proyecto: 100,
};

// ─── DATOS GRÁFICA DASHBOARD ────────────────────────────────────────
export const datos_grafica = [
  { mes: "Ene", inversiones: 2500, solicitudes: 4000 },
  { mes: "Feb", inversiones: 1700, solicitudes: 1700 },
  { mes: "Mar", inversiones: 1200, solicitudes: 3200 },
];



// ─── NOTIFICACIONES ─────────────────────────────────────────────────
export const lista_notificaciones = [
  {
    id_notificacion: 1,
    tipo_notificacion: "inversionista",
    titulo_notificacion: "Juan Pérez llamado y le interesó sobre su proyecto!",
    tiempo_notificacion: "Hace 5 minutos",
    esta_leida: false,
  },
  {
    id_notificacion: 2,
    tipo_notificacion: "stats",
    titulo_notificacion: "Menrsionista eanió uu remals esta semana.",
    tiempo_notificacion: "Hoy 2 minutos",
    esta_leida: false,
  },
  {
    id_notificacion: 3,
    tipo_notificacion: "mensaje",
    titulo_notificacion: "Carlos Fernández envió un mensaje.",
    tiempo_notificacion: "Hoy 2 minutos",
    esta_leida: false,
  },
  {
    id_notificacion: 4,
    tipo_notificacion: "negociacion",
    titulo_notificacion: "Ana Ríos en negociación.",
    subtitulo_notificacion: "Ana Ríos agranó su proyecto",
    tiempo_notificacion: "Ayer",
    esta_leida: true,
  },
  {
    id_notificacion: 5,
    tipo_notificacion: "banco",
    titulo_notificacion: "Banco República tiaca recomendata la 14.5 %",
    subtitulo_notificacion: "Notheg agrantó tu proyecto",
    tiempo_notificacion: "Ayer",
    esta_leida: true,
  },
  {
    id_notificacion: 6,
    tipo_notificacion: "banco",
    titulo_notificacion: "Banco República nivel de riesgo esta áy'a de Bajo",
    subtitulo_notificacion: "Notheg agrantó tu Bajo",
    tiempo_notificacion: "Hace 2 días",
    esta_leida: true,
  },
];

export const lista_notificaciones_recientes = [
  {
    id_notificacion: 1,
    nombre_contacto: "Juan Pérez",
    descripcion_contacto: "popular y relacionado a la tecnología",
    esta_conectado: true,
  },
  {
    id_notificacion: 2,
    tipo_stat: "visitas",
    titulo_stat: "Visitas y hay art 25%",
    subtitulo_stat: "+31 visitas en 3 días",
  },
  {
    id_notificacion: 3,
    nombre_contacto: "Carlos Fernández",
    descripcion_contacto: "Activo ahora y está interesado en fintech",
    esta_conectado: true,
  },
  {
    id_notificacion: 4,
    nombre_contacto: "Ana Ríos",
    descripcion_contacto: "en negociación",
    esta_conectado: false,
  },
  {
    id_notificacion: 5,
    tipo_banco: "BR",
    titulo_banco: "Banco República",
    descripcion_banco: "Tasa recomendada ha 14.5 %",
  },
];

// ─── MENSAJES CHATBOT ───────────────────────────────────────────────
export const lista_mensajes_bot = [];

// ─── INVERSIONISTAS ────────────────────────────────────────────────
export const lista_inversionistas = [];
