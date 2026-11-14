import { describe, expect, it } from "vitest";
import { feedbackSchemaFor } from "@/lib/feedback";
import { fitReasons } from "@/lib/fit";
import { inviteCode } from "@/lib/invite";
import { parseReliability, reliabilityFacts, shortDuration } from "@/lib/reliability";
import { teamSchedule } from "@/lib/teams";

describe("te pueden encajar", () => {
  it("solo motivos conocidos, en orden fijo y sin repetir", () => {
    expect(fitReasons(["language", "role", "inventado", "role"])).toEqual(["role", "language"]);
    expect(fitReasons(null)).toEqual([]);
  });
});

describe("fiabilidad", () => {
  it("sin datos suficientes no se enseña nada", () => {
    expect(reliabilityFacts(parseReliability({ finished: 1, left: 0, completion_pct: null, responded: 0, response_pct: null, median_response_min: null }))).toEqual([]);
    expect(reliabilityFacts(parseReliability(null))).toEqual([]);
    expect(parseReliability("basura")).toBeNull();
  });

  it("enseña los hechos con su base", () => {
    const facts = reliabilityFacts(parseReliability({ finished: 9, left: 1, completion_pct: 90, responded: 4, response_pct: 80, median_response_min: 95 }));
    expect(facts).toEqual([
      { key: "completion", pct: 90, finished: 9, total: 10 },
      { key: "response", pct: 80 },
      { key: "responseTime", minutes: 95 },
    ]);
    expect(shortDuration(0)).toEqual({ unit: "min", value: 1 });
    expect(shortDuration(95)).toEqual({ unit: "h", value: 2 });
    expect(shortDuration(3 * 1440)).toEqual({ unit: "d", value: 3 });
  });
});

describe("horario del equipo", () => {
  it("cuenta por franja, ignora a quien no lo indica y propone la mejor con al menos 2", () => {
    const s = teamSchedule([["weekday_evening", "weekend_evening"], ["weekday_evening"], null, []]);
    expect(s.counts.get("weekday_evening")).toBe(2);
    expect(s).toMatchObject({ shared: 2, hidden: 2, max: 2, best: ["weekday_evening"] });
    expect(teamSchedule([["weekday_morning"], ["weekend_night"]]).best).toEqual([]);
    expect(teamSchedule([]).shared).toBe(0);
  });
});

describe("sugerencias e invitaciones", () => {
  it("valida tipo, longitud, caracteres y página", () => {
    const schema = feedbackSchemaFor("es");
    expect(schema.safeParse({ kind: "idea", body: "Una idea para mejorar", page: "/inicio" }).success).toBe(true);
    expect(schema.safeParse({ kind: "idea", body: "corto", page: null }).success).toBe(false);
    expect(schema.safeParse({ kind: "spam", body: "Una idea para mejorar", page: null }).success).toBe(false);
    expect(schema.safeParse({ kind: "bug", body: "<script>alert(1)</script>", page: null }).success).toBe(false);
    // Una página rara no invalida el envío: simplemente no se guarda.
    expect(schema.parse({ kind: "bug", body: "Algo falla al entrar", page: "https://evil.example" }).page).toBeNull();
  });

  it("los códigos de invitación son 8 letras o números en minúscula", () => {
    expect(inviteCode.safeParse("ab12cd34").success).toBe(true);
    expect(inviteCode.safeParse("AB12CD34").success).toBe(false);
    expect(inviteCode.safeParse("../admin").success).toBe(false);
  });
});
