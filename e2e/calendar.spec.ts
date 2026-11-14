import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("un grupo con hora se añade al calendario (.ics)", async ({ page }, info) => {
  await signIn(page, `e2e-ics-${info.project.name}-${Date.now()}@example.test`);
  await page.goto("/grupos/nuevo");
  await page.getByLabel("Más tarde").check();
  // Mañana a las 21:00, hora local del navegador.
  const d = new Date(Date.now() + 24 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  await page.locator("#starts_at").fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T21:00`);
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await expect(page).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/);

  const link = page.getByRole("link", { name: "Añadir al calendario" });
  await expect(link).toBeVisible();
  const res = await page.request.get((await link.getAttribute("href"))!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/calendar");
  const ics = await res.text();
  expect(ics).toContain("BEGIN:VEVENT");
  expect(ics).toMatch(/SUMMARY:.+VALORANT/);
});

test("el calendario de un grupo exige sesión", async ({ request }) => {
  const res = await request.get("/grupos/00000000-0000-4000-8000-000000000000/calendario", { maxRedirects: 0 });
  expect([307, 401]).toContain(res.status());
});
