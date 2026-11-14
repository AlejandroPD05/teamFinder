import { toSearchParams, type Filters, type SearchCatalog } from "./filters";

/**
 * Qué se guarda de una búsqueda: la URL de /buscar (sin página ni «disponibles ahora», que es momentáneo) para volver a
 * abrirla, y los filtros que comprueba la alerta (rol, rango mínimo y máximo, servidor e idioma).
 */
export function savedSearchFrom(f: Filters, catalog: SearchCatalog) {
  const id = (list: { id: string; slug: string }[], slug?: string) => (slug ? (list.find((x) => x.slug === slug)?.id ?? null) : null);
  const query = toSearchParams({ ...f, page: 1, now: false }).toString();
  return {
    query,
    role: id(catalog.roles, f.role),
    rankMin: id(catalog.ranks, f.rmin),
    rankMax: id(catalog.ranks, f.rmax),
    region: id(catalog.regions, f.region),
    language: f.lang ?? null,
    /** Filtros que no cuentan para la alerta (se avisa igualmente; al abrir la búsqueda se aplican todos). */
    alertIgnores: Boolean(f.agent || f.mode || f.slot.length || f.goal || f.voice || f.flex),
  };
}
