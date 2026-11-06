import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;

// Grupo de dos (DuoQ) que llena `member` y el creador cierra.
async function fillAndClose(owner: U, member: U) {
  const { data: lobby, error } = await owner.client.rpc("create_lobby", {
    p_game_id: "valorant",
    p_mode_slug: "duo",
    p_note: "Misión de prueba",
    p_rank_min: null as unknown as string,
    p_rank_max: null as unknown as string,
    p_region: null as unknown as string,
    p_language: "es",
    p_goal: "ranked",
    p_starts_at: null as unknown as string,
    p_roles: [],
  });
  if (error) throw error;
  const { data: request, error: e2 } = await member.client.rpc("request_join", { p_lobby: lobby!, p_message: "" });
  if (e2) throw e2;
  const { error: e3 } = await owner.client.rpc("respond_request", { p_request: request!, p_accept: true });
  if (e3) throw e3;
  const { error: e4 } = await owner.client.rpc("close_lobby", { p_lobby: lobby! });
  if (e4) throw e4;
  return lobby!;
}

describe("misiones y cartas", () => {
  let owner: U, member: U, other: U;
  let quick: string, strict: string;

  beforeAll(async () => {
    assertEnv();
    [owner, member, other] = await Promise.all([createUser("mis-owner"), createUser("mis-member"), createUser("mis-other")]);
    // Misiones de prueba: una sin límites (2 grupos) y otra que exige cuentas de más de un día.
    const db = admin();
    const { data, error } = await db
      .from("missions")
      .insert([
        { game_id: "valorant", slug: `test-quick-${Date.now()}`, title: "Prueba", description: "Prueba", kind: "fill_lobbies", target: 2, max_per_day: 50, min_member_age: "0 seconds" },
        { game_id: "valorant", slug: `test-strict-${Date.now()}`, title: "Prueba estricta", description: "Prueba", kind: "fill_lobbies", target: 1, max_per_day: 50, min_member_age: "1 day" },
      ])
      .select("id, min_member_age");
    if (error) throw error;
    quick = data!.find((m) => m.min_member_age === "00:00:00")!.id;
    strict = data!.find((m) => m.min_member_age !== "00:00:00")!.id;
  });

  afterAll(async () => {
    await admin().from("missions").delete().in("id", [quick, strict]);
    await deleteUsers([owner?.id, member?.id, other?.id]);
  });

  const mine = async (u: U) => {
    const { data, error } = await u.client.rpc("my_missions", { p_game: "valorant" });
    if (error) throw error;
    return Object.fromEntries(data!.map((m) => [m.id, m]));
  };

  it("sin grupos llenos no se puede reclamar", async () => {
    const m = (await mine(owner))[quick];
    expect(m).toMatchObject({ progress: 0, claimable: false, claims: 0, cards_owned: 0 });
    expect(m.cards_total).toBeGreaterThan(0);
    const { error } = await owner.client.rpc("claim_mission", { p_mission: quick });
    expect(error?.message).toContain("Misión sin completar");
  });

  it("cuenta grupos llenos y cerrados, y la recompensa es una carta nueva", async () => {
    await fillAndClose(owner, member);
    expect((await mine(owner))[quick]).toMatchObject({ progress: 1, claimable: false });
    await fillAndClose(owner, member);
    expect((await mine(owner))[quick]).toMatchObject({ progress: 2, claimable: true });

    const { data: card, error } = await owner.client.rpc("claim_mission", { p_mission: quick });
    expect(error).toBeNull();
    const { data: cards } = await owner.client.from("user_cards").select("card_id");
    expect(cards!.map((c) => c.card_id)).toEqual([card]);
    expect((await mine(owner))[quick]).toMatchObject({ progress: 0, claimable: false, claims: 1, cards_owned: 1 });

    // Sin más grupos no hay segunda carta.
    const again = await owner.client.rpc("claim_mission", { p_mission: quick });
    expect(again.error?.message).toContain("Misión sin completar");
  });

  it("no cuentan grupos llenados con cuentas recién creadas si la misión lo exige", async () => {
    expect((await mine(owner))[strict]).toMatchObject({ progress: 0, claimable: false });
  });

  it("las cartas y las reclamaciones solo las ve su dueño y no se pueden escribir a mano", async () => {
    const { data: seen } = await other.client.from("user_cards").select("card_id").eq("user_id", owner.id);
    expect(seen).toEqual([]);
    const { data: claims } = await other.client.from("mission_claims").select("id").eq("user_id", owner.id);
    expect(claims).toEqual([]);
    const { data: anyCard } = await other.client.from("collectible_cards").select("id").limit(1).single();
    const insert = await other.client.from("user_cards").insert({ user_id: other.id, card_id: anyCard!.id });
    expect(insert.error).not.toBeNull();
    const mission = await other.client.from("missions").update({ target: 1 }).eq("id", quick).select();
    expect(mission.data ?? []).toEqual([]);
  });

  it("los grupos que no se cierran o no se llenan no cuentan", async () => {
    // Grupo lleno pero abierto: no cuenta.
    const { data: lobby } = await other.client.rpc("create_lobby", {
      p_game_id: "valorant",
      p_mode_slug: "duo",
      p_note: "Sin cerrar",
      p_rank_min: null as unknown as string,
      p_rank_max: null as unknown as string,
      p_region: null as unknown as string,
      p_language: "es",
      p_goal: "ranked",
      p_starts_at: null as unknown as string,
      p_roles: [],
    });
    const { data: req } = await member.client.rpc("request_join", { p_lobby: lobby!, p_message: "" });
    await other.client.rpc("respond_request", { p_request: req!, p_accept: true });
    expect((await mine(other))[quick]).toMatchObject({ progress: 0 });
    // Cerrado sin llenar (otro grupo): tampoco.
    const { data: empty } = await other.client.rpc("create_lobby", {
      p_game_id: "valorant",
      p_mode_slug: "duo",
      p_note: "Vacío",
      p_rank_min: null as unknown as string,
      p_rank_max: null as unknown as string,
      p_region: null as unknown as string,
      p_language: "es",
      p_goal: "ranked",
      p_starts_at: null as unknown as string,
      p_roles: [],
    });
    await other.client.rpc("close_lobby", { p_lobby: empty! });
    expect((await mine(other))[quick]).toMatchObject({ progress: 0 });
  });

  it("sin sesión no hay misiones", async () => {
    const { anon } = await import("./helpers");
    const { error } = await anon().rpc("my_missions", { p_game: "valorant" });
    expect(error).not.toBeNull();
  });
});
