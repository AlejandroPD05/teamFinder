import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

// El juego elegido tiene que mantenerse igual en la cabecera, los colores y el contenido al moverse por la web.
const NAMES = { valorant: "VALORANT", cs2: "Counter-Strike 2", apex: "Apex Legends" } as const;
const SHORT = { valorant: "VALORANT", cs2: "CS2", apex: "APEX" } as const;
type Id = keyof typeof NAMES;

async function expectGame(page: Page, id: Id, where: string) {
  await expect(page.locator("html"), where).toHaveAttribute("data-game", id);
  await expect(page.getByRole("button", { name: SHORT[id], exact: true }), where).toHaveAttribute("aria-pressed", "true");
  for (const other of Object.keys(SHORT) as Id[]) {
    if (other !== id) {
      await expect(page.getByRole("button", { name: SHORT[other], exact: true }), where).toHaveAttribute("aria-pressed", "false");
    }
  }
}

async function nav(page: Page, label: string) {
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: label }).click();
}

async function choose(page: Page, id: Id) {
  await page.getByRole("button", { name: SHORT[id], exact: true }).click();
  await expectGame(page, id, `tras elegir ${id}`);
}

test("el juego elegido se mantiene al navegar entre páginas", async ({ page }, info) => {
  await signIn(page, `e2e-nav-juego-${info.project.name}-${Date.now()}@example.test`);
  await page.waitForLoadState("networkidle");

  await nav(page, "Buscar");
  await expect(page).toHaveURL(/\/buscar$/);
  await choose(page, "apex");
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

  // Cambio en otra página y vuelta a las anteriores.
  await choose(page, "cs2");
  await expect(page.getByText(`Aún no has rellenado tu perfil de ${NAMES.cs2}.`)).toBeVisible();
  await nav(page, "Buscar");
  await expect(page).toHaveURL(/\/buscar$/);
  await expectGame(page, "cs2", "/buscar tras CS2");
  await expect(page.getByText(`${NAMES.cs2} · Solo ves`)).toBeVisible();

  await nav(page, "Grupos");
  await expectGame(page, "cs2", "/grupos tras CS2");
  await expect(page.getByText(`Grupos de ${NAMES.cs2}`)).toBeVisible();

  // Atrás en el historial: el contenido y la cabecera siguen en el juego elegido.
  await page.goBack();
  await expect(page).toHaveURL(/\/buscar$/);
  await expectGame(page, "cs2", "atrás a /buscar");
  await expect(page.getByText(`${NAMES.cs2} · Solo ves`)).toBeVisible();

  // Recargar mantiene la elección.
  await page.reload();
  await expectGame(page, "cs2", "tras recargar");
});

test("con red lenta, cambiar de juego y navegar enseguida no desincroniza", async ({ page }, info) => {
  await signIn(page, `e2e-nav-lenta-${info.project.name}-${Date.now()}@example.test`);
  await page.waitForLoadState("networkidle");
  // Latencia como en producción: cada petición tarda 600 ms más.
  await page.route("**/*", async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.continue();
  });

  await page.goto("/buscar");
  // Elegir y navegar sin esperar a que termine el cambio.
  await page.getByRole("button", { name: "APEX", exact: true }).click();
  await nav(page, "Grupos");
  await expect(page).toHaveURL(/\/grupos$/, { timeout: 15_000 });
  await expect(page.getByText(`Grupos de ${NAMES.apex}`)).toBeVisible({ timeout: 15_000 });
  await expectGame(page, "apex", "/grupos tras elegir y navegar");

  // Dos cambios seguidos: gana el último.
  await page.getByRole("button", { name: "CS2", exact: true }).click();
  await page.getByRole("button", { name: "VALORANT", exact: true }).click();
  await expect(page.getByText(`Grupos de ${NAMES.valorant}`)).toBeVisible({ timeout: 15_000 });
  await expectGame(page, "valorant", "tras dos cambios seguidos");

  // Navegar y cambiar a la vez.
  await nav(page, "Mi perfil");
  await page.getByRole("button", { name: "APEX", exact: true }).click();
  await expect(page).toHaveURL(/\/perfil$/, { timeout: 15_000 });
  await expect(page.getByText(`Aún no has rellenado tu perfil de ${NAMES.apex}.`)).toBeVisible({ timeout: 15_000 });
  await expectGame(page, "apex", "/perfil tras navegar y cambiar a la vez");

  await nav(page, "Buscar");
  await expect(page.getByText(`${NAMES.apex} · Solo ves`)).toBeVisible({ timeout: 15_000 });
  await expectGame(page, "apex", "/buscar al final");
});

test("pasar por la portada no cambia el juego elegido (precarga de enlaces por juego)", async ({ page }, info) => {
  await signIn(page, `e2e-nav-portada-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/buscar");
  await choose(page, "cs2");

  // La portada enlaza a /equipos/<juego>: el navegador las precarga, y eso no debe cambiar el juego.
  await page.getByRole("link", { name: "TeamFinder, inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: "Equipo para Apex Legends" }).scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await nav(page, "Buscar");
  await expect(page).toHaveURL(/\/buscar$/);
  await expectGame(page, "cs2", "/buscar tras pasar por la portada");
  await expect(page.getByText(`${NAMES.cs2} · Solo ves`)).toBeVisible();
});
