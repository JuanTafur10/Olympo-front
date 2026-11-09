// Si no se configura una URL pública, las rutas /api se reescriben desde Next.js
// hacia el backend usando BACKEND_URL en el servidor.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
