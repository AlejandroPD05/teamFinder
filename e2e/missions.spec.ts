import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { pickGame, signIn, userIdByEmail } from "./helpers";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});

async function audit(page: import("@playwright/test").Page, path: string) {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(result.violations.map((v) => v.id), path).toEqual([]);
}

test("misiones y colección: progreso, cartas bloqueadas y conseguidas", async ({ page }, info) => {
  const email = `e2e-misiones-${info.project.name}-${Date.now()}@example.test`;
  await signIn(page, email);

  // Acceso desde el inicio.
  await page.getByRole("link", { name: /^Misiones/ }).click();
  await expect(page).toHaveURL(/\/misiones$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Misiones de VALORANT");
  await expect(page.getByText("0 de 10 grupos")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByRole("button", { name: "Reclamar carta" })).toBeDisabled();
  await audit(page, "/misiones");

  // Colección vacía: todas bloqueadas.
  await page.getByRole("link", { name: /Colección: 0 de/ }).click();
  await expect(page).toHaveURL(/\/coleccion$/);
  await expect(page.getByText(/Tienes 0 de \d+ cartas/)).toBeVisible();
  await expect(page.getByText("· bloqueada").first()).toBeVisible();
  await audit(page, "/coleccion");

  // Con una carta conseguida (se da desde el servidor para no tener que llenar 10 grupos), se ve su arte.
  const userId = await userIdByEmail(email);
  const { data: card } = await db.from("collectible_cards").select("id, name").eq("game_id", "valorant").eq("slug", "jett").single();
  await db.from("user_cards").insert({ user_id: userId, card_id: card!.id });
  await page.reload();
  await expect(page.getByText(/Tienes 1 de \d+ cartas/)).toBeVisible();
  const jett = page.locator("figure").filter({ hasText: "Jett" });
  await expect(jett.locator("img")).toBeVisible();
  await expect(jett).not.toContainText("bloqueada");

  // CS2 aún no tiene cartas ni misiones: lo dice con claridad.
  await pickGame(page, "cs2");
  await page.goto("/coleccion");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Colección de Counter-Strike 2");
  await expect(page.getByText("Aún no hay cartas de Counter-Strike 2.")).toBeVisible();
  await page.goto("/misiones");
  await expect(page.getByText(/Aún no hay misiones de Counter-Strike 2/)).toBeVisible();
});
