import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers, type Db } from "./helpers";

// Visibilidad por campo y guardado del perfil de VALORANT contra Supabase local.
describe("perfil: visibilidad y datos de juego", () => {
  let owner: { id: string; client: Db };
  let other: { id: string; client: Db };
  let roleIds: Record<string, string> = {};
  let omen = "";
  let clove = "";
  let valorantSage = "";

  beforeAll(async () => {
    assertEnv();
    owner = await createUser("vis-owner", { full_name: "Dueña" });
    other = await createUser("vis-other");
    const db = admin();
    const { data: roles } = await db.from("game_roles").select("id, slug").eq("game_id", "valorant");
    roleIds = Object.fromEntries((roles ?? []).map((r) => [r.slug, r.id]));
    const { data: chars } = await db.from("game_characters").select("id, slug").in("slug", ["omen", "clove", "sage"]);
    const bySlug = Object.fromEntries((chars ?? []).map((c) => [c.slug, c.id]));
    omen = bySlug.omen;
    clove = bySlug.clove;
    valorantSage = bySlug.sage;

    const { error } = await owner.client
      .from("profiles")
      .update({
        languages: ["es", "en"],
        languages_visibility: "public",
        goals: ["ranked"],
        goals_visibility: "registered",
        availability: ["weekend_evening"],
        availability_visibility: "private",
      })
      .eq("id", owner.id);
    if (error) throw error;
  });

  afterAll(() => deleteUsers([owner?.id, other?.id]));

  it("anónimo: ve nombre y campos públicos, no los de registrados ni privados", async () => {
    const { data } = await anon().from("profile_cards").select("*").eq("id", owner.id).single();
    expect(data?.display_name).toBe("Dueña");
    expect(data?.languages).toEqual(["es", "en"]);
    expect(data?.goals).toBeNull();
    expect(data?.availability).toBeNull();
  });

  it("registrado: ve también los de registrados, nunca los privados", async () => {
    const { data } = await other.client.from("profile_cards").select("*").eq("id", owner.id).single();
    expect(data?.goals).toEqual(["ranked"]);
    expect(data?.availability).toBeNull();
  });

  it("el dueño lo ve todo", async () => {
    const { data } = await owner.client.from("profile_cards").select("*").eq("id", owner.id).single();
    expect(data?.availability).toEqual(["weekend_evening"]);
  });

  it("otro usuario no lee las tablas base del perfil", async () => {
    const { data } = await other.client.from("profiles").select("*").eq("id", owner.id);
    expect(data ?? []).toHaveLength(0);
  });

  it("guarda rango manual, roles y pool de agentes de forma atómica", async () => {
    const { error } = await owner.client.rpc("save_game_profile", {
      p_game_id: "valorant",
      p_rank_id: null as unknown as string,
      p_region_id: null as unknown as string,
      p_flex: true,
      p_visibility: "public",
      p_roles: [
        { role_id: roleIds.controller, is_primary: true },
        { role_id: roleIds.sentinel, is_primary: false },
      ],
      p_characters: [
        { character_id: omen, status: "main" },
        { character_id: clove, status: "comfort" },
      ],
    });
    expect(error).toBeNull();

    const { data: chars } = await anon().from("player_character_cards").select("status").eq("user_id", owner.id);
    expect(chars?.map((c) => c.status).sort()).toEqual(["comfort", "main"]);
    const { data: gp } = await anon().from("game_profile_cards").select("flex, rank_source").eq("user_id", owner.id).single();
    expect(gp).toEqual({ flex: true, rank_source: "manual" });
  });

  it("volver a guardar sustituye el pool (no acumula)", async () => {
    const { error } = await owner.client.rpc("save_game_profile", {
      p_game_id: "valorant",
      p_rank_id: null as unknown as string,
      p_region_id: null as unknown as string,
      p_flex: false,
      p_visibility: "public",
      p_roles: [],
      p_characters: [{ character_id: valorantSage, status: "playable" }],
    });
    expect(error).toBeNull();
    const { data } = await owner.client.from("player_characters").select("character_id").eq("user_id", owner.id);
    expect(data).toEqual([{ character_id: valorantSage }]);
  });

  it("dos roles principales se rechazan", async () => {
    const { error } = await owner.client.rpc("save_game_profile", {
      p_game_id: "valorant",
      p_rank_id: null as unknown as string,
      p_region_id: null as unknown as string,
      p_flex: false,
      p_visibility: "public",
      p_roles: [
        { role_id: roleIds.duelist, is_primary: true },
        { role_id: roleIds.initiator, is_primary: true },
      ],
      p_characters: [],
    });
    expect(error).not.toBeNull();
  });

  it("perfil de juego privado: invisible para otros, incluidos sus agentes", async () => {
    await owner.client.rpc("save_game_profile", {
      p_game_id: "valorant",
      p_rank_id: null as unknown as string,
      p_region_id: null as unknown as string,
      p_flex: false,
      p_visibility: "private",
      p_roles: [{ role_id: roleIds.controller, is_primary: true }],
      p_characters: [{ character_id: omen, status: "main" }],
    });
    const [gp, chars, roles] = await Promise.all([
      other.client.from("game_profile_cards").select("*").eq("user_id", owner.id),
      other.client.from("player_character_cards").select("*").eq("user_id", owner.id),
      anon().from("player_role_cards").select("*").eq("user_id", owner.id),
    ]);
    expect(gp.data ?? []).toHaveLength(0);
    expect(chars.data ?? []).toHaveLength(0);
    expect(roles.data ?? []).toHaveLength(0);
  });

  it("no se pueden escribir roles ni agentes a nombre de otro", async () => {
    const { error } = await other.client
      .from("player_characters")
      .insert({ user_id: owner.id, game_id: "valorant", character_id: omen, status: "main" });
    expect(error).not.toBeNull();
  });

  it("un anónimo no puede guardar perfil de juego", async () => {
    const { error } = await anon().rpc("save_game_profile", {
      p_game_id: "valorant",
      p_rank_id: null as unknown as string,
      p_region_id: null as unknown as string,
      p_flex: false,
      p_visibility: "public",
      p_roles: [],
      p_characters: [],
    });
    expect(error).not.toBeNull();
  });
});
