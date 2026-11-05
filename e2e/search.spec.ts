import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Crea un jugador objetivo directamente con la clave de servicio (solo Supabase local).
async function createTarget(name: string) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const { data: u, error } = await db.auth.admin.createUser({
    email: `target-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  const id = u.user.id;
  const one = async (table: string, slug: string) =>
    (await db.from(table).select("id").eq("game_id", "valorant").eq("slug", slug).single()).data!.id as string;
  const [rank, region, role, omen] = await Promise.all([
    one("game_ranks", "platinum-1"),
    one("game_regions", "eu"),
    one("game_roles", "controller"),
    one("game_characters", "omen"),
  ]);
  await db.from("profiles").update({ languages: ["es"], languages_visibility: "public" }).eq("id", id);
  await db.from("game_profiles").insert({
    user_id: id,
    game_id: "valorant",
    rank_id: rank,
    region_id: region,
    visibility: "public",
    mode_slugs: ["duo"],
  });
  await db.from("player_roles").insert({ user_id: id, game_id: "valorant", role_id: role, is_primary: true });
  await db.from("player_characters").insert({ user_id: id, game_id: "valorant", character_id: omen, status: "main" });
  return { id, cleanup: () => db.auth.admin.deleteUser(id) };
}

test("buscar con filtros combinados encuentra al jugador y la URL los conserva", async ({ page }, info) => {
  const name = `Buscado ${Date.now().toString(36)}`;
  const target = await createTarget(name);
  try {
    await signIn(page, `e2e-buscar-${info.project.name}-${Date.now()}@example.test`);
    await page.getByRole("link", { name: "Buscar", exact: true }).first().click();
    await expect(page).toHaveURL(/\/buscar$/);

    await page.getByLabel("Rango mínimo").selectOption({ label: "Platino 1" });
    await page.getByLabel("Rango máximo").selectOption({ label: "Platino 1" });
    await page.getByLabel("Servidor").selectOption({ label: "Europa" });
    await page.getByLabel("Rol", { exact: true }).selectOption({ label: "Controlador" });
    await page.getByLabel("Agente", { exact: true }).selectOption({ label: "Omen" });
    await page.getByLabel("Main").check();
    await page.getByLabel("Idioma").selectOption({ label: "Español" });
    await page.getByLabel("Modo").selectOption({ label: "DuoQ" });
    await page.getByRole("button", { name: "Buscar", exact: true }).click();

    await expect(page).toHaveURL(/\/buscar\?/);
    const params = new URL(page.url()).searchParams;
    expect(Object.fromEntries([...params].filter(([, v]) => v))).toMatchObject({
      rmin: "platinum-1",
      rmax: "platinum-1",
      region: "eu",
      role: "controller",
      agent: "omen",
      astatus: "main",
      mode: "duo",
      lang: "es",
    });
    const card = page.getByRole("listitem").filter({ hasText: name });
    await expect(card).toBeVisible();
    await expect(card).toContainText(/Platino 1\s*· manual/);
    await expect(card).toContainText("Omen (Main)");

    // Recargar con la URL mantiene los filtros.
    await page.reload();
    await expect(page.getByLabel("Agente", { exact: true })).toHaveValue("omen");
    await expect(card).toBeVisible();

    // Un filtro incompatible lo excluye.
    const incompatible = new URL(page.url());
    incompatible.searchParams.set("voice", "text");
    await page.goto(incompatible.toString());
    await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);

    // Estado vacío determinista (nadie tiene Radiante + gallego) con sugerencias para ampliar.
    await page.goto("/buscar?rmin=radiant&rmax=radiant&lang=gl");
    await expect(page.getByRole("heading", { name: "No hay jugadores con estos filtros" })).toBeVisible();
    await page.getByRole("link", { name: "Cualquier idioma" }).click();
    await expect(page).toHaveURL(/\/buscar\?rmin=radiant&rmax=radiant$/);

    // Perfil desde la tarjeta.
    await page.goto(`/buscar?agent=omen&astatus=main&lang=es&mode=duo`);
    await page.getByRole("link", { name: `Ver perfil de ${name}` }).click();
    await expect(page).toHaveURL(new RegExp(`/jugador/${target.id}$`));
  } finally {
    await target.cleanup();
  }
});

test("/buscar exige sesión", async ({ page }) => {
  await page.goto("/buscar?agent=omen");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fbuscar%3Fagent%3Domen/);
});

test("la búsqueda responde en menos de 2 s", async ({ page }, info) => {
  await signIn(page, `e2e-perf-${info.project.name}-${Date.now()}@example.test`);
  const start = Date.now();
  await page.goto("/buscar?rmin=gold-1&rmax=diamond-3&role=controller&lang=es");
  await expect(page.getByRole("status").filter({ hasText: /jugador/ })).toBeVisible();
  expect(Date.now() - start).toBeLessThan(2000);
});
