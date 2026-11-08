# Evidencia de integración

Última ejecución verificada: 17 de octubre de 2026.

## Entorno

Se levantó el stack con:

```powershell
docker compose up -d --build
```

Resultado de los servicios:

- `olympo-database`: `healthy`, PostgreSQL 16, puerto `5432`.
- `olympo-backend`: `Up`, FastAPI, puerto `8000`.
- `olympo-frontend`: `Up`, Nginx, puerto `80`.

## Comprobaciones de integración

- `GET http://127.0.0.1/api/v1/health` respondió `200` con `ok: true` y `servicio: backend-olympo`.
- `GET http://127.0.0.1/api/v1/proyectos` respondió `200` con `ok: true` y una lista de proyectos. La lista vacía es válida para una base recién inicializada.

## Playwright

Comando ejecutado desde `frontend/`:

```powershell
npm run test:e2e
```

Resultado: **3 passed**.

Las pruebas cubren el proxy frontend–backend, la consulta backend–PostgreSQL y la validación de campos obligatorios en el acceso. El informe HTML completo queda en `frontend/playwright-report/`, y los artefactos de fallos en `frontend/test-results/`.
