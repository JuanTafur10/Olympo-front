// En Vercel configura NEXT_PUBLIC_API_HOST con la URL pública del backend.
// NEXT_PUBLIC_API_URL se conserva como compatibilidad para despliegues existentes.
const configuredApiHost = process.env.NEXT_PUBLIC_API_HOST?.trim()
  || process.env.NEXT_PUBLIC_API_URL?.trim()
  || '';

export const API_BASE_URL = configuredApiHost.replace(/\/+$/, '');