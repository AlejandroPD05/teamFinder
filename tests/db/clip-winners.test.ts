import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;

// Ganadores semanales: el cálculo se hace con parámetros para poder probarlo con cuentas recién creadas.
describe("ganadores semanales de clips", () => {
  let a: U, b: U, v1: U, v2: U, v3: U;
  let ace: string, top: string, second: string;
  const vid = () => Math.random().toString(36).slice(2, 13).padEnd(11, "x");
  const game = "apex"; // juego sin otros clips en las pruebas

  beforeAll(async () => {
    assertEnv();
    [a, b, v1, v2, v3] = await Promise.all(["w-a", "w-b", "w-v1", "w-v2", "w-v3"].map((t) => createUser(t)));
    ace = (await admin().from("clip_emblems").select("id").eq("slug", "ace").single()).data!.id;
    const post = async (u: U) =>
      (await u.client.rpc("post_clip", { p_game: game, p_emblem: ace, p_title: "Ace de prueba", p_provider: "youtube", p_video: vid() })).data!;
    top = await post(a);
    second = await post(b);
    for (const v of [v1, v2, v3]) await v.client.rpc("toggle_clip_vote", { p_clip: top, p_emblem: ace });
    for (const v of [v1, v2]) await v.client.rpc("toggle_clip_vote", { p_clip: second, p_emblem: ace });
  });

  afterAll(async () => {
    await deleteUsers([a?.id, b?.id, v1?.id, v2?.id, v3?.id]);
  });

  const winners = async (minVotes: number, minAge = "0 seconds") => {
    const { data, error } = await v1.client.rpc("clip_weekly_winners", {
      p_game: game,
      p_weeks: 1,
      p_min_votes: minVotes,
      p_min_voter_age: minAge,
    });
    if (error) throw error;
    return data!.filter((w) => w.emblem_id === ace);
  };

  it("gana el clip con más emblemas de ese tipo en la semana (en curso)", async () => {
    const [w] = await winners(1);
    expect(w).toMatchObject({ clip_id: top, votes: 3, closed: false });
  });

  it("hace falta un mínimo de emblemas", async () => {
    expect(await winners(4)).toEqual([]);
  });

  it("no cuentan los emblemas de cuentas recién creadas (regla por defecto: más de un día)", async () => {
    expect(await winners(1, "1 day")).toEqual([]);
  });

  it("un clip oculto por moderación no gana", async () => {
    await admin().from("clips").update({ hidden: true }).eq("id", top);
    const [w] = await winners(1);
    expect(w).toMatchObject({ clip_id: second, votes: 2 });
    await admin().from("clips").update({ hidden: false }).eq("id", top);
  });

  it("sin sesión no se consulta", async () => {
    const { anon } = await import("./helpers");
    const { error } = await anon().rpc("clip_weekly_winners", { p_game: game });
    expect(error).not.toBeNull();
  });
});
