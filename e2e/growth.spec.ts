import { expect, test } from "@playwright/test";

test("página pública por rol: título, búsqueda con el rol, otros roles y 404", async ({ page, request }) => {
  const res = await page.goto("/equipos/valorant/controller");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Busco Controlador en VALORANT");
  await expect(page).toHaveTitle(/^Busco Controlador en VALORANT: encuentra compañeros/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/equipos\/valorant\/controller$/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /Busco Controlador en VALORANT/);
  // La web se pinta con el juego de la URL.
  await expect(page.locator("html")).toHaveAttribute("data-game", "valorant");

  // Sin sesión: entrar y volver a la búsqueda con el rol ya elegido.
  await expect(page.getByRole("link", { name: "Entrar y buscar jugadores de Controlador" })).toHaveAttribute(
    "href",
    `/entrar?next=${encodeURIComponent("/buscar?role=controller")}`,
  );
  await expect(page.getByRole("link", { name: "Equipo para VALORANT" }).first()).toHaveAttribute("href", "/equipos/valorant");

  // Cifras agregadas (perfiles públicos con el rol), nunca nombres de jugadores.
  await expect(page.getByText("perfiles públicos que juegan de Controlador")).toBeVisible();

  // Migas de pan en datos estructurados.
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(ld["@type"]).toBe("BreadcrumbList");
  expect(ld.itemListElement.at(-1).item).toMatch(/\/equipos\/valorant\/controller$/);

  // Enlaces a los demás roles del juego.
  const siblings = page.getByRole("navigation", { name: "Otros roles en VALORANT" });
  await expect(siblings.getByRole("link")).toHaveCount(3);
  await page.waitForLoadState("networkidle");
  await siblings.getByRole("link", { name: "Centinela" }).click();
  await expect(page).toHaveURL(/\/equipos\/valorant\/sentinel$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Busco Centinela en VALORANT");

  // CS2: su propio rol y su tema.
  await page.goto("/equipos/cs2/awper");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Busco AWPer en Counter-Strike 2");
  await expect(page.locator("html")).toHaveAttribute("data-game", "cs2");

  // Rol de otro juego o desconocido, y juego desconocido: 404.
  expect((await request.get("/equipos/valorant/no-existe")).status()).toBe(404);
  expect((await request.get("/equipos/valorant/awper")).status()).toBe(404);
  expect((await request.get("/equipos/no-existe/controller")).status()).toBe(404);

  // En el sitemap.
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/equipos/valorant/controller");
  expect(sitemap).toContain("/equipos/cs2/awper");
  expect(sitemap).toContain("/novedades");
});

test("la página del juego enlaza a cada rol", async ({ page }) => {
  await page.goto("/equipos/apex");
  await expect(page.getByRole("link", { name: "Asalto", exact: true })).toHaveAttribute("href", "/equipos/apex/assault");
});

test("novedades: enlace en el pie y de lo más reciente a lo más antiguo", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("contentinfo").getByRole("link", { name: "Novedades" }).click();
  await expect(page).toHaveURL(/\/novedades$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Novedades");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/novedades$/);
  const dates = await page.locator("main h2 time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime") ?? ""));
  expect(dates.length).toBeGreaterThan(1);
  expect(dates).toEqual([...dates].sort().reverse());
  await expect(page.locator("main h2").first()).toHaveText(/de 2026$/);
});
