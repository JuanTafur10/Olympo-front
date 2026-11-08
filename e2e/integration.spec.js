const { test, expect } = require("@playwright/test");

test.describe("Integración Olympo", () => {
  test("el frontend consulta el healthcheck del backend mediante el proxy", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const resultado = await page.evaluate(async () => {
      const respuesta = await fetch("/api/v1/health");
      return { status: respuesta.status, body: await respuesta.json() };
    });

    expect(resultado.status).toBe(200);
    expect(resultado.body).toMatchObject({
      ok: true,
      servicio: "backend-olympo",
    });
  });

  test("el backend responde una consulta respaldada por PostgreSQL", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const resultado = await page.evaluate(async () => {
      const respuesta = await fetch("/api/v1/proyectos");
      return { status: respuesta.status, body: await respuesta.json() };
    });

    expect(resultado.status).toBe(200);
    expect(resultado.body.ok).toBe(true);
    expect(Array.isArray(resultado.body.proyectos)).toBe(true);
  });

  test("la pantalla de acceso valida los campos obligatorios", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "EMPEZAR!" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Por favor completa tu correo y contraseña."
    );
  });
});
