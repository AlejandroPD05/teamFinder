import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, anon, assertEnv, createUser, deleteUsers, type Db } from "./helpers";

// Pentest de regresión: cada caso es un ataque real contra la API de Supabase (PostgREST) con la clave pública,
// saltándose la interfaz. Todos deben fallar para el atacante.
type U = { id: string; client: Db };
const nil = null as unknown as string;

describe("pentest: manipulación directa por la API", () => {
  let attacker: U, victim: U, other: U;

  beforeAll(async () => {
    assertEnv();
    [attacker, victim, other] = await Promise.all([createUser("p-att"), createUser("p-vic"), createUser("p-oth")]);
  });
  afterAll(() => deleteUsers([attacker?.id, victim?.id, other?.id]));

  it("no se puede marcar el rango como verificado ni falsear la fecha para salir primero en la búsqueda", async () => {
    const future = new Date(Date.now() + 365 * 86_400_000).toISOString();
    const ins = await attacker.client
      .from("game_profiles")
      .insert({ user_id: attacker.id, game_id: "valorant", rank_source: "verified", updated_at: future, visibility: "public" });
    expect(ins.error).not.toBeNull();
    await attacker.client.rpc("save_game_profile", {
      p_game_id: "valorant", p_rank_id: nil, p_region_id: nil, p_flex: false, p_visibility: "public",
      p_roles: [], p_characters: [], p_modes: [],
    });
    const upd = await attacker.client.from("game_profiles").update({ rank_source: "verified", updated_at: future }).eq("user_id", attacker.id).select();
    expect(upd.data ?? []).toHaveLength(0);
    const { data } = await admin().from("game_profiles").select("rank_source, updated_at").eq("user_id", attacker.id).single();
    expect(data?.rank_source).toBe("manual");
    expect(Date.parse(data!.updated_at)).toBeLessThan(Date.now() + 60_000);
  });

  it("no se puede escribir roles ni agentes saltándose la función de guardado", async () => {
    const role = (await admin().from("game_roles").select("id").eq("game_id", "valorant").limit(1).single()).data!.id;
    const r = await attacker.client.from("player_roles").insert({ user_id: attacker.id, game_id: "valorant", role_id: role });
    expect(r.error).not.toBeNull();
  });

  it("el avatar solo puede apuntar al CDN de Discord (evita caída de páginas y rastreo por IP)", async () => {
    const r = await attacker.client.from("profiles").update({ avatar_url: "https://evil.example/pixel.png" }).eq("id", attacker.id);
    expect(r.error).not.toBeNull();
  });

  it("el nombre visible rechaza caracteres de control e invisibles", async () => {
    for (const bad of ["Mod​eración", "a\u0000b", "<img src=x>", "‮admin"]) {
      const r = await attacker.client.from("profiles").update({ display_name: bad }).eq("id", attacker.id);
      expect(r.error, JSON.stringify(bad)).not.toBeNull();
    }
  });

  it("nadie puede averiguar por la API si otra persona le ha bloqueado", async () => {
    await victim.client.rpc("block_user", { p_user: attacker.id });
    const probe = await attacker.client.rpc("blocked_with" as never, { other: victim.id } as never);
    expect(probe.error).not.toBeNull();
  });

  it("las funciones internas no se pueden llamar desde la API", async () => {
    const someId = attacker.id;
    // is_lobby_member y can_see siguen expuestas a propósito: solo responden sobre los datos de quien llama.
    const calls: [string, Record<string, unknown>][] = [["lobby_refresh_status", { p_lobby: someId }]];
    for (const [fn, args] of calls) {
      const r = await attacker.client.rpc(fn as never, args as never);
      expect(r.error, fn).not.toBeNull();
    }
  });

  it("el catálogo no se puede modificar ni con sesión", async () => {
    const r = await attacker.client.from("game_roles").update({ name: "Hackeado" }).eq("game_id", "valorant").select();
    expect(r.data ?? []).toHaveLength(0);
  });

  it("los miembros de un grupo cerrado o de alguien que te bloqueó no se pueden listar", async () => {
    const { data: lobby } = await other.client.rpc("create_lobby", {
      p_game_id: "valorant", p_mode_slug: "duo", p_note: "", p_rank_min: nil, p_rank_max: nil,
      p_region: nil, p_language: nil, p_goal: nil, p_starts_at: nil, p_roles: [],
    });
    await other.client.rpc("close_lobby", { p_lobby: lobby as string });
    const closed = await attacker.client.from("lobby_members").select("user_id").eq("lobby_id", lobby as string);
    expect(closed.data ?? []).toHaveLength(0);

    const { data: vLobby } = await victim.client.rpc("create_lobby", {
      p_game_id: "valorant", p_mode_slug: "trio", p_note: "", p_rank_min: nil, p_rank_max: nil,
      p_region: nil, p_language: nil, p_goal: nil, p_starts_at: nil, p_roles: [],
    });
    const blocked = await attacker.client.from("lobby_members").select("user_id").eq("lobby_id", vLobby as string);
    expect(blocked.data ?? []).toHaveLength(0);
    const roles = await attacker.client.from("lobby_needed_roles").select("role_id").eq("lobby_id", vLobby as string);
    expect(roles.data ?? []).toHaveLength(0);
  });

  it("un anónimo no puede listar a todos los usuarios, solo ver perfiles que tengan algo público", async () => {
    const { data } = await anon().from("profile_cards").select("id").in("id", [attacker.id, victim.id, other.id]);
    // attacker tiene perfil de juego público; victim y other no tienen nada público.
    expect((data ?? []).map((r) => r.id)).toEqual([attacker.id]);
  });
});
