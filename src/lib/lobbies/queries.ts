import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type LobbyFilters = { mode?: string; region?: string; role?: string; lang?: string };

const LOBBY_FIELDS =
  "id, game_id, owner_id, mode_slug, slots, note, rank_min_id, rank_max_id, region_id, language, goal, starts_at, status, created_at, closed_at, shared_at";

/** Grupos abiertos, más recientes primero. `regionId` y `roleId` ya resueltos desde slugs. */
export async function listOpenLobbies(
  supabase: Client,
  f: { gameId: string; mode?: string; regionId?: string; roleId?: string; lang?: string },
) {
  const select = f.roleId
    ? `${LOBBY_FIELDS}, lobby_members(user_id), lobby_needed_roles!inner(role_id)`
    : `${LOBBY_FIELDS}, lobby_members(user_id), lobby_needed_roles(role_id)`;
  let q = supabase.from("lobbies").select(select).eq("game_id", f.gameId).eq("status", "open");
  if (f.mode) q = q.eq("mode_slug", f.mode);
  if (f.regionId) q = q.eq("region_id", f.regionId);
  if (f.lang) q = q.eq("language", f.lang);
  if (f.roleId) q = q.eq("lobby_needed_roles.role_id", f.roleId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as LobbyListItem[];
}

export type LobbyListItem = {
  id: string;
  owner_id: string;
  mode_slug: string;
  slots: number;
  note: string | null;
  rank_min_id: string | null;
  rank_max_id: string | null;
  region_id: string | null;
  language: string | null;
  goal: string | null;
  starts_at: string | null;
  status: "open" | "full" | "closed";
  created_at: string;
  lobby_members: { user_id: string }[];
  lobby_needed_roles: { role_id: string }[];
};

/** Nombres y avatares (siempre visibles) para una lista de usuarios. */
export async function loadNames(supabase: Client, ids: string[]) {
  if (ids.length === 0) return new Map<string, { name: string; avatar: string | null }>();
  const { data } = await supabase.from("profile_cards").select("id, display_name, avatar_url").in("id", [...new Set(ids)]);
  return new Map((data ?? []).map((p) => [p.id!, { name: p.display_name ?? "Jugador", avatar: p.avatar_url }]));
}

/** Detalle de un grupo con miembros, roles buscados y solicitudes visibles para quien consulta. */
export async function loadLobby(supabase: Client, id: string) {
  const { data: lobby, error } = await supabase.from("lobbies").select(LOBBY_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!lobby) return null;
  const [members, roles, requests] = await Promise.all([
    supabase.from("lobby_members").select("user_id, joined_at").eq("lobby_id", id).order("joined_at"),
    supabase.from("lobby_needed_roles").select("role_id").eq("lobby_id", id),
    supabase
      .from("lobby_requests")
      .select("id, user_id, message, status, created_at")
      .eq("lobby_id", id)
      .order("created_at"),
  ]);
  return {
    lobby,
    members: members.data ?? [],
    neededRoles: (roles.data ?? []).map((r) => r.role_id),
    requests: requests.data ?? [],
  };
}
