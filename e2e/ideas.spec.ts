import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { signIn, userIdByEmail } from "./helpers";

const service = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

test("ideas: sin sesión se ven y piden entrar para apoyar", async ({ page }) => {
  await page.goto("/ideas");
  await expect(page.getByRole("heading", { level: 1, name: "Ideas de la comunidad" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entra para apoyar ideas" })).toHaveAttribute("href", "/entrar?next=/ideas");
  await expect(page.getByRole("button", { name: /^Apoyar/ })).toHaveCount(0);
});

test("ideas: moderación publica, la comunidad apoya y ve el cambio de estado", async ({ page }, info) => {
  const email = `e2e-ideas-${info.project.name}-${Date.now()}@example.test`;
  const title = `Idea e2e ${info.project.name} ${Date.now()}`.slice(0, 60);
  await signIn(page, email);
  const id = await userIdByEmail(email);
  await service().from("app_admins").insert({ user_id: id });
  try {
    await page.goto("/ideas");
    await page.getByLabel("Título").first().fill(title);
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Idea publicada.")).toBeVisible();

    const pending = page.getByRole("region", { name: /^Pendientes/ });
    const vote = pending.getByRole("button", { name: new RegExp(`^Apoyar «${title}»`) });
    await expect(vote).toHaveAttribute("aria-pressed", "false");
    await vote.click();
    await expect(vote).toHaveAttribute("aria-pressed", "true");
    await expect(vote).toHaveAccessibleName(`Apoyar «${title}», 1 apoyo`);

    const card = pending.getByRole("listitem").filter({ hasText: title });
    await card.getByText("Editar").click();
    await card.getByLabel("Estado").selectOption({ label: "En desarrollo" });
    await card.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("region", { name: /^En desarrollo/ }).getByText(title)).toBeVisible();
  } finally {
    await service().from("ideas").delete().eq("title", title);
    await service().from("app_admins").delete().eq("user_id", id);
  }
});
