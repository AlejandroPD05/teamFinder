import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;

const saveProfile = (u: U, visibility: "public" | "registered" | "private" = "registered") =>
  u.client.rpc("save_game_profile", {
    p_game_id: "valorant",
    p_rank_id: null as unknown as string,
    p_region_id: null as unknown as string,
    p_flex: false,
    p_visibility: visibility,
    p_roles: [],
    p_characters: [],
    p_modes: [],
  });

describe("disponible ahora", () => {
  let a: U, b: U, c: U;
  beforeAll(async () => {
    assertEnv();
    [a, b, c] = await Promise.all(["av-a", "av-b", "av-c"].map((t) => createUser(t)));
    await Promise.all([saveProfile(a), saveProfile(b, "private")]);
  });
  afterAll(() => deleteUsers([a?.id, b?.id, c?.id]));

  it("se marca 1–3 horas, con modo opcional, y hace falta perfil de ese juego", async () => {
    const { data, error } = await a.client.rpc("set_available", { p_game: "valorant", p_hours: 2, p_mode: "duo" });
    expect(error).toBeNull();
    expect(new Date(data!).getTime() - Date.now()).toBeGreaterThan(1.9 * 3_600_000);
    expect((await a.client.rpc("set_available", { p_game: "valorant", p_hours: 5 })).error?.hint).toBe("invalid");
    expect((await a.client.rpc("set_available", { p_game: "valorant", p_hours: 1, p_mode: "wingman-falso" })).error?.hint).toBe("invalid");
    expect((await c.client.rpc("set_available", { p_game: "valorant", p_hours: 1 })).error?.hint).toBe("no_profile");
  });

  it("lo ven quienes pueden ver el perfil de juego, no si es privado ni con bloqueo", async () => {
    await b.client.rpc("set_available", { p_game: "valorant", p_hours: 1 });
    const seen = async (u: U) => ((await u.client.rpc("available_now", { p_game: "valorant" })).data ?? []).map((r) => r.user_id);
    expect(await seen(c)).toContain(a.id);
    expect(await seen(c)).not.toContain(b.id); // perfil privado
    await a.client.rpc("block_user", { p_user: c.id });
    expect(await seen(c)).not.toContain(a.id);
    await a.client.rpc("unblock_user", { p_user: c.id });
    // El contador agregado es público.
    const { data: counts } = await anon().rpc("available_counts");
    expect(counts!.find((x) => x.game_id === "valorant")!.players).toBeGreaterThanOrEqual(2);
    // Dejar de estar disponible.
    await a.client.rpc("set_available", { p_game: "valorant", p_hours: 0 });
    expect(await seen(c)).not.toContain(a.id);
  });
});

describe("grupos compartidos", () => {
  let owner: U, other: U;
  let lobby: string;
  beforeAll(async () => {
    assertEnv();
    [owner, other] = await Promise.all([createUser("sh-owner"), createUser("sh-other")]);
    const r = await owner.client.rpc("create_lobby", {
      p_game_id: "valorant", p_mode_slug: "trio", p_note: "Buen rollo", p_rank_min: null as unknown as string,
      p_rank_max: null as unknown as string, p_region: null as unknown as string, p_language: "es", p_goal: "ranked",
      p_starts_at: null as unknown as string, p_roles: [],
    });
    if (r.error) throw r.error;
    lobby = r.data!;
  });
  afterAll(() => deleteUsers([owner?.id, other?.id]));

  it("sin compartir no hay resumen público; solo el creador lo comparte", async () => {
    expect((await anon().rpc("shared_lobby", { p_lobby: lobby })).data).toEqual([]);
    expect((await other.client.rpc("share_lobby", { p_lobby: lobby })).error?.code).toBe("42501");
    expect((await owner.client.rpc("share_lobby", { p_lobby: lobby })).error).toBeNull();
    const { data } = await anon().rpc("shared_lobby", { p_lobby: lobby });
    expect(data![0]).toMatchObject({ id: lobby, game_name: "VALORANT", slots: 3, taken: 1, note: "Buen rollo", status: "open" });
    // El resumen no trae ids de personas.
    expect(Object.keys(data![0])).not.toContain("owner_id");
  });
});

describe("quedadas de equipo", () => {
  let owner: U, b: U, c: U, outsider: U;
  let team: string, event: string;
  beforeAll(async () => {
    assertEnv();
    [owner, b, c, outsider] = await Promise.all(["ev-o", "ev-b", "ev-c", "ev-x"].map((t) => createUser(t)));
    team = (await owner.client.rpc("create_team", { p_game: "valorant", p_name: `Quedadas ${Date.now()}`, p_description: "" })).data!;
    for (const u of [b, c]) {
      const { data: inv } = await owner.client.rpc("invite_to_team", { p_team: team, p_user: u.id });
      await u.client.rpc("respond_team_invite", { p_invite: inv!, p_accept: true });
    }
  });
  afterAll(() => deleteUsers([owner?.id, b?.id, c?.id, outsider?.id]));

  it("un miembro propone, se avisa al equipo y quien no es del equipo no ve nada", async () => {
    const starts = new Date(Date.now() + 2 * 3_600_000).toISOString();
    const r = await b.client.rpc("create_team_event", { p_team: team, p_starts_at: starts, p_note: "Ranked" });
    expect(r.error).toBeNull();
    event = r.data!;
    expect((await c.client.from("notifications").select("kind, team_id")).data).toContainEqual({ kind: "team_event", team_id: team });
    expect((await outsider.client.from("team_events").select("id").eq("team_id", team)).data).toEqual([]);
    expect((await outsider.client.rpc("create_team_event", { p_team: team, p_starts_at: starts, p_note: "" })).error?.hint).toBe("not_member");
    const far = new Date(Date.now() + 40 * 86_400_000).toISOString();
    expect((await b.client.rpc("create_team_event", { p_team: team, p_starts_at: far, p_note: "" })).error?.hint).toBe("invalid");
  });

  it("se responde y el grupo se crea con los que van", async () => {
    expect((await c.client.rpc("rsvp_team_event", { p_event: event, p_answer: "yes" })).error).toBeNull();
    expect((await owner.client.rpc("rsvp_team_event", { p_event: event, p_answer: "no" })).error).toBeNull();
    // Solo quien la propuso (b) o el dueño crean el grupo.
    expect((await c.client.rpc("team_event_lobby", { p_event: event, p_mode: "duo" })).error?.code).toBe("42501");
    const { data: lobby, error } = await b.client.rpc("team_event_lobby", { p_event: event, p_mode: "duo" });
    expect(error).toBeNull();
    const { data: members } = await admin().from("lobby_members").select("user_id").eq("lobby_id", lobby!);
    expect(members!.map((m) => m.user_id).sort()).toEqual([b.id, c.id].sort());
    expect((await admin().from("lobbies").select("status").eq("id", lobby!).single()).data).toEqual({ status: "full" });
    expect((await c.client.from("notifications").select("kind")).data).toContainEqual({ kind: "team_lobby" });
    expect((await b.client.rpc("team_event_lobby", { p_event: event, p_mode: "duo" })).error?.hint).toBe("duplicate");
  });
});

describe("bienvenida y notificaciones push", () => {
  let a: U, b: U;
  beforeAll(async () => {
    assertEnv();
    [a, b] = await Promise.all([createUser("pw-a"), createUser("pw-b")]);
  });
  afterAll(() => deleteUsers([a?.id, b?.id]));

  it("las cuentas nuevas empiezan sin guía hecha", async () => {
    expect((await a.client.from("profiles").select("onboarded_at").eq("id", a.id).single()).data).toEqual({ onboarded_at: null });
    expect((await a.client.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", a.id)).error).toBeNull();
  });

  it("cada cual gestiona solo sus suscripciones; la limpieza exige el secreto", async () => {
    const sub = { endpoint: `https://push.example.test/${a.id}`, p256dh: "x".repeat(40), auth: "y".repeat(16) };
    expect((await a.client.from("push_subscriptions").insert({ ...sub, user_id: a.id })).error).toBeNull();
    expect((await b.client.from("push_subscriptions").insert({ ...sub, endpoint: `${sub.endpoint}/b`, user_id: a.id })).error).not.toBeNull();
    expect((await b.client.from("push_subscriptions").select("id").eq("user_id", a.id)).data).toEqual([]);
    expect((await anon().rpc("prune_push_subscriptions", { p_secret: "adivinando", p_endpoints: [sub.endpoint] })).error).not.toBeNull();
    expect((await a.client.from("push_subscriptions").select("endpoint")).data).toEqual([{ endpoint: sub.endpoint }]);
  });
});
