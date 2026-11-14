import { describe, expect, it } from "vitest";
import { pct } from "@/lib/admin-stats";
import { parseFilters, type SearchCatalog } from "@/lib/search/filters";
import { savedSearchFrom } from "@/lib/search/saved";

const catalog: SearchCatalog = {
  ranks: [
    { id: "r1", slug: "oro-1", tier: 10 },
    { id: "r2", slug: "platino-1", tier: 13 },
  ],
  regions: [{ id: "g1", slug: "eu" }],
  roles: [{ id: "c1", slug: "controller" }],
  characters: [{ id: "a1", slug: "omen" }],
  modes: [{ slug: "duo" }],
};

describe("búsquedas guardadas", () => {
  it("guarda la URL sin página ni «disponibles ahora» y los filtros de la alerta como ids", () => {
    const f = parseFilters({ role: "controller", rmin: "oro-1", region: "eu", lang: "es", now: "1", page: "3" }, catalog);
    expect(savedSearchFrom(f, catalog)).toEqual({
      query: "rmin=oro-1&region=eu&role=controller&lang=es",
      role: "c1",
      rankMin: "r1",
      rankMax: null,
      region: "g1",
      language: "es",
      alertIgnores: false,
    });
  });

  it("avisa de los filtros que la alerta no comprueba", () => {
    expect(savedSearchFrom(parseFilters({ mode: "duo" }, catalog), catalog).alertIgnores).toBe(true);
    expect(savedSearchFrom(parseFilters({}, catalog), catalog).query).toBe("");
  });
});

describe("estadísticas", () => {
  it("porcentajes sin dividir entre cero", () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(0, 0)).toBeNull();
  });
});
