import type { AppLocale } from "@/lib/i18n/locale";
import { translator } from "@/lib/i18n/translator";
import { AVAILABILITY, CHARACTER_STATUS, GOALS, LANGUAGES, VOICE } from "@/lib/profile/options";

// Filtros de búsqueda: viven en la URL (compartibles) con slugs legibles.
// Valores desconocidos se descartan en silencio: una URL vieja o manipulada nunca rompe la página.

export const PAGE_SIZE = 20;

export type Filters = {
  rmin?: string; // slug de rango
  rmax?: string;
  region?: string;
  role?: string;
  agent?: string;
  astatus?: (keyof typeof CHARACTER_STATUS)[]; // vacío = cualquier estado
  mode?: string;
  lang?: string;
  slot: (keyof typeof AVAILABILITY)[];
  goal?: string;
  voice?: string;
  flex: boolean;
  /** Solo quien se ha marcado «disponible ahora». */
  now: boolean;
  page: number;
};

export type SearchCatalog = {
  ranks: { id: string; slug: string; tier: number }[];
  regions: { id: string; slug: string }[];
  roles: { id: string; slug: string }[];
  characters: { id: string; slug: string }[];
  modes: { slug: string }[];
};

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const many = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const inDict = (d: Record<string, string>, v?: string) => (v && v in d ? v : undefined);

export function parseFilters(params: Params, catalog: SearchCatalog): Filters {
  const slugIn = (list: { slug: string }[], v?: string) => (v && list.some((x) => x.slug === v) ? v : undefined);
  const page = Number.parseInt(one(params.page) ?? "1", 10);
  return {
    rmin: slugIn(catalog.ranks, one(params.rmin)),
    rmax: slugIn(catalog.ranks, one(params.rmax)),
    region: slugIn(catalog.regions, one(params.region)),
    role: slugIn(catalog.roles, one(params.role)),
    agent: slugIn(catalog.characters, one(params.agent)),
    astatus: [...new Set(many(params.astatus))].filter((s): s is keyof typeof CHARACTER_STATUS => s in CHARACTER_STATUS),
    mode: slugIn(catalog.modes, one(params.mode)),
    lang: inDict(LANGUAGES, one(params.lang)),
    slot: [...new Set(many(params.slot))].filter((s): s is keyof typeof AVAILABILITY => s in AVAILABILITY),
    goal: inDict(GOALS, one(params.goal)),
    voice: inDict(VOICE, one(params.voice)),
    flex: one(params.flex) === "1",
    now: one(params.now) === "1",
    page: Number.isFinite(page) && page >= 1 && page <= 500 ? page : 1,
  };
}

/** URL canónica de unos filtros (sin valores vacíos). `page` 1 se omite. */
export function toSearchParams(f: Filters): URLSearchParams {
  const sp = new URLSearchParams();
  const set = (k: string, v?: string) => v && sp.set(k, v);
  set("rmin", f.rmin);
  set("rmax", f.rmax);
  set("region", f.region);
  set("role", f.role);
  set("agent", f.agent);
  if (f.agent) f.astatus?.forEach((s) => sp.append("astatus", s));
  set("mode", f.mode);
  set("lang", f.lang);
  f.slot.forEach((s) => sp.append("slot", s));
  set("goal", f.goal);
  set("voice", f.voice);
  if (f.flex) sp.set("flex", "1");
  if (f.now) sp.set("now", "1");
  if (f.page > 1) sp.set("page", String(f.page));
  return sp;
}

export type Condition =
  | { op: "gte" | "lte" | "eq"; column: string; value: string | number | boolean }
  | { op: "contains" | "overlaps"; column: string; value: string[] };

/** Traduce filtros a condiciones sobre la vista `player_search`. */
export function toConditions(f: Filters, catalog: SearchCatalog): Condition[] {
  const c: Condition[] = [];
  const tier = (slug?: string) => catalog.ranks.find((r) => r.slug === slug)?.tier;
  let lo = tier(f.rmin);
  let hi = tier(f.rmax);
  if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
  if (lo != null) c.push({ op: "gte", column: "rank_tier", value: lo });
  if (hi != null) c.push({ op: "lte", column: "rank_tier", value: hi });

  const region = catalog.regions.find((r) => r.slug === f.region);
  if (region) c.push({ op: "eq", column: "region_id", value: region.id });
  const role = catalog.roles.find((r) => r.slug === f.role);
  if (role) c.push({ op: "contains", column: "role_ids", value: [role.id] });

  const agent = catalog.characters.find((a) => a.slug === f.agent);
  if (agent) {
    if (f.astatus?.length) {
      c.push({ op: "overlaps", column: "char_keys", value: f.astatus.map((s) => `${agent.id}:${s}`) });
    } else {
      c.push({ op: "contains", column: "character_ids", value: [agent.id] });
    }
  }
  if (f.mode) c.push({ op: "contains", column: "mode_slugs", value: [f.mode] });
  if (f.lang) c.push({ op: "contains", column: "languages", value: [f.lang] });
  if (f.slot.length) c.push({ op: "overlaps", column: "availability", value: f.slot });
  if (f.goal) c.push({ op: "contains", column: "goals", value: [f.goal] });
  if (f.voice) c.push({ op: "eq", column: "voice", value: f.voice });
  if (f.flex) c.push({ op: "eq", column: "flex", value: true });
  return c;
}

/** Cuántos filtros activos hay (sin contar la página). */
export function activeCount(f: Filters): number {
  return [f.rmin, f.rmax, f.region, f.role, f.agent, f.mode, f.lang, f.goal, f.voice].filter(Boolean).length +
    (f.slot.length ? 1 : 0) + (f.flex ? 1 : 0) + (f.now ? 1 : 0);
}

/** Filtros secundarios activos (van plegados en «Más filtros»; si hay alguno, el bloque se abre). */
export function advancedCount(f: Filters): number {
  return [f.agent, f.lang, f.goal, f.voice].filter(Boolean).length + (f.slot.length ? 1 : 0) + (f.flex ? 1 : 0);
}

/** Sugerencias para ampliar la búsqueda cuando no hay resultados: quitar un filtro cada vez. */
export function widenSuggestions(f: Filters, locale: AppLocale = "es"): { label: string; filters: Filters }[] {
  const t = translator(locale, "search.widen");
  const base = { ...f, page: 1 };
  const out: { label: string; filters: Filters }[] = [];
  if (f.now) out.push({ label: t("now"), filters: { ...base, now: false } });
  if (f.rmin || f.rmax) out.push({ label: t("rank"), filters: { ...base, rmin: undefined, rmax: undefined } });
  if (f.agent) out.push({ label: t("agent"), filters: { ...base, agent: undefined, astatus: [] } });
  if (f.role) out.push({ label: t("role"), filters: { ...base, role: undefined } });
  if (f.slot.length) out.push({ label: t("slot"), filters: { ...base, slot: [] } });
  if (f.lang) out.push({ label: t("lang"), filters: { ...base, lang: undefined } });
  if (f.mode) out.push({ label: t("mode"), filters: { ...base, mode: undefined } });
  if (f.region) out.push({ label: t("region"), filters: { ...base, region: undefined } });
  if (f.goal || f.voice || f.flex)
    out.push({ label: t("style"), filters: { ...base, goal: undefined, voice: undefined, flex: false } });
  return out;
}
