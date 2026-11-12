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

- `NEXT_PUBLIC_API_HOST`: URL pública del backend. El navegador llama a `/api` en el mismo origen y Next.js reenvía la solicitud a esta URL, evitando errores CORS. Se admite `NEXT_PUBLIC_API_URL` por compatibilidad.
- `BACKEND_URL`: URL privada del backend para las reescrituras cuando no configuras `NEXT_PUBLIC_API_HOST` ni `NEXT_PUBLIC_API_URL`; por defecto usa `http://localhost:4000`.
- `NEXT_PUBLIC_FIREBASE_*`: configuración pública de Firebase para las funciones que la utilizan.

No incluyas secretos privados en variables `NEXT_PUBLIC_*` ni subas archivos `.env.local` al repositorio.

## Scripts

- `npm run dev`: inicia Next.js en modo desarrollo.
- `npm run build`: genera la compilación de producción.
- `npm run start`: sirve la compilación de producción.
- `npm run test:e2e`: ejecuta las pruebas E2E con Playwright.

## Despliegues

- Repositorio frontend: [github.com/JuanTafur10/Olympo-front](https://github.com/JuanTafur10/Olympo-front).
- Sitio frontend: [olympo-front-git-main-juan-tafur.vercel.app](https://olympo-front-git-main-juan-tafur.vercel.app).
- Repositorio backend: [github.com/JuanTafur10/Olympo-back](https://github.com/JuanTafur10/Olympo-back).
- API y estado: [olympo-backend.onrender.com/api/v1/health](https://olympo-backend.onrender.com/api/v1/health).

> El despliegue de Vercel debe permitir acceso público para la sustentación; revisa la protección de despliegues antes de compartir el enlace.

## Reparto del trabajo

| Integrante | Aporte en este repositorio |
| --- | --- |
| Juan Pablo Tafur | Arquitectura en Next.js App Router, integración de vistas principales y ruteo |
| David Hernández Mejía | Integración de servicios API, marketplace, carga de imágenes y estilos responsivos |
| Tomás Granda | Calidad de código: tipado TypeScript de dominio, limpieza de logs de depuración, estandarización de formateo (.prettierrc) y robustez del cliente HTTP |


