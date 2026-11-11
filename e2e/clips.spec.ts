import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

async function audit(page: Page, path: string) {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  // El reproductor de YouTube/Twitch es contenido de terceros: se audita solo lo nuestro.
  const result = await new AxeBuilder({ page }).exclude("iframe").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(summary, path).toEqual([]);
}

test("Clip Zone: publicar, ver, dar emblemas, comentar y borrar", async ({ page, browser }, info) => {
  await signIn(page, `e2e-clips-${info.project.name}-${Date.now()}@example.test`);
  const title = `Ace e2e ${info.project.name} ${Date.now()}`;
  // Id de YouTube único por ejecución (11 caracteres).
  const videoId = `${info.project.name === "mobile" ? "m" : "d"}${Date.now().toString(36)}`.padEnd(11, "x").slice(0, 11);

  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Clips" }).click();
  await expect(page).toHaveURL(/\/clips$/);
  await audit(page, "/clips");
  await page.getByRole("link", { name: "Publicar clip" }).first().click();
  await expect(page).toHaveURL(/\/clips\/nuevo$/);

  // Validación: enlace de otra web.
  await page.getByLabel("Enlace del clip").fill("https://example.com/video");
  await page.getByLabel("Título").fill(title);
  await page.getByLabel(/^Ace/).check();
  await page.getByRole("button", { name: "Publicar clip" }).click();
  await expect(page.getByText("Pega un enlace de YouTube")).toBeVisible();
  await audit(page, "/clips/nuevo");

  await page.getByLabel("Enlace del clip").fill(`https://youtu.be/${videoId}`);
  await page.getByRole("button", { name: "Publicar clip" }).click();
  await expect(page).toHaveURL(/\/clips\/[0-9a-f-]{36}$/);
  const clipUrl = page.url();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  // Fachada: el reproductor no se carga hasta pulsar.
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: /Ver clip \(YouTube\)/ }).click();
  await expect(page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/"]')).toHaveCount(1);
  // En tu propio clip no puedes dar emblemas.
  await expect(page.getByRole("button", { name: /^Ace/ })).toBeDisabled();

  await page.getByLabel("Comentar", { exact: true }).fill("Primer comentario");
  await page.getByRole("button", { name: "Publicar comentario" }).click();
  await expect(page.getByText("Primer comentario")).toBeVisible();
  await audit(page, "/clips/[id]");

  // Otra persona le da un emblema y lo ve en la lista.
  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  await signIn(other, `e2e-clips-fan-${info.project.name}-${Date.now()}@example.test`);
  await other.goto(clipUrl);
  const comedy = other.getByRole("button", { name: /^Comedia/ });
  await expect(comedy).toHaveAttribute("aria-pressed", "false");
  await comedy.click();
  await expect(comedy).toHaveAttribute("aria-pressed", "true");
  await expect(comedy).toContainText("1");
  await other.goto("/clips");
  const card = other.getByRole("listitem").filter({ hasText: title });
  await expect(card.getByRole("list", { name: "Emblemas recibidos" })).toContainText("Comedia 1");
  await ctx.close();

  // El autor borra su clip.
  await page.goto(clipUrl);
  await page.getByRole("button", { name: "Borrar mi clip" }).click();
  await expect(page).toHaveURL(/\/clips$/);
  await expect(page.getByText(title)).toHaveCount(0);
});
