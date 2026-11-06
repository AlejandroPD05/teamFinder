import { expect, test } from "@playwright/test";
import { gameTile } from "./helpers";

test("robots, sitemap y metadatos para buscadores", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /jugador/");
  expect(robots).toContain("Disallow: /perfil");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const id of ["valorant", "cs2", "apex"]) expect(sitemap).toContain(`/equipos/${id}`);
  expect(sitemap).not.toContain("/jugador/");

  await page.goto("/");
  await expect(page).toHaveTitle(/busca equipo para VALORANT, CS2 y Apex Legends/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain('"WebSite"');
  await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute("content", /.+/);

  // Página pública por juego, enlazada desde la portada.
  const apexLink = page.getByRole("link", { name: "Equipo para Apex Legends" });
  await expect(apexLink).toHaveAttribute("href", "/equipos/apex");
  // Con la máquina cargada, un clic durante la hidratación puede perderse: se espera a que la página esté lista.
  await page.waitForLoadState("networkidle");
  await apexLink.click();
  await expect(page).toHaveURL(/\/equipos\/apex$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Encuentra equipo para Apex Legends");
  await expect(page).toHaveTitle(/Buscar equipo para Apex Legends/);
  await expect(page.getByText("Hostigador")).toBeVisible();
  // La web entera pasa a Apex (colores) y lo recuerda.
  await expect(page.locator("html")).toHaveAttribute("data-game", "apex");
  await page.waitForLoadState("networkidle");
  // Al abrir de verdad /equipos/cs2, el selector guarda la elección con una acción en el servidor.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/equipos/cs2"));
  await page.getByRole("navigation", { name: "Otros juegos" }).getByRole("link", { name: "Equipo para Counter-Strike 2" }).click();
  await expect(page).toHaveURL(/\/equipos\/cs2$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Encuentra equipo para Counter-Strike 2");
  await expect(page.locator("html")).toHaveAttribute("data-game", "cs2");
  expect((await saved).ok()).toBe(true);
  await page.goto("/");
  await expect(gameTile(page, "cs2")).toHaveAttribute("aria-pressed", "true");

  expect((await request.get("/equipos/no-existe")).status()).toBe(404);
  expect((await request.get("/opengraph-image")).headers()["content-type"]).toContain("image/png");
});
