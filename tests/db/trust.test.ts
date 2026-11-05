import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, assertEnv, createUser, deleteUsers, type Db } from "./helpers";

type U = { id: string; client: Db };
const nil = null as unknown as string;

async function lobbyWith(owner: U, guests: U[]) {
  const { data, error } = await owner.client.rpc("create_lobby", {
    p_game_id: "valorant", p_mode_slug: "five", p_note: "", p_rank_min: nil, p_rank_max: nil,
    p_region: nil, p_language: nil, p_goal: nil, p_starts_at: nil, p_roles: [],
  });
  if (error) throw error;
  const id = data as string;
  for (const g of guests) {
    await g.client.rpc("request_join", { p_lobby: id, p_message: "" });
    const req = (await admin().from("lobby_requests").select("id").eq("lobby_id", id).eq("user_id", g.id).eq("status", "pending").single()).data!;
    const { error: e } = await owner.client.rpc("respond_request", { p_request: req.id, p_accept: true });
    if (e) throw e;
  }
  return id;
}

async function publicGameProfile(u: U) {
  const { error } = await u.client.rpc("save_game_profile", {
    p_game_id: "valorant", p_rank_id: nil, p_region_id: nil, p_flex: false, p_visibility: "public",
    p_roles: [], p_characters: [], p_modes: [],
  });
  if (error) throw error;
}

describe("bloqueo", () => {
  let a: U, b: U, c: U;
  beforeAll(async () => {
    assertEnv();
    [a, b, c] = await Promise.all([createUser("t-a"), createUser("t-b"), createUser("t-c")]);
    await Promise.all([publicGameProfile(a), publicGameProfile(b)]);
  });
  afterAll(() => deleteUsers([a?.id, b?.id, c?.id]));

  it("el bloqueado desaparece de la búsqueda en ambos sentidos", async () => {
    const sees = async (viewer: U, target: U) =>
      ((await viewer.client.from("player_search").select("user_id").eq("user_id", target.id)).data ?? []).length;
    expect(await sees(a, b)).toBe(1);
    expect((await a.client.rpc("block_user", { p_user: b.id })).error).toBeNull();
    expect(await sees(a, b)).toBe(0);
    expect(await sees(b, a)).toBe(0);
    expect((await a.client.rpc("block_user", { p_user: a.id })).error?.hint).toBe("self");
  });

  it("no puede verse ni pedir unirse a grupos de quien le bloqueó; se retiran solicitudes", async () => {
    const lobby = await lobbyWith(a, []);
    const { data } = await b.client.from("lobbies").select("id").eq("id", lobby);
    expect(data).toEqual([]);
    expect((await b.client.rpc("request_join", { p_lobby: lobby, p_message: "" })).error?.hint).toBe("not_open");
  });

  it("en una sala compartida no ves los mensajes de quien bloqueaste", async () => {
    await a.client.rpc("unblock_user", { p_user: b.id });
    const lobby = await lobbyWith(c, [a, b]);
    await b.client.rpc("send_message", { p_lobby: lobby, p_body: "hola de b" });
    await c.client.rpc("send_message", { p_lobby: lobby, p_body: "hola de c" });
    await a.client.rpc("block_user", { p_user: b.id });
    const { data } = await a.client.from("lobby_messages").select("body").eq("lobby_id", lobby);
    expect(data!.map((m) => m.body)).toEqual(["hola de c"]);
    const { data: list } = await a.client.from("user_blocks").select("blocked_id");
    expect(list).toEqual([{ blocked_id: b.id }]);
    const { data: other } = await b.client.from("user_blocks").select("blocked_id");
    expect(other).toEqual([]); // b no ve que a le ha bloqueado
  });
});

describe("denuncias y moderación", () => {
  let reporter: U, target: U, mod: U;
  let lobby = "";
  beforeAll(async () => {
    assertEnv();
    [reporter, target, mod] = await Promise.all([createUser("r-rep"), createUser("r-tgt"), createUser("r-mod")]);
    await admin().from("app_admins").insert({ user_id: mod.id });
    lobby = await lobbyWith(reporter, [target]);
  });
  afterAll(() => deleteUsers([reporter?.id, target?.id, mod?.id]));

  it("denunciar un mensaje guarda una copia y solo lo ven quien denuncia y moderación", async () => {
    const msg = await target.client.rpc("send_message", { p_lobby: lobby, p_body: "mensaje ofensivo" });
    const { error } = await reporter.client.rpc("report_user", {
      p_target: target.id, p_reason: "harassment", p_details: "insultos", p_message: msg.data as number, p_lobby: lobby,
    });
    expect(error).toBeNull();
    const asTarget = await target.client.from("reports").select("id");
    expect(asTarget.data).toEqual([]);
    const asMod = await mod.client.from("reports").select("message_snapshot, status").eq("target_user_id", target.id);
    expect(asMod.data).toEqual([{ message_snapshot: "mensaje ofensivo", status: "open" }]);
  });

  it("no se puede denunciar un mensaje que no ves", async () => {
    const outsider = await createUser("r-out");
    const msg = await target.client.rpc("send_message", { p_lobby: lobby, p_body: "otro" });
    const r = await outsider.client.rpc("report_user", {
      p_target: target.id, p_reason: "spam", p_details: "", p_message: msg.data as number, p_lobby: lobby,
    });
    expect(r.error?.hint).toBe("invalid");
    await deleteUsers([outsider.id]);
  });

  it("solo moderación resuelve y queda registrado", async () => {
    const { data: rep } = await mod.client.from("reports").select("id").eq("target_user_id", target.id).single();
    expect((await reporter.client.rpc("resolve_report", { p_report: rep!.id, p_status: "dismissed", p_note: "" })).error).not.toBeNull();
    expect((await mod.client.rpc("resolve_report", { p_report: rep!.id, p_status: "actioned", p_note: "Aviso" })).error).toBeNull();
    const { data: log } = await mod.client.from("moderation_log").select("action, note").eq("report_id", rep!.id);
    expect(log).toEqual([{ action: "actioned", note: "Aviso" }]);
    const { data: logAsUser } = await reporter.client.from("moderation_log").select("id");
    expect(logAsUser).toEqual([]);
  });

  it("is_admin solo es cierto para moderación", async () => {
    expect((await mod.client.rpc("is_admin")).data).toBe(true);
    expect((await reporter.client.rpc("is_admin")).data).toBe(false);
  });
});

describe("karma", () => {
  let owner: U, mate: U, stranger: U;
  let lobby = "";
  beforeAll(async () => {
    assertEnv();
    [owner, mate, stranger] = await Promise.all([createUser("k-own"), createUser("k-mate"), createUser("k-str")]);
    lobby = await lobbyWith(owner, [mate]);
  });
  afterAll(() => deleteUsers([owner?.id, mate?.id, stranger?.id]));

  const vote = (u: U, target: string, value: 1 | -1, tags: string[] = []) =>
    u.client.rpc("vote_karma", { p_lobby: lobby, p_target: target, p_value: value, p_tags: tags });

  it("solo se vota en grupos cerrados", async () => {
    expect((await vote(owner, mate.id, 1)).error?.hint).toBe("not_closed");
    await owner.client.rpc("close_lobby", { p_lobby: lobby });
  });

  it("una vez por compañero, solo entre miembros y con etiquetas válidas", async () => {
    expect((await vote(owner, mate.id, 1, ["buen_companero", "comunicativo"])).error).toBeNull();
    expect((await vote(owner, mate.id, 1)).error?.hint).toBe("duplicate");
    expect((await vote(stranger, mate.id, 1)).error?.hint).toBe("not_member");
    expect((await vote(mate, owner.id, -1)).error).not.toBeNull(); // no hay votos negativos
    expect((await vote(mate, owner.id, 1, ["toxico"])).error).not.toBeNull();
    expect((await vote(mate, owner.id, 1, ["inventada"])).error).not.toBeNull();
    expect((await vote(mate, mate.id, 1)).error).not.toBeNull();
  });

  it("el resumen público da totales y etiquetas, no quién votó", async () => {
    const { data } = await stranger.client.rpc("karma_summary", { p_user: mate.id });
    expect(data).toEqual([{ positives: 1, negatives: 0, top_tags: ["buen_companero", "comunicativo"] }]);
    const { data: raw } = await stranger.client.from("karma_votes").select("*").eq("target_id", mate.id);
    expect(raw).toEqual([]);
  });
});

describe("borrado de cuenta", () => {
  it("borra perfil, datos de juego y mensajes; conserva denuncias anonimizadas", async () => {
    const [gone, other] = await Promise.all([createUser("del-me"), createUser("del-other")]);
    await publicGameProfile(gone);
    const lobby = await lobbyWith(other, [gone]);
    await gone.client.rpc("send_message", { p_lobby: lobby, p_body: "adiós" });
    await gone.client.rpc("report_user", { p_target: other.id, p_reason: "spam", p_details: "" });

    expect((await gone.client.rpc("delete_my_account")).error).toBeNull();
    const db = admin();
    expect((await db.from("profiles").select("id").eq("id", gone.id)).data).toEqual([]);
    expect((await db.from("game_profiles").select("user_id").eq("user_id", gone.id)).data).toEqual([]);
    expect((await db.from("lobby_messages").select("id").eq("lobby_id", lobby)).data).toEqual([]);
    expect((await db.auth.admin.getUserById(gone.id)).data.user).toBeNull();
    const { data: reports } = await db.from("reports").select("reporter_id").eq("target_user_id", other.id);
    expect(reports).toEqual([{ reporter_id: null }]);
    await deleteUsers([other.id]);
  });
});
