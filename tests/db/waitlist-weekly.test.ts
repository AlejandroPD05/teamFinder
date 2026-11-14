import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;
const nil = null as unknown as string;

// Las tareas de pg_cron no tienen envoltorio público: se lanzan como lo haría cron.
const sql = (q: string) =>
  execFileSync("docker", ["exec", "-i", "supabase_db_teamFinder", "psql", "-U", "postgres", "-qtAc", q], { encoding: "utf8" }).trim();

const newLobby = (u: U) =>
  u.client.rpc("create_lobby", {
    p_game_id: "valorant", p_mode_slug: "duo", p_note: "", p_rank_min: nil, p_rank_max: nil, p_region: nil,
    p_language: nil, p_goal: nil, p_starts_at: nil, p_roles: [],
  });

async function join(owner: U, member: U, lobby: string) {
  await member.client.rpc("request_join", { p_lobby: lobby, p_message: "" });
  const { data: req } = await admin().from("lobby_requests").select("id").eq("lobby_id", lobby).eq("user_id", member.id).single();
  await owner.client.rpc("respond_request", { p_request: req!.id, p_accept: true });
}

const notes = async (u: U, kind: string) =>
  ((await u.client.from("notifications").select("kind, lobby_id").eq("kind", kind as never)).data ?? []);

describe("lista de espera", () => {
  let owner: U, b: U, c: U, d: U, e: U, lobby: string;
  beforeAll(async () => {
    assertEnv();
    [owner, b, c, d, e] = await Promise.all(["wl-o", "wl-b", "wl-c", "wl-d", "wl-e"].map((t) => createUser(t)));
    lobby = (await newLobby(owner)).data!;
  });
  afterAll(() => deleteUsers([owner?.id, b?.id, c?.id, d?.id, e?.id]));

  it("solo en grupos llenos y para quien no es del grupo", async () => {
    expect((await c.client.rpc("join_waitlist", { p_lobby: lobby })).error?.hint).toBe("not_full");
    await join(owner, b, lobby);
    expect((await admin().from("lobbies").select("status").eq("id", lobby).single()).data!.status).toBe("full");
    expect((await owner.client.rpc("join_waitlist", { p_lobby: lobby })).error?.hint).toBe("already_member");
    expect((await b.client.rpc("join_waitlist", { p_lobby: lobby })).error?.hint).toBe("already_member");
    await owner.client.rpc("block_user", { p_user: d.id });
    expect((await d.client.rpc("join_waitlist", { p_lobby: lobby })).error?.hint).toBe("not_open");
    expect((await c.client.rpc("join_waitlist", { p_lobby: lobby })).error).toBeNull();
    // Cada uno ve solo lo suyo: ni el creador sabe quién espera.
    expect((await c.client.from("lobby_waitlist").select("user_id")).data).toEqual([{ user_id: c.id }]);
    expect((await owner.client.from("lobby_waitlist").select("user_id")).data).toEqual([]);
    expect((await c.client.from("lobby_waitlist").insert({ lobby_id: lobby, user_id: c.id })).error).not.toBeNull();
  });

  it("al liberarse una plaza avisa a quien espera y vacía la lista", async () => {
    await b.client.rpc("leave_lobby", { p_lobby: lobby });
    expect(await notes(c, "waitlist_open")).toEqual([{ kind: "waitlist_open", lobby_id: lobby }]);
    expect((await admin().from("lobby_waitlist").select("user_id").eq("lobby_id", lobby)).data).toEqual([]);
  });

  it("se puede salir y al cerrar el grupo se borra", async () => {
    await join(owner, e, lobby);
    await c.client.rpc("join_waitlist", { p_lobby: lobby });
    await c.client.rpc("leave_waitlist", { p_lobby: lobby });
    expect((await c.client.from("lobby_waitlist").select("user_id")).data).toEqual([]);
    await c.client.rpc("join_waitlist", { p_lobby: lobby });
    await owner.client.rpc("close_lobby", { p_lobby: lobby });
    expect((await admin().from("lobby_waitlist").select("user_id").eq("lobby_id", lobby)).data).toEqual([]);
    expect(await notes(c, "waitlist_open")).toHaveLength(1);
  });
});

describe("quedadas semanales", () => {
  let owner: U, m: U, team: string;
  beforeAll(async () => {
    assertEnv();
    [owner, m] = await Promise.all([createUser("wk-o"), createUser("wk-m")]);
    team = (await owner.client.rpc("create_team", { p_game: "valorant", p_name: `Semanal ${Date.now()}`, p_description: "" })).data!;
    const { data: inv } = await owner.client.rpc("invite_to_team", { p_team: team, p_user: m.id });
    await m.client.rpc("respond_team_invite", { p_invite: inv!, p_accept: true });
  });
  afterAll(() => deleteUsers([owner?.id, m?.id]));

  const events = async () =>
    (await admin().from("team_events").select("id, starts_at, note, repeat_weekly, repeated").eq("team_id", team).order("starts_at")).data!;

  it("al empezar, crea la de la semana siguiente (una sola vez) y avisa al equipo", async () => {
    const soon = new Date(Date.now() + 60_000).toISOString();
    const { data: first, error } = await owner.client.rpc("create_team_event", { p_team: team, p_starts_at: soon, p_note: "Scrim", p_repeat: true });
    expect(error).toBeNull();
    // Hacemos que ya haya empezado y lanzamos la tarea como pg_cron.
    sql(`update public.team_events set starts_at = now() - interval '5 minutes' where id = '${first}'`);
    sql("select private.roll_team_events()");
    sql("select private.roll_team_events()");
    const list = await events();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ id: first, repeated: true });
    expect(list[1]).toMatchObject({ note: "Scrim", repeat_weekly: true, repeated: false });
    const gap = new Date(list[1].starts_at).getTime() - new Date(list[0].starts_at).getTime();
    expect(gap).toBe(7 * 86_400_000);
    const { data: notified } = await m.client.from("notifications").select("body").eq("kind", "team_event");
    expect(notified!.some((n) => n.body?.includes("cada semana"))).toBe(true);
  });

  it("dejar de repetir solo lo puede quien la propuso o el dueño", async () => {
    const next = (await events())[1];
    expect((await m.client.rpc("stop_team_event_repeat", { p_event: next.id })).error?.code).toBe("42501");
    expect((await owner.client.rpc("stop_team_event_repeat", { p_event: next.id })).error).toBeNull();
    sql(`update public.team_events set starts_at = now() - interval '1 minute' where id = '${next.id}'`);
    sql("select private.roll_team_events()");
    expect(await events()).toHaveLength(2);
  });

  it("sin marcar, no se repite", async () => {
    const { data: once } = await owner.client.rpc("create_team_event", { p_team: team, p_starts_at: new Date(Date.now() + 60_000).toISOString(), p_note: "" });
    sql(`update public.team_events set starts_at = now() - interval '1 minute' where id = '${once}'`);
    sql("select private.roll_team_events()");
    expect(await events()).toHaveLength(3);
  });
});
