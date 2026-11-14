import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;
const nil = null as unknown as string;

const newLobby = (u: U, mode = "trio") =>
  u.client.rpc("create_lobby", {
    p_game_id: "valorant", p_mode_slug: mode, p_note: "", p_rank_min: nil, p_rank_max: nil, p_region: nil,
    p_language: nil, p_goal: nil, p_starts_at: nil, p_roles: [],
  });

describe("te pueden encajar", () => {
  let a: U, b: U, c: U;
  let eu: string, gold: string, plat: string, duelist: string, controller: string;

  beforeAll(async () => {
    assertEnv();
    [a, b, c] = await Promise.all(["fit-a", "fit-b", "fit-c"].map((t) => createUser(t)));
    const db = admin();
    eu = (await db.from("game_regions").select("id").eq("game_id", "valorant").limit(1).single()).data!.id;
    const ranks = (await db.from("game_ranks").select("id, tier").eq("game_id", "valorant").order("tier")).data!;
    gold = ranks[10].id;
    plat = ranks[12].id;
    const roles = (await db.from("game_roles").select("id, slug").eq("game_id", "valorant")).data!;
    duelist = roles.find((r) => r.slug === "duelista")?.id ?? roles[0].id;
    controller = roles.find((r) => r.slug === "controlador")?.id ?? roles[1].id;
    const save = (u: U, rank: string, role: string) =>
      u.client.rpc("save_game_profile", {
        p_game_id: "valorant", p_rank_id: rank, p_region_id: eu, p_flex: false, p_visibility: "registered",
        p_roles: [{ role_id: role, is_primary: true }], p_characters: [], p_modes: [],
      });
    for (const r of await Promise.all([save(a, gold, duelist), save(b, plat, controller), save(c, gold, duelist)])) {
      if (r.error) throw r.error;
    }
    await Promise.all(
      [a, b, c].map((u) => u.client.from("profiles").update({ languages: ["es"], availability: ["weekday_evening"] }).eq("id", u.id)),
    );
  });
  afterAll(() => deleteUsers([a?.id, b?.id, c?.id]));

  it("sugiere con motivos explícitos (rol que falta, servidor, horario, rango, idioma)", async () => {
    const { data, error } = await a.client.rpc("suggested_players", { p_game: "valorant", p_limit: 10 });
    expect(error).toBeNull();
    const bRow = data!.find((r) => r.user_id === b.id);
    expect(bRow?.reasons.sort()).toEqual(["language", "rank", "region", "role", "schedule"]);
    // c tiene el mismo rol que a: no es «rol que te falta».
    expect(data!.find((r) => r.user_id === c.id)?.reasons).not.toContain("role");
    // b va antes que c (más motivos).
    expect(data!.findIndex((r) => r.user_id === b.id)).toBeLessThan(data!.findIndex((r) => r.user_id === c.id));
    expect(data!.map((r) => r.user_id)).not.toContain(a.id);
  });

  it("un bloqueo o un horario oculto se respetan; sin sesión no hay sugerencias", async () => {
    await b.client.rpc("block_user", { p_user: a.id });
    expect(((await a.client.rpc("suggested_players", { p_game: "valorant" })).data ?? []).map((r) => r.user_id)).not.toContain(b.id);
    await b.client.rpc("unblock_user", { p_user: a.id });
    await c.client.from("profiles").update({ availability_visibility: "private" }).eq("id", c.id);
    const cRow = (await a.client.rpc("suggested_players", { p_game: "valorant", p_limit: 10 })).data!.find((r) => r.user_id === c.id);
    expect(cRow?.reasons ?? []).not.toContain("schedule");
    expect((await anon().rpc("suggested_players", { p_game: "valorant" })).error).not.toBeNull();
  });
});

describe("fiabilidad", () => {
  let owner: U, b: U, stranger: U;
  beforeAll(async () => {
    assertEnv();
    [owner, b, stranger] = await Promise.all(["rel-o", "rel-b", "rel-x"].map((t) => createUser(t)));
  });
  afterAll(() => deleteUsers([owner?.id, b?.id, stranger?.id]));

  it("sin datos suficientes no hay porcentajes; sin sesión, nada", async () => {
    const { data } = await stranger.client.rpc("player_reliability", { p_user: b.id });
    expect(data).toMatchObject({ finished: 0, left: 0, completion_pct: null, response_pct: null });
    expect((await anon().rpc("player_reliability", { p_user: b.id })).error).not.toBeNull();
  });

  it("cuenta las salidas antes de cerrar y las respuestas del creador", async () => {
    for (let i = 0; i < 3; i++) {
      const { data: lobby, error } = await newLobby(owner);
      if (error) throw error;
      await b.client.rpc("request_join", { p_lobby: lobby!, p_message: "" });
      const { data: req } = await admin().from("lobby_requests").select("id").eq("lobby_id", lobby!).eq("user_id", b.id).single();
      await owner.client.rpc("respond_request", { p_request: req!.id, p_accept: true });
      expect((await b.client.rpc("leave_lobby", { p_lobby: lobby! })).error).toBeNull();
      await owner.client.rpc("close_lobby", { p_lobby: lobby! });
    }
    const { data: rb } = await stranger.client.rpc("player_reliability", { p_user: b.id });
    expect(rb).toMatchObject({ finished: 0, left: 3, completion_pct: 0 });
    const { data: ro } = await stranger.client.rpc("player_reliability", { p_user: owner.id });
    expect(ro).toMatchObject({ responded: 3, response_pct: 100 });
    expect((ro as { median_response_min: number }).median_response_min).toBeGreaterThanOrEqual(0);
    // Las salidas no las lee nadie directamente.
    expect((await b.client.from("lobby_departures").select("id")).error).not.toBeNull();
  });
});

describe("plantillas de grupo", () => {
  let owner: U, other: U;
  let lobby: string;
  beforeAll(async () => {
    assertEnv();
    [owner, other] = await Promise.all([createUser("tpl-o"), createUser("tpl-x")]);
    lobby = (await newLobby(owner, "duo")).data!;
  });
  afterAll(() => deleteUsers([owner?.id, other?.id]));

  it("solo el creador guarda su grupo como plantilla, y solo él la ve", async () => {
    expect((await other.client.rpc("save_lobby_template", { p_lobby: lobby, p_name: "Ajena" })).error?.code).toBe("42501");
    const { data: id, error } = await owner.client.rpc("save_lobby_template", { p_lobby: lobby, p_name: "Duo de noche" });
    expect(error).toBeNull();
    expect((await owner.client.from("lobby_templates").select("name, mode_slug").eq("id", id!).single()).data).toEqual({ name: "Duo de noche", mode_slug: "duo" });
    expect((await other.client.from("lobby_templates").select("id").eq("id", id!)).data).toEqual([]);
    expect((await owner.client.from("lobby_templates").insert({ user_id: owner.id, game_id: "valorant", name: "Directa", mode_slug: "duo" })).error).not.toBeNull();
    expect((await owner.client.rpc("save_lobby_template", { p_lobby: lobby, p_name: "<b>" })).error).not.toBeNull();
  });

  it("como mucho 5 por juego; se pueden borrar", async () => {
    for (let i = 0; i < 4; i++) await owner.client.rpc("save_lobby_template", { p_lobby: lobby, p_name: `Plantilla ${i}` });
    expect((await owner.client.rpc("save_lobby_template", { p_lobby: lobby, p_name: "Sexta" })).error?.hint).toBe("limit_templates");
    const { data } = await owner.client.from("lobby_templates").select("id");
    expect(data).toHaveLength(5);
    await owner.client.from("lobby_templates").delete().eq("id", data![0].id);
    expect((await owner.client.from("lobby_templates").select("id")).data).toHaveLength(4);
  });
});

describe("invitar amigos", () => {
  let a: U, b: U, c: U;
  let code: string;
  beforeAll(async () => {
    assertEnv();
    [a, b, c] = await Promise.all(["inv-a", "inv-b", "inv-c"].map((t) => createUser(t)));
  });
  afterAll(() => deleteUsers([a?.id, b?.id, c?.id]));

  it("cada cual tiene un código estable; el enlace público solo dice quién invita", async () => {
    code = (await a.client.rpc("my_invite_code")).data!;
    expect(code).toMatch(/^[a-z0-9]{8}$/);
    expect((await a.client.rpc("my_invite_code")).data).toBe(code);
    const { data: name } = await anon().rpc("invite_owner", { p_code: code });
    expect(typeof name).toBe("string");
    expect((await anon().rpc("invite_owner", { p_code: "zzzzzzzz" })).data).toBeNull();
    expect((await anon().rpc("my_invite_code")).error).not.toBeNull();
  });

  it("una cuenta nueva acepta una vez, se avisa y aparece en tus invitados", async () => {
    expect((await a.client.rpc("accept_invite", { p_code: code })).data).toBe(false); // a sí mismo
    expect((await b.client.rpc("accept_invite", { p_code: code })).data).toBe(true);
    expect((await b.client.rpc("accept_invite", { p_code: code })).data).toBe(false);
    expect((await a.client.from("notifications").select("kind")).data).toContainEqual({ kind: "friend_joined" });
    expect(((await a.client.rpc("my_invitees")).data ?? []).map((r) => r.user_id)).toEqual([b.id]);
    expect((await c.client.rpc("my_invitees")).data).toEqual([]);
    // Nadie se pone «invitado por» a mano.
    expect((await c.client.from("profiles").update({ invited_by: a.id }).eq("id", c.id)).error).not.toBeNull();
  });

  it("con un bloqueo de por medio no se acepta", async () => {
    await a.client.rpc("block_user", { p_user: c.id });
    expect((await c.client.rpc("accept_invite", { p_code: code })).data).toBe(false);
  });
});

describe("tarjeta compartible", () => {
  let a: U;
  beforeAll(async () => {
    assertEnv();
    a = await createUser("card-a");
  });
  afterAll(() => deleteUsers([a?.id]));

  const card = () => anon().rpc("public_player_card", { p_user: a.id, p_game: "valorant" });
  const save = (visibility: "public" | "registered") =>
    a.client.rpc("save_game_profile", {
      p_game_id: "valorant", p_rank_id: nil, p_region_id: nil, p_flex: true, p_visibility: visibility,
      p_roles: [], p_characters: [], p_modes: [],
    });

  it("solo se ve si su dueño la activa y su perfil del juego es público", async () => {
    await save("public");
    expect((await card()).data).toEqual([]);
    expect((await a.client.from("profiles").update({ share_card: true }).eq("id", a.id)).error).toBeNull();
    const { data } = await card();
    expect(data![0]).toMatchObject({ game_name: "VALORANT", flex: true, roles: [], mains: [] });
    expect(Object.keys(data![0])).not.toContain("languages");
    await save("registered");
    expect((await card()).data).toEqual([]);
  });
});

describe("buzón de sugerencias", () => {
  let a: U, b: U;
  beforeAll(async () => {
    assertEnv();
    [a, b] = await Promise.all([createUser("fb-a"), createUser("fb-b")]);
  });
  afterAll(() => deleteUsers([a?.id, b?.id]));

  it("se envían con sesión, solo las ve su autor (y moderación) y hay límite diario", async () => {
    expect((await anon().rpc("send_feedback", { p_kind: "idea", p_body: "Una idea muy buena", p_page: "" })).error).not.toBeNull();
    expect((await a.client.rpc("send_feedback", { p_kind: "queja", p_body: "Tipo que no existe", p_page: "" })).error).not.toBeNull();
    expect((await a.client.rpc("send_feedback", { p_kind: "bug", p_body: "corto", p_page: "" })).error).not.toBeNull();
    for (let i = 0; i < 5; i++) {
      expect((await a.client.rpc("send_feedback", { p_kind: "idea", p_body: `Idea número ${i} para mejorar`, p_page: "/inicio" })).error).toBeNull();
    }
    expect((await a.client.rpc("send_feedback", { p_kind: "idea", p_body: "Una más de la cuenta", p_page: "" })).error?.hint).toBe("rate_limited");
    expect((await a.client.from("feedback").select("id")).data).toHaveLength(5);
    expect((await b.client.from("feedback").select("id")).data).toEqual([]);
    expect((await a.client.from("feedback").insert({ user_id: a.id, kind: "idea", body: "Directo sin función" })).error).not.toBeNull();
    const { data: one } = await admin().from("feedback").select("id").eq("user_id", a.id).limit(1).single();
    expect((await a.client.rpc("set_feedback_status", { p_id: one!.id, p_status: "done" })).error?.code).toBe("42501");
  });
});
