import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;
const nil = null as unknown as string;

const newLobby = (u: U, startsAt: string | null = null) =>
  u.client.rpc("create_lobby", {
    p_game_id: "valorant", p_mode_slug: "duo", p_note: "", p_rank_min: nil, p_rank_max: nil, p_region: nil,
    p_language: nil, p_goal: nil, p_starts_at: startsAt ?? nil, p_roles: [],
  });

async function join(owner: U, member: U, lobby: string) {
  await member.client.rpc("request_join", { p_lobby: lobby, p_message: "" });
  const { data: req } = await admin().from("lobby_requests").select("id").eq("lobby_id", lobby).eq("user_id", member.id).single();
  await owner.client.rpc("respond_request", { p_request: req!.id, p_accept: true });
}

// Tarea de pg_cron: sin envoltorio público, se lanza como lo haría cron.
const runCron = (fn: string) =>
  execFileSync("docker", ["exec", "-i", "supabase_db_teamFinder", "psql", "-U", "postgres", "-qtAc", `select private.${fn}()`], { encoding: "utf8" });

const kinds = async (u: U) => ((await u.client.from("notifications").select("kind, lobby_id")).data ?? []);

describe("avisos de grupo", () => {
  let owner: U, b: U;
  beforeAll(async () => {
    assertEnv();
    [owner, b] = await Promise.all([createUser("rem-o"), createUser("rem-b")]);
  });
  afterAll(() => deleteUsers([owner?.id, b?.id]));

  it("al cerrar un grupo de 2 o más, todos reciben el recordatorio de karma", async () => {
    const lobby = (await newLobby(owner)).data!;
    await join(owner, b, lobby);
    await owner.client.rpc("close_lobby", { p_lobby: lobby });
    expect(await kinds(b)).toContainEqual({ kind: "karma_reminder", lobby_id: lobby });
    expect(await kinds(owner)).toContainEqual({ kind: "karma_reminder", lobby_id: lobby });
    // Un grupo cerrado sin nadie más no avisa.
    const solo = (await newLobby(owner)).data!;
    await owner.client.rpc("close_lobby", { p_lobby: solo });
    expect((await kinds(owner)).filter((n) => n.lobby_id === solo)).toEqual([]);
  });

  it("15 minutos antes de empezar, avisa una sola vez a los miembros", async () => {
    const soon = new Date(Date.now() + 10 * 60_000).toISOString();
    const lobby = (await newLobby(owner, soon)).data!;
    await join(owner, b, lobby);
    const later = (await newLobby(owner, new Date(Date.now() + 3 * 3_600_000).toISOString())).data!;
    expect(Number(runCron("remind_starting_lobbies"))).toBeGreaterThanOrEqual(1);
    expect((await b.client.rpc("remind_starting_lobbies" as never)).error).not.toBeNull();
    expect(await kinds(b)).toContainEqual({ kind: "lobby_starting", lobby_id: lobby });
    expect((await kinds(b)).filter((n) => n.lobby_id === later)).toEqual([]);
    runCron("remind_starting_lobbies");
    expect((await kinds(b)).filter((n) => n.kind === "lobby_starting" && n.lobby_id === lobby)).toHaveLength(1);
  });
});

describe("búsquedas guardadas con alerta", () => {
  let a: U, b: U, c: U;
  let duelist: string, eu: string, gold: string, gold3: string;
  beforeAll(async () => {
    assertEnv();
    [a, b, c] = await Promise.all(["ss-a", "ss-b", "ss-c"].map((t) => createUser(t)));
    const db = admin();
    const roles = (await db.from("game_roles").select("id, slug").eq("game_id", "valorant")).data!;
    duelist = roles.find((r) => r.slug === "duelist" || r.slug === "duelista")?.id ?? roles[0].id;
    eu = (await db.from("game_regions").select("id").eq("game_id", "valorant").limit(1).single()).data!.id;
    const ranks = (await db.from("game_ranks").select("id, tier").eq("game_id", "valorant").order("tier")).data!;
    gold = ranks[10].id;
    gold3 = ranks[12].id;
    for (const [u, vis] of [[b, "registered"], [c, "private"]] as const) {
      const r = await u.client.rpc("save_game_profile", {
        p_game_id: "valorant", p_rank_id: gold, p_region_id: eu, p_flex: false, p_visibility: vis,
        p_roles: [{ role_id: duelist, is_primary: true }], p_characters: [], p_modes: [],
      });
      if (r.error) throw r.error;
    }
  });
  afterAll(() => deleteUsers([a?.id, b?.id, c?.id]));

  it("se guardan con filtros del juego, solo las ve su dueño, máximo 5", async () => {
    const save = (name: string, role = duelist) =>
      a.client.rpc("save_search", {
        p_game: "valorant", p_name: name, p_query: "role=duelist", p_role: role, p_rank_min: gold, p_rank_max: gold3,
        p_region: eu, p_language: "",
      });
    expect((await save("Duelista oro")).error).toBeNull();
    expect((await save("Rol de otro juego", (await admin().from("game_roles").select("id").eq("game_id", "cs2").limit(1).single()).data!.id)).error?.hint).toBe("invalid");
    expect((await b.client.from("saved_searches").select("id")).data).toEqual([]);
    expect((await anon().from("saved_searches").select("id")).data ?? []).toEqual([]);
    expect((await a.client.from("saved_searches").insert({ user_id: a.id, game_id: "valorant", name: "Directa" })).error).not.toBeNull();
    for (let i = 0; i < 4; i++) await save(`Búsqueda ${i}`);
    expect((await save("Sexta")).error?.hint).toBe("limit_searches");
    // Deja solo la primera para la prueba de alertas.
    const { data } = await a.client.from("saved_searches").select("id, name").order("created_at");
    for (const s of data!.slice(1)) await a.client.from("saved_searches").delete().eq("id", s.id);
  });

  it("avisa cuando alguien que encaja se marca disponible, respetando privacidad, bloqueos y el margen de 3 h", async () => {
    // c encaja pero su perfil de juego es privado: no avisa.
    await c.client.rpc("set_available", { p_game: "valorant", p_hours: 1 });
    expect((await kinds(a)).filter((n) => n.kind === "search_match")).toEqual([]);
    // b bloqueado por a: no avisa.
    await a.client.rpc("block_user", { p_user: b.id });
    await b.client.rpc("set_available", { p_game: "valorant", p_hours: 1 });
    expect((await kinds(a)).filter((n) => n.kind === "search_match")).toEqual([]);
    await a.client.rpc("unblock_user", { p_user: b.id });
    await b.client.rpc("set_available", { p_game: "valorant", p_hours: 0 });
    await b.client.rpc("set_available", { p_game: "valorant", p_hours: 1 });
    const { data } = await a.client.from("notifications").select("kind, actor_id, body").eq("kind", "search_match");
    expect(data).toEqual([{ kind: "search_match", actor_id: b.id, body: "Duelista oro" }]);
    // Dentro de las 3 horas no repite.
    await b.client.rpc("set_available", { p_game: "valorant", p_hours: 0 });
    await b.client.rpc("set_available", { p_game: "valorant", p_hours: 2 });
    expect((await a.client.from("notifications").select("id").eq("kind", "search_match")).data).toHaveLength(1);
    // Con la alerta apagada, nada.
    const { data: s } = await a.client.from("saved_searches").select("id").single();
    expect((await a.client.from("saved_searches").update({ alerts: false }).eq("id", s!.id)).error).toBeNull();
    expect((await a.client.from("saved_searches").update({ name: "Otro" }).eq("id", s!.id)).error).not.toBeNull();
  });
});

describe("estadísticas de moderación", () => {
  let a: U;
  beforeAll(async () => {
    assertEnv();
    a = await createUser("st-a");
  });
  afterAll(() => deleteUsers([a?.id]));

  it("solo moderación las ve; son recuentos", async () => {
    expect((await a.client.rpc("admin_stats")).error?.code).toBe("42501");
    expect((await anon().rpc("admin_stats")).error).not.toBeNull();
    await admin().from("app_admins").insert({ user_id: a.id });
    const { data, error } = await a.client.rpc("admin_stats");
    expect(error).toBeNull();
    expect(data).toMatchObject({ users: expect.any(Number), lobbies_30d: expect.any(Number) });
    expect(JSON.stringify(data)).not.toContain(a.id);
    await admin().from("app_admins").delete().eq("user_id", a.id);
  });
});
