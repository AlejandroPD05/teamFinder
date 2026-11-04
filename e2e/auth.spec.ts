import { expect, test } from "@playwright/test";

// Mailpit de Supabase local captura los correos (no se envían de verdad).
const MAILPIT = "http://127.0.0.1:54324";

async function latestMagicLink(email: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    if (messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as {
        Text: string;
      };
      const link = msg.Text.match(/https?:\/\/\S+/)?.[0];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó el correo a ${email}`);
}

test("una ruta privada sin sesión redirige a /entrar", async ({ page }) => {
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/entrar\?next=%2Finicio/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Entrar");
});

test("correo inválido muestra error accesible", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Correo electrónico").fill("no-es-correo");
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("correo válido");
});

test("login real con enlace por correo, sesión y salida", async ({ page }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.test`;
  await page.goto("/entrar");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByRole("main").getByRole("status")).toContainText("Enlace enviado");

  await page.goto(await latestMagicLink(email));
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hola, Jugador");
  await expect(page.getByText("integración pendiente")).toBeVisible();

  // Con sesión, /entrar lleva al inicio.
  await page.goto("/entrar");
  await expect(page).toHaveURL(/\/inicio$/);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/entrar/);
});
