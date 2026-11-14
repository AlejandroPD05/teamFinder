import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { CHANGELOG, formatChangelogDate, isIsoDate, newestFirst } from "@/lib/changelog";
import { breadcrumbJsonLd, jsonLdString, rolePagePath, roleSearchHref, siblingRoles } from "@/lib/role-pages";

describe("páginas por rol", () => {
  it("rutas y búsqueda con el rol elegido", () => {
    expect(rolePagePath("valorant", "controller")).toBe("/equipos/valorant/controller");
    expect(roleSearchHref("awper", true)).toBe("/buscar?role=awper");
    // Sin sesión: entrar y volver a la misma búsqueda.
    expect(roleSearchHref("awper", false)).toBe(`/entrar?next=${encodeURIComponent("/buscar?role=awper")}`);
  });

  it("los demás roles, en el orden del catálogo", () => {
    const roles = [{ slug: "duelist" }, { slug: "initiator" }, { slug: "controller" }];
    expect(siblingRoles(roles, "initiator").map((r) => r.slug)).toEqual(["duelist", "controller"]);
    expect(siblingRoles(roles, "otro")).toHaveLength(3);
  });

  it("migas de pan schema.org con URLs absolutas y JSON seguro dentro de <script>", () => {
    const ld = breadcrumbJsonLd("https://x.test", [
      { name: "Inicio", path: "/" },
      { name: "VALORANT", path: "/equipos/valorant" },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://x.test/" },
      { "@type": "ListItem", position: 2, name: "VALORANT", item: "https://x.test/equipos/valorant" },
    ]);
    expect(jsonLdString({ name: "</script><b>" })).not.toContain("<");
    expect(JSON.parse(jsonLdString({ name: "</script>" }))).toEqual({ name: "</script>" });
  });

  it("los textos de cada rol existen en los dos idiomas", () => {
    for (const [game, roles] of Object.entries(es.rolePage.roles)) {
      const english = en.rolePage.roles[game as keyof typeof en.rolePage.roles];
      expect(Object.keys(english).sort()).toEqual(Object.keys(roles).sort());
    }
  });
});

describe("novedades", () => {
  it("fechas válidas, sin repetir y con cada cambio en los dos idiomas", () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
    expect(new Set(CHANGELOG.map((e) => e.date)).size).toBe(CHANGELOG.length);
    for (const entry of CHANGELOG) {
      expect(isIsoDate(entry.date), entry.date).toBe(true);
      expect(entry.items.length).toBeGreaterThan(0);
      for (const item of entry.items) {
        expect(item.es.trim()).not.toBe("");
        expect(item.en.trim()).not.toBe("");
      }
    }
  });

  it("de la más reciente a la más antigua, sin cambiar la lista original", () => {
    const list = [
      { date: "2026-11-04", items: [] },
      { date: "2026-11-13", items: [] },
      { date: "2026-11-06", items: [] },
    ];
    expect(newestFirst(list).map((e) => e.date)).toEqual(["2026-11-13", "2026-11-06", "2026-11-04"]);
    expect(list[0].date).toBe("2026-11-04");
  });

  it("valida y formatea fechas", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-1-05")).toBe(false);
    expect(formatChangelogDate("2026-11-04", "es-ES")).toBe("4 de noviembre de 2026");
    expect(formatChangelogDate("2026-11-04", "en-GB")).toBe("4 November 2026");
  });
});
