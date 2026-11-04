import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

async function userIdByEmail(email: string) {
  const { data } = await db().auth.admin.listUsers({ perPage: 500 });
  return data.users.find((u) => u.email === email)!.id;
}

async function makePublic(userId: string, name: string) {
  await db().from("profiles").update({ display_name: name }).eq("id", userId);
  await db().from("game_profiles").insert({ user_id: userId, game_id: "valorant", visibility: "public" });
}

async function session(browser: Browser, email: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  await signIn(page, email);
  return { ctx, page, id: await userIdByEmail(email) };
}

test("bloquear saca al jugador de la búsqueda; desbloquear lo devuelve; denunciar perfil", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const a = await session(browser, `e2e-blk-a-${stamp}@example.test`);
  const b = await session(browser, `e2e-blk-b-${stamp}@example.test`);
  const bName = `Bloq ${Date.now().toString(36)}`;
  await makePublic(b.id, bName);
  try {
    const card = () => a.page.getByRole("listitem").filter({ hasText: bName });
    await a.page.goto("/buscar");
    await expect(card()).toBeVisible();
    await card().getByRole("link", { name: /Ver perfil/ }).click();

    await a.page.getByText("Denunciar a este jugador").click();
    await a.page.getByLabel("Motivo").selectOption("spam");
    await a.page.getByRole("button", { name: "Enviar denuncia" }).click();
    await expect(a.page.getByText("Denuncia enviada")).toBeVisible();

    await a.page.getByRole("button", { name: "Bloquear" }).click();
    await expect(a.page.getByText("Has bloqueado a este jugador")).toBeVisible();
    await a.page.goto("/buscar");
    await expect(card()).toHaveCount(0);

    await a.page.goto("/ajustes");
    const row = a.page.getByRole("listitem").filter({ hasText: bName });
    await row.getByRole("button", { name: "Desbloquear" }).click();
    await expect(a.page.getByText("No has bloqueado a nadie.")).toBeVisible();
    await a.page.goto("/buscar");
    await expect(card()).toBeVisible();
  } finally {
    await a.ctx.close();
    await b.ctx.close();
  }
});

async function closedDuo(owner: Page, guest: Page, note: string) {
  await owner.goto("/grupos/nuevo");
  await owner.getByLabel("DuoQ · 2 plazas").check();
  await owner.getByLabel("Nota (opcional)").fill(note);
  await owner.getByRole("button", { name: "Crear grupo" }).click();
  await expect(owner).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
  const url = owner.url();
  await guest.goto(url);
  await guest.getByRole("button", { name: "Solicitar unirme" }).click();
  await expect(guest.getByText("Tu solicitud está pendiente de respuesta.")).toBeVisible();
  await owner.reload();
  await owner.getByRole("button", { name: "Aceptar" }).click();
  await expect(owner.getByText("Completo · 2/2 plazas")).toBeVisible();
  return url;
}

test("karma tras cerrar el grupo y denuncia de mensaje revisada por moderación", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const owner = await session(browser, `e2e-k-own-${stamp}@example.test`);
  const guest = await session(browser, `e2e-k-gst-${stamp}@example.test`);
  const mod = await session(browser, `e2e-k-mod-${stamp}@example.test`);
  await db().from("app_admins").insert({ user_id: mod.id });
  try {
    const url = await closedDuo(owner.page, guest.page, `Karma ${stamp}`);

    // Mensaje y denuncia del mensaje.
    await guest.page.reload();
    await expect(guest.page.getByText("En directo")).toBeVisible({ timeout: 15_000 });
    await guest.page.getByLabel("Escribe un mensaje").fill(`Mensaje feo ${stamp}`);
    await guest.page.getByRole("button", { name: "Enviar" }).click();
    await owner.page.reload();
    await owner.page.getByText("Denunciar mensaje").first().click();
    await owner.page.getByLabel("Motivo").selectOption("harassment");
    await owner.page.getByRole("button", { name: "Enviar denuncia" }).click();
    await expect(owner.page.getByText("Denuncia enviada")).toBeVisible();

    // Cerrar y valorar.
    await owner.page.getByRole("button", { name: "Cerrar grupo" }).click();
    await expect(owner.page.getByText(/Cerrado · 2\/2 plazas/)).toBeVisible();
    await guest.page.goto(url);
    await guest.page.getByLabel("Positiva").check();
    await guest.page.getByLabel("Comunicativo").check();
    await guest.page.getByRole("button", { name: "Guardar valoración" }).click();
    await expect(guest.page.getByText("Ya has valorado a todos")).toBeVisible();
    await guest.page.reload();
    await expect(guest.page.getByRole("button", { name: "Guardar valoración" })).toHaveCount(0);
    await guest.page.goto(`/jugador/${owner.id}`);
    await expect(guest.page.getByText("1 valoración positiva · 0 negativas")).toBeVisible();
    await expect(guest.page.getByText("Comunicativo")).toBeVisible();

    // Moderación: solo la ve quien es admin.
    await guest.page.goto("/moderacion");
    await expect(guest.page.getByRole("heading", { name: "Moderación" })).toHaveCount(0);
    await mod.page.goto("/moderacion");
    const item = mod.page.getByRole("listitem").filter({ hasText: `Mensaje feo ${stamp}` });
    await expect(item).toBeVisible();
    await item.getByLabel("Nota de moderación (opcional)").fill("Aviso enviado");
    await item.getByRole("button", { name: "Marcar como actuada" }).click();
    await expect(mod.page.getByRole("listitem").filter({ hasText: `Mensaje feo ${stamp}` })).toHaveCount(0);
    await mod.page.reload();
    await expect(mod.page.getByRole("listitem").filter({ hasText: `Mensaje feo ${stamp}` })).toHaveCount(0);
  } finally {
    await Promise.all([owner.ctx.close(), guest.ctx.close(), mod.ctx.close()]);
  }
});

test("borrar la cuenta elimina los datos y cierra la sesión", async ({ browser }, info) => {
  const email = `e2e-del-${info.project.name}-${Date.now()}@example.test`;
  const u = await session(browser, email);
  try {
    await u.page.goto("/ajustes");
    await u.page.getByRole("button", { name: "Borrar mi cuenta" }).click();
    await expect(u.page.getByText("Escribe BORRAR para confirmar.").last()).toBeVisible();
    await u.page.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
    await u.page.getByRole("button", { name: "Borrar mi cuenta" }).click();
    await expect(u.page.getByText("Tu cuenta y tus datos se han borrado.")).toBeVisible();
    await u.page.goto("/inicio");
    await expect(u.page).toHaveURL(/\/entrar/);
    expect((await db().auth.admin.getUserById(u.id)).data.user).toBeNull();
  } finally {
    await u.ctx.close();
  }
});
