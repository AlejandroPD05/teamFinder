import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { localeFromAcceptLanguage, pickLocale } from "@/lib/i18n/locale";
import { errorMessage } from "@/lib/i18n/translator";
import { notificationText } from "@/lib/notifications";
import { weekLabel } from "@/lib/ranking";

/** Todas las claves hoja («a.b.c») con su texto. */
function leaves(node: unknown, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

describe("messages", () => {
  const esLeaves = leaves(es);
  const enLeaves = leaves(en);

  it("es.json y en.json tienen exactamente las mismas claves", () => {
    expect(enLeaves.map(([k]) => k).sort()).toEqual(esLeaves.map(([k]) => k).sort());
  });

  it("no hay textos vacíos", () => {
    for (const [k, v] of [...esLeaves, ...enLeaves]) expect(v.trim(), k).not.toBe("");
  });

  it("los textos sin variables se muestran tal cual (ICU no se come < > ni apóstrofos)", () => {
    for (const [messages, list] of [
      [es, esLeaves],
      [en, enLeaves],
    ] as const) {
      const t = createTranslator({ locale: "es", messages, onError: (e) => { throw e; } });
      for (const [k, v] of list) {
        if (/[{}]|<[a-z]/i.test(v)) continue;
        expect(t(k as never), k).toBe(v);
      }
    }
  });
});

describe("idioma de la petición", () => {
  it("sin cookie ni cabecera, español", () => {
    expect(pickLocale(undefined, null)).toBe("es");
    expect(localeFromAcceptLanguage("")).toBe("es");
  });

  it("la cookie manda si es válida", () => {
    expect(pickLocale("en", "es-ES,es;q=0.9")).toBe("en");
    expect(pickLocale("es", "en-GB")).toBe("es");
    expect(pickLocale("fr", "en-GB")).toBe("en");
  });

  it("Accept-Language: la primera preferencia decide", () => {
    expect(localeFromAcceptLanguage("es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,es;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("en;q=0.5,es-MX;q=0.9")).toBe("es");
    expect(localeFromAcceptLanguage("ca-ES,ca;q=0.9")).toBe("es");
  });
});

describe("textos fuera de React", () => {
  it("por defecto en español y, si se pide, en inglés", () => {
    const n = { kind: "team_joined" as const, lobby_id: null, clip_id: null, body: null, team_id: "t" };
    expect(notificationText(n, "Ana").title).toBe("Ana se ha unido a tu equipo");
    expect(notificationText(n, "Ana", "en").title).toBe("Ana joined your team");
    expect(errorMessage("lobby", "full", "en")).toBe("There are no free spots left.");
    expect(errorMessage("lobby", "desconocido")).toBe("No se pudo completar la acción. Inténtalo de nuevo.");
    expect(weekLabel("2026-11-09", "en")).toBe("9 Nov to 15 Nov");
  });
});
