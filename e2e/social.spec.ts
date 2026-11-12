import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { signIn, userIdByEmail } from "./helpers";

const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

// PNG mínimo válido (1×1) para la subida de fanart.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("mensajes privados en tiempo real, redes en el perfil y notificación de solicitud", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now()}`;
  const [aCtx, bCtx] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, b] = await Promise.all([aCtx.newPage(), bCtx.newPage()]);
  try {
    const bEmail = `e2e-dm-b-${stamp}@example.test`;
    await signIn(a, `e2e-dm-a-${stamp}@example.test`);
    await signIn(b, bEmail);
    const bId = await userIdByEmail(bEmail);

    // B pone su Twitch en el perfil; A lo ve como enlace.
    await b.goto("/perfil/editar");
    await b.getByLabel("Twitch").fill("@jugadora_e2e");
    await b.getByRole("button", { name: "Guardar perfil" }).click();
    await expect(b.getByText("Perfil guardado.")).toBeVisible();

    await a.goto(`/jugador/${bId}`);
    await expect(a.getByRole("link", { name: /Twitch: jugadora_e2e/ })).toHaveAttribute("href", "https://www.twitch.tv/jugadora_e2e");

    // A abre conversación con B y escribe.
    await a.getByRole("button", { name: "Enviar mensaje" }).click();
    await expect(a).toHaveURL(/\/mensajes\/[0-9a-f-]{36}$/);
    const convUrl = a.url();
    await expect(a.getByText("En directo")).toBeVisible({ timeout: 15_000 });
    await a.getByLabel("Escribe un mensaje").fill("¿Te vienes a una ranked?");
    await a.getByRole("button", { name: "Enviar" }).click();
    await expect(a.getByRole("log", { name: "Mensajes" })).toContainText("¿Te vienes a una ranked?");

    // B lo ve en su bandeja como no leído, entra y contesta; A lo recibe sin recargar.
    await b.goto("/mensajes");
    const row = b.getByRole("link", { name: /¿Te vienes a una ranked\?/ });
    await expect(row).toContainText("1 sin leer");
    await row.click();
    await expect(b).toHaveURL(convUrl);
    await expect(b.getByText("En directo")).toBeVisible({ timeout: 15_000 });
    await b.getByLabel("Escribe un mensaje").fill("¡Vamos!");
    await b.getByRole("button", { name: "Enviar" }).click();
    await expect(a.getByRole("log", { name: "Mensajes" })).toContainText("¡Vamos!", { timeout: 15_000 });

    // Notificación: B pide unirse a un grupo de A.
    await a.goto("/grupos/nuevo");
    await a.getByLabel("TrioQ · 3 plazas").check();
    await a.getByRole("button", { name: "Crear grupo" }).click();
    await expect(a).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);
    await b.goto(a.url());
    await b.getByRole("button", { name: "Solicitar unirme" }).click();
    await expect(b.getByText("Tu solicitud está pendiente de respuesta.")).toBeVisible();

    await a.goto("/inicio");
    await a.getByRole("link", { name: "Notificaciones, 1 sin leer" }).click();
    await expect(a.getByRole("link", { name: /quiere unirse a tu grupo/ })).toBeVisible();
    await a.getByRole("button", { name: "Marcar todas como leídas" }).click();
    await expect(a.getByText("Todo leído.")).toBeVisible();
    await expect(a.getByRole("link", { name: "Notificaciones", exact: true })).toBeVisible();
  } finally {
    await Promise.all([aCtx.close(), bCtx.close()]);
  }
});

test("enviar fanart y verlo pendiente; una restricción se avisa en el inicio", async ({ page }, info) => {
  const email = `e2e-fanart-${info.project.name}-${Date.now()}@example.test`;
  await signIn(page, email);
  await page.goto("/coleccion");
  await page.getByRole("link", { name: "Enviar tu fanart" }).click();
  await expect(page).toHaveURL(/\/coleccion\/fanart$/);

  await page.getByLabel("Título de la obra").fill("Jett al amanecer");
  await page.getByLabel("Nombre artístico (aparece en la carta)").fill("Ana Dibuja");
  await page.getByLabel(/^Imagen/).setInputFiles({ name: "obra.png", mimeType: "image/png", buffer: PNG_1X1 });
  // Sin aceptar el permiso no se envía.
  await page.getByRole("button", { name: "Enviar fanart" }).click();
  await expect(page.getByText("Tienes que aceptar el permiso para enviarla.")).toBeVisible();
  await page.getByRole("checkbox", { name: /Declaro que soy el autor/ }).check();
  await page.getByRole("button", { name: "Enviar fanart" }).click();
  await expect(page.getByText("¡Gracias! Moderación la revisará y te avisaremos.")).toBeVisible();
  await expect(page.getByText(/Pendiente de revisión/)).toBeVisible();

  // Restricción aplicada por moderación (aquí con la clave de servicio): aviso en el inicio y en la campana.
  const id = await userIdByEmail(email);
  const until = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const { error } = await service().from("user_restrictions").insert({ user_id: id, until, reason: "Prueba e2e" });
  expect(error).toBeNull();
  await page.goto("/inicio");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Tu cuenta está restringida hasta el");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Motivo: Prueba e2e");
  await page.getByRole("link", { name: /^Notificaciones, \d+ sin leer$/ }).click();
  await expect(page.getByText("Tu cuenta está restringida temporalmente")).toBeVisible();

  // Y no puede publicar fanart mientras dure.
  await page.goto("/coleccion/fanart");
  await page.getByLabel("Título de la obra").fill("Otra obra");
  await page.getByLabel("Nombre artístico (aparece en la carta)").fill("Ana Dibuja");
  await page.getByLabel(/^Imagen/).setInputFiles({ name: "obra2.png", mimeType: "image/png", buffer: PNG_1X1 });
  await page.getByRole("checkbox", { name: /Declaro que soy el autor/ }).check();
  await page.getByRole("button", { name: "Enviar fanart" }).click();
  await expect(page.getByText(/Tu cuenta está restringida temporalmente/).first()).toBeVisible();
});
