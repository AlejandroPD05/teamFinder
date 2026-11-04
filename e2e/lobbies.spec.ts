import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("crear grupo → solicitar → aceptar → completo → cerrar", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const note = `Buscamos smoker ${stamp}`;

  const ownerCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  const guest = await guestCtx.newPage();
  owner.on("dialog", (d) => d.accept());
  guest.on("dialog", (d) => d.accept());

  try {
    // El creador publica un DuoQ que busca Controlador.
    await signIn(owner, `e2e-owner-${stamp}@example.test`);
    await owner.goto("/grupos/nuevo");
    await owner.getByLabel("DuoQ · 2 plazas").check();
    await owner.getByLabel("Controlador").check();
    await owner.getByLabel("Idioma").selectOption({ label: "Español" });
    await owner.getByLabel("Nota (opcional)").fill(note);
    await owner.getByRole("button", { name: "Crear grupo" }).click();
    await expect(owner).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
    await expect(owner.getByText("Abierto · 1/2 plazas")).toBeVisible();
    await expect(owner.getByText("Aún no hay solicitudes.")).toBeVisible();
    await expect(owner.getByRole("link", { name: "Buscar Controlador" })).toHaveAttribute("href", /role=controller/);
    const lobbyUrl = owner.url();

    // El invitado lo encuentra filtrando por rol y solicita unirse.
    await signIn(guest, `e2e-guest-${stamp}@example.test`);
    await guest.goto("/grupos?role=controller&lang=es");
    const card = guest.getByRole("listitem").filter({ hasText: note });
    await expect(card).toContainText("1/2 plazas");
    await card.getByRole("link", { name: /Ver grupo/ }).click();
    await expect(guest).toHaveURL(lobbyUrl);
    await guest.getByLabel("Mensaje para el grupo (opcional)").fill("Juego Omen, Oro 2");
    await guest.getByRole("button", { name: "Solicitar unirme" }).click();
    await expect(guest.getByText("Tu solicitud está pendiente de respuesta.")).toBeVisible();
    await guest.reload();
    await expect(guest.getByRole("button", { name: "Retirar solicitud" })).toBeVisible();

    // El creador la ve y la acepta: el grupo queda completo.
    await owner.reload();
    await expect(owner.getByText("«Juego Omen, Oro 2»")).toBeVisible();
    await owner.getByRole("button", { name: "Aceptar" }).click();
    await expect(owner.getByText("Completo · 2/2 plazas")).toBeVisible();
    await owner.reload();
    await expect(owner.getByText("Solicitudes pendientes (0)")).toBeVisible();

    // El invitado ya es miembro; el grupo completo desaparece de la lista de abiertos.
    await guest.reload();
    await expect(guest.getByRole("button", { name: "Salir del grupo" })).toBeVisible();
    await expect(guest.getByRole("heading", { name: "Chat del grupo" })).toBeVisible();
    await guest.goto("/grupos?role=controller&lang=es");
    await expect(guest.getByRole("listitem").filter({ hasText: note })).toHaveCount(0);

    // Cerrar.
    await owner.getByRole("button", { name: "Cerrar grupo" }).click();
    await expect(owner.getByText(/Cerrado · 2\/2 plazas/)).toBeVisible();
    await expect(owner.getByRole("button", { name: "Cerrar grupo" })).toHaveCount(0);
  } finally {
    await ownerCtx.close();
    await guestCtx.close();
  }
});

test("crear grupo para más tarde exige fecha", async ({ page }, info) => {
  await signIn(page, `e2e-later-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/grupos/nuevo");
  await page.getByLabel("Más tarde").check();
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await expect(page.getByText("Indica fecha y hora.")).toBeVisible();
  await expect(page).toHaveURL(/\/grupos\/nuevo$/);
});

test("/grupos exige sesión", async ({ page }) => {
  await page.goto("/grupos");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fgrupos/);
});
