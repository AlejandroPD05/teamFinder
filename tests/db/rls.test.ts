import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

// Requiere Supabase local en marcha. Si falta la configuración, falla (no se salta).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;

const admin = () =>
  createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function signedInClient(email: string, password: string) {
  const client = createClient<Database>(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe("RLS de perfiles", () => {
  const password = `Test-${crypto.randomUUID()}`;
  const stamp = Date.now();
  let aId = "";
  let bId = "";
  let a: SupabaseClient<Database>;
  let anon: SupabaseClient<Database>;

  beforeAll(async () => {
    expect(url && publishable && secret, "faltan variables de .env.local").toBeTruthy();
    const db = admin();
    const ua = await db.auth.admin.createUser({
      email: `rls-a-${stamp}@example.test`,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Jugadora A" },
    });
    const ub = await db.auth.admin.createUser({
      email: `rls-b-${stamp}@example.test`,
      password,
      email_confirm: true,
    });
    if (ua.error || ub.error) throw ua.error ?? ub.error;
    aId = ua.data.user.id;
    bId = ub.data.user.id;
    a = await signedInClient(`rls-a-${stamp}@example.test`, password);
    anon = createClient<Database>(url, publishable, { auth: { persistSession: false } });
  });

  afterAll(async () => {
    const db = admin();
    await Promise.all([aId, bId].filter(Boolean).map((id) => db.auth.admin.deleteUser(id)));
  });

  it("el alta crea el perfil con el nombre del proveedor y sin correo", async () => {
    const { data, error } = await a.from("profiles").select("*").eq("id", aId).single();
    expect(error).toBeNull();
    expect(data?.display_name).toBe("Jugadora A");
    expect(JSON.stringify(data)).not.toContain("@example.test");
  });

  it("un usuario edita su propio perfil", async () => {
    const { data, error } = await a
      .from("profiles")
      .update({ display_name: "Nuevo nombre" })
      .eq("id", aId)
      .select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("un usuario NO puede editar el perfil de otro", async () => {
    const { data } = await a.from("profiles").update({ display_name: "Hackeado" }).eq("id", bId).select();
    expect(data ?? []).toHaveLength(0);
    const { data: b } = await admin().from("profiles").select("display_name").eq("id", bId).single();
    expect(b?.display_name).not.toBe("Hackeado");
  });

  it("un usuario NO puede crear un perfil de juego a nombre de otro", async () => {
    const { error } = await a.from("game_profiles").insert({ user_id: bId, game_id: "valorant" });
    expect(error).not.toBeNull();
  });

  it("un usuario crea su perfil de juego con rango manual", async () => {
    const nil = null as unknown as string;
    const { error } = await a.rpc("save_game_profile", {
      p_game_id: "valorant", p_rank_id: nil, p_region_id: nil, p_flex: false, p_visibility: "registered",
      p_roles: [], p_characters: [], p_modes: [],
    });
    expect(error).toBeNull();
    const { data } = await a.from("game_profiles").select("rank_source").eq("user_id", aId).single();
    expect(data?.rank_source).toBe("manual");
  });

  it("un anónimo no ve perfiles pero sí el catálogo", async () => {
    const { data: profiles } = await anon.from("profiles").select("id");
    expect(profiles ?? []).toHaveLength(0);
    const { count } = await anon
      .from("game_characters")
      .select("*", { count: "exact", head: true })
      .eq("game_id", "valorant");
    expect(count).toBeGreaterThan(0);
  });

  it("el catálogo no se puede modificar desde la app", async () => {
    const { error } = await a.from("games").insert({ id: "fake-game", name: "Fake" });
    expect(error).not.toBeNull();
  });
});
