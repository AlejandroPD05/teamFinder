import { expect, test } from "@playwright/test";
import { latestMagicLink, signIn, userIdByEmail } from "./helpers";

test("bienvenida: una cuenta nueva elige juego, rol y rango y llega al inicio", async ({ page }, info) => {
  const email = `e2e-bienvenida-${info.project.name}-${Date.now()}@example.test`;
  await page.goto("/entrar");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Enlace enviado");
  await page.goto(await latestMagicLink(email));
  await expect(page).toHaveURL(/\/bienvenida$/);
  await expect(page.getByText("Bienvenida · paso 1 de 3")).toBeVisible();

  await page.getByRole("button", { name: "CS2" }).click();
  await expect(page).toHaveURL(/paso=2$/);
  await page.getByLabel("AWPer").first().check();
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page).toHaveURL(/paso=3$/);
  await page.getByLabel("Tu nombre visible").fill("Nuevo E2E");
  await page.getByRole("button", { name: "Terminar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nuevo E2E");
  // Ya no vuelve a salir.
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/inicio$/);
});

test("disponible ahora: me marco, aparezco en la búsqueda filtrada y me desmarco", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const [aCtx, bCtx] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = await Promise.all([aCtx.newPage(), bCtx.newPage()]);
  try {
    await signIn(a, `e2e-ahora-a-${stamp}@example.test`);
    await signIn(b, `e2e-ahora-b-${stamp}@example.test`);
    // Hace falta perfil de juego visible para aparecer.
    await a.goto("/perfil/editar");
    await a.getByLabel("Nombre visible").fill(`Disponible ${stamp}`.slice(0, 32));
    await a.getByRole("button", { name: "Guardar perfil" }).click();
    await expect(a.getByText("Perfil guardado.")).toBeVisible();

    await a.goto("/inicio");
    await a.getByRole("button", { name: "2 horas" }).click();
    await expect(a.getByRole("heading", { name: "Estás disponible" })).toBeVisible();

    await b.goto("/buscar?now=1");
    const card = b.getByRole("listitem").filter({ hasText: `Disponible ${stamp}`.slice(0, 32) });
    await expect(card).toContainText("Disponible ahora");

    await a.getByRole("button", { name: "Ya no estoy disponible" }).click();
    await expect(a.getByRole("heading", { name: /Juegas a .* ahora/ })).toBeVisible();
    await b.reload();
    await expect(card).toHaveCount(0);
  } finally {
    await Promise.all([aCtx.close(), bCtx.close()]);
  }
});

test("compartir un grupo: enlace público con resumen y tarjeta para Discord", async ({ page, browser }, info) => {
  await signIn(page, `e2e-compartir-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/grupos/nuevo");
  await page.getByLabel("TrioQ · 3 plazas").check();
  await page.getByLabel("Nota (opcional)").fill("Buscamos buen rollo");
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await expect(page).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop();

  await page.getByRole("button", { name: "Crear enlace para compartir" }).click();
  await expect(page.getByLabel("Enlace para compartir")).toHaveValue(new RegExp(`/unete/${id}$`));

  // Sin sesión: se ve el resumen y la vista previa, y para unirse hay que entrar.
  const anon = await browser.newContext();
  const p = await anon.newPage();
  await p.goto(`/unete/${id}`);
  await expect(p.getByRole("heading", { level: 1, name: "TrioQ" })).toBeVisible();
  await expect(p.getByText("2 plazas libres de 3")).toBeVisible();
  await expect(p.getByText("«Buscamos buen rollo»")).toBeVisible();
  await expect(p.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  await p.getByRole("link", { name: "Entrar y pedir unirme" }).click();
  await expect(p).toHaveURL(/\/entrar\?next=/);
  await anon.close();
});

test("quedadas: proponer, responder y crear el grupo con los que van", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const [aCtx, bCtx] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = await Promise.all([aCtx.newPage(), bCtx.newPage()]);
  try {
    const bEmail = `e2e-quedada-b-${stamp}@example.test`;
    await signIn(a, `e2e-quedada-a-${stamp}@example.test`);
    await signIn(b, bEmail);
    const bId = await userIdByEmail(bEmail);
    await a.goto("/mis-equipos");
    await a.getByLabel("Nombre del equipo").fill(`Q ${stamp}`.slice(0, 32));
    await a.getByRole("button", { name: "Crear equipo" }).click();
    await expect(a).toHaveURL(/\/equipo\/[0-9a-f-]{36}$/);
    const teamUrl = a.url();
    await a.goto(`/jugador/${bId}`);
    await a.getByRole("button", { name: "Invitar", exact: true }).click();
    await expect(a.getByText("Invitación enviada.")).toBeVisible();
    await b.goto("/mis-equipos");
    await b.getByRole("button", { name: /^Aceptar la invitación/ }).click();
    await expect(b).toHaveURL(teamUrl);

    await a.goto(teamUrl);
    const soon = new Date(Date.now() + 3 * 3_600_000);
    const local = new Date(soon.getTime() - soon.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    await a.getByLabel("Día y hora").fill(local);
    await a.getByLabel("Nota (opcional)").last().fill("Ranked");
    await a.getByRole("button", { name: "Proponer quedada" }).click();
    await expect(a.getByText("Quedada propuesta. Se ha avisado al equipo.")).toBeVisible();

    await b.goto(teamUrl);
    await b.getByRole("button", { name: "Voy" }).click();
    await expect(b.getByText(/2 van/)).toBeVisible();

    await a.reload();
    await a.getByLabel("Modo del grupo").selectOption({ label: "DuoQ" });
    await a.getByRole("button", { name: "Crear grupo con los que van" }).click();
    await expect(a).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
    await expect(a.getByText("Completo · 2/2 plazas")).toBeVisible();
  } finally {
    await Promise.all([aCtx.close(), bCtx.close()]);
  }
});

test("la web se puede instalar: manifiesto, iconos y service worker", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "TeamFinder", display: "standalone", start_url: "/inicio" });
  for (const icon of manifest.icons) {
    const res = await request.get(icon.src);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(await sw.text()).toContain('addEventListener("push"');
  // El envío de push solo acepta llamadas con el secreto (sin configurar en local: no disponible).
  expect([401, 503]).toContain((await request.post("/api/push", { data: {} })).status());
});
