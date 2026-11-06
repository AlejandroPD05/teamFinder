import { expect, test, type Page } from "@playwright/test";
import { gameTile, pickGame, signIn, type GameId } from "./helpers";

// El juego elegido en la portada tiene que mantenerse en los colores y el contenido al moverse por la web.
const NAMES = { valorant: "VALORANT", cs2: "Counter-Strike 2", apex: "Apex Legends" } as const;

async function expectGame(page: Page, id: GameId, where: string) {
  await expect(page.locator("html"), where).toHaveAttribute("data-game", id);
}

async function nav(page: Page, label: string) {
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: label }).click();
}

test("el selector de la portada muestra los juegos con su contador", async ({ page }) => {
  await page.goto("/");
  for (const id of ["valorant", "cs2", "apex"] as const) {
    await expect(gameTile(page, id)).toBeVisible();
    await expect(gameTile(page, id)).toContainText(/\d+ jugador(es)?/);
  }
  await expect(gameTile(page, "valorant")).toHaveAttribute("aria-pressed", "true");
  // Ya no está en la cabecera.
  await expect(page.getByRole("banner").getByRole("button", { name: /^CS2/ })).toHaveCount(0);
});

test("el juego elegido se mantiene al navegar entre páginas", async ({ page }, info) => {
  await signIn(page, `e2e-nav-juego-${info.project.name}-${Date.now()}@example.test`);
  await pickGame(page, "apex");

  await nav(page, "Buscar");
  await expect(page).toHaveURL(/\/buscar$/);
  await expectGame(page, "apex", "/buscar");
  await expect(page.getByText(`${NAMES.apex} · Solo ves`)).toBeVisible();

  await nav(page, "Grupos");
  await expect(page).toHaveURL(/\/grupos$/);
  await expectGame(page, "apex", "/grupos");
  await expect(page.getByText(`Grupos de ${NAMES.apex}`)).toBeVisible();

  await nav(page, "Mensajes");
  await expect(page).toHaveURL(/\/mensajes$/);
  await expectGame(page, "apex", "/mensajes");

  await nav(page, "Mi perfil");
  await expect(page).toHaveURL(/\/perfil$/);
  await expectGame(page, "apex", "/perfil");
  await expect(page.getByText(`Aún no has rellenado tu perfil de ${NAMES.apex}.`)).toBeVisible();

  // Volver a la portada por el logotipo, cambiar y seguir navegando.
  await page.getByRole("link", { name: "TeamFinder, inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(gameTile(page, "apex")).toHaveAttribute("aria-pressed", "true");
  await pickGame(page, "cs2");
  await nav(page, "Buscar");
  await expectGame(page, "cs2", "/buscar tras CS2");
  await expect(page.getByText(`${NAMES.cs2} · Solo ves`)).toBeVisible();

  await nav(page, "Grupos");
  await expect(page.getByText(`Grupos de ${NAMES.cs2}`)).toBeVisible();

  // Atrás en el historial y recarga mantienen la elección.
  await page.goBack();
  await expect(page).toHaveURL(/\/buscar$/);
  await expectGame(page, "cs2", "atrás a /buscar");
  await expect(page.getByText(`${NAMES.cs2} · Solo ves`)).toBeVisible();
  await page.reload();
  await expectGame(page, "cs2", "tras recargar");
});

test("con red lenta, cambiar de juego y navegar enseguida no desincroniza", async ({ page }, info) => {
  await signIn(page, `e2e-nav-lenta-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Latencia como en producción: cada petición tarda 600 ms más.
  await page.route("**/*", async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.continue();
  });

  // Elegir y navegar sin esperar a que termine el cambio.
  await gameTile(page, "apex").click();
  await nav(page, "Grupos");
  await expect(page).toHaveURL(/\/grupos$/, { timeout: 15_000 });
  await expect(page.getByText(`Grupos de ${NAMES.apex}`)).toBeVisible({ timeout: 15_000 });
  await expectGame(page, "apex", "/grupos tras elegir y navegar");

  // Dos cambios seguidos: gana el último.
  await page.getByRole("link", { name: "TeamFinder, inicio" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  await gameTile(page, "cs2").click();
  await gameTile(page, "valorant").click();
  await expect(gameTile(page, "valorant")).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });
  await nav(page, "Buscar");
  await expect(page.getByText(`${NAMES.valorant} · Solo ves`)).toBeVisible({ timeout: 15_000 });
  await expectGame(page, "valorant", "/buscar tras dos cambios seguidos");
});

test("pasar por la portada no cambia el juego elegido (precarga de enlaces por juego)", async ({ page }, info) => {
  await signIn(page, `e2e-nav-portada-${info.project.name}-${Date.now()}@example.test`);
  await pickGame(page, "cs2");

  // La portada enlaza a /equipos/<juego>: el navegador las precarga, y eso no debe cambiar el juego.
  await page.getByRole("link", { name: "Equipo para Apex Legends" }).scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await nav(page, "Buscar");
  await expect(page).toHaveURL(/\/buscar$/);
  await expectGame(page, "cs2", "/buscar tras pasar por la portada");
  await expect(page.getByText(`${NAMES.cs2} · Solo ves`)).toBeVisible();
});
