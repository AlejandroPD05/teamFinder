import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

async function createTrio(page: Page, note: string) {
  await page.goto("/grupos/nuevo");
  await page.getByLabel("TrioQ · 3 plazas").check();
  await page.getByLabel("Nota (opcional)").fill(note);
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await expect(page).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
  return page.url();
}

// Flujo largo: más margen que el límite por defecto cuando la máquina va cargada.
test.describe.configure({ timeout: 60_000 });

test("dos miembros chatean en tiempo real; alguien de fuera no ve la sala", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const [ownerCtx, guestCtx, outsiderCtx] = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [owner, guest, outsider] = await Promise.all([ownerCtx.newPage(), guestCtx.newPage(), outsiderCtx.newPage()]);
  try {
    await signIn(owner, `e2e-chat-owner-${stamp}@example.test`);
    const url = await createTrio(owner, `Chat ${stamp}`);

    await signIn(guest, `e2e-chat-guest-${stamp}@example.test`);
    await guest.goto(url);
    await guest.getByRole("button", { name: "Solicitar unirme" }).click();
    await expect(guest.getByText("Tu solicitud está pendiente de respuesta.")).toBeVisible();

    await owner.reload();
    await owner.getByRole("button", { name: "Aceptar" }).click();
    await expect(owner.getByText("Abierto · 2/3 plazas")).toBeVisible();

    // Los dos con la sala abierta y conectada.
    await guest.reload();
    const ownerLog = owner.getByRole("log", { name: "Mensajes del grupo" });
    const guestLog = guest.getByRole("log", { name: "Mensajes del grupo" });
    await expect(owner.getByText("En directo")).toBeVisible({ timeout: 15_000 });
    await expect(guest.getByText("En directo")).toBeVisible({ timeout: 15_000 });

    await guest.getByLabel("Escribe un mensaje").fill("Hola equipo, ¿a las 22?");
    await guest.getByRole("button", { name: "Enviar" }).click();
    await expect(guestLog).toContainText("Hola equipo, ¿a las 22?");
    await expect(ownerLog).toContainText("Hola equipo, ¿a las 22?"); // sin recargar

    await owner.getByLabel("Escribe un mensaje").press("Escape");
    await owner.getByLabel("Escribe un mensaje").fill("Perfecto, invito yo");
    await owner.getByLabel("Escribe un mensaje").press("Enter");
    await expect(guestLog).toContainText("Perfecto, invito yo");

    // Bandeja del invitado: la sala con el último mensaje.
    await guest.goto("/mensajes");
    await expect(guest.getByRole("link", { name: /TrioQ/ }).first()).toContainText("Perfecto, invito yo");

    // Sin leer: el dueño escribe con el invitado fuera de la sala.
    await owner.getByLabel("Escribe un mensaje").fill("¿Estás?");
    await owner.getByRole("button", { name: "Enviar" }).click();
    await expect(ownerLog).toContainText("¿Estás?");
    await guest.goto("/inicio");
    await expect(guest.getByRole("link", { name: /Mensajes\s*\d+ sin leer/ }).first()).toBeVisible();
    await guest.goto("/mensajes");
    await expect(guest.getByRole("link", { name: /TrioQ/ }).first()).toContainText("¿Estás?");

    // Abrir la sala la marca como leída.
    await guest.goto(url);
    await expect(guestLog).toContainText("¿Estás?");
    await expect(guest.getByText("En directo")).toBeVisible({ timeout: 15_000 });
    await guest.goto("/mensajes");
    await expect(guest.getByRole("link", { name: /sin leer/ })).toHaveCount(0);

    // Alguien de fuera ve el grupo pero no la sala.
    await signIn(outsider, `e2e-chat-out-${stamp}@example.test`);
    await outsider.goto(url);
    await expect(outsider.getByRole("button", { name: "Solicitar unirme" })).toBeVisible();
    await expect(outsider.getByRole("heading", { name: "Chat del grupo" })).toHaveCount(0);
  } finally {
    await Promise.all([ownerCtx.close(), guestCtx.close(), outsiderCtx.close()]);
  }
});

test("/mensajes sin grupos muestra un estado vacío útil", async ({ page }, info) => {
  await signIn(page, `e2e-inbox-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/mensajes");
  await expect(page.getByRole("heading", { name: "No estás en ningún grupo activo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver grupos" })).toBeVisible();
});
