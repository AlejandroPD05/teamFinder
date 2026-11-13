import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;

// Ranking semanal (reglas «Compañerismo»): 3 × reconocimientos + 1 × grupos terminados, como mucho un grupo al día.
// Las cuentas de la prueba son nuevas: se pasa una antigüedad mínima de 0 para poder contar.
describe("ranking semanal", () => {
  let a: U, b: U, c: U;

  const duo = async (owner: U, guest: U) => {
    const { data: lobby, error } = await owner.client.rpc("create_lobby", {
      p_game_id: "valorant",
      p_mode_slug: "duo",
      p_note: "Ranking",
      p_rank_min: null as unknown as string,
      p_rank_max: null as unknown as string,
      p_region: null as unknown as string,
      p_language: "es",
      p_goal: "ranked",
      p_starts_at: null as unknown as string,
      p_roles: [],
    });
    if (error) throw error;
    await guest.client.rpc("request_join", { p_lobby: lobby!, p_message: "" });
    const { data: req } = await admin().from("lobby_requests").select("id").eq("lobby_id", lobby!).eq("user_id", guest.id).single();
    const accepted = await owner.client.rpc("respond_request", { p_request: req!.id, p_accept: true });
    if (accepted.error) throw accepted.error;
    const closed = await owner.client.rpc("close_lobby", { p_lobby: lobby! });
    if (closed.error) throw closed.error;
    return lobby!;
  };

  const ranking = async (u: U, opts: { minAge?: string; minFinished?: number } = {}) => {
    const { data, error } = await u.client.rpc("weekly_ranking", {
      p_game: "valorant",
      p_min_age: opts.minAge ?? "0 seconds",
      p_min_finished: opts.minFinished ?? 1,
    });
    if (error) throw error;
    return data!.filter((r) => [a.id, b.id, c.id].includes(r.user_id));
  };

  beforeAll(async () => {
    assertEnv();
    [a, b, c] = await Promise.all(["rk-a", "rk-b", "rk-c"].map((t) => createUser(t)));
    // Tres grupos terminados el mismo día entre A y B; B reconoce a A en dos de ellos.
    const l1 = await duo(a, b);
    const l2 = await duo(a, b);
    await duo(a, b);
    for (const l of [l1, l2]) {
      const v = await b.client.rpc("vote_karma", { p_lobby: l, p_target: a.id, p_value: 1, p_tags: [] });
      if (v.error) throw v.error;
    }
  });

  afterAll(async () => {
    await deleteUsers([a?.id, b?.id, c?.id]);
  });

  it("puntúa reconocimientos de compañeros distintos y un grupo al día", async () => {
    const rows = await ranking(c);
    const ra = rows.find((r) => r.user_id === a.id)!;
    const rb = rows.find((r) => r.user_id === b.id)!;
    // A: 1 compañero distinto (B, aunque le reconozca dos veces) y 3 grupos el mismo día → 1.
    expect(ra).toMatchObject({ recognitions: 1, finished: 1, points: 4 });
    expect(rb).toMatchObject({ recognitions: 0, finished: 1, points: 1 });
    expect(ra.pos).toBeLessThan(rb.pos);
    // Quien no ha jugado no aparece.
    expect(rows.some((r) => r.user_id === c.id)).toBe(false);
  });

  it("hace falta el mínimo de grupos terminados (3 por defecto)", async () => {
    expect(await ranking(c, { minFinished: 3 })).toEqual([]);
  });

  it("no cuentan cuentas recién creadas (regla por defecto: más de un día)", async () => {
    expect(await ranking(c, { minAge: "1 day" })).toEqual([]);
  });

  it("quien ha estado restringido esa semana no entra", async () => {
    const until = new Date(Date.now() + 86_400_000).toISOString();
    const { data } = await admin().from("user_restrictions").insert({ user_id: b.id, until, reason: "Prueba ranking" }).select("id").single();
    expect((await ranking(c)).some((r) => r.user_id === b.id)).toBe(false);
    await admin().from("user_restrictions").delete().eq("id", data!.id);
  });

  it("sin sesión no se consulta", async () => {
    expect((await anon().rpc("weekly_ranking", { p_game: "valorant" })).error).not.toBeNull();
  });

  it("los puestos guardados se ven en las insignias y nadie puede escribirlos desde la web", async () => {
    const week = "2020-01-06";
    await admin().from("weekly_rank_awards").insert({ game_id: "valorant", week_start: week, user_id: a.id, pos: 1, points: 12, recognitions: 3, finished: 3 });
    const { data } = await c.client.rpc("player_badges", { p_user: a.id });
    expect((data as { rank_awards: unknown[] }).rank_awards).toEqual([{ game_id: "valorant", week_start: week, pos: 1, points: 12 }]);
    const forged = await c.client.from("weekly_rank_awards").insert({ game_id: "valorant", week_start: week, user_id: c.id, pos: 2, points: 99, recognitions: 9, finished: 9 });
    expect(forged.error).not.toBeNull();
  });
});
