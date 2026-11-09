# Pruebas E2E de integración

Estas pruebas verifican la comunicación que corresponde a Persona 2:

- el frontend llega al backend por las reescrituras `/api/` de Next.js;
- el backend responde el healthcheck;
- el backend consulta PostgreSQL a través de `GET /api/v1/proyectos`;
- la pantalla de acceso valida los campos obligatorios.

## Ejecución local

Desde la raíz de Olympo-front, con el backend disponible en `http://localhost:4000`:

```powershell
npm ci
npm run dev
```

En otra terminal, instala Chromium y ejecuta Playwright:

```powershell
npx playwright install chromium
npm run test:e2e
```

La configuración usa `http://127.0.0.1:3000`, el puerto de desarrollo de Next.js. Para ejecutar contra otra URL:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://tu-frontend.example"
npm run test:e2e
```

## Evidencia

Playwright genera el informe HTML en `playwright-report/`. Para abrirlo:

```powershell
npm run test:e2e:report
```

Las trazas, capturas y videos de fallos se guardan en `test-results/`. Ambos directorios son artefactos locales ignorados por Git para que el código fuente permanezca limpio.

Para detener el entorno:

```powershell
cd ..
docker compose down
```
