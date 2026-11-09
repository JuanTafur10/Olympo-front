# Verificación de rutas y sesión

Verificación local realizada el 9 de noviembre de 2026 con Next.js en modo producción.

- `npm run build`: compilación de Next.js y comprobación de TypeScript correctas.
- Una visita directa a una ruta privada sin sesión lleva a `/login`.
- Un usuario sin rol de administrador que abre `/admin` termina en `/dashboard`.
- La sesión validada se mantiene después de refrescar la página.
- Un token rechazado con `401` se elimina y la aplicación lleva a `/login`.
- Con sesión activa, `/login` y `/register` llevan al inicio correspondiente al rol.
- Una ruta inexistente muestra `src/app/not-found.tsx` y responde HTTP `404`.
- `npm run test:e2e -- e2e/frontend-routes.spec.js`: **10 pruebas pasaron** en Chromium.
- `npm run test:e2e -- e2e/frontend-routes.spec.js e2e/views-ux.spec.js --workers=1`: **15 pruebas pasaron** en Chromium con el build de producción. Cubre autenticación, rutas, landing, listado responsive en móvil, creación y carga de archivo, edición, confirmación y llamada `DELETE`, detalle y solicitud de inversión.
- Prueba real de imagen (9 de noviembre de 2026): la API recibió un PNG válido, Supabase Storage permitió descargarlo con los mismos bytes y `GET /api/v1/projects/:id` devolvió la misma URL persistida en Neon. Se retiraron el archivo y el proyecto temporales al terminar.
- Revisión visual en 1440×1000 y 390×844: landing, listado y formulario. Se corrigió el scroll vertical global que recortaba páginas públicas en móvil y el selector de archivos ahora presenta sus textos en español.
- CRUD real desde la interfaz contra la API local conectada a Neon: login admin, creación con imagen, edición y eliminación lógica; se verificó `status=DELETED` y `GET` con `404`. La imagen y el proyecto temporales se limpiaron al terminar.

Las pruebas de navegador usan respuestas controladas para la API de autenticación y sesión. No son una prueba de disponibilidad del backend ni de la base de datos desplegados.
