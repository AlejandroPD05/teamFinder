import { expect, test, type Locator, type Page } from "@playwright/test";
import { latestMagicLink, signIn, userIdByEmail } from "./helpers";

/*
 * Accesibilidad con teclado: los flujos principales solo con Tab / Shift+Tab / Enter / Espacio / flechas (sin ratón),
 * comprobando en cada paso que el foco se ve y que no hay trampas de foco. Y en todas las páginas principales:
 * un único h1, las regiones (cabecera, navegación, contenido, pie) y el enlace «Saltar al contenido».
 */

/** El elemento con el foco se ve: coincide con :focus-visible y tiene contorno (o el foco está en el documento). */
async function expectVisibleFocus(page: Page) {
  const info = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement) return null;
    const style = getComputedStyle(el);
    return {
      what: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""} «${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}»`,
      // Los campos de fecha reciben el foco en sus partes internas: el contorno va en el campo (:focus-within).
      visible: el.matches(':focus-visible, input[type^="date"]:focus-within, input[type="time"]:focus-within'),
      outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
    };
  });
  if (!info) return;
  expect(info.visible && info.outline, `foco sin indicador visible en ${info.what}`).toBe(true);
}

/** Lleva el punto de partida del foco al principio del documento (como al cargar la página). */
async function resetFocus(page: Page) {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.removeAttribute("tabindex");
  });
}

async function isFocused(target: Locator) {
  return target.evaluate((el) => el === document.activeElement);
}

/** Pulsa Tab (o Shift+Tab) hasta llegar a `target`, comprobando el indicador de foco en cada paso. */
async function tabTo(page: Page, target: Locator, { back = false, max = 150 } = {}) {
  await expect(target).toBeVisible();
  const path: string[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(back ? "Shift+Tab" : "Tab");
    await expectVisibleFocus(page);
    if (await isFocused(target)) return;
    path.push(await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return `${el?.tagName.toLowerCase()}${el?.id ? `#${el.id}` : ""}:${(el?.getAttribute("aria-label") ?? el?.textContent ?? "").trim().slice(0, 20)}`;
    }));
  }
  throw new Error(`No se llega con ${back ? "Shift+Tab" : "Tab"} a ${target}. Recorrido: ${path.slice(-15).join(" | ")}`);
}

/** Desde el elemento con foco, Tab sale de él y Shift+Tab vuelve (no hay trampa de foco). */
async function expectNoTrap(page: Page) {
  const mark = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement & { __kbd?: number };
      el.__kbd ??= Math.random();
      return el.__kbd;
    });
  const start = await mark();
  await page.keyboard.press("Tab");
  expect(await mark(), "Tab no saca el foco del elemento").not.toBe(start);
  await page.keyboard.press("Shift+Tab");
  expect(await mark(), "Shift+Tab no devuelve el foco").toBe(start);
}

/** Recorre la página entera con Tab desde el principio: el foco se ve siempre y llega hasta el pie (sin trampas). */
async function walkToFooter(page: Page) {
  await resetFocus(page);
  for (let i = 0; i < 300; i++) {
    await page.keyboard.press("Tab");
    await expectVisibleFocus(page);
    if (await page.evaluate(() => !!document.activeElement?.closest("footer"))) return;
  }
  throw new Error(`El foco no llega al pie en ${page.url()}`);
}

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

/** Un solo h1, regiones principales y el enlace para saltar al contenido. */
async function checkStructure(page: Page, path: string) {
  await ready(page, path);
  await expect(page.locator("h1"), `${path}: un único h1`).toHaveCount(1);
  await expect(page.getByRole("banner"), `${path}: cabecera`).toHaveCount(1);
  await expect(page.getByRole("main"), `${path}: contenido`).toHaveCount(1);
  await expect(page.getByRole("contentinfo"), `${path}: pie`).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Principal" }), `${path}: navegación`).toHaveCount(1);

  // El primer Tab va al enlace de saltar; Enter lleva el foco al contenido.
  await resetFocus(page);
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Saltar al contenido" });
  expect(await isFocused(skip), `${path}: el primer Tab va a «Saltar al contenido»`).toBe(true);
  await expect(skip).toBeInViewport();
  await expectVisibleFocus(page);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenido$/);
  await page.keyboard.press("Tab");
  // Dentro del contenido o, si no tiene nada enfocable, después (el pie); nunca de vuelta en la cabecera.
  expect(
    await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const el = document.activeElement!;
      return main.contains(el) || !!(main.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    }),
    `${path}: tras saltar, el siguiente Tab cae en el contenido o después`,
  ).toBe(true);
}

test("estructura de las páginas públicas: un h1, regiones y enlace para saltar", async ({ page }) => {
  for (const path of ["/", "/entrar", "/equipos/valorant", "/demo", "/normas", "/privacidad", "/no-existe"]) {
    await checkStructure(page, path);
  }
});

test("estructura de las páginas con sesión: un h1, regiones y enlace para saltar", async ({ page }, info) => {
  await signIn(page, `e2e-kbd-pages-${info.project.name}-${Date.now()}@example.test`);
  for (const path of [
    "/inicio",
    "/buscar",
    "/grupos",
    "/grupos/nuevo",
    "/clips",
    "/mensajes",
    "/notificaciones",
    "/perfil",
    "/perfil/editar",
    "/ajustes",
    "/misiones",
    "/coleccion",
    "/ranking",
    "/mis-equipos",
  ]) {
    await checkStructure(page, path);
  }
});

test("entrar solo con teclado: el error se anuncia y el enlace se envía", async ({ page }, info) => {
  const email = `e2e-kbd-login-${info.project.name}-${Date.now()}@example.test`;
  await ready(page, "/entrar");
  await walkToFooter(page);

  const field = page.getByLabel("Correo electrónico");
  await resetFocus(page);
  await tabTo(page, field);
  await page.keyboard.type("esto-no-es-un-correo");
  await page.keyboard.press("Enter");
  const alert = page.getByRole("main").getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  // El campo apunta al error: el lector de pantalla lo lee al volver a él.
  await expect(field).toHaveAttribute("aria-describedby", /login-error/);

  await resetFocus(page);
  await tabTo(page, field);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type(email);
  await expectNoTrap(page);
  await tabTo(page, page.getByRole("button", { name: "Enviarme el enlace" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main").getByRole("status")).toContainText("Enlace enviado");

  // El enlace del correo inicia la sesión (lo que hay detrás ya no es del formulario).
  await page.goto(await latestMagicLink(email));
  await expect(page).toHaveURL(/\/(inicio|bienvenida)$/);
});

test("elegir juego en la portada con teclado", async ({ page }) => {
  await ready(page, "/");
  await walkToFooter(page);
  await resetFocus(page);
  const picker = page.getByRole("main").getByRole("form", { name: "Juego" });
  await expect(picker.locator("button[aria-pressed]")).toHaveCount(3);
  const id = await picker.locator("button[aria-pressed='false']").first().getAttribute("value");
  const other = picker.locator(`button[aria-pressed][value="${id}"]`);
  await tabTo(page, other);
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/");
  await page.keyboard.press("Space");
  expect((await saved).ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-game", id!);
  await expect(other).toHaveAttribute("aria-pressed", "true");
  await expect(other).toBeFocused();
});

test("buscar con filtros y «Más filtros» solo con teclado", async ({ page }, info) => {
  await signIn(page, `e2e-kbd-search-${info.project.name}-${Date.now()}@example.test`);
  await ready(page, "/buscar");
  await walkToFooter(page);
  await resetFocus(page);

  const role = page.getByLabel("Rol", { exact: true });
  await tabTo(page, role);
  await page.keyboard.press("ArrowDown");
  await expect(role).not.toHaveValue("");
  await expectNoTrap(page);

  const more = page.locator("summary").filter({ hasText: "Más filtros" });
  await tabTo(page, more);
  await page.keyboard.press("Enter");
  const agent = page.getByLabel("Agente", { exact: true });
  await expect(agent).toBeVisible();
  await tabTo(page, agent);
  await page.keyboard.press("ArrowDown");
  await expect(agent).not.toHaveValue("");

  await tabTo(page, page.getByRole("button", { name: "Buscar", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/[?&]role=[a-z]+/);
  await expect(page).toHaveURL(/[?&]agent=[a-z]+/);
});

test("crear grupo solo con teclado (con error anunciado) y abrir la campana de notificaciones", async ({ page }, info) => {
  await signIn(page, `e2e-kbd-lobby-${info.project.name}-${Date.now()}@example.test`);
  await ready(page, "/grupos/nuevo");
  await walkToFooter(page);
  await resetFocus(page);

  // Modo: grupo de radios (se entra con Tab y se cambia con flechas).
  const firstMode = page.locator('input[name="mode"]').first();
  await tabTo(page, firstMode);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('input[name="mode"]').nth(1)).toBeChecked();

  // Un rol con Espacio.
  await tabTo(page, page.getByLabel("Controlador"));
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Controlador")).toBeChecked();

  // «Más tarde» sin fecha: el error se anuncia en la región de estado.
  await tabTo(page, page.getByLabel("Ahora"));
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Más tarde")).toBeChecked();
  const submit = page.getByRole("button", { name: "Crear grupo" });
  await tabTo(page, submit);
  await page.keyboard.press("Enter");
  await expect(page.getByText("Indica fecha y hora.")).toBeVisible();
  await expect(page.locator("form").getByRole("status")).not.toBeEmpty();
  // El foco va al campo con error y no se pierde nada de lo elegido.
  await expect(page.getByLabel("Fecha y hora")).toBeFocused();
  await expect(page.locator('input[name="mode"]').nth(1)).toBeChecked();
  await expect(page.getByLabel("Controlador")).toBeChecked();
  await expect(page.getByLabel("Más tarde")).toBeChecked();

  // Volver a «Ahora» y crear.
  await tabTo(page, page.getByLabel("Más tarde"), { back: true });
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByLabel("Ahora")).toBeChecked();
  await tabTo(page, submit);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Campana de notificaciones.
  await resetFocus(page);
  await tabTo(page, page.getByRole("link", { name: /^Notificaciones/ }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/notificaciones$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("abrir una conversación privada y enviar un mensaje solo con teclado", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const [aCtx, bCtx] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = await Promise.all([aCtx.newPage(), bCtx.newPage()]);
  try {
    const bEmail = `e2e-kbd-dm-b-${stamp}@example.test`;
    await signIn(a, `e2e-kbd-dm-a-${stamp}@example.test`);
    await signIn(b, bEmail);
    const bId = await userIdByEmail(bEmail);

    await ready(a, `/jugador/${bId}`);
    await resetFocus(a);
    await tabTo(a, a.getByRole("button", { name: "Enviar mensaje" }));
    await a.keyboard.press("Enter");
    await expect(a).toHaveURL(/\/mensajes\/[0-9a-f-]{36}$/);
    await expect(a.getByText("En directo")).toBeVisible({ timeout: 15_000 });
    await walkToFooter(a);

    const input = a.getByLabel("Escribe un mensaje");
    await resetFocus(a);
    await tabTo(a, input);
    await a.keyboard.type("Hola desde el teclado");
    await expectNoTrap(a);
    await a.keyboard.press("Enter");
    await expect(a.getByRole("log", { name: "Mensajes" })).toContainText("Hola desde el teclado");
    await expect(input).toHaveValue("");
  } finally {
    await Promise.all([aCtx.close(), bCtx.close()]);
  }
});
