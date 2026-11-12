import "server-only";
import { loadNames } from "@/lib/lobbies/queries";
import type { createClient } from "@/lib/supabase/server";
import type { ClipProvider } from "./links";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Emblem = { id: string; slug: string; name: string; description: string; kind: "skill" | "subjective" };
export type ClipItem = {
  id: string;
  user_id: string;
  game_id: string;
  emblem_id: string;
  title: string;
  provider: ClipProvider;
  video_id: string;
  hidden: boolean;
  created_at: string;
  author: { name: string; avatar: string | null };
  votes: Record<string, number>; // emblema → número
  total: number;
  mine: string[]; // emblemas que ha dado quien mira
  comments: number;
};

const CLIP_FIELDS = "id, user_id, game_id, emblem_id, title, provider, video_id, hidden, created_at";

export async function loadEmblems(supabase: Client): Promise<Emblem[]> {
  const { data, error } = await supabase.from("clip_emblems").select("id, slug, name, description, kind").order("sort");
  if (error) throw error;
  return (data ?? []) as Emblem[];
}

type Row = Omit<ClipItem, "author" | "votes" | "total" | "mine" | "comments"> & {
  clip_votes: { emblem_id: string; user_id: string }[];
  clip_comments: { count: number }[];
};

async function decorate(supabase: Client, rows: Row[], viewer: string): Promise<ClipItem[]> {
  const names = await loadNames(supabase, rows.map((r) => r.user_id));
  return rows.map(({ clip_votes, clip_comments, ...c }) => {
    const votes: Record<string, number> = {};
    for (const v of clip_votes) votes[v.emblem_id] = (votes[v.emblem_id] ?? 0) + 1;
    return {
      ...c,
      author: names.get(c.user_id) ?? { name: "Jugador", avatar: null },
      votes,
      total: clip_votes.length,
      mine: clip_votes.filter((v) => v.user_id === viewer).map((v) => v.emblem_id),
      comments: clip_comments[0]?.count ?? 0,
    };
  });
}

/**
 * Clips de un juego. `top`: los de los últimos 7 días con más emblemas (orden por total, después por fecha).
 * Sin ocultos (la RLS ya quita los de usuarios bloqueados).
 */
export async function listClips(
  supabase: Client,
  viewer: string,
  f: { gameId: string; emblemId?: string; sort: "recent" | "top" },
) {
  let q = supabase
    .from("clips")
    .select(`${CLIP_FIELDS}, clip_votes(emblem_id, user_id), clip_comments(count)`)
    .eq("game_id", f.gameId)
    .eq("hidden", false);
  if (f.emblemId) q = q.eq("emblem_id", f.emblemId);
  if (f.sort === "top") q = q.gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString());
  const { data, error } = await q.order("created_at", { ascending: false }).limit(f.sort === "top" ? 200 : 30);
  if (error) throw error;
  const items = await decorate(supabase, (data ?? []) as unknown as Row[], viewer);
  return f.sort === "top" ? items.toSorted((a, b) => b.total - a.total).slice(0, 30) : items;
}

/** Un clip con sus comentarios visibles. */
export async function loadClip(supabase: Client, viewer: string, id: string) {
  const { data, error } = await supabase
    .from("clips")
    .select(`${CLIP_FIELDS}, clip_votes(emblem_id, user_id), clip_comments(count)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [clip] = await decorate(supabase, [data as unknown as Row], viewer);
  const { data: comments, error: e2 } = await supabase
    .from("clip_comments")
    .select("id, user_id, body, hidden, created_at")
    .eq("clip_id", id)
    .order("created_at");
  if (e2) throw e2;
  const names = await loadNames(supabase, (comments ?? []).map((c) => c.user_id));
  return {
    clip,
    comments: (comments ?? []).map((c) => ({ ...c, author: names.get(c.user_id) ?? { name: "Jugador", avatar: null } })),
  };
}

export type Winner = {
  week_start: string;
  emblem_id: string;
  clip_id: string;
  votes: number;
  closed: boolean;
  clip: { id: string; title: string; user_id: string; author: string } | null;
};

/** Ganadores semanales del juego (reglas en la migración 20261112010000_clip_winners.sql y en /clips/ganadores). */
export async function loadWinners(supabase: Client, gameId: string, weeks = 8): Promise<Winner[]> {
  const { data, error } = await supabase.rpc("clip_weekly_winners", { p_game: gameId, p_weeks: weeks });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];
  // Los datos del clip pasan por la RLS: si quien mira ha bloqueado al autor, no aparece.
  const { data: clips } = await supabase.from("clips").select("id, title, user_id").in("id", [...new Set(rows.map((r) => r.clip_id))]);
  const names = await loadNames(supabase, (clips ?? []).map((c) => c.user_id));
  const byId = new Map((clips ?? []).map((c) => [c.id, { ...c, author: names.get(c.user_id)?.name ?? "Jugador" }]));
  return rows.map((r) => ({ ...r, clip: byId.get(r.clip_id) ?? null }));
}
