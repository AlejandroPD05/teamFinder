import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { signIn, userIdByEmail } from "./helpers";

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

test("sesión de una cuenta borrada: cierra la sesión y vuelve al login sin error", async ({ page }, info) => {
  const email = `e2e-borrada-${info.project.name}-${Date.now()}@example.test`;
  await signIn(page, email);
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const user = { id: await userIdByEmail(email) };
  await db.from("profiles").delete().eq("id", user.id);
  const res = await page.goto("/inicio");
  expect(res?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/entrar/);
  await db.auth.admin.deleteUser(user.id);
});

test("cabeceras de seguridad", async ({ request }) => {
  const res = await request.get("/entrar");
  const h = res.headers();
  expect(h["x-powered-by"]).toBeUndefined();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
});

test("la demo pública se ve sin cuenta y avisa de que es ficticia", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("note").filter({ hasText: "Demostración con datos ficticios" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Buscar jugadores/ })).toBeVisible();
  await expect(page.getByText("Ficticio · Nébula").first()).toBeVisible();
});
