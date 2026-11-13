import { describe, expect, it } from "vitest";
import { pushRequestSchema, secretMatches, vapidConfig } from "@/lib/push";
import { activeCount, parseFilters, toSearchParams, widenSuggestions, type SearchCatalog } from "@/lib/search/filters";
import { sharedExtras, sharedSummary, type SharedLobby } from "@/lib/shared-lobby";

describe("push", () => {
  const secret = "s".repeat(40);

  it("compara el secreto sin aceptar vacíos ni secretos cortos", () => {
    expect(secretMatches(secret, secret)).toBe(true);
    expect(secretMatches("otro", secret)).toBe(false);
    expect(secretMatches(null, secret)).toBe(false);
    expect(secretMatches("corto", "corto")).toBe(false);
  });

  it("solo acepta rutas internas y suscripciones https", () => {
    const base = { title: "Aviso", body: "", url: "/grupos/1", subscriptions: [{ endpoint: "https://push.example/x", keys: { p256dh: "k".repeat(40), auth: "a".repeat(16) } }] };
    expect(pushRequestSchema.safeParse(base).success).toBe(true);
    expect(pushRequestSchema.safeParse({ ...base, url: "https://evil.example" }).success).toBe(false);
    expect(pushRequestSchema.safeParse({ ...base, subscriptions: [{ ...base.subscriptions[0], endpoint: "http://push.example/x" }] }).success).toBe(false);
    expect(pushRequestSchema.safeParse({ ...base, subscriptions: [] }).success).toBe(false);
  });

  it("sin configuración completa, los push están desactivados", () => {
    expect(vapidConfig({} as NodeJS.ProcessEnv)).toBeNull();
    const env = { NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", VAPID_SUBJECT: "mailto:a@b.es", PUSH_WEBHOOK_SECRET: secret } as unknown as NodeJS.ProcessEnv;
    expect(vapidConfig(env)).toMatchObject({ publicKey: "pub", subject: "mailto:a@b.es" });
    expect(vapidConfig({ ...env, VAPID_SUBJECT: "correo" })).toBeNull();
  });
});

describe("búsqueda: disponibles ahora", () => {
  const catalog: SearchCatalog = { ranks: [], regions: [], roles: [], characters: [], modes: [] };
  it("el filtro va en la URL, cuenta como filtro y se puede quitar", () => {
    const f = parseFilters({ now: "1" }, catalog);
    expect(f.now).toBe(true);
    expect(toSearchParams(f).toString()).toBe("now=1");
    expect(activeCount(f)).toBe(1);
    expect(widenSuggestions(f)[0]).toMatchObject({ label: "No solo disponibles ahora", filters: { now: false } });
    expect(parseFilters({ now: "si" }, catalog).now).toBe(false);
  });
});

describe("grupos compartidos", () => {
  const l = {
    id: "x", game_id: "valorant", game_name: "VALORANT", mode_name: "TrioQ", slots: 3, taken: 1, roles: ["Controlador"],
    rank_min: "Oro 1", rank_max: null, region: "Europa", language: "es", goal: "ranked", starts_at: null, note: null,
    status: "open", owner_name: "Ana",
  } as unknown as SharedLobby;
  it("resume el grupo en una línea", () => {
    expect(sharedSummary(l)).toBe("TrioQ de VALORANT · 2 plazas libres · busca Controlador · Oro 1 a — · Europa · Español · Competitivo");
    expect(sharedExtras({ ...l, region: null, language: null, goal: null } as unknown as SharedLobby)).toEqual([]);
    expect(sharedSummary({ ...l, status: "full" })).toContain("completo");
  });
});
