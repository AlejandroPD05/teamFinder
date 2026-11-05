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
