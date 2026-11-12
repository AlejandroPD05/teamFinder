import { describe, expect, it } from "vitest";
import { activeCount, advancedCount, parseFilters, toConditions, toSearchParams, widenSuggestions, type SearchCatalog } from "@/lib/search/filters";

const catalog: SearchCatalog = {
  ranks: [
    { id: "r-gold1", slug: "gold-1", tier: 10 },
    { id: "r-gold2", slug: "gold-2", tier: 11 },
    { id: "r-plat1", slug: "platinum-1", tier: 13 },
  ],
  regions: [{ id: "reg-eu", slug: "eu" }],
  roles: [{ id: "role-ctrl", slug: "controller" }],
  characters: [{ id: "c-omen", slug: "omen" }],
  modes: [{ slug: "duo" }, { slug: "five" }],
};

describe("parseFilters", () => {
  it("descarta valores desconocidos y páginas inválidas", () => {
    const f = parseFilters(
      { rmin: "hacker", region: "eu", lang: "klingon", slot: ["weekday_evening", "x"], page: "-3", astatus: ["main", "god"] },
      catalog,
    );
    expect(f.rmin).toBeUndefined();
    expect(f.region).toBe("eu");
    expect(f.lang).toBeUndefined();
    expect(f.slot).toEqual(["weekday_evening"]);
    expect(f.astatus).toEqual(["main"]);
    expect(f.page).toBe(1);
  });

  it("ida y vuelta por la URL", () => {
    const f = parseFilters(
      { rmin: "gold-1", rmax: "platinum-1", role: "controller", agent: "omen", astatus: ["main", "comfort"], mode: "duo", flex: "1", page: "2" },
      catalog,
    );
    const again = parseFilters(Object.fromEntries([...toSearchParams(f).keys()].map((k) => [k, toSearchParams(f).getAll(k)])), catalog);
    expect(again).toEqual(f);
    expect(toSearchParams(f).toString()).toBe(
      "rmin=gold-1&rmax=platinum-1&role=controller&agent=omen&astatus=main&astatus=comfort&mode=duo&flex=1&page=2",
    );
  });
});

describe("toConditions", () => {
  it("rango mín–máx por tier y se ordena si vienen al revés", () => {
    const f = parseFilters({ rmin: "platinum-1", rmax: "gold-1" }, catalog);
    expect(toConditions(f, catalog)).toEqual([
      { op: "gte", column: "rank_tier", value: 10 },
      { op: "lte", column: "rank_tier", value: 13 },
    ]);
  });

  it("agente con estados usa claves id:estado; sin estado, solo el agente", () => {
    expect(toConditions(parseFilters({ agent: "omen", astatus: ["main", "comfort"] }, catalog), catalog)).toEqual([
      { op: "overlaps", column: "char_keys", value: ["c-omen:main", "c-omen:comfort"] },
    ]);
    expect(toConditions(parseFilters({ agent: "omen" }, catalog), catalog)).toEqual([
      { op: "contains", column: "character_ids", value: ["c-omen"] },
    ]);
  });

  it("combina filtros de perfil común y de juego", () => {
    const f = parseFilters({ region: "eu", role: "controller", lang: "es", slot: ["weekend_evening"], voice: "voice", flex: "1" }, catalog);
    expect(toConditions(f, catalog)).toEqual([
      { op: "eq", column: "region_id", value: "reg-eu" },
      { op: "contains", column: "role_ids", value: ["role-ctrl"] },
      { op: "contains", column: "languages", value: ["es"] },
      { op: "overlaps", column: "availability", value: ["weekend_evening"] },
      { op: "eq", column: "voice", value: "voice" },
      { op: "eq", column: "flex", value: true },
    ]);
    expect(activeCount(f)).toBe(6);
  });

  it("sin filtros no hay condiciones", () => {
    expect(toConditions(parseFilters({}, catalog), catalog)).toEqual([]);
  });
});

describe("widenSuggestions", () => {
  it("propone quitar cada filtro activo y vuelve a la página 1", () => {
    const f = parseFilters({ rmin: "gold-1", agent: "omen", astatus: "main", lang: "es", page: "3" }, catalog);
    const s = widenSuggestions(f);
    expect(s.map((x) => x.label)).toEqual(["Cualquier rango", "Cualquier agente", "Cualquier idioma"]);
    expect(s.every((x) => x.filters.page === 1)).toBe(true);
    expect(s[1].filters.agent).toBeUndefined();
  });
});

describe("advancedCount", () => {
  it("cuenta solo los filtros que van plegados en «Más filtros»", () => {
    const base = parseFilters({}, catalog);
    expect(advancedCount({ ...base, rmin: "gold", region: "eu" })).toBe(0);
    expect(advancedCount({ ...base, lang: "es", flex: true, slot: ["weekday_night"] })).toBe(3);
  });
});
