import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("editar perfil, verlo como público y respetar la privacidad", async ({ page, browser }, info) => {
  await signIn(page, `e2e-perfil-${info.project.name}-${Date.now()}@example.test`);
  await expect(page.getByText("0% completado")).toBeVisible();
  await page.getByRole("link", { name: "Completar perfil" }).click();
  await expect(page).toHaveURL(/\/perfil\/editar$/);

  // Validación de servidor: nombre demasiado corto.
  await page.getByLabel("Nombre visible").fill("A");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(page.getByText("al menos 2 caracteres")).toBeVisible();

  await page.getByLabel("Nombre visible").fill("Smoker E2E");
  await page.getByLabel("Español").check();
  await page.getByLabel("Competitivo").check();
  await page.getByLabel("Rango actual").selectOption({ label: "Oro 2" });
  await page.getByLabel("Servidor").selectOption({ label: "Europa" });
  await page.getByLabel("Controlador", { exact: true }).check();
  await page.getByLabel("Rol principal").selectOption({ label: "Controlador" });
  await page.getByText(/Pool de agentes/).click();
  await page.getByLabel("Omen").selectOption("main");
  await page.getByLabel("Clove").selectOption("comfort");
  await page.getByLabel("Quién ve tu perfil de VALORANT:").selectOption("public");
  // El aviso «Perfil guardado» puede perderse si la revalidación remonta el formulario: se espera a que la acción
  // responda y el resultado se comprueba en el perfil público.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/perfil/editar"));
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  expect((await saved).ok()).toBe(true);

  // Perfil público visto por su dueño.
  await page.getByRole("link", { name: "Ver mi perfil público" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Smoker E2E");
  await expect(page.getByText("Oro 2 · introducido manualmente")).toBeVisible();
  await expect(page.getByText("Controlador (principal)")).toBeVisible();
  await expect(page.getByText("Omen")).toBeVisible();
  await expect(page.getByText("Español")).toBeVisible();
  const profileUrl = page.url();

  // Visto por un anónimo: VALORANT es público, idiomas solo para registrados.
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(profileUrl);
  await expect(guestPage.getByRole("heading", { level: 1 })).toHaveText("Smoker E2E");
  await expect(guestPage.getByText("Oro 2 · introducido manualmente")).toBeVisible();
  await expect(guestPage.getByText("Español")).toHaveCount(0);
  await expect(guestPage.getByText("Oculto").first()).toBeVisible();
  await expect(guestPage.getByRole("link", { name: "Editar perfil" })).toHaveCount(0);
  await guest.close();

  // El progreso refleja lo rellenado.
  await page.goto("/inicio");
  await expect(page.getByText("75% completado")).toBeVisible();
});

test("perfil inexistente o id inválido da 404", async ({ page }) => {
  const res = await page.goto("/jugador/no-es-un-id");
  expect(res?.status()).toBe(404);
  const res2 = await page.goto("/jugador/00000000-0000-4000-8000-000000000000");
  expect(res2?.status()).toBe(404);
});
