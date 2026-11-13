import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("ranking semanal: se llega desde el inicio, explica las reglas y dice cuánto te falta", async ({ page }, info) => {
  await signIn(page, `e2e-ranking-${info.project.name}-${Date.now()}@example.test`);
  await page.getByRole("link", { name: /Ranking semanal/ }).click();
  await expect(page).toHaveURL(/\/ranking$/);
  await expect(page.getByRole("heading", { level: 1, name: "Ranking semanal" })).toBeVisible();
  await expect(page.getByText("Aún no cuentas esta semana. Termina 3 grupos para entrar.")).toBeVisible();
  await page.getByText("Cómo se calcula").click();
  await expect(page.getByText("Puntos = 3 por cada reconocimiento de karma recibido + 1 por cada grupo terminado.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Semanas anteriores" })).toBeVisible();
});

test("el ranking exige sesión", async ({ page }) => {
  await page.goto("/ranking");
  await expect(page).toHaveURL(/\/entrar\?next=%2Franking$/);
});
