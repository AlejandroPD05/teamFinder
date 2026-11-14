import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("normas y privacidad recogen lo que exige la normativa", async ({ page }) => {
  await page.goto("/normas");
  for (const section of ["Juego limpio", "Clips", "Equipos y partidas", "Mensajes privados", "Denuncias", "Qué hace moderación", "Recurrir una decisión", "Edad"]) {
    await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
  }
  // Texto definitivo: con versión y fecha, sin aviso de borrador.
  await expect(page.getByText(/Versión 1\.2, en vigor desde el/)).toBeVisible();
  await expect(page.getByText("no lo ha revisado un abogado", { exact: false })).toHaveCount(0);
  // La escala de medidas incluye las restricciones temporales (ya existen).
  await expect(page.getByText("Restricción temporal de 1 a 30 días", { exact: false })).toBeVisible();

  await page.goto("/privacidad");
  for (const section of ["Quién es el responsable", "Para qué y con qué base legal", "Proveedores (encargados del tratamiento)", "Cuánto tiempo los guardamos", "Tus derechos"]) {
    await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
  }
  await expect(page.getByText("Brevo", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /sedeagpd\.gob\.es/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "30 días desde que se cierra el grupo." })).toBeVisible();
  await expect(page.getByRole("cell", { name: "60 días.", exact: true })).toBeVisible();
});

test("descargar mis datos devuelve un JSON con lo propio", async ({ page }, info) => {
  const email = `e2e-datos-${info.project.name}-${Date.now()}@example.test`;
  await signIn(page, email);
  await page.goto("/ajustes");
  await expect(page.getByRole("link", { name: "Descargar mis datos" })).toHaveAttribute("href", "/ajustes/mis-datos");
  const res = await page.request.get("/ajustes/mis-datos");
  expect(res.ok()).toBe(true);
  expect(res.headers()["content-disposition"]).toContain("teamfinder-mis-datos.json");
  const data = await res.json();
  expect(data.account.email).toBe(email);
  expect(data.profile).toHaveLength(1);
  expect(Array.isArray(data.clips)).toBe(true);
  expect(Array.isArray(data.direct_messages)).toBe(true);
  expect(Array.isArray(data.notifications)).toBe(true);

  // Sin sesión no hay nada que descargar.
  const anon = await page.context().browser()!.newContext();
  const r2 = await anon.request.get(new URL("/ajustes/mis-datos", page.url()).toString(), { maxRedirects: 0 });
  expect([307, 401]).toContain(r2.status());
  await anon.close();
});

test("la página de ganadores explica las reglas", async ({ page }, info) => {
  await signIn(page, `e2e-ganadores-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/clips");
  await page.getByRole("link", { name: "Ganadores" }).click();
  await expect(page).toHaveURL(/\/clips\/ganadores$/);
  await page.getByText("Cómo se elige").click();
  await expect(page.getByText("La semana va de lunes a domingo (hora de España).")).toBeVisible();
});
