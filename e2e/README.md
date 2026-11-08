# Pruebas E2E de integración

Estas pruebas verifican la comunicación que corresponde a Persona 2:

- el frontend llega al backend por el proxy `/api/` de Nginx;
- el backend responde el healthcheck;
- el backend consulta PostgreSQL a través de `GET /api/v1/proyectos`;
- la pantalla de acceso valida los campos obligatorios.

## Ejecución local

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Cuando los tres servicios estén iniciados, instala las dependencias del frontend y ejecuta Playwright:

```powershell
cd frontend
npm install
npx playwright install chromium
npm run test:e2e
```

La configuración usa `http://127.0.0.1` como URL base, que corresponde al puerto `80` publicado por el servicio `frontend`. Para ejecutar contra otra URL:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3000"
npm run test:e2e
```

## Evidencia

Playwright genera el informe HTML en `frontend/playwright-report/`. Para abrirlo:

```powershell
npm run test:e2e:report
```

Las trazas, capturas y videos de fallos se guardan en `frontend/test-results/`. Ambos directorios son artefactos locales ignorados por Git para que el código fuente permanezca limpio.

Para detener el entorno:

```powershell
cd ..
docker compose down
```
