import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Recoge las infracciones de la Content-Security-Policy de la propia web: el evento `securitypolicyviolation` (en la
 * ventana principal, no en los iframes de YouTube & cía., que tienen su propia CSP) y los errores de consola de Chrome
 * del tipo «Refused to …» que vengan de nuestro origen.
 */
async function watchCsp(page: Page): Promise<string[]> {
  const found: string[] = [];
  await page.addInitScript(() => {
    if (window.top !== window) return;
    document.addEventListener("securitypolicyviolation", (e) => {
      console.error(`CSP-VIOLATION ${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`);
    });
  });
  const origin = new URL(test.info().project.use.baseURL ?? "http://127.0.0.1:3000").origin;
  page.on("console", (msg) => {
    const text = msg.text();
    const from = msg.location().url;
    if (from && !from.startsWith(origin)) return;
    if (/CSP-VIOLATION|Content Security Policy|Refused to (execute|load|connect|apply|frame)/i.test(text)) {
      found.push(`${page.url()} → ${text}`);
    }
  });
  return found;
}

async function visit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

test("la CSP lleva un nonce distinto en cada respuesta y no permite scripts sin él", async ({ request }) => {
  const [a, b] = await Promise.all([request.get("/"), request.get("/entrar")]);
  const csp = a.headers()["content-security-policy"];
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).not.toContain("'unsafe-inline' 'strict-dynamic'");
  expect(csp).toContain("frame-ancestors 'none'");
  const nonce = (h: string) => h.match(/'nonce-([^']+)'/)![1];
  expect(nonce(csp)).not.toBe(nonce(b.headers()["content-security-policy"]));
  // Todos los <script> de la página llevan el nonce (Next lo pone solo en los suyos; el JSON-LD lo lee de headers()).
  const html = await a.text();
  const scripts = html.match(/<script\b[^>]*>/g) ?? [];
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.filter((s) => !s.includes(`nonce="${nonce(csp)}"`))).toEqual([]);
});

test("sin infracciones de la CSP en las páginas públicas", async ({ page }) => {
  const violations = await watchCsp(page);
  for (const path of ["/", "/entrar", "/equipos/valorant", "/demo", "/normas"]) await visit(page, path);
  expect(violations).toEqual([]);
});

test("sin infracciones de la CSP con sesión: chat en directo, clip con reproductor, colección y avisos push", async ({ page }, info) => {
  const violations = await watchCsp(page);
  const stamp = `${info.project.name}-${Date.now()}`;
  await signIn(page, `e2e-csp-${stamp}@example.test`);
  for (const path of ["/inicio", "/buscar", "/coleccion", "/mensajes", "/notificaciones"]) await visit(page, path);
  // La sección de avisos push está en ajustes (el service worker se registra en todas las páginas).
  await visit(page, "/ajustes");
  await expect(page.locator("#push")).toBeVisible();

  // Grupo nuevo: el chat se conecta por Realtime (WebSocket a Supabase).
  await visit(page, "/grupos/nuevo");
  await page.getByLabel("TrioQ · 3 plazas").check();
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await expect(page).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
  await expect(page.getByText("En directo")).toBeVisible({ timeout: 15_000 });

  // Clip de YouTube: fachada y, al pulsar, el reproductor (iframe) y la miniatura de la luz ambiental.
  const videoId = `c${Date.now().toString(36)}`.padEnd(11, "x").slice(0, 11);
  await visit(page, "/clips/nuevo");
  await page.getByLabel("Enlace del clip").fill(`https://youtu.be/${videoId}`);
  await page.getByLabel("Título").fill(`CSP ${stamp}`);
  await page.getByLabel(/^Ace/).check();
  await page.getByRole("button", { name: "Publicar clip" }).click();
  await expect(page).toHaveURL(/\/clips\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: /Ver clip \(YouTube\)/ }).click();
  await expect(page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/"]')).toHaveCount(1);
  await page.waitForLoadState("networkidle");

  expect(violations).toEqual([]);
});
