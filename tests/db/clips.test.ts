import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;

describe("Clip Zone", () => {
  let author: U, fan: U, blocker: U, mod: U;
  let ace: string, comedy: string, clip: string;
  const video = () => Math.random().toString(36).slice(2, 13).padEnd(11, "x");

  beforeAll(async () => {
    assertEnv();
    [author, fan, blocker, mod] = await Promise.all([
      createUser("clip-author"),
      createUser("clip-fan"),
      createUser("clip-blocker"),
      createUser("clip-mod"),
    ]);
    await admin().from("app_admins").insert({ user_id: mod.id });
    const { data } = await admin().from("clip_emblems").select("id, slug");
    ace = data!.find((e) => e.slug === "ace")!.id;
    comedy = data!.find((e) => e.slug === "comedy")!.id;
  });

  afterAll(async () => {
    await admin().from("app_admins").delete().eq("user_id", mod.id);
    await deleteUsers([author?.id, fan?.id, blocker?.id, mod?.id]);
  });

  const post = (u: U, v = video(), provider: "youtube" | "twitch" | "streamable" = "youtube") =>
    u.client.rpc("post_clip", { p_game: "valorant", p_emblem: ace, p_title: "Ace con Jett", p_provider: provider, p_video: v });

  it("publica un clip válido y rechaza ids de vídeo inválidos o repetidos", async () => {
    const v = video();
    const { data, error } = await post(author, v);
    expect(error).toBeNull();
    clip = data!;
    expect((await post(fan, v)).error?.hint).toBe("duplicate");
    expect((await post(author, "corto")).error).not.toBeNull();
    expect((await post(author, "https://evil.example/x", "twitch")).error).not.toBeNull();
  });

  it("los clips no se escriben a mano", async () => {
    const insert = await fan.client.from("clips").insert({
      user_id: fan.id, game_id: "valorant", emblem_id: ace, title: "Hack", provider: "youtube", video_id: video(),
    });
    expect(insert.error).not.toBeNull();
    const vote = await fan.client.from("clip_votes").insert({ clip_id: clip, user_id: fan.id, emblem_id: ace });
    expect(vote.error).not.toBeNull();
  });

  it("emblemas: se dan y se quitan, pero no a tu propio clip", async () => {
    expect((await fan.client.rpc("toggle_clip_vote", { p_clip: clip, p_emblem: comedy })).data).toBe(true);
    const { data: votes } = await fan.client.from("clip_votes").select("emblem_id").eq("clip_id", clip);
    expect(votes).toEqual([{ emblem_id: comedy }]);
    expect((await fan.client.rpc("toggle_clip_vote", { p_clip: clip, p_emblem: comedy })).data).toBe(false);
    expect((await author.client.rpc("toggle_clip_vote", { p_clip: clip, p_emblem: ace })).error?.hint).toBe("own");
  });

  it("comentarios: se publican, solo el autor los borra y sin sesión no se ve nada", async () => {
    const { data: cid, error } = await fan.client.rpc("comment_clip", { p_clip: clip, p_body: "¡Qué locura!" });
    expect(error).toBeNull();
    expect((await author.client.rpc("delete_my_clip_comment", { p_comment: cid! })).error).not.toBeNull();
    const { data: seen } = await author.client.from("clip_comments").select("body").eq("clip_id", clip);
    expect(seen).toEqual([{ body: "¡Qué locura!" }]);
    const { data: guest } = await anon().from("clips").select("id").eq("id", clip);
    expect(guest ?? []).toEqual([]);
  });

  it("con bloqueo no se ven ni se puede interactuar", async () => {
    await blocker.client.rpc("block_user", { p_user: author.id });
    const { data } = await blocker.client.from("clips").select("id").eq("id", clip);
    expect(data).toEqual([]);
    expect((await blocker.client.rpc("comment_clip", { p_clip: clip, p_body: "hola" })).error?.hint).toBe("not_found");
  });

  it("denuncia y moderación: el clip oculto deja de verse salvo para su autor", async () => {
    const { error } = await fan.client.rpc("report_clip", { p_clip: clip, p_comment: null as unknown as number, p_reason: "spam", p_details: "" });
    expect(error).toBeNull();
    expect((await fan.client.rpc("moderate_clip", { p_clip: clip, p_comment: null as unknown as number, p_hidden: true, p_note: "" })).error).not.toBeNull();
    expect((await mod.client.rpc("moderate_clip", { p_clip: clip, p_comment: null as unknown as number, p_hidden: true, p_note: "spam" })).error).toBeNull();
    expect((await fan.client.from("clips").select("id").eq("id", clip)).data).toEqual([]);
    expect((await author.client.from("clips").select("hidden").eq("id", clip)).data).toEqual([{ hidden: true }]);
    expect((await fan.client.rpc("toggle_clip_vote", { p_clip: clip, p_emblem: ace })).error?.hint).toBe("not_found");
  });

  it("el autor borra su clip y nadie más puede", async () => {
    const { data: other } = await post(author);
    expect((await fan.client.rpc("delete_my_clip", { p_clip: other! })).error).not.toBeNull();
    expect((await author.client.rpc("delete_my_clip", { p_clip: other! })).error).toBeNull();
  });

  it("como mucho 5 clips al día", async () => {
    for (let i = 0; i < 5; i++) expect((await post(fan)).error).toBeNull();
    const sixth = await post(fan);
    expect(sixth.error?.hint).toBe("rate_limited");
  });
});
