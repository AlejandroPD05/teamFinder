import { describe, expect, it } from "vitest";
import { changelogItems, discordMessage, newItems, probe } from "../../scripts/changelog-diff.mjs";
import { CHANGELOG } from "@/lib/changelog";
import { readFileSync } from "node:fs";

const v1 = `export const CHANGELOG = [{ date: "2026-11-13", items: [{ es: "Uno", en: "One" }] }];`;
const v2 = `export const CHANGELOG = [
  { date: "2026-11-14", items: [{ es: "Lista de espera: \\"te avisamos\\"", en: "Waitlist" }, { es: "Dos", en: "Two" }] },
  { date: "2026-11-13", items: [{ es: "Uno", en: "One" }] },
];`;

describe("novedades para Discord", () => {
  it("lee todas las novedades del changelog real", () => {
    const items = changelogItems(readFileSync("src/lib/changelog.ts", "utf8"));
    expect(items).toEqual(CHANGELOG.flatMap((e) => e.items.map((i) => i.es)));
  });

  it("solo anuncia las nuevas", () => {
    expect(newItems(v1, v2)).toEqual(['Lista de espera: "te avisamos"', "Dos"]);
    expect(newItems(v2, v2)).toEqual([]);
  });

  it("mensaje corto, con enlace y como mucho 10 novedades", () => {
    const msg = discordMessage(Array.from({ length: 12 }, (_, i) => `Novedad ${i}`), "https://x.test");
    expect(msg.startsWith("**Novedades en TeamFinder**")).toBe(true);
    expect(msg).toContain("• Novedad 9");
    expect(msg).not.toContain("Novedad 10");
    expect(msg).toContain("…y 2 más.");
    expect(msg.endsWith("https://x.test/novedades")).toBe(true);
    expect(discordMessage(["x".repeat(3000)], "https://x.test").length).toBeLessThanOrEqual(1900);
  });

  it("el fragmento de comprobación no lleva caracteres que el HTML escapa", () => {
    expect(probe('Lista de "espera" & más cosas')).toBe("Lista de espera más");
  });
});
