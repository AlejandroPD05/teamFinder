import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("invitar amigos: el enlace lleva a la invitación y el invitado aparece en la lista", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const [aCtx, bCtx] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = await Promise.all([aCtx.newPage(), bCtx.newPage()]);
  try {
    await signIn(a, `e2e-inv-a-${stamp}@example.test`);
    await a.goto("/amigos");
    const link = await a.getByLabel("Tu enlace de invitación").inputValue();
    expect(link).toMatch(/\/invitar\/[a-z0-9]{8}$/);
    await expect(a.getByText("Aún no ha entrado nadie con tu enlace.")).toBeVisible();

    // Sin sesión, la página pública dice quién invita y lleva a entrar.
    const path = new URL(link).pathname;
    await b.goto(path);
    await expect(b.getByRole("heading", { level: 1 })).toContainText("te invita a TeamFinder");
    await expect(b.getByRole("link", { name: "Entrar o crear cuenta" })).toHaveAttribute("href", `/entrar?next=${path}`);

    await signIn(b, `e2e-inv-b-${stamp}@example.test`);
    await b.goto(path);
    await b.getByRole("button", { name: "Aceptar la invitación" }).click();
    await expect(b).toHaveURL(/\/inicio$/);

    await a.goto("/amigos");
    await expect(a.getByRole("heading", { name: "Tus invitados (1)" })).toBeVisible();
    await a.goto("/notificaciones");
    await expect(a.getByText("se ha unido con tu invitación")).toBeVisible();
  } finally {
    await Promise.all([aCtx.close(), bCtx.close()]);
  }
});

test("plantillas: guardo un grupo y lo repito en un clic", async ({ page }, info) => {
  await signIn(page, `e2e-tpl-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/grupos/nuevo");
  await expect(page.getByRole("heading", { name: "En un clic" })).toHaveCount(0);
  await page.getByLabel("DuoQ · 2 plazas").check();
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await expect(page).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
  const first = page.url();

  await page.getByText("Guardar como plantilla").click();
  await page.getByLabel("Nombre de la plantilla").fill("Duo rápido");
  await page.getByRole("button", { name: "Guardar plantilla" }).click();
  await expect(page.getByText("Plantilla guardada.")).toBeVisible();

  await page.goto("/grupos/nuevo");
  await expect(page.getByRole("heading", { name: "En un clic" })).toBeVisible();
  await expect(page.getByText("Repetir mi último grupo")).toBeVisible();
  await page.getByRole("button", { name: "Crear con la plantilla Duo rápido" }).click();
  await expect(page).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
  expect(page.url()).not.toBe(first);
  await expect(page.getByText("Abierto · 1/2 plazas")).toBeVisible();
});

test("buzón de sugerencias: se envía y valida", async ({ page }, info) => {
  await signIn(page, `e2e-fb-${info.project.name}-${Date.now()}@example.test`);
  await page.getByRole("link", { name: "Enviar una sugerencia" }).click();
  await expect(page).toHaveURL(/\/sugerencias\?desde=\/inicio$/);
  await page.getByLabel("Cuéntanos").fill("corto");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Escribe al menos 10 caracteres.")).toBeVisible();
  await page.getByLabel("Algo falla").check();
  await page.getByLabel("Cuéntanos").fill("El botón de copiar no hace nada en mi móvil.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("¡Gracias! Hemos recibido tu sugerencia.")).toBeVisible();
});

test("tarjeta del perfil: viene desactivada y sin activarla no hay página pública", async ({ page }, info) => {
  await signIn(page, `e2e-card-${info.project.name}-${Date.now()}@example.test`);
  await page.getByRole("link", { name: "Ver mi perfil público" }).click();
  await expect(page.getByRole("heading", { name: "Tarjeta para compartir" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fiabilidad" })).toBeVisible();
  await expect(page.getByText("Aún no hay datos suficientes")).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").pop();
  await page.getByRole("button", { name: "Activar tarjeta" }).click();
  await expect(page.getByRole("button", { name: "Desactivar tarjeta" })).toBeVisible();
  // El perfil del juego de una cuenta nueva no es público: la tarjeta avisa y no se publica.
  const res = await page.request.get(`/tarjeta/${id}/valorant`);
  expect(res.status()).toBe(404);
});
