import { describe, expect, it } from "vitest";
import { matchFromForm, matchSchema, matchSummary, todayInMadrid } from "@/lib/matches";
import { notificationText } from "@/lib/notifications";
import { teamError, teamSchema } from "@/lib/teams";

const fd = (entries: Record<string, string>) => {
  const f = new FormData();
  Object.entries(entries).forEach(([k, v]) => f.append(k, v));
  return f;
};

describe("partidas manuales", () => {
  it("acepta una partida mínima y deja el resto vacío", () => {
    const r = matchSchema.safeParse(matchFromForm(fd({ played_on: "2026-11-10" })));
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ mode_id: null, map_name: null, result: null, kills: null, note: null });
  });

  it("rechaza fechas futuras, números fuera de rango y etiquetas", () => {
    const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    expect(matchSchema.safeParse(matchFromForm(fd({ played_on: tomorrow }))).success).toBe(false);
    expect(matchSchema.safeParse(matchFromForm(fd({ played_on: "2026-11-10", kills: "-1" }))).success).toBe(false);
    expect(matchSchema.safeParse(matchFromForm(fd({ played_on: "2026-11-10", placement: "61" }))).success).toBe(false);
    expect(matchSchema.safeParse(matchFromForm(fd({ played_on: "2026-11-10", note: "<b>" }))).success).toBe(false);
    expect(matchSchema.safeParse(matchFromForm(fd({ played_on: "2026-11-10", result: "mvp" }))).success).toBe(false);
  });

  it("resume victorias y K/D solo con lo que hay", () => {
    expect(matchSummary([])).toEqual({ total: 0, winRate: null, kd: null });
    const s = matchSummary([
      { result: "win", kills: 20, deaths: 10 },
      { result: "loss", kills: 5, deaths: 10 },
      { result: null, kills: null, deaths: null },
    ]);
    expect(s).toEqual({ total: 3, winRate: 50, kd: 1.25 });
    expect(todayInMadrid(new Date("2026-11-12T23:30:00Z"))).toBe("2026-11-13");
  });
});

describe("equipos", () => {
  it("valida nombre y descripción", () => {
    expect(teamSchema.safeParse({ name: "Los Pibes", description: "" }).success).toBe(true);
    expect(teamSchema.safeParse({ name: "ab", description: "" }).success).toBe(false);
    expect(teamSchema.safeParse({ name: "<script>", description: "" }).success).toBe(false);
    expect(teamError("full")).toContain("completo");
    expect(teamError("raro")).toBe("No se pudo completar la acción. Inténtalo de nuevo.");
  });

  it("avisos de invitación y nuevo miembro", () => {
    const base = { lobby_id: null, clip_id: null, body: "Te invitan" };
    expect(notificationText({ ...base, kind: "team_invite" }, "Ana")).toEqual({ title: "Ana te invita a su equipo", detail: "Te invitan", href: "/mis-equipos" });
    expect(notificationText({ ...base, kind: "team_joined" }, "Ana").title).toBe("Ana se ha unido a tu equipo");
  });
});
