import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

const accent = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim());

test("cambiar de juego cambia el tema y el catálogo", async ({ page }, info) => {
  await signIn(page, `e2e-games-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/buscar");
  await expect(page.locator("html")).toHaveAttribute("data-game", "valorant");
  const valorantAccent = await accent(page);
  await expect(page.getByLabel("Agente", { exact: true })).toBeVisible();

  // CS2: sin personajes, roles de comunidad y otro acento.
  await page.getByRole("button", { name: "CS2" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-game", "cs2");
  await expect(page.getByRole("button", { name: "CS2" })).toHaveAttribute("aria-pressed", "true");
  expect(await accent(page)).not.toBe(valorantAccent);
  await expect(page.getByLabel("Agente", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Rol", { exact: true }).locator("option", { hasText: "AWPer" })).toHaveCount(1);

  // Apex: leyendas como personajes y su propio acento.
  await page.getByRole("button", { name: "APEX" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-game", "apex");
  await expect(page.getByLabel("Leyenda", { exact: true }).locator("option", { hasText: "Wraith" })).toHaveCount(1);

  // La elección se recuerda en otras páginas y cada tema pasa la auditoría de accesibilidad.
  for (const path of ["/perfil/editar", "/grupos/nuevo"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-game", "apex");
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations.map((v) => v.id), path).toEqual([]);
  }
  await expect(page.getByText("Crear grupo de Apex Legends")).toBeVisible();

  await page.getByRole("button", { name: "CS2" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-game", "cs2");
  await expect(page.getByText("Crear grupo de Counter-Strike 2")).toBeVisible();
  await page.goto("/perfil/editar");
  await expect(page.getByText(/Pool de/)).toHaveCount(0);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
