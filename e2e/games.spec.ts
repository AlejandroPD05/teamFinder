import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { pickGame, signIn } from "./helpers";

const accent = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim());

test("cambiar de juego cambia el tema y el catálogo", async ({ page }, info) => {
  await signIn(page, `e2e-games-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/buscar");
  await expect(page.locator("html")).toHaveAttribute("data-game", "valorant");
  const valorantAccent = await accent(page);
  await page.getByText("Más filtros").click();
  await expect(page.getByLabel("Agente", { exact: true })).toBeVisible();

  // CS2: sin personajes, roles de comunidad y otro acento.
  await pickGame(page, "cs2");
  expect(await accent(page)).not.toBe(valorantAccent);
  await page.goto("/buscar");
  await expect(page.getByLabel("Agente", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Rol", { exact: true }).locator("option", { hasText: "AWPer" })).toHaveCount(1);

  // Apex: leyendas como personajes y su propio acento.
  await pickGame(page, "apex");
  await page.goto("/buscar");
  await expect(page.getByLabel("Leyenda", { exact: true }).locator("option", { hasText: "Wraith" })).toHaveCount(1);

  // La elección se recuerda en otras páginas y cada tema pasa la auditoría de accesibilidad.
  for (const path of ["/perfil/editar", "/grupos/nuevo"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-game", "apex");
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations.map((v) => v.id), path).toEqual([]);
  }
  await expect(page.getByText("Crear grupo de Apex Legends")).toBeVisible();

  await pickGame(page, "cs2");
  await page.goto("/grupos/nuevo");
  await expect(page.getByText("Crear grupo de Counter-Strike 2")).toBeVisible();
  await page.goto("/perfil/editar");
  await expect(page.getByText(/Pool de/)).toHaveCount(0);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
});

test("perfil de Apex: guarda clases y leyendas", async ({ page }, info) => {
  await signIn(page, `e2e-apex-${info.project.name}-${Date.now()}@example.test`);
  await pickGame(page, "apex");
  await page.goto("/perfil/editar");
  await expect(page.getByRole("group", { name: "Apex Legends" })).toBeVisible();
  await page.getByLabel("Nombre visible").fill("Apex E2E");
  await page.getByLabel("Hostigador", { exact: true }).check();
  await page.getByLabel("Rol principal").selectOption({ label: "Hostigador" });
  await page.getByText(/Pool de leyendas/).click();
  await page.getByLabel("Wraith").selectOption("main");
  await expect(page.getByText(/Pool de leyendas \(1 elegido\)/)).toBeVisible();
  await page.getByLabel("Quién ve tu perfil de Apex Legends:").selectOption("public");
  // Se espera a la respuesta de la acción (el aviso puede perderse si la revalidación llega antes); el resultado se
  // comprueba después en el resumen y al volver al editor.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/perfil/editar"));
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  expect((await saved).ok()).toBe(true);
  await page.goto("/perfil");
  await expect(page.getByText("Wraith")).toBeVisible();
  // Icono oficial de EA servido por el optimizador de imágenes.
  await expect(page.locator('img[src*="drop-assets.ea.com"]').first()).toBeVisible();
  await page.goto("/perfil/editar");
  await expect(page.getByLabel("Wraith")).toHaveValue("main");
});
