// Anuncia en Discord (#novedades-web) las novedades nuevas de src/lib/changelog.ts al llegar a main.
// Lo lanza .github/workflows/announce-news.yml. Espera a que la web de producción ya las muestre (Vercel tarda unos
// minutos en desplegar) para que el enlace no lleve a la versión anterior.
// Variables: DISCORD_NEWS_WEBHOOK (secreto; sin él no hace nada), SITE_URL, BEFORE_SHA (commit anterior del push).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { discordMessage, newItems, probe } from "./changelog-diff.mjs";

const FILE = "src/lib/changelog.ts";
const hook = process.env.DISCORD_NEWS_WEBHOOK ?? "";
const site = (process.env.SITE_URL ?? "https://teamfinder-seven.vercel.app").replace(/\/$/, "");
const before = process.env.BEFORE_SHA ?? "";

if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/.test(hook)) {
  console.log("Sin DISCORD_NEWS_WEBHOOK válido: no se anuncia nada.");
  process.exit(0);
}

let previous = "";
try {
  previous = execFileSync("git", ["show", `${before}:${FILE}`], { encoding: "utf8" });
} catch {
  console.log("No se pudo leer la versión anterior del changelog: no se anuncia nada para no repetir novedades.");
  process.exit(0);
}
const items = newItems(previous, readFileSync(FILE, "utf8"));
if (items.length === 0) {
  console.log("Sin novedades nuevas.");
  process.exit(0);
}

// Hasta 15 minutos esperando a que /novedades muestre la primera novedad nueva.
const needle = probe(items[0]);
for (let i = 0; i < 30; i++) {
  const html = await fetch(`${site}/novedades`, { cache: "no-store" }).then((r) => r.text()).catch(() => "");
  if (html.includes(needle)) break;
  if (i === 29) console.log("La web aún no muestra la novedad; se anuncia igualmente.");
  else await new Promise((r) => setTimeout(r, 30_000));
}

const res = await fetch(hook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: discordMessage(items, site), allowed_mentions: { parse: [] } }),
});
if (!res.ok) {
  console.error(`Discord respondió ${res.status}.`);
  process.exit(1);
}
console.log(`Anunciadas ${items.length} novedades.`);
