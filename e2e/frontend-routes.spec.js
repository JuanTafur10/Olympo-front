const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

async function guardarSesion(page, usuario, token = "token-de-prueba") {
  if (page.url() === "about:blank") await page.goto(`${BASE_URL}/login`);
  await page.evaluate(({ usuario_guardado, token_guardado }) => {
    localStorage.setItem("olympo_usuario", JSON.stringify(usuario_guardado));
    localStorage.setItem("olympo_token", token_guardado);
  }, { usuario_guardado: usuario, token_guardado: token });
}

async function responderUsuarioActual(page, status, usuario) {
  await page.route("**/api/v1/users/me", (route) => route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(status === 200 ? { data: usuario } : { error: { message: "Sesión inválida" } }),
  }));
}

test.describe("Frontend: autenticación y protección", () => {
  test("las rutas privadas redirigen sin sesión y registro tiene su propia URL", async ({ page }) => {
    await page.goto(`${BASE_URL}/cuenta`);
    await expect(page).toHaveURL(/\/login$/);

    await page.goto(`${BASE_URL}/register`);
    await expect(page.getByPlaceholder("Nombre de usuario")).toBeVisible();
  });

  test("un user no abre administración y un admin sí", async ({ page }) => {
    await guardarSesion(page, { id: 1, email: "user@test.local", role: "USER" });
    await responderUsuarioActual(page, 200, { id: 1, email: "user@test.local", role: "USER" });
    await page.goto(`${BASE_URL}/admin`);
    await expect(page).toHaveURL(/\/dashboard$/);

    await guardarSesion(page, { id: 2, email: "admin@test.local", role: "ADMIN", es_admin: true });
    await responderUsuarioActual(page, 200, { id: 2, email: "admin@test.local", role: "ADMIN" });
    await page.goto(`${BASE_URL}/admin`);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("una sesión guardada sobrevive al refresco y login/registro la redirigen", async ({ page }) => {
    const usuario = { id: 3, email: "user@test.local", role: "USER" };
    await guardarSesion(page, usuario, "token-persistente");
    await responderUsuarioActual(page, 200, usuario);
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("olympo_token")))
      .toBe("token-persistente");

    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`${BASE_URL}/register`);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("logout elimina el token y devuelve al login", async ({ page }) => {
    const usuario = { id: 7, email: "logout@test.local", role: "USER" };
    await guardarSesion(page, usuario, "token-para-cerrar");
    await responderUsuarioActual(page, 200, usuario);
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByTitle("Cerrar sesión").click();
    await expect(page).toHaveURL(/\/login$/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("olympo_token"))).toBeNull();
  });

  test("un 401 limpia el token y devuelve al login", async ({ page }) => {
    await guardarSesion(page, { id: 4, email: "stale@test.local", role: "ADMIN", es_admin: true }, "token-vencido");
    await responderUsuarioActual(page, 401);
    await page.goto(`${BASE_URL}/admin`);
    await expect(page).toHaveURL(/\/login$/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("olympo_token"))).toBeNull();
  });

  test("muestra el error de credenciales dentro del login", async ({ page }) => {
    await page.route("**/api/auth/login", (route) => route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Correo o contraseña incorrectos" } }),
    }));
    await page.goto(`${BASE_URL}/login`);
    await page.getByPlaceholder("Correo electrónico").fill("persona@test.local");
    await page.getByPlaceholder("Contraseña", { exact: true }).fill("incorrecta");
    await page.getByRole("button", { name: "EMPEZAR!" }).click();
    await expect(page.locator(".login__error").filter({ hasText: "Correo o contraseña incorrectos" }))
      .toBeVisible();
  });

  test("el login válido obtiene token y abre la aplicación", async ({ page }) => {
    const usuario = { id: 5, name: "Persona", email: "persona@test.local", role: "OWNER" };
    await page.route("**/api/auth/login", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: usuario, token: "jwt-login" }),
    }));
    await responderUsuarioActual(page, 200, usuario);
    await page.goto(`${BASE_URL}/login`);
    await page.getByPlaceholder("Correo electrónico").fill(usuario.email);
    await page.getByPlaceholder("Contraseña", { exact: true }).fill("Clave-segura-123");
    await page.getByRole("button", { name: "EMPEZAR!" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("olympo_token"))).toBe("jwt-login");
  });

  test("el registro válido llama a la API y abre la sesión", async ({ page }) => {
    const usuario = { id: 6, name: "Nueva persona", email: "nueva@test.local", role: "OWNER" };
    await page.route("**/api/auth/register", (route) => route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ user: usuario, token: "jwt-register" }),
    }));
    await page.route("**/api/auth/login", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: usuario, token: "jwt-register" }),
    }));
    await responderUsuarioActual(page, 200, usuario);
    await page.goto(`${BASE_URL}/register`);
    await page.getByPlaceholder("Nombre de usuario").fill(usuario.name);
    await page.getByPlaceholder("Correo", { exact: true }).fill(usuario.email);
    await page.getByPlaceholder("Contraseña", { exact: true }).fill("Clave-segura-123");
    await page.getByPlaceholder("Confirmar contraseña").fill("Clave-segura-123");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "REGISTRARSE" }).last().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("olympo_token"))).toBe("jwt-register");
  });

  test("muestra el error 409 de email repetido dentro del registro", async ({ page }) => {
    let aparecio_dialogo = false;
    page.on("dialog", async (dialog) => {
      aparecio_dialogo = true;
      await dialog.dismiss();
    });
    await page.route("**/api/auth/register", (route) => route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Este correo ya está registrado" } }),
    }));
    await page.goto(`${BASE_URL}/register`);
    await page.getByPlaceholder("Nombre de usuario").fill("Persona de prueba");
    await page.getByPlaceholder("Correo", { exact: true }).fill("repetido@test.local");
    await page.getByPlaceholder("Contraseña", { exact: true }).fill("Clave-segura-123");
    await page.getByPlaceholder("Confirmar contraseña").fill("Clave-segura-123");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "REGISTRARSE" }).last().click();
    await expect(page.locator(".login__error").filter({ hasText: "Este correo ya está registrado" }))
      .toBeVisible();
    expect(aparecio_dialogo).toBe(false);
  });

  test("una ruta inexistente sirve el not-found de Next con HTTP 404", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/ruta-inexistente`);
    expect(response.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
  });
});
