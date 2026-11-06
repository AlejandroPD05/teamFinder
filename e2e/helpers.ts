import { expect, type Page } from "@playwright/test";

// Mailpit de Supabase local captura los correos (no se envían de verdad).
const MAILPIT = "http://127.0.0.1:54324";

export async function latestMagicLink(email: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    if (messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { Text: string };
      const link = msg.Text.match(/https?:\/\/\S+/)?.[0];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó el correo a ${email}`);
}

/** Inicia sesión con enlace por correo y deja la página en /inicio. */
export async function signIn(page: Page, email: string) {
  await page.goto("/entrar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Enlace enviado");
  await page.goto(await latestMagicLink(email));
  await expect(page).toHaveURL(/\/inicio$/);
}

/** Id de un usuario por correo (pagina: en local puede haber miles de usuarios de demo). */
export async function userIdByEmail(email: string): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  for (let page = 1; page <= 200; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 100 });
    const u = data.users.find((x) => x.email === email);
    if (u) return u.id;
    if (data.users.length === 0) break;
  }
  throw new Error(`Usuario no encontrado: ${email}`);
}

const SHORT_NAMES = { valorant: "VALORANT", cs2: "CS2", apex: "APEX" } as const;
export type GameId = keyof typeof SHORT_NAMES;

/** Recuadro del juego en el selector de la portada (su nombre accesible incluye el contador de jugadores). */
export function gameTile(page: Page, id: GameId) {
  return page.getByRole("button", { name: new RegExp(`^${SHORT_NAMES[id]}\\b`) });
}

/** Elige juego desde la portada (el selector solo está allí) y espera a que la web cambie. */
export async function pickGame(page: Page, id: GameId) {
  if (new URL(page.url()).pathname !== "/") {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  }
  // El color y el recuadro cambian al instante; se espera a que la acción guarde la elección en el servidor.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/");
  await gameTile(page, id).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-game", id);
  await expect(gameTile(page, id)).toHaveAttribute("aria-pressed", "true");
}
