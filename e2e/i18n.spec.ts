import { expect, test } from "@playwright/test";

test("el selector del pie cambia la web a inglés y vuelve al español", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  // El selector está en el pie: un botón por idioma, el activo con aria-pressed.
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "true");
  await expect(footer.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "false");

  await footer.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Find people to stack with in /);
  await expect(page.getByRole("link", { name: "Sign in to get started" }).first()).toBeVisible();
  await expect(footer.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");

  // La elección se guarda: el resto de páginas ya salen en inglés.
  await page.goto("/entrar");
  await expect(page).toHaveTitle(/^Sign in · TeamFinder$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in to TeamFinder" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Discord" })).toBeVisible();

  // Los textos legales siguen en español (la versión vinculante), con un aviso en inglés.
  await page.goto("/normas");
  await expect(page.getByText("This is the binding Spanish version.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Normas de la comunidad" })).toBeVisible();

  await page.getByRole("contentinfo").getByRole("button", { name: "Español" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByText("This is the binding Spanish version.", { exact: false })).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Encuentra con quién hacer stack en /);
});

test("sin cookie, un navegador en inglés ve la web en inglés", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-GB" });
  const page = await context.newPage();
  await page.goto("/entrar");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in to TeamFinder" })).toBeVisible();
  await context.close();
});
