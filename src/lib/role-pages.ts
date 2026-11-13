// Páginas públicas por juego y rol (/equipos/<juego>/<rol>): rutas, enlace a la búsqueda y migas de pan.
// Funciones puras: los roles vienen del catálogo (game_roles), nunca escritos aquí.

export function gamePagePath(game: string): string {
  return `/equipos/${game}`;
}

export function rolePagePath(game: string, role: string): string {
  return `/equipos/${game}/${role}`;
}

/** Búsqueda con el rol ya elegido; sin sesión, primero se entra y luego se vuelve a esa búsqueda. */
export function roleSearchHref(role: string, signedIn: boolean): string {
  const search = `/buscar?${new URLSearchParams({ role })}`;
  return signedIn ? search : `/entrar?next=${encodeURIComponent(search)}`;
}

/** Los demás roles del juego, en el orden del catálogo. */
export function siblingRoles<R extends { slug: string }>(roles: R[], current: string): R[] {
  return roles.filter((r) => r.slug !== current);
}

/** Datos estructurados schema.org BreadcrumbList (portada → juego → rol) con URLs absolutas. */
export function breadcrumbJsonLd(base: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.path === "/" ? `${base}/` : `${base}${item.path}`,
    })),
  };
}

/** JSON dentro de <script>: sin `<` literal, así ningún texto puede cerrar la etiqueta. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
