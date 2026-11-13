import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

describe("partidas introducidas a mano", () => {
  let a: U, b: U;
  let omen: string, duo: string, csMode: string;

  beforeAll(async () => {
    assertEnv();
    [a, b] = await Promise.all([createUser("mm-a"), createUser("mm-b")]);
    omen = (await admin().from("game_characters").select("id").eq("game_id", "valorant").eq("slug", "omen").single()).data!.id;
    duo = (await admin().from("game_modes").select("id").eq("game_id", "valorant").eq("slug", "duo").single()).data!.id;
    csMode = (await admin().from("game_modes").select("id").eq("game_id", "cs2").limit(1).single()).data!.id;
  });

  afterAll(() => deleteUsers([a?.id, b?.id]));

  const add = (u: U, extra: Record<string, unknown> = {}) =>
    u.client.from("manual_matches").insert({ user_id: u.id, game_id: "valorant", played_on: today(), ...extra });

  it("se apuntan las propias y se validan modo, personaje y fecha del mismo juego", async () => {
    expect((await add(a, { mode_id: duo, character_id: omen, map_name: "Ascent", result: "win", kills: 20, deaths: 10, assists: 5 })).error).toBeNull();
    expect((await add(a, { mode_id: csMode })).error?.hint).toBe("invalid");
    expect((await add(a, { played_on: "2999-01-01" })).error?.hint).toBe("invalid");
    expect((await a.client.from("manual_matches").insert({ user_id: b.id, game_id: "valorant", played_on: today() })).error).not.toBeNull();
    expect((await add(a, { map_name: "<script>" })).error).not.toBeNull();
  });

  it("por defecto solo las ve su dueño; con «registrados», cualquiera con cuenta", async () => {
    expect((await b.client.from("manual_matches").select("id").eq("user_id", a.id)).data).toEqual([]);
    expect((await a.client.from("manual_matches").select("id").eq("user_id", a.id)).data).toHaveLength(1);
    await a.client.from("profiles").update({ matches_visibility: "registered" }).eq("id", a.id);
    expect((await b.client.from("manual_matches").select("id").eq("user_id", a.id)).data).toHaveLength(1);
    expect((await anon().from("manual_matches").select("id").eq("user_id", a.id)).data).toEqual([]);
    // Un bloqueo las oculta.
    await a.client.rpc("block_user", { p_user: b.id });
    expect((await b.client.from("manual_matches").select("id").eq("user_id", a.id)).data).toEqual([]);
    await a.client.rpc("unblock_user", { p_user: b.id });
  });

  it("nadie edita ni borra las de otro", async () => {
    const { data } = await a.client.from("manual_matches").select("id").eq("user_id", a.id).single();
    await b.client.from("manual_matches").delete().eq("id", data!.id);
    expect((await a.client.from("manual_matches").select("id").eq("id", data!.id)).data).toHaveLength(1);
    expect((await a.client.from("manual_matches").update({ kills: 99 }).eq("id", data!.id)).error).not.toBeNull();
    expect((await a.client.from("manual_matches").delete().eq("id", data!.id)).error).toBeNull();
  });
});

describe("equipos persistentes", () => {
  let owner: U, b: U, c: U;
  let team: string;

  beforeAll(async () => {
    assertEnv();
    [owner, b, c] = await Promise.all([createUser("tm-owner"), createUser("tm-b"), createUser("tm-c")]);
    const r = await owner.client.rpc("create_team", { p_game: "valorant", p_name: `Los del ${Date.now()}`, p_description: "Ranked por las noches" });
    if (r.error) throw r.error;
    team = r.data!;
  });

  afterAll(() => deleteUsers([owner?.id, b?.id, c?.id]));

  it("crear un equipo hace al creador dueño y miembro; nombres repetidos no", async () => {
    const { data } = await b.client.from("team_members").select("user_id, role").eq("team_id", team);
    expect(data).toEqual([{ user_id: owner.id, role: "owner" }]);
    const { data: t } = await owner.client.from("teams").select("name").eq("id", team).single();
    expect((await c.client.rpc("create_team", { p_game: "valorant", p_name: t!.name.toUpperCase(), p_description: "" })).error?.hint).toBe("duplicate");
    expect((await owner.client.from("teams").insert({ game_id: "valorant", name: "Directo", owner_id: owner.id })).error).not.toBeNull();
  });

  it("invitar, aceptar y avisar; solo el dueño invita", async () => {
    expect((await b.client.rpc("invite_to_team", { p_team: team, p_user: c.id })).error?.code).toBe("42501");
    const { data: invite, error } = await owner.client.rpc("invite_to_team", { p_team: team, p_user: b.id });
    expect(error).toBeNull();
    expect((await owner.client.rpc("invite_to_team", { p_team: team, p_user: b.id })).error?.hint).toBe("duplicate");
    expect((await b.client.from("notifications").select("kind")).data).toContainEqual({ kind: "team_invite" });
    // Otra persona no puede responder por b.
    expect((await c.client.rpc("respond_team_invite", { p_invite: invite!, p_accept: true })).error?.hint).toBe("not_pending");
    expect((await b.client.rpc("respond_team_invite", { p_invite: invite!, p_accept: true })).error).toBeNull();
    expect((await owner.client.from("notifications").select("kind")).data).toContainEqual({ kind: "team_joined" });
  });

  it("el chat solo lo leen y escriben los miembros, y se puede denunciar", async () => {
    const { data: mid, error } = await b.client.rpc("send_team_message", { p_team: team, p_body: "¿Jugamos a las 22?" });
    expect(error).toBeNull();
    expect((await owner.client.from("team_messages").select("body").eq("team_id", team)).data).toEqual([{ body: "¿Jugamos a las 22?" }]);
    expect((await c.client.from("team_messages").select("id").eq("team_id", team)).data).toEqual([]);
    expect((await c.client.rpc("send_team_message", { p_team: team, p_body: "intruso" })).error?.hint).toBe("not_member");
    const rep = await owner.client.rpc("report_team_message", { p_message: mid!, p_reason: "spam", p_details: "" });
    expect(rep.error).toBeNull();
    const { data: snap } = await admin().from("reports").select("message_snapshot, target_user_id").eq("id", rep.data!).single();
    expect(snap).toEqual({ message_snapshot: "¿Jugamos a las 22?", target_user_id: b.id });
  });

  it("no se invita a quien te ha bloqueado; el dueño saca a alguien y borra el equipo", async () => {
    await c.client.rpc("block_user", { p_user: owner.id });
    expect((await owner.client.rpc("invite_to_team", { p_team: team, p_user: c.id })).error?.hint).toBe("unavailable");
    await c.client.rpc("unblock_user", { p_user: owner.id });
    expect((await b.client.rpc("leave_team", { p_team: team, p_user: owner.id })).error).not.toBeNull();
    expect((await owner.client.rpc("leave_team", { p_team: team })).error?.hint).toBe("owner");
    expect((await owner.client.rpc("leave_team", { p_team: team, p_user: b.id })).error).toBeNull();
    expect((await b.client.rpc("send_team_message", { p_team: team, p_body: "hola" })).error?.hint).toBe("not_member");
    expect((await b.client.rpc("delete_team", { p_team: team })).error).not.toBeNull();
    expect((await owner.client.rpc("delete_team", { p_team: team })).error).toBeNull();
    expect((await owner.client.from("teams").select("id").eq("id", team)).data).toEqual([]);
  });

  it("sin sesión no se ven equipos", async () => {
    expect((await anon().from("teams").select("id").limit(1)).data ?? []).toEqual([]);
  });
});

describe("avisos por correo", () => {
  let a: U;
  beforeAll(async () => {
    assertEnv();
    a = await createUser("em-a");
  });
  afterAll(() => deleteUsers([a?.id]));

  it("vienen desactivados y cada cual los activa en su perfil", async () => {
    expect((await a.client.from("profiles").select("email_notifications").eq("id", a.id).single()).data).toEqual({ email_notifications: false });
    expect((await a.client.from("profiles").update({ email_notifications: true }).eq("id", a.id)).error).toBeNull();
    expect((await a.client.from("profiles").select("email_notifications").eq("id", a.id).single()).data).toEqual({ email_notifications: true });
  });
});
