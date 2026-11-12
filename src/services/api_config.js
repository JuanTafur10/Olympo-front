// El navegador siempre llama al mismo origen. Next.js reenvía /api al backend
// mediante rewrites para evitar bloqueos CORS entre Vercel y el servicio de API.
export const API_BASE_URL = '';
