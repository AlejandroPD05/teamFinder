import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers, type Db } from "./helpers";

// La búsqueda nunca debe revelar (ni dejar filtrar por) datos ocultos.
describe("búsqueda de jugadores", () => {
  type U = { id: string; client: Db };
  let viewer: U, open: U, secret: U, hiddenLang: U;
  let ids: string[] = [];
  let gold2 = "", plat1 = "", omen = "", controller = "";

  const search = (client: Db) => client.from("player_search").select("user_id").eq("game_id", "valorant").in("user_id", ids);

  async function save(u: U, visibility: "public" | "registered" | "private", rank: string, chars: { character_id: string; status: string }[]) {
    const { error } = await u.client.rpc("save_game_profile", {
      p_game_id: "valorant",
      p_rank_id: rank,
      p_region_id: null as unknown as string,
      p_flex: false,
      p_visibility: visibility,
      p_roles: [{ role_id: controller, is_primary: true }],
      p_characters: chars,
      p_modes: ["duo"],
    });
    if (error) throw error;
  }

  beforeAll(async () => {
    assertEnv();
    [viewer, open, secret, hiddenLang] = await Promise.all([
      createUser("s-viewer"),
      createUser("s-open"),
      createUser("s-secret"),
      createUser("s-hidden"),
    ]);
    ids = [viewer.id, open.id, secret.id, hiddenLang.id];
    const db = admin();
    const { data: ranks } = await db.from("game_ranks").select("id, slug").eq("game_id", "valorant").in("slug", ["gold-2", "platinum-1"]);
    gold2 = ranks!.find((r) => r.slug === "gold-2")!.id;
    plat1 = ranks!.find((r) => r.slug === "platinum-1")!.id;
    omen = (await db.from("game_characters").select("id").eq("game_id", "valorant").eq("slug", "omen").single()).data!.id;
    controller = (await db.from("game_roles").select("id").eq("game_id", "valorant").eq("slug", "controller").single()).data!.id;

    await save(viewer, "public", gold2, []);
    await save(open, "registered", gold2, [{ character_id: omen, status: "main" }]);
    await save(secret, "private", plat1, [{ character_id: omen, status: "main" }]);
    await save(hiddenLang, "public", plat1, [{ character_id: omen, status: "playable" }]);
    await open.client.from("profiles").update({ languages: ["es"], languages_visibility: "registered" }).eq("id", open.id);
    await hiddenLang.client.from("profiles").update({ languages: ["pt"], languages_visibility: "private" }).eq("id", hiddenLang.id);
  });

  afterAll(() => deleteUsers(ids));

  it("solo usuarios con sesión pueden buscar", async () => {
    const { error } = await search(anon());
    expect(error).not.toBeNull();
  });

  it("no aparecen perfiles de juego privados", async () => {
    const { data } = await search(viewer.client).neq("user_id", viewer.id);
    expect(data!.map((r) => r.user_id).sort()).toEqual([open.id, hiddenLang.id].sort());
  });

  it("filtrar por un idioma privado no revela a quien lo tiene", async () => {
    const { data } = await search(viewer.client).filter("languages", "cs", "{pt}");
    expect(data).toEqual([]);
    const { data: es } = await search(viewer.client).filter("languages", "cs", "{es}");
    expect(es!.map((r) => r.user_id)).toEqual([open.id]);
  });

  it("filtra por tramo de rango", async () => {
    const { data } = await search(viewer.client).gte("rank_tier", 13).lte("rank_tier", 13);
    expect(data!.map((r) => r.user_id)).toEqual([hiddenLang.id]);
  });

  it("filtra por agente y estado (Omen como main)", async () => {
    const { data } = await search(viewer.client).filter("char_keys", "ov", `{${omen}:main}`);
    expect(data!.map((r) => r.user_id)).toEqual([open.id]);
    const { data: any } = await search(viewer.client).filter("character_ids", "cs", `{${omen}}`);
    expect(any!.map((r) => r.user_id).sort()).toEqual([open.id, hiddenLang.id].sort());
  });

  it("filtra por rol y modo", async () => {
    const { data } = await search(viewer.client)
      .neq("user_id", viewer.id)
      .filter("role_ids", "cs", `{${controller}}`)
      .filter("mode_slugs", "cs", "{duo}");
    expect(data).toHaveLength(2);
  });

  it("un modo que no existe se rechaza al guardar", async () => {
    const { error } = await viewer.client.rpc("save_game_profile", {
      p_game_id: "valorant",
      p_rank_id: null as unknown as string,
      p_region_id: null as unknown as string,
      p_flex: false,
      p_visibility: "public",
      p_roles: [],
      p_characters: [],
      p_modes: ["sixstack"],
    });
    expect(error).not.toBeNull();
  });
});
