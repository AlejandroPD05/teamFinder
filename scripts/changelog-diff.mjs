// Novedades nuevas entre dos versiones de src/lib/changelog.ts (para anunciarlas en Discord sin repetir las viejas).
// Se lee el texto del archivo, sin ejecutarlo: solo las cadenas `es: "..."` de cada novedad.

/** Textos en español de las novedades de un changelog.ts, en orden. */
export function changelogItems(source) {
  const items = [];
  for (const m of source.matchAll(/\bes:\s*"((?:[^"\\]|\\.)*)"/g)) items.push(JSON.parse(`"${m[1]}"`));
  return items;
}

/** Las que están en `after` y no estaban en `before` (un texto retocado cuenta como nuevo). */
export function newItems(before, after) {
  const old = new Set(changelogItems(before));
  return changelogItems(after).filter((i) => !old.has(i));
}

/** Mensaje para Discord: como mucho 10 novedades y el enlace; sin menciones y dentro del límite de 2000 caracteres. */
export function discordMessage(items, siteUrl) {
  const shown = items.slice(0, 10).map((i) => `• ${i}`);
  const more = items.length > 10 ? [`…y ${items.length - 10} más.`] : [];
  const text = ["**Novedades en TeamFinder**", ...shown, ...more, `${siteUrl}/novedades`].join("\n");
  return text.length <= 1900 ? text : `${text.slice(0, 1850)}…\n${siteUrl}/novedades`;
}

/** Fragmento corto y sin caracteres que el HTML escapa, para comprobar que la web ya muestra la novedad. */
export function probe(item) {
  return item.replace(/[&<>"']/g, " ").split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
}
