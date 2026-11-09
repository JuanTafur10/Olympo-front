const { test, expect } = require("@playwright/test");

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const category = { id: "22222222-2222-4222-8222-222222222222", name: "Tecnología" };
const owner = { id: "33333333-3333-4333-8333-333333333333", name: "Equipo Olympo" };
const originalProject = {
  id: "11111111-1111-4111-8111-111111111111",
  ownerId: owner.id,
  categoryId: category.id,
  title: "Huerta urbana inteligente",
  description: "Cultivamos alimentos frescos en espacios urbanos con tecnología eficiente.",
  targetAmount: "50000000",
  raisedAmount: "10000000",
  status: "PUBLISHED",
  imageUrl: null,
  category,
  owner,
  createdAt: "2026-11-09T12:00:00.000Z",
};

async function setSession(page, role = "OWNER") {
  const userId = role === "USER" ? "44444444-4444-4444-8444-444444444444" : owner.id;
  await page.goto(`${baseURL}/login`);
  await page.evaluate(({ role: userRole, ownerData }) => {
    localStorage.setItem("olympo_token", "jwt-e2e");
    localStorage.setItem("olympo_usuario", JSON.stringify({ ...ownerData, role: userRole }));
  }, { role, ownerData: { id: userId, name: role === "USER" ? "Inversionista de prueba" : owner.name, email: "equipo@example.test" } });
  await page.route("**/api/v1/users/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: { id: userId, name: role === "USER" ? "Inversionista de prueba" : owner.name, email: "equipo@example.test", role } }),
  }));
}

async function mockMarketplace(page, initialProject = originalProject) {
  let project = { ...initialProject };
  const requests = [];
  await page.route("**/api/v1/categories?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: [category], pagination: { total: 1, currentPage: 1, limit: 100, totalPages: 1 } }),
  }));
  await page.route("**/api/v1/projects**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    requests.push({ method, path: url.pathname });
    if (url.pathname.endsWith("/image") && method === "POST") {
      project = { ...project, imageUrl: "https://images.example.test/project.jpg" };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: project }) });
    }
    if (url.pathname.endsWith(`/${project.id}`) && method === "DELETE") return route.fulfill({ status: 204 });
    if (url.pathname.endsWith(`/${project.id}`) && method === "PATCH") {
      const payload = request.postDataJSON();
      project = { ...project, ...payload };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: project }) });
    }
    if (url.pathname.endsWith(`/${project.id}`) && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: project }) });
    }
    if (url.pathname.endsWith("/projects") && method === "POST") {
      const payload = request.postDataJSON();
      project = { ...project, ...payload, id: project.id, ownerId: owner.id, category, owner };
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: project }) });
    }
    if (method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [project], pagination: { total: 1, currentPage: 1, limit: 12, totalPages: 1 } }) });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { message: "No se encontró el proyecto." } }) });
  });
  return requests;
}

test.describe("Frontend: vistas y experiencia", () => {
  test("la página de inicio presenta Olympo y proyectos destacados", async ({ page }) => {
    await mockMarketplace(page);
    await page.goto(baseURL);
    await expect(page.getByRole("heading", { name: /El próximo gran proyecto/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Proyectos destacados" })).toBeVisible();
    await expect(page.getByRole("link", { name: originalProject.title }).first()).toBeVisible();
  });

  test("el listado muestra filtros, proyectos y se adapta a móvil", async ({ page }) => {
    await mockMarketplace(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/proyectos`);
    await expect(page.getByRole("heading", { name: "Explora proyectos" })).toBeVisible();
    await expect(page.getByLabel("Buscar proyectos")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Categoría" })).toBeVisible();
    await expect(page.getByRole("heading", { name: originalProject.title })).toBeVisible();
    const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
    expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
  });

  test("crear proyecto permite cargar una imagen como archivo", async ({ page }) => {
    await setSession(page);
    const requests = await mockMarketplace(page);
    await page.goto(`${baseURL}/proyectos`);
    await page.getByRole("button", { name: "Crear proyecto" }).click();
    await page.getByLabel("Nombre del proyecto").fill("Biblioteca digital rural");
    await page.getByLabel("Descripción").fill("Conectamos bibliotecas comunitarias rurales con recursos educativos digitales.");
    await page.getByRole("dialog").getByLabel("Categoría").selectOption(category.id);
    await page.getByLabel("Meta de financiación (COP)").fill("30000000");
    await page.getByLabel("Visibilidad").selectOption("PUBLISHED");
    await page.getByLabel(/Imagen del proyecto/).setInputFiles({ name: "proyecto.png", mimeType: "image/png", buffer: Buffer.from("test-image") });
    await page.getByRole("button", { name: "Crear proyecto" }).last().click();
    await expect(page.getByRole("status").filter({ hasText: "Proyecto creado" })).toBeVisible();
    expect(requests.some((request) => request.method === "POST" && request.path.endsWith("/projects"))).toBe(true);
    expect(requests.some((request) => request.method === "POST" && request.path.endsWith("/image"))).toBe(true);
  });

  test("editar guarda cambios y eliminar exige confirmación y llama DELETE", async ({ page }) => {
    await setSession(page);
    const requests = await mockMarketplace(page);
    await page.goto(`${baseURL}/proyectos`);
    await page.getByRole("button", { name: `Editar ${originalProject.title}` }).click();
    await page.getByLabel("Nombre del proyecto").fill("Huerta urbana renovada");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Cambios guardados" })).toBeVisible();
    expect(requests.some((request) => request.method === "PATCH")).toBe(true);

    await page.getByRole("button", { name: "Eliminar Huerta urbana renovada" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sí, eliminar" })).toBeVisible();
    expect(requests.some((request) => request.method === "DELETE")).toBe(false);
    await page.getByRole("button", { name: "Cancelar" }).click();
    expect(requests.some((request) => request.method === "DELETE")).toBe(false);
    await page.getByRole("button", { name: "Eliminar Huerta urbana renovada" }).click();
    await page.getByRole("button", { name: "Sí, eliminar" }).click();
    expect(requests.some((request) => request.method === "DELETE")).toBe(true);
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Aún no hay proyectos para mostrar" })).toBeVisible();
  });

  test("el detalle muestra información y permite enviar una solicitud", async ({ page }) => {
    await setSession(page, "USER");
    await page.route("**/api/v1/projects/*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: originalProject }) }));
    let requestCreated = false;
    await page.route("**/api/v1/investment-requests", async (route) => {
      requestCreated = true;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: { id: "request-1", status: "PENDING" } }) });
    });
    await page.goto(`${baseURL}/proyectos/${originalProject.id}`);
    await expect(page.getByRole("heading", { name: originalProject.title })).toBeVisible();
    await expect(page.getByText(originalProject.description)).toBeVisible();
    await page.getByRole("button", { name: "Enviar solicitud de inversión" }).click();
    await page.getByLabel("Valor de inversión (COP)").fill("2500000");
    await page.getByLabel(/Mensaje para el equipo/).fill("Me interesa conocer más.");
    await page.getByRole("button", { name: "Enviar solicitud", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Tu solicitud de inversión se envió correctamente" })).toBeVisible();
    expect(requestCreated).toBe(true);
  });
});
