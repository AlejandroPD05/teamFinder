import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

/*
 * Lo que la auditoría axe no ve (revisión manual de accesibilidad, 2026-11-14), comprobado en las páginas principales:
 * - Reflujo: sin scroll horizontal a 320 px de ancho (móvil) ni con zoom al 200 % (640 px CSS en escritorio).
 * - Objetivos táctiles de 44 × 44 px como mínimo en móvil (salvo enlaces dentro de una frase).
 * - Nombres accesibles que se entienden fuera de contexto: dos enlaces o botones con el mismo nombre no llevan a
 *   sitios distintos (p. ej. varios «Ver perfil»).
 * - Los campos marcados como erróneos dicen por qué (aria-describedby a un texto que existe).
 * - El título y el texto principal (el LCP) se pintan sin esperar a una animación de entrada.
 */

const PUBLIC = ["/", "/entrar", "/equipos/valorant", "/equipos/valorant/controller", "/demo", "/novedades", "/normas", "/privacidad"];
const SESSION = [
  "/inicio",
  "/perfil",
  "/buscar",
  "/grupos",
  "/grupos/nuevo",
  "/mensajes",
  "/ajustes",
  "/misiones",
  "/coleccion",
  "/ranking",
  "/perfil/partidas",
  "/mis-equipos",
  "/amigos",
  "/sugerencias",
  "/notificaciones",
];

type Report = { overflow: string[]; small: string[]; duplicates: string[]; invalid: string[] };

/** Recorre la página ya cargada y devuelve lo que incumple (vacío si todo está bien). */
async function inspect(page: Page, { targets }: { targets: boolean }): Promise<Report> {
  // Sin animaciones finitas en marcha: las tarjetas que entran escalonadas aún se están moviendo.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
  return page.evaluate((checkTargets) => {
    const doc = document.documentElement;
    const label = (el: Element) =>
      (
        el.getAttribute("aria-label") ||
        (el.getAttribute("aria-labelledby") ?? "")
          .split(" ")
          .map((id) => document.getElementById(id)?.textContent ?? "")
          .join(" ") ||
        el.textContent ||
        el.getAttribute("title") ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim();
    const where = (el: Element) => `${el.tagName.toLowerCase()} «${label(el).slice(0, 40)}»`;
    const hidden = (el: Element) => Boolean(el.closest('[aria-hidden="true"], [inert], details:not([open]) > :not(summary)'));

    const overflow: string[] = [];
    if (doc.scrollWidth > doc.clientWidth + 1) {
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.right > doc.clientWidth + 1 && getComputedStyle(el).position !== "fixed") overflow.push(`${where(el)} hasta ${Math.round(b.right)} px`);
      }
      if (!overflow.length) overflow.push(`scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}`);
    }

    const small: string[] = [];
    const byName = new Map<string, Set<string>>();
    const controls = document.querySelectorAll(
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"]',
    );
    for (const el of controls) {
      if (hidden(el)) continue;
      const b = el.getBoundingClientRect();
      // Ocultos o solo para lectores de pantalla (el enlace «Saltar al contenido» hasta recibir el foco).
      if (b.width < 2 || b.height < 2) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden") continue;
      if (checkTargets) {
        // Excepción de WCAG 2.5.5/2.5.8: enlaces dentro de una frase.
        const parentText = el.parentElement?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const inSentence = style.display === "inline" && parentText !== label(el);
        let { width, height } = b;
        // Casillas y radios: cuenta la etiqueta que los envuelve (se pulsa entera).
        const wrap = el.matches('input[type="checkbox"], input[type="radio"]') ? el.closest("label") : null;
        if (wrap) ({ width, height } = wrap.getBoundingClientRect());
        if (!inSentence && (Math.round(width) < 44 || Math.round(height) < 44)) small.push(`${where(el)} ${Math.round(width)}×${Math.round(height)}`);
      }
      if (el.matches("a[href]")) {
        const name = label(el).toLowerCase();
        const href = new URL((el as HTMLAnchorElement).href, location.href);
        const set = byName.get(name) ?? new Set<string>();
        set.add(href.pathname + href.search);
        byName.set(name, set);
      }
    }
    const duplicates = [...byName.entries()]
      // Dos jugadores (o sus grupos, equipos y clips) pueden llamarse igual: el nombre lo elige cada uno.
      .filter(([name, hrefs]) => name && hrefs.size > 1 && ![...hrefs].every((h) => /^\/(jugador|grupos|equipo|clips)\/[0-9a-f-]{36}/.test(h)))
      .map(([name, hrefs]) => `«${name}» → ${[...hrefs].join(", ")}`);

    const invalid: string[] = [];
    for (const el of document.querySelectorAll('[aria-invalid="true"]')) {
      const ids = (el.getAttribute("aria-describedby") ?? el.getAttribute("aria-errormessage") ?? "").split(" ").filter(Boolean);
      const text = ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? "").join("");
      if (!text) invalid.push(where(el));
    }
    return { overflow: overflow.slice(0, 5), small, duplicates, invalid };
  }, targets);
}

async function check(page: Page, path: string, mobile: boolean) {
  await page.goto(path);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  const r = await inspect(page, { targets: mobile });
  expect(r.overflow, `${path}: scroll horizontal`).toEqual([]);
  expect(r.small, `${path}: objetivos de menos de 44 px`).toEqual([]);
  expect(r.duplicates, `${path}: enlaces con el mismo nombre y distinto destino`).toEqual([]);
  expect(r.invalid, `${path}: campos con error sin descripción`).toEqual([]);
}

test.describe("reflujo, objetivos y nombres", () => {
  // Móvil: 320 px de ancho. Escritorio: 1280 px al 200 % de zoom equivalen a 640 px CSS.
  test.beforeEach(async ({ page }, info) => {
    await page.setViewportSize(info.project.name === "mobile" ? { width: 320, height: 640 } : { width: 640, height: 400 });
  });

  test("páginas públicas", async ({ page }, info) => {
    test.setTimeout(120_000);
    for (const path of PUBLIC) await check(page, path, info.project.name === "mobile");
  });

  test("páginas con sesión", async ({ page }, info) => {
    test.setTimeout(240_000);
    await signIn(page, `e2e-a11y-manual-${info.project.name}-${Date.now()}@example.test`);
    for (const path of SESSION) await check(page, path, info.project.name === "mobile");
  });
});

test("el texto principal se pinta sin esperar a una animación de entrada", async ({ page }) => {
  for (const path of ["/", "/entrar", "/equipos/valorant"]) {
    await page.goto(path, { waitUntil: "commit" });
    const lead = page.locator("main h1").first();
    await lead.waitFor();
    const animated = await lead.evaluate((h1) => {
      const block = h1.parentElement ?? h1;
      const chain: Element[] = [];
      for (let el: Element | null = block; el; el = el.parentElement) chain.push(el);
      return chain.some((el) => el.getAnimations().some((a) => a.effect?.getComputedTiming().iterations !== Infinity) || getComputedStyle(el).opacity === "0");
    });
    expect(animated, path).toBe(false);
  }
});

test("los nombres del catálogo en español llevan lang=es en la versión inglesa", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "tf_lang", value: "en", url: baseURL! }]);
  await page.goto("/equipos/valorant");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "Controlador" }).locator("[lang=es]")).toHaveText("Controlador");
  await page.goto("/equipos/valorant/controller");
  await expect(page.getByRole("navigation", { name: /breadcrumb/i }).locator('[aria-current="page"]')).toHaveAttribute("lang", "es");
});

test("copiar un enlace se anuncia en una región de estado", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "el portapapeles se concede en Chromium de escritorio");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await signIn(page, `e2e-a11y-copy-${Date.now()}@example.test`);
  await page.goto("/amigos");
  await page.getByRole("button", { name: "Copiar enlace" }).click();
  await expect(page.getByRole("main").getByRole("status").filter({ hasText: "Copiado" })).toBeAttached();
});
