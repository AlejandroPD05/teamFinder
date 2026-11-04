import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, assertEnv, createUser, deleteUsers, type Db } from "./helpers";

type U = { id: string; client: Db };

async function newLobby(u: U, mode = "duo", roles: string[] = []) {
  const { data, error } = await u.client.rpc("create_lobby", {
    p_game_id: "valorant",
    p_mode_slug: mode,
    p_note: "Grupo de prueba",
    p_rank_min: null as unknown as string,
    p_rank_max: null as unknown as string,
    p_region: null as unknown as string,
    p_language: "es",
    p_goal: "ranked",
    p_starts_at: null as unknown as string,
    p_roles: roles,
  });
  if (error) throw error;
  return data as string;
}

const request = (u: U, lobby: string) => u.client.rpc("request_join", { p_lobby: lobby, p_message: "¿Hueco?" });
const requestId = async (lobby: string, user: string) =>
  (await admin().from("lobby_requests").select("id").eq("lobby_id", lobby).eq("user_id", user).eq("status", "pending").single()).data!.id;

describe("grupos y solicitudes", () => {
  let owner: U, b: U, c: U, d: U;
  let controller = "";
  let lobby = "";

  beforeAll(async () => {
    assertEnv();
    [owner, b, c, d] = await Promise.all([createUser("l-owner"), createUser("l-b"), createUser("l-c"), createUser("l-d")]);
    controller = (await admin().from("game_roles").select("id").eq("game_id", "valorant").eq("slug", "controller").single()).data!.id;
    lobby = await newLobby(owner, "duo", [controller]);
  });

  afterAll(() => deleteUsers([owner?.id, b?.id, c?.id, d?.id]));

  it("crear un grupo: el creador ocupa una plaza y las plazas salen del modo", async () => {
    const { data } = await owner.client.from("lobbies").select("slots, status").eq("id", lobby).single();
    expect(data).toEqual({ slots: 2, status: "open" });
    const { data: members } = await b.client.from("lobby_members").select("user_id").eq("lobby_id", lobby);
    expect(members).toEqual([{ user_id: owner.id }]);
    const { data: roles } = await b.client.from("lobby_needed_roles").select("role_id").eq("lobby_id", lobby);
    expect(roles).toEqual([{ role_id: controller }]);
  });

  it("no se puede escribir directamente en las tablas", async () => {
    const { error } = await b.client.from("lobby_members").insert({ lobby_id: lobby, user_id: b.id });
    expect(error).not.toBeNull();
    const { error: e2 } = await b.client.from("lobbies").update({ status: "closed" }).eq("id", lobby);
    expect(e2).not.toBeNull();
  });

  it("solicitar unirse y sin solicitudes duplicadas", async () => {
    expect((await request(b, lobby)).error).toBeNull();
    const dup = await request(b, lobby);
    expect(dup.error?.hint).toBe("duplicate");
    expect((await request(c, lobby)).error).toBeNull();
    const own = await request(owner, lobby);
    expect(own.error?.hint).toBe("already_member");
  });

  it("cada solicitud la ven su autor y el creador, nadie más", async () => {
    const { data: asOwner } = await owner.client.from("lobby_requests").select("user_id").eq("lobby_id", lobby);
    expect(asOwner).toHaveLength(2);
    const { data: asB } = await b.client.from("lobby_requests").select("user_id").eq("lobby_id", lobby);
    expect(asB).toEqual([{ user_id: b.id }]);
    const { data: asD } = await d.client.from("lobby_requests").select("user_id").eq("lobby_id", lobby);
    expect(asD).toEqual([]);
  });

  it("solo el creador responde solicitudes", async () => {
    const { error } = await b.client.rpc("respond_request", { p_request: await requestId(lobby, c.id), p_accept: true });
    expect(error).not.toBeNull();
  });

  it("dos aceptaciones simultáneas para la última plaza: entra solo una", async () => {
    const [rb, rc] = await Promise.all([requestId(lobby, b.id), requestId(lobby, c.id)]);
    const results = await Promise.all([
      owner.client.rpc("respond_request", { p_request: rb, p_accept: true }),
      owner.client.rpc("respond_request", { p_request: rc, p_accept: true }),
    ]);
    expect(results.filter((r) => r.error == null)).toHaveLength(1);
    const { data: l } = await owner.client.from("lobbies").select("status").eq("id", lobby).single();
    expect(l?.status).toBe("full");
    const { count } = await owner.client.from("lobby_members").select("*", { count: "exact", head: true }).eq("lobby_id", lobby);
    expect(count).toBe(2);
  });

  it("un grupo completo no admite más solicitudes", async () => {
    const r = await request(d, lobby);
    expect(r.error?.hint).toBe("not_open");
  });

  it("si alguien sale, el grupo vuelve a estar abierto", async () => {
    const { data: members } = await owner.client.from("lobby_members").select("user_id").eq("lobby_id", lobby);
    const guest = [b, c].find((u) => members!.some((m) => m.user_id === u.id))!;
    expect((await guest.client.rpc("leave_lobby", { p_lobby: lobby })).error).toBeNull();
    const { data: l } = await owner.client.from("lobbies").select("status").eq("id", lobby).single();
    expect(l?.status).toBe("open");
    const ownerLeaves = await owner.client.rpc("leave_lobby", { p_lobby: lobby });
    expect(ownerLeaves.error?.hint).toBe("owner");
  });

  it("cerrar: rechaza las pendientes y solo los miembros siguen viendo el grupo", async () => {
    expect((await request(d, lobby)).error).toBeNull();
    expect((await b.client.rpc("close_lobby", { p_lobby: lobby })).error).not.toBeNull();
    expect((await owner.client.rpc("close_lobby", { p_lobby: lobby })).error).toBeNull();
    const { data: req } = await d.client.from("lobby_requests").select("status").eq("lobby_id", lobby).single();
    expect(req?.status).toBe("rejected");
    const { data: seenByD } = await d.client.from("lobbies").select("id").eq("id", lobby);
    expect(seenByD).toEqual([]);
    const { data: seenByOwner } = await owner.client.from("lobbies").select("id").eq("id", lobby);
    expect(seenByOwner).toHaveLength(1);
  });

  it("como mucho 3 grupos abiertos por persona", async () => {
    await newLobby(d, "five");
    await newLobby(d, "trio");
    await newLobby(d, "duo");
    const { error } = await d.client.rpc("create_lobby", {
      p_game_id: "valorant",
      p_mode_slug: "duo",
      p_note: "",
      p_rank_min: null as unknown as string,
      p_rank_max: null as unknown as string,
      p_region: null as unknown as string,
      p_language: null as unknown as string,
      p_goal: null as unknown as string,
      p_starts_at: null as unknown as string,
      p_roles: [],
    });
    expect(error?.hint).toBe("limit_lobbies");
  });

  it("modo inexistente o rol de otro juego se rechazan", async () => {
    const bad = await c.client.rpc("create_lobby", {
      p_game_id: "valorant",
      p_mode_slug: "sixstack",
      p_note: "",
      p_rank_min: null as unknown as string,
      p_rank_max: null as unknown as string,
      p_region: null as unknown as string,
      p_language: null as unknown as string,
      p_goal: null as unknown as string,
      p_starts_at: null as unknown as string,
      p_roles: [],
    });
    expect(bad.error).not.toBeNull();
  });
});
