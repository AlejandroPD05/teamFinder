import { expect, test } from "@playwright/test";
import { signIn, userIdByEmail } from "./helpers";

test("partidas a mano: se apuntan, se resumen y se borran", async ({ page }, info) => {
  await signIn(page, `e2e-partidas-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/perfil/partidas");
  await expect(page.getByRole("heading", { level: 1, name: "Mis partidas" })).toBeVisible();
  await expect(page.getByText("introducidos manualmente", { exact: false }).first()).toBeVisible();

  await page.getByLabel("Mapa").fill("Ascent");
  await page.getByLabel("Resultado").selectOption({ label: "Victoria" });
  await page.getByLabel("Bajas").fill("21");
  await page.getByLabel("Muertes").fill("14");
  await page.getByRole("button", { name: "Apuntar partida" }).click();
  await expect(page.getByText("Partida apuntada.")).toBeVisible();
  await expect(page.getByText(/1 partida · 100% de victorias · K\/D 1,5/)).toBeVisible();

  // Fecha futura: se rechaza con su mensaje.
  const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Fecha").fill(tomorrow);
  await page.getByRole("button", { name: "Apuntar partida" }).click();
  await expect(page.getByText("La fecha no puede ser futura.")).toBeVisible();

  await page.getByRole("button", { name: /^Borrar la partida/ }).click();
  await expect(page.getByText("Aún no has apuntado ninguna partida.")).toBeVisible();
});

test("equipos: crear, invitar desde el perfil, aceptar y chatear en tiempo real", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const [aCtx, bCtx] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = await Promise.all([aCtx.newPage(), bCtx.newPage()]);
  try {
    const bEmail = `e2e-team-b-${stamp}@example.test`;
    await signIn(a, `e2e-team-a-${stamp}@example.test`);
    await signIn(b, bEmail);
    const bId = await userIdByEmail(bEmail);

    await a.getByRole("link", { name: /Mis equipos/ }).click();
    await a.getByLabel("Nombre del equipo").fill(`Equipo ${stamp}`.slice(0, 32));
    await a.getByRole("button", { name: "Crear equipo" }).click();
    await expect(a).toHaveURL(/\/equipo\/[0-9a-f-]{36}$/);
    const teamUrl = a.url();

    await a.goto(`/jugador/${bId}`);
    await a.getByRole("button", { name: "Invitar", exact: true }).click();
    await expect(a.getByText("Invitación enviada.")).toBeVisible();

    await b.goto("/mis-equipos");
    await b.getByRole("button", { name: /^Aceptar la invitación/ }).click();
    // Al aceptar, te lleva al equipo.
    await expect(b).toHaveURL(teamUrl);
    await expect(b.getByRole("log", { name: "Mensajes del equipo" })).toBeVisible();

    await a.goto(teamUrl);
    await expect(a.getByText("En directo")).toBeVisible({ timeout: 15_000 });
    await expect(b.getByText("En directo")).toBeVisible({ timeout: 15_000 });
    await b.getByLabel("Escribe un mensaje").fill("¿Ranked esta noche?");
    await b.getByRole("button", { name: "Enviar" }).click();
    await expect(a.getByRole("log", { name: "Mensajes del equipo" })).toContainText("¿Ranked esta noche?", { timeout: 15_000 });
  } finally {
    await Promise.all([aCtx.close(), bCtx.close()]);
  }
});

test("avisos por correo: vienen apagados y se activan en Ajustes", async ({ page }, info) => {
  await signIn(page, `e2e-correo-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/ajustes");
  await expect(page.getByText("Ahora mismo: desactivados.")).toBeVisible();
  await page.getByRole("button", { name: "Activar avisos por correo" }).click();
  await expect(page.getByText("Ahora mismo: activados.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Desactivar avisos por correo" })).toBeVisible();
});
