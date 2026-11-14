import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;

describe("ideas públicas", () => {
  let mod: U, author: U, fan: U, other: U, idea: string;
  const mine = async (u: U) => ((await u.client.rpc("public_ideas")).data ?? []).find((i) => i.id === idea);
  const alerts = async (u: U) => ((await u.client.from("notifications").select("body").eq("kind", "idea_status")).data ?? []).map((n) => n.body);

  beforeAll(async () => {
    assertEnv();
    [mod, author, fan, other] = await Promise.all(["id-m", "id-a", "id-f", "id-o"].map((t) => createUser(t)));
    await admin().from("app_admins").insert({ user_id: mod.id });
  });
  afterAll(async () => {
    await admin().from("app_admins").delete().eq("user_id", mod?.id);
    if (idea) await admin().from("ideas").delete().eq("id", idea);
    await deleteUsers([mod?.id, author?.id, fan?.id, other?.id]);
  });

  it("solo moderación publica; desde una sugerencia la marca atendida y avisa a quien la envió", async () => {
    const { data: fb } = await author.client.rpc("send_feedback", { p_kind: "idea", p_body: "Estaría bien poder filtrar por mapa.", p_page: "" });
    const save = (u: U) =>
      u.client.rpc("save_idea", { p_id: null as unknown as string, p_title: "Filtrar por mapa", p_body: "En la búsqueda.", p_status: "pending", p_feedback: fb! });
    expect((await save(author)).error?.code).toBe("42501");
    const res = await save(mod);
    expect(res.error).toBeNull();
    idea = res.data!;
    expect((await admin().from("feedback").select("status").eq("id", fb!).single()).data!.status).toBe("done");
    expect(await alerts(author)).toEqual(["Filtrar por mapa"]);
  });

  it("se ven sin sesión, sin autor ni votantes; nadie lee las tablas directamente", async () => {
    const pub = ((await anon().rpc("public_ideas")).data ?? []).find((i) => i.id === idea);
    expect(pub).toMatchObject({ title: "Filtrar por mapa", status: "pending", votes: 0, voted: false });
    expect(Object.keys(pub!)).not.toContain("feedback_id");
    expect((await other.client.from("ideas").select("id")).data ?? []).toEqual([]);
    expect((await anon().from("idea_votes").select("idea_id")).data ?? []).toEqual([]);
  });

  it("con sesión se apoya y se retira; cada uno ve solo su voto", async () => {
    expect((await anon().rpc("vote_idea", { p_idea: idea, p_on: true })).error).not.toBeNull();
    expect((await fan.client.rpc("vote_idea", { p_idea: idea, p_on: true })).error).toBeNull();
    await fan.client.rpc("vote_idea", { p_idea: idea, p_on: true }); // repetir no suma
    expect(await mine(fan)).toMatchObject({ votes: 1, voted: true });
    expect(await mine(other)).toMatchObject({ votes: 1, voted: false });
    expect((await other.client.from("idea_votes").select("user_id")).data).toEqual([]);
    await other.client.rpc("vote_idea", { p_idea: idea, p_on: true });
    await other.client.rpc("vote_idea", { p_idea: idea, p_on: false });
    expect(await mine(other)).toMatchObject({ votes: 1, voted: false });
    expect((await other.client.from("idea_votes").insert({ idea_id: idea, user_id: other.id })).error).not.toBeNull();
  });

  it("al cambiar de estado avisa a quien la apoya y a quien la envió; cerrada ya no se vota", async () => {
    const set = (status: string) =>
      mod.client.rpc("save_idea", { p_id: idea, p_title: "Filtrar por mapa", p_body: "", p_status: status, p_feedback: null as unknown as string });
    expect((await set("in_progress")).error).toBeNull();
    expect(await alerts(fan)).toEqual(["Filtrar por mapa"]);
    expect(await alerts(author)).toHaveLength(2);
    expect(await alerts(other)).toEqual([]);
    await set("in_progress"); // sin cambio de estado, sin aviso
    expect(await alerts(fan)).toHaveLength(1);
    await set("done");
    expect((await other.client.rpc("vote_idea", { p_idea: idea, p_on: true })).error?.hint).toBe("closed");
    expect((await mod.client.rpc("save_idea", { p_id: idea, p_title: "<b>", p_body: "", p_status: "done", p_feedback: null as unknown as string })).error?.hint).toBe("invalid");
  });

  it("solo moderación borra", async () => {
    expect((await other.client.rpc("delete_idea", { p_id: idea })).error?.code).toBe("42501");
    expect((await mod.client.rpc("delete_idea", { p_id: idea })).error).toBeNull();
    expect(await mine(other)).toBeUndefined();
  });
});
