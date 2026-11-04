import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export const GAME_ID = "valorant";

/** Catálogo del juego (datos de configuración). */
export async function loadCatalog(supabase: Client, gameId = GAME_ID) {
  const [roles, characters, ranks, regions, modes] = await Promise.all([
    supabase.from("game_roles").select("id, slug, name").eq("game_id", gameId).eq("active", true).order("sort"),
    supabase
      .from("game_characters")
      .select("id, slug, name, role_id")
      .eq("game_id", gameId)
      .eq("active", true)
      .order("name"),
    supabase.from("game_ranks").select("id, slug, name, tier").eq("game_id", gameId).eq("active", true).order("tier"),
    supabase.from("game_regions").select("id, slug, name").eq("game_id", gameId).eq("active", true).order("sort"),
    supabase.from("game_modes").select("slug, name, party_size").eq("game_id", gameId).eq("active", true).order("sort"),
  ]);
  const error = roles.error ?? characters.error ?? ranks.error ?? regions.error ?? modes.error;
  if (error) throw error;
  return {
    roles: roles.data ?? [],
    characters: characters.data ?? [],
    ranks: ranks.data ?? [],
    regions: regions.data ?? [],
    modes: modes.data ?? [],
  };
}

export type Catalog = Awaited<ReturnType<typeof loadCatalog>>;

/** Perfil propio completo (tablas base; RLS solo deja ver el propio). */
export async function loadOwnProfile(supabase: Client, userId: string, gameId = GAME_ID) {
  const [profile, game, roles, characters] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("game_profiles").select("*").eq("user_id", userId).eq("game_id", gameId).maybeSingle(),
    supabase.from("player_roles").select("role_id, is_primary").eq("user_id", userId).eq("game_id", gameId),
    supabase.from("player_characters").select("character_id, status").eq("user_id", userId).eq("game_id", gameId),
  ]);
  if (profile.error) throw profile.error;
  return {
    profile: profile.data,
    game: game.data,
    roles: roles.data ?? [],
    characters: characters.data ?? [],
  };
}

/** Perfil visto por otra persona: vistas con la visibilidad por campo ya aplicada. */
export async function loadPublicProfile(supabase: Client, userId: string, gameId = GAME_ID) {
  const [profile, game, roles, characters] = await Promise.all([
    supabase.from("profile_cards").select("*").eq("id", userId).maybeSingle(),
    supabase.from("game_profile_cards").select("*").eq("user_id", userId).eq("game_id", gameId).maybeSingle(),
    supabase.from("player_role_cards").select("role_id, is_primary").eq("user_id", userId).eq("game_id", gameId),
    supabase
      .from("player_character_cards")
      .select("character_id, status")
      .eq("user_id", userId)
      .eq("game_id", gameId),
  ]);
  if (profile.error) throw profile.error;
  return {
    profile: profile.data,
    game: game.data,
    roles: roles.data ?? [],
    characters: characters.data ?? [],
  };
}
