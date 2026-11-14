import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("un formulario con error conserva lo escrito y lleva el foco al campo", async ({ page }, info) => {
  await signIn(page, `e2e-sticky-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/perfil/editar");
  await page.waitForLoadState("networkidle");
  const lang = page.getByRole("checkbox", { name: "Español" });
  await lang.check();
  await page.getByLabel("Nombre visible").fill("x");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByLabel("Nombre visible")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Nombre visible")).toBeFocused();
  await expect(page.getByLabel("Nombre visible")).toHaveValue("x");
  await expect(lang).toBeChecked();
});

test("búsquedas guardadas: guardo, la abro y apago la alerta", async ({ page }, info) => {
  await signIn(page, `e2e-saved-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/buscar");
  await expect(page.getByRole("heading", { name: "Búsquedas guardadas" })).toHaveCount(0);
  await page.goto("/buscar?role=controller");
  await page.getByLabel("Guardar esta búsqueda como").fill("Controlador");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Búsqueda guardada, con alerta activada.")).toBeVisible();
  await expect(page.getByLabel("Guardar esta búsqueda como")).toHaveCount(0); // ya está guardada

  await page.goto("/buscar");
  await page.getByRole("link", { name: "Controlador", exact: true }).click();
  await expect(page).toHaveURL(/\/buscar\?role=controller$/);
  const alert = page.getByRole("button", { name: "Alerta de la búsqueda Controlador" });
  await expect(alert).toHaveAttribute("aria-pressed", "true");
  await alert.click();
  await expect(page.getByText("Alerta desactivada.")).toBeVisible();
  await expect(alert).toHaveAttribute("aria-pressed", "false");
});

test("las estadísticas solo existen para moderación", async ({ page }, info) => {
  await signIn(page, `e2e-stats-${info.project.name}-${Date.now()}@example.test`);
  const res = await page.goto("/moderacion/estadisticas");
  expect(res?.status()).toBe(404);
});
