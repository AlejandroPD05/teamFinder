import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("una ruta privada sin sesión redirige a /entrar", async ({ page }) => {
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/entrar\?next=%2Finicio/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Entrar");
});

test("un error de OAuth devuelto a la portada lleva al login con aviso", async ({ page }) => {
  await page.goto("/?error=invalid_request&error_code=bad_oauth_state");
  await expect(page).toHaveURL(/\/entrar\?error=oauth$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Discord");
});

test("correo inválido muestra error accesible", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Correo electrónico").fill("no-es-correo");
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("correo válido");
});

test("login real con enlace por correo, sesión y salida", async ({ page }, info) => {
  await signIn(page, `e2e-${info.project.name}-${Date.now()}@example.test`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hola, Jugador");
  await expect(page.getByText("integración pendiente")).toBeVisible();

  // Con sesión, /entrar lleva al inicio.
  await page.goto("/entrar");
  await expect(page).toHaveURL(/\/inicio$/);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/entrar/);
});
