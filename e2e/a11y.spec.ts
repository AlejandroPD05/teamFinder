import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// Auditoría automática WCAG 2.1 A/AA en las páginas principales (no sustituye a una revisión manual).
async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // Las entradas escalonadas empiezan transparentes: medir el contraste cuando han terminado.
  // Con los esqueletos de carga (loading.tsx), el contenido llega después: esperar a que se vaya el esqueleto.
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  // Hasta que no quede ninguna animación finita en marcha (las entradas escalonadas pueden empezar más tarde).
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity).length,
      ),
    )
    .toBe(0);
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(summary, `${path}`).toEqual([]);
}

test("páginas públicas sin infracciones WCAG A/AA", async ({ page }) => {
  for (const path of ["/", "/entrar", "/privacidad", "/normas", "/demo", "/equipos/valorant", "/equipos/apex"]) await audit(page, path);
});

test("páginas con sesión sin infracciones WCAG A/AA", async ({ page }, info) => {
  await signIn(page, `e2e-a11y-${info.project.name}-${Date.now()}@example.test`);
  for (const path of ["/inicio", "/perfil", "/perfil/editar", "/buscar", "/grupos", "/grupos/nuevo", "/mensajes", "/ajustes", "/clips/ganadores", "/misiones", "/coleccion", "/coleccion/fanart", "/notificaciones", "/ranking", "/perfil/partidas", "/mis-equipos", "/amigos", "/sugerencias"]) {
    await audit(page, path);
  }
});
