import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

/** Solo producción se indexa: previews y local quedan fuera de los buscadores. */
export function indexable(env: NodeJS.ProcessEnv = process.env): boolean {
  return !env.VERCEL_ENV || env.VERCEL_ENV === "production";
}

/** Cliente sin cookies: lee lo mismo que un visitante sin sesión (RLS de `anon`), igual para todo el mundo. */
function anonClient() {
  const { url, key } = supabaseEnv();
  return createSupabase<Database>(url, key, { auth: { persistSession: false } });
}

/** Juegos activos sin depender de cookies (robots, sitemap). Catálogo público. */
export async function publicGameIds(): Promise<string[]> {
  const { data } = await anonClient().from("games").select("id").eq("active", true).order("sort");
  return (data ?? []).map((g) => g.id);
}

/** Roles activos de los juegos activos, para el sitemap de las páginas por rol. Catálogo público. */
export async function publicGameRoles(): Promise<{ game: string; role: string }[]> {
  const games = await publicGameIds();
  if (!games.length) return [];
  const { data } = await anonClient()
    .from("game_roles")
    .select("game_id, slug")
    .in("game_id", games)
    .eq("active", true)
    .order("sort");
  return games.flatMap((game) => (data ?? []).filter((r) => r.game_id === game).map((r) => ({ game, role: r.slug })));
}

/**
 * Cifras agregadas de una página por rol tal como las ve un visitante sin sesión (nunca datos personales):
 * perfiles que muestran ese rol a todo el mundo (la vista ya aplica la visibilidad de cada perfil), jugadores con
 * perfil del juego y cuántos se han marcado «disponible ahora». `null` si la consulta falla: entonces no se muestra.
 * Los grupos abiertos no aparecen: solo los puede leer quien tiene sesión.
 */
export async function publicRoleStats(gameId: string, roleId: string) {
  const supabase = anonClient();
  const [role, players, now] = await Promise.all([
    supabase
      .from("player_role_cards")
      .select("role_id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("role_id", roleId),
    supabase.rpc("game_player_counts"),
    supabase.rpc("available_counts"),
  ]);
  const of = (rows: { game_id: string; players: number }[] | null) =>
    rows?.find((r) => r.game_id === gameId)?.players ?? null;
  return {
    publicWithRole: role.error ? null : (role.count ?? 0),
    players: players.error ? null : of(players.data),
    availableNow: now.error ? null : of(now.data),
  };
}
