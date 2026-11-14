// Comprobación rápida de producción tras cada despliegue (sin iniciar sesión): espera a que la web sirva el commit
// recién fusionado y revisa las páginas públicas clave, las cabeceras de seguridad y que las privadas pidan entrar.
// Variables: SITE_URL, EXPECTED_SHA (opcional: si falta o la web no lo dice, se comprueba lo que haya).
const site = (process.env.SITE_URL ?? "https://teamfinder-seven.vercel.app").replace(/\/$/, "");
const expected = process.env.EXPECTED_SHA ?? "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (expected) {
  let live = null;
  for (let i = 0; i < 40; i++) {
    live = await fetch(`${site}/api/version`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (live?.commit === expected) break;
    if (live && live.commit === null) break; // Vercel no expone el commit: se comprueba sin esperar más.
    await sleep(30_000);
  }
  console.log(live?.commit === expected ? `Producción ya sirve ${expected.slice(0, 7)}.` : `Producción sirve ${live?.commit ?? "?"}; se comprueba igualmente.`);
}

const PAGES = ["/", "/entrar", "/equipos/valorant", "/equipos/valorant/controller", "/ideas", "/novedades", "/normas", "/privacidad", "/demo"];
const FILES = [
  ["/robots.txt", "text/plain"],
  ["/sitemap.xml", "application/xml"],
  ["/manifest.webmanifest", "application/manifest+json"],
  ["/equipos/valorant/controller/opengraph-image", "image/png"],
];
const PRIVATE = ["/buscar", "/grupos", "/inicio", "/moderacion"];

const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
};

for (const path of PAGES) {
  const res = await fetch(site + path, { redirect: "manual" });
  check(res.status === 200, `${path}: ${res.status}`);
  const csp = res.headers.get("content-security-policy") ?? "";
  check(/script-src[^;]*'nonce-/.test(csp), `${path}: sin CSP con nonce`);
  const html = await res.text();
  check(html.includes("<h1"), `${path}: sin título principal`);
}
for (const [path, type] of FILES) {
  const res = await fetch(site + path);
  check(res.status === 200 && (res.headers.get("content-type") ?? "").startsWith(type), `${path}: ${res.status} ${res.headers.get("content-type")}`);
}
for (const path of PRIVATE) {
  const res = await fetch(site + path, { redirect: "manual" });
  const to = res.headers.get("location") ?? "";
  check(res.status >= 300 && res.status < 400 && to.includes("/entrar"), `${path}: debería pedir entrar (${res.status} ${to})`);
}

if (failures.length) {
  console.error(`Fallos en producción:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Producción bien: ${PAGES.length + FILES.length + PRIVATE.length} comprobaciones.`);
