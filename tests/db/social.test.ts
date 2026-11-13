import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;

const vid = () => Math.random().toString(36).slice(2, 13).padEnd(11, "x");

// Restricciones, notificaciones, mensajes privados, redes, insignias y fanart (migraciones 20261113*).
describe("restricciones temporales y notificaciones", () => {
  let mod: U, a: U, b: U;
  let ace: string;

  beforeAll(async () => {
    assertEnv();
    [mod, a, b] = await Promise.all(["r-mod", "r-a", "r-b"].map((t) => createUser(t)));
    await admin().from("app_admins").insert({ user_id: mod.id });
    ace = (await admin().from("clip_emblems").select("id").eq("slug", "ace").single()).data!.id;
  });

  afterAll(async () => {
    await admin().from("app_admins").delete().eq("user_id", mod.id);
    await deleteUsers([mod?.id, a?.id, b?.id]);
  });

  it("comentar un clip avisa a su autor (y no a quien comenta)", async () => {
    const { data: clip } = await a.client.rpc("post_clip", { p_game: "cs2", p_emblem: ace, p_title: "Clutch 1v3", p_provider: "youtube", p_video: vid() });
    expect((await b.client.rpc("comment_clip", { p_clip: clip!, p_body: "¡Brutal!" })).error).toBeNull();
    const { data: notes } = await a.client.from("notifications").select("kind, actor_id, clip_id, body, read_at");
    expect(notes).toContainEqual({ kind: "clip_comment", actor_id: b.id, clip_id: clip, body: "¡Brutal!", read_at: null });
    expect((await b.client.from("notifications").select("id")).data).toEqual([]);
  });

  it("cada persona solo ve sus notificaciones y puede marcarlas como leídas", async () => {
    expect((await b.client.from("notifications").select("id").eq("user_id", a.id)).data).toEqual([]);
    expect((await a.client.from("notifications").insert({ user_id: a.id, kind: "karma" })).error).not.toBeNull();
    await a.client.rpc("mark_notifications_read", {});
    const { data } = await a.client.from("notifications").select("read_at");
    expect(data!.every((n) => n.read_at)).toBe(true);
  });

  it("solo moderación restringe", async () => {
    const { error } = await a.client.rpc("restrict_user", { p_user: b.id, p_days: 7, p_reason: "spam" });
    expect(error?.code).toBe("42501");
    expect((await a.client.from("user_restrictions").insert({ user_id: b.id, until: new Date().toISOString(), reason: "xxx" })).error).not.toBeNull();
  });

  it("una restricción bloquea publicar, comentar, dar emblemas, crear grupos y escribir, y se notifica", async () => {
    const { data: clip } = await a.client.rpc("post_clip", { p_game: "cs2", p_emblem: ace, p_title: "Otro clip", p_provider: "youtube", p_video: vid() });
    const { data: rid, error } = await mod.client.rpc("restrict_user", { p_user: b.id, p_days: 3, p_reason: "Insultos en el chat" });
    expect(error).toBeNull();

    const post = await b.client.rpc("post_clip", { p_game: "cs2", p_emblem: ace, p_title: "No debería", p_provider: "youtube", p_video: vid() });
    expect(post.error?.hint).toBe("restricted");
    expect((await b.client.rpc("comment_clip", { p_clip: clip!, p_body: "hola" })).error?.hint).toBe("restricted");
    expect((await b.client.rpc("toggle_clip_vote", { p_clip: clip!, p_emblem: ace })).error?.hint).toBe("restricted");
    const { data: conv } = await b.client.rpc("start_conversation", { p_other: a.id });
    expect((await b.client.rpc("send_direct_message", { p_conversation: conv!, p_body: "hola" })).error?.hint).toBe("restricted");

    const { data: notes } = await b.client.from("notifications").select("kind, body").eq("kind", "restriction");
    expect(notes?.[0]?.body).toContain("Insultos en el chat");
    // Ve su propia restricción; otra persona no.
    expect((await b.client.from("user_restrictions").select("id")).data).toHaveLength(1);
    expect((await a.client.from("user_restrictions").select("id")).data).toEqual([]);

    expect((await mod.client.rpc("lift_restriction", { p_restriction: rid! })).error).toBeNull();
    expect((await b.client.rpc("comment_clip", { p_clip: clip!, p_body: "Perdón" })).error).toBeNull();
  });

  it("la duración está acotada", async () => {
    expect((await mod.client.rpc("restrict_user", { p_user: b.id, p_days: 365, p_reason: "demasiado" })).error).not.toBeNull();
    expect((await mod.client.rpc("restrict_user", { p_user: mod.id, p_days: 1, p_reason: "a mí" })).error?.hint).toBe("self");
  });
});

describe("mensajes privados", () => {
  let a: U, b: U, c: U;
  let conv: string;

  beforeAll(async () => {
    assertEnv();
    [a, b, c] = await Promise.all(["dm-a", "dm-b", "dm-c"].map((t) => createUser(t)));
  });

  afterAll(async () => {
    await deleteUsers([a?.id, b?.id, c?.id]);
  });

  it("abre una conversación (una sola por pareja) y no contigo mismo", async () => {
    const r = await a.client.rpc("start_conversation", { p_other: b.id });
    expect(r.error).toBeNull();
    conv = r.data!;
    expect((await b.client.rpc("start_conversation", { p_other: a.id })).data).toBe(conv);
    expect((await a.client.rpc("start_conversation", { p_other: a.id })).error?.hint).toBe("self");
  });

  it("solo las dos personas leen los mensajes", async () => {
    const { data: mid, error } = await a.client.rpc("send_direct_message", { p_conversation: conv, p_body: "  ¿Jugamos?  " });
    expect(error).toBeNull();
    expect((await b.client.from("direct_messages").select("id, body").eq("conversation_id", conv)).data).toEqual([{ id: mid, body: "¿Jugamos?" }]);
    expect((await c.client.from("direct_messages").select("id").eq("conversation_id", conv)).data).toEqual([]);
    expect((await c.client.rpc("send_direct_message", { p_conversation: conv, p_body: "intruso" })).error?.hint).toBe("unavailable");
    expect((await anon().from("direct_messages").select("id")).error).not.toBeNull();
    // Nadie escribe directamente en la tabla.
    expect((await a.client.from("direct_messages").insert({ conversation_id: conv, sender_id: a.id, body: "x" })).error).not.toBeNull();
  });

  it("cuenta los no leídos y los marca al leer", async () => {
    const unread = async (u: U) => (await u.client.rpc("my_conversations")).data!.find((x) => x.conversation_id === conv)!.unread;
    expect(Number(await unread(b))).toBe(1);
    expect(Number(await unread(a))).toBe(0);
    await b.client.rpc("mark_direct_read", { p_conversation: conv });
    expect(Number(await unread(b))).toBe(0);
  });

  it("se puede denunciar un mensaje recibido, con copia", async () => {
    const { data: msgs } = await b.client.from("direct_messages").select("id").eq("conversation_id", conv);
    const r = await b.client.rpc("report_direct_message", { p_message: msgs![0].id, p_reason: "spam", p_details: "" });
    expect(r.error).toBeNull();
    const { data: rep } = await admin().from("reports").select("target_user_id, message_snapshot").eq("id", r.data!).single();
    expect(rep).toEqual({ target_user_id: a.id, message_snapshot: "¿Jugamos?" });
    expect((await a.client.rpc("report_direct_message", { p_message: msgs![0].id, p_reason: "spam", p_details: "" })).error?.hint).toBe("invalid");
  });

  it("quien cierra los privados no recibe conversaciones nuevas", async () => {
    await c.client.from("profiles").update({ dm_policy: "none" }).eq("id", c.id);
    expect((await a.client.rpc("start_conversation", { p_other: c.id })).error?.hint).toBe("closed");
    await c.client.from("profiles").update({ dm_policy: "registered" }).eq("id", c.id);
  });

  it("un bloqueo corta la conversación", async () => {
    await b.client.rpc("block_user", { p_user: a.id });
    expect((await a.client.rpc("send_direct_message", { p_conversation: conv, p_body: "¿hola?" })).error?.hint).toBe("unavailable");
    expect((await a.client.rpc("start_conversation", { p_other: b.id })).error?.hint).toBe("unavailable");
    await b.client.rpc("unblock_user", { p_user: a.id });
  });
});

describe("redes, insignias y fanart", () => {
  let mod: U, a: U, b: U;

  beforeAll(async () => {
    assertEnv();
    [mod, a, b] = await Promise.all(["f-mod", "f-a", "f-b"].map((t) => createUser(t)));
    await admin().from("app_admins").insert({ user_id: mod.id });
  });

  afterAll(async () => {
    await admin().from("app_admins").delete().eq("user_id", mod.id);
    await deleteUsers([mod?.id, a?.id, b?.id]);
  });

  it("las redes solo admiten nombres de usuario y respetan su visibilidad", async () => {
    expect((await a.client.from("profiles").update({ social_twitch: "https://evil.example" }).eq("id", a.id)).error).not.toBeNull();
    expect((await a.client.from("profiles").update({ social_twitch: "jugadora_1", socials_visibility: "private" }).eq("id", a.id)).error).toBeNull();
    const seen = async () => (await b.client.from("profile_cards").select("social_twitch, dm_policy").eq("id", a.id).single()).data;
    expect(await seen()).toEqual({ social_twitch: null, dm_policy: "registered" });
    await a.client.from("profiles").update({ socials_visibility: "registered" }).eq("id", a.id);
    expect((await seen())!.social_twitch).toBe("jugadora_1");
  });

  it("las insignias solo con sesión", async () => {
    const { data, error } = await b.client.rpc("player_badges", { p_user: a.id });
    expect(error).toBeNull();
    expect(data).toEqual({ cards: [], clip_awards: [], rank_awards: [] });
    expect((await anon().rpc("player_badges", { p_user: a.id })).error).not.toBeNull();
  });

  it("fanart: sube a su carpeta, se revisa y, aprobado, es una carta; al retirarlo deja de mostrarse", async () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const path = `${a.id}/obra1.png`;
    // No puede subir a la carpeta de otra persona.
    expect((await b.client.storage.from("fanart").upload(`${a.id}/ajena.png`, png, { contentType: "image/png" })).error).not.toBeNull();
    expect((await a.client.storage.from("fanart").upload(path, png, { contentType: "image/png" })).error).toBeNull();

    // Sin imagen subida no hay envío.
    const missing = await a.client.rpc("submit_fanart", { p_game: "valorant", p_title: "Jett", p_artist: "Ana", p_portfolio: "", p_path: `${a.id}/nada.png`, p_license: "v1" });
    expect(missing.error?.hint).toBe("invalid");
    const { data: sid, error } = await a.client.rpc("submit_fanart", { p_game: "valorant", p_title: "Jett al viento", p_artist: "Ana Dibuja", p_portfolio: "", p_path: path, p_license: "v1" });
    expect(error).toBeNull();
    expect((await b.client.from("fanart_submissions").select("id")).data).toEqual([]);

    const url = a.client.storage.from("fanart").getPublicUrl(path).data.publicUrl;
    expect((await a.client.rpc("review_fanart", { p_id: sid!, p_approve: true, p_image_url: url, p_rarity: "rare", p_note: "" })).error?.code).toBe("42501");
    expect((await mod.client.rpc("review_fanart", { p_id: sid!, p_approve: true, p_image_url: url, p_rarity: "rare", p_note: "" })).error).toBeNull();

    const { data: sub } = await a.client.from("fanart_submissions").select("status, card_id").eq("id", sid!).single();
    expect(sub!.status).toBe("approved");
    const { data: card } = await admin().from("collectible_cards").select("source, credit, active, image_url").eq("id", sub!.card_id!).single();
    expect(card).toEqual({ source: "fanart", credit: "Fanart de Ana Dibuja", active: true, image_url: url });
    expect((await a.client.from("notifications").select("kind").eq("kind", "fanart")).data).toHaveLength(1);

    expect((await a.client.rpc("withdraw_fanart", { p_id: sid! })).error).toBeNull();
    expect((await admin().from("collectible_cards").select("active").eq("id", sub!.card_id!).single()).data!.active).toBe(false);
    expect((await b.client.rpc("withdraw_fanart", { p_id: sid! })).error).not.toBeNull();
    await a.client.storage.from("fanart").remove([path]);
    await admin().from("collectible_cards").delete().eq("id", sub!.card_id!);
  });
});
