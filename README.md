# Olympo Frontend

Interfaz web de Olympo, una plataforma que conecta emprendedores con inversionistas. Está construida con Next.js App Router y React. Conviven páginas TypeScript con componentes existentes en JavaScript y estilos CSS; integra los flujos de marketplace y gestión.

## Requisitos

- Node.js 20.9 o posterior.
- El backend de Olympo disponible, o una URL configurada mediante `BACKEND_URL`.

## Instalación y ejecución

1. Instala dependencias con `npm install`.
2. Copia `.env.example` a `.env.local`.
3. Configura las variables necesarias para la API y, si se usan, Firebase.
4. Inicia el servidor con `npm run dev`.
5. Abre `http://localhost:3000`.

## Variables de entorno

- `NEXT_PUBLIC_API_HOST`: URL pública de la API, como pide la rúbrica. Si queda vacía, se admite `NEXT_PUBLIC_API_URL` por compatibilidad; si ambas están vacías, Next.js reescribe `/api` hacia `BACKEND_URL`.
- `BACKEND_URL`: URL del backend para las reescrituras del servidor; por defecto `http://localhost:4000`.
- `NEXT_PUBLIC_FIREBASE_*`: configuración pública de Firebase para las funciones que la utilizan.

No incluyas secretos privados en variables `NEXT_PUBLIC_*` ni subas archivos `.env.local` al repositorio.

## Scripts

- `npm run dev`: inicia Next.js en modo desarrollo.
- `npm run build`: genera la compilación de producción.
- `npm run start`: sirve la compilación de producción.
- `npm run test:e2e`: ejecuta las pruebas E2E con Playwright.

## Despliegues

- Frontend: pendiente de registrar el enlace de producción.
- Backend: ver el README del repositorio Olympo-back.

## Reparto del trabajo

| Integrante | Aporte en este repositorio |
| --- | --- |
| Juan Pablo Tafur | Arquitectura en Next.js App Router, integración de vistas principales y ruteo |
| David Hernández Mejía | Integración de servicios API, marketplace, carga de imágenes y estilos responsivos |
| Tomás Granda | Calidad de código: tipado TypeScript de dominio, limpieza de logs de depuración, estandarización de formateo (.prettierrc) y robustez del cliente HTTP |


