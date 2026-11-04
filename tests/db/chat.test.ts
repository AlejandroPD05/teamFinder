import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, assertEnv, createUser, deleteUsers, type Db } from "./helpers";

type U = { id: string; client: Db };
const nil = null as unknown as string;

describe("chat de sala", () => {
  let owner: U, member: U, outsider: U;
  let lobby = "";

  beforeAll(async () => {
    assertEnv();
    [owner, member, outsider] = await Promise.all([createUser("c-owner"), createUser("c-member"), createUser("c-out")]);
    const { data, error } = await owner.client.rpc("create_lobby", {
      p_game_id: "valorant", p_mode_slug: "trio", p_note: "", p_rank_min: nil, p_rank_max: nil,
      p_region: nil, p_language: nil, p_goal: nil, p_starts_at: nil, p_roles: [],
    });
    if (error) throw error;
    lobby = data as string;
    await member.client.rpc("request_join", { p_lobby: lobby, p_message: "" });
    const req = (await admin().from("lobby_requests").select("id").eq("lobby_id", lobby).eq("user_id", member.id).single()).data!;
    await owner.client.rpc("respond_request", { p_request: req.id, p_accept: true });
  });

  afterAll(() => deleteUsers([owner?.id, member?.id, outsider?.id]));

  it("los miembros envían y leen mensajes", async () => {
    expect((await member.client.rpc("send_message", { p_lobby: lobby, p_body: "  ¿Jugamos a las 22?  " })).error).toBeNull();
    const { data } = await owner.client.from("lobby_messages").select("body, user_id").eq("lobby_id", lobby);
    expect(data).toEqual([{ body: "¿Jugamos a las 22?", user_id: member.id }]);
  });

  it("alguien de fuera no puede leer ni escribir", async () => {
    const { data } = await outsider.client.from("lobby_messages").select("id").eq("lobby_id", lobby);
    expect(data).toEqual([]);
    const send = await outsider.client.rpc("send_message", { p_lobby: lobby, p_body: "hola" });
    expect(send.error?.hint).toBe("not_member");
    const direct = await outsider.client.from("lobby_messages").insert({ lobby_id: lobby, user_id: outsider.id, body: "x" });
    expect(direct.error).not.toBeNull();
  });

  it("rechaza mensajes vacíos o de más de 500 caracteres", async () => {
    expect((await member.client.rpc("send_message", { p_lobby: lobby, p_body: "   " })).error?.hint).toBe("invalid");
    expect((await member.client.rpc("send_message", { p_lobby: lobby, p_body: "a".repeat(501) })).error?.hint).toBe("invalid");
  });

  it("sin leer: cuenta los mensajes de otros y se pone a cero al marcar como leído", async () => {
    const before = (await owner.client.rpc("my_rooms")).data!.find((r) => r.lobby_id === lobby)!;
    expect(before.unread).toBe(1);
    expect(before.last_body).toBe("¿Jugamos a las 22?");
    await owner.client.rpc("mark_read", { p_lobby: lobby });
    const after = (await owner.client.rpc("my_rooms")).data!.find((r) => r.lobby_id === lobby)!;
    expect(after.unread).toBe(0);
    const mine = (await member.client.rpc("my_rooms")).data!.find((r) => r.lobby_id === lobby)!;
    expect(mine.unread).toBe(0); // los propios no cuentan
    expect((await outsider.client.rpc("my_rooms")).data).toEqual([]);
  });

  it("límite de ritmo: más de 5 mensajes en 10 s se rechazan", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await owner.client.rpc("send_message", { p_lobby: lobby, p_body: `m${i}` }));
    expect(results.slice(0, 5).every((r) => r.error == null)).toBe(true);
    expect(results[5].error?.hint).toBe("rate_limited");
  });

  it("quien sale del grupo deja de ver la sala", async () => {
    await member.client.rpc("leave_lobby", { p_lobby: lobby });
    const { data } = await member.client.from("lobby_messages").select("id").eq("lobby_id", lobby);
    expect(data).toEqual([]);
  });

  it("una sala cerrada es de solo lectura", async () => {
    await owner.client.rpc("close_lobby", { p_lobby: lobby });
    const { data } = await owner.client.from("lobby_messages").select("id").eq("lobby_id", lobby);
    expect(data!.length).toBeGreaterThan(0);
    const r = await owner.client.rpc("send_message", { p_lobby: lobby, p_body: "¿hola?" });
    expect(r.error?.hint).toBe("closed");
  });
});
