import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, assertEnv, createUser, deleteUsers } from "./helpers";

type U = Awaited<ReturnType<typeof createUser>>;
const nil = null as unknown as string;

// Lo que no expone la API (esquema private) se prepara y se comprueba directamente en la base de datos local.
const sql = (q: string) =>
  execFileSync("docker", ["exec", "-i", "supabase_db_teamFinder", "psql", "-U", "postgres", "-qtAc", q], { encoding: "utf8" }).trim();

describe("grupos en el Discord de TeamFinder", () => {
  let owner: U, other: U, lobby: string;
  beforeAll(async () => {
    assertEnv();
    [owner, other] = await Promise.all([createUser("dc-o", { display_name: "Nombre Secreto" }), createUser("dc-b")]);
    await owner.client.from("profiles").update({ display_name: "Nombre Secreto" }).eq("id", owner.id);
    lobby = (
      await owner.client.rpc("create_lobby", {
        p_game_id: "valorant", p_mode_slug: "duo", p_note: "nota privada", p_rank_min: nil, p_rank_max: nil, p_region: nil,
        p_language: "es", p_goal: nil, p_starts_at: nil, p_roles: [],
      })
    ).data!;
  });
  afterAll(() => deleteUsers([owner?.id, other?.id]));

  it("sin webhook no está conectada y no publica nada", async () => {
    expect((await owner.client.rpc("discord_lobbies_enabled")).data).toBe(false);
    expect((await owner.client.rpc("post_lobby_discord", { p_lobby: lobby })).error?.hint).toBe("not_connected");
    expect((await other.client.rpc("post_lobby_discord", { p_lobby: lobby })).error?.code).toBe("42501");
    const { data } = await admin().from("lobbies").select("discord_posted_at").eq("id", lobby).single();
    expect(data!.discord_posted_at).toBeNull();
  });

  it("el mensaje lleva el catálogo y el enlace, nunca el nombre ni la nota", () => {
    const msg = sql(`select private.lobby_discord_message('${lobby}')`);
    expect(msg).toContain("VALORANT");
    expect(msg).toContain("plazas libres");
    expect(msg).toContain("ES");
    expect(msg).toContain(`/unete/${lobby}`);
    expect(msg).not.toContain("Nombre Secreto");
    expect(msg).not.toContain("nota privada");
    // La API no deja leerlo ni a quien ha creado el grupo.
    expect(sql("select has_function_privilege('authenticated', 'private.lobby_discord_message(uuid)', 'execute')")).toBe("f");
  });
});

describe("perfiles inactivos fuera de la búsqueda", () => {
  let a: U, b: U;
  const visible = async () => ((await a.client.from("player_search").select("user_id").eq("user_id", b.id)).data ?? []).length === 1;
  const suggested = async () => ((await a.client.rpc("suggested_players", { p_game: "valorant", p_limit: 10 })).data ?? []).some((s) => s.user_id === b.id);
  const goInactive = () =>
    sql(`insert into private.user_activity (user_id, last_seen_at) values ('${b.id}', now() - interval '61 days')
         on conflict (user_id) do update set last_seen_at = excluded.last_seen_at`);

  beforeAll(async () => {
    assertEnv();
    [a, b] = await Promise.all([createUser("ia-a"), createUser("ia-b")]);
    const db = admin();
    const region = (await db.from("game_regions").select("id").eq("game_id", "valorant").limit(1).single()).data!.id;
    const roles = (await db.from("game_roles").select("id").eq("game_id", "valorant").order("sort").limit(2)).data!;
    // a juega de un rol y b de otro, mismo servidor y mismo idioma: «Te pueden encajar» lo sugiere (2 motivos).
    for (const [u, role] of [[a, roles[0].id], [b, roles[1].id]] as const) {
      const r = await u.client.rpc("save_game_profile", {
        p_game_id: "valorant", p_rank_id: nil, p_region_id: region, p_flex: false, p_visibility: "registered",
        p_roles: [{ role_id: role, is_primary: true }], p_characters: [], p_modes: [],
      });
      if (r.error) throw r.error;
      await u.client.from("profiles").update({ languages: ["es"], languages_visibility: "registered" }).eq("id", u.id);
    }
  });
  afterAll(() => deleteUsers([a?.id, b?.id]));

  it("sale mientras entra; a los 60 días sin entrar deja de salir (salvo para sí mismo)", async () => {
    expect(await visible()).toBe(true);
    expect(await suggested()).toBe(true);
    goInactive();
    expect(await visible()).toBe(false);
    expect(await suggested()).toBe(false);
    expect((await b.client.from("player_search").select("user_id").eq("user_id", b.id)).data).toHaveLength(1);
  });

  it("al volver a entrar, o si se marca disponible, vuelve a salir", async () => {
    const seen = (await b.client.rpc("touch_seen")).data;
    expect(new Date(seen!).getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect(await visible()).toBe(true);
    goInactive();
    await b.client.rpc("set_available", { p_game: "valorant", p_hours: 1 });
    expect(await visible()).toBe(true);
    await b.client.rpc("set_available", { p_game: "valorant", p_hours: 0 });
  });

  it("la última visita no se lee por la API y se apunta como mucho cada 12 horas", async () => {
    expect(sql("select has_table_privilege('authenticated', 'private.user_activity', 'select')")).toBe("f");
    sql(`update private.user_activity set last_seen_at = now() - interval '2 hours' where user_id = '${b.id}'`);
    const before = sql(`select last_seen_at from private.user_activity where user_id = '${b.id}'`);
    await b.client.rpc("touch_seen");
    expect(sql(`select last_seen_at from private.user_activity where user_id = '${b.id}'`)).toBe(before);
  });
});

describe("uso de los planes en las estadísticas", () => {
  let m: U;
  beforeAll(async () => {
    assertEnv();
    m = await createUser("st-m");
    await admin().from("app_admins").insert({ user_id: m.id });
  });
  afterAll(async () => {
    await admin().from("app_admins").delete().eq("user_id", m?.id);
    await deleteUsers([m?.id]);
  });

  it("incluye tamaño de la base de datos, archivos, usuarios activos y correos de hoy", async () => {
    const { data, error } = await m.client.rpc("admin_stats");
    expect(error).toBeNull();
    expect(data).toMatchObject({
      db_bytes: expect.any(Number), storage_bytes: expect.any(Number), seen_30d: expect.any(Number),
      emails_today: expect.any(Number), inactive_60d: expect.any(Number), discord_lobbies_7d: expect.any(Number),
    });
    expect((data as { db_bytes: number }).db_bytes).toBeGreaterThan(1024 * 1024);
  });
});
