import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// Auditoría automática WCAG 2.1 A/AA en las páginas principales (no sustituye a una revisión manual).
async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(summary, `${path}`).toEqual([]);
}

test("páginas públicas sin infracciones WCAG A/AA", async ({ page }) => {
  for (const path of ["/", "/entrar", "/privacidad", "/normas"]) await audit(page, path);
});

test("páginas con sesión sin infracciones WCAG A/AA", async ({ page }, info) => {
  await signIn(page, `e2e-a11y-${info.project.name}-${Date.now()}@example.test`);
  for (const path of ["/inicio", "/perfil/editar", "/buscar", "/grupos", "/grupos/nuevo", "/mensajes", "/ajustes"]) {
    await audit(page, path);
  }
});
