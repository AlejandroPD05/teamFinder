import { describe, expect, it } from "vitest";
import { createLobbyFromForm, createLobbySchema, lobbyError, parseLocalDateTime } from "@/lib/lobbies/schema";

function fd(entries: [string, string][]) {
  const f = new FormData();
  entries.forEach(([k, v]) => f.append(k, v));
  return f;
}

const pad = (n: number) => String(n).padStart(2, "0");
const localInput = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

describe("parseLocalDateTime", () => {
  it("aplica el desfase del navegador (getTimezoneOffset: Madrid en invierno = -60)", () => {
    expect(parseLocalDateTime("2026-11-06T21:00", -60)?.toISOString()).toBe("2026-11-06T20:00:00.000Z");
    expect(parseLocalDateTime("2026-11-06T21:00", 0)?.toISOString()).toBe("2026-11-06T21:00:00.000Z");
  });
  it("rechaza formatos inválidos", () => {
    expect(parseLocalDateTime("mañana", 0)).toBeNull();
  });
});

describe("createLobbySchema", () => {
  it("«ahora» no necesita fecha y limpia los vacíos", () => {
    const r = createLobbySchema.safeParse(createLobbyFromForm(fd([["mode", "duo"], ["when", "now"], ["note", "  "]])));
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ mode: "duo", note: "", rank_min: null, language: null, startsAt: null, roles: [] });
  });

  it("«más tarde» exige una fecha dentro de 14 días", () => {
    const later = (d: Date) =>
      createLobbySchema.safeParse(createLobbyFromForm(fd([["mode", "five"], ["when", "later"], ["starts_at", localInput(d)], ["tz", "0"]])));
    expect(later(new Date(Date.now() + 2 * 3_600_000)).success).toBe(true);
    expect(later(new Date(Date.now() + 20 * 86_400_000)).success).toBe(false);
    const missing = createLobbySchema.safeParse(createLobbyFromForm(fd([["mode", "five"], ["when", "later"]])));
    expect(missing.success).toBe(false);
  });

  it("valida nota, idioma y roles", () => {
    const bad = createLobbySchema.safeParse(
      createLobbyFromForm(fd([["mode", "duo"], ["when", "now"], ["note", "<b>"], ["language", "xx"], ["roles", "no-uuid"]])),
    );
    expect(bad.success).toBe(false);
  });
});

describe("lobbyError", () => {
  it("traduce los códigos conocidos y da un mensaje genérico para el resto", () => {
    expect(lobbyError("full")).toBe("No quedan plazas libres.");
    expect(lobbyError("xyz")).toContain("No se pudo");
    expect(lobbyError(null)).toContain("No se pudo");
  });
});
