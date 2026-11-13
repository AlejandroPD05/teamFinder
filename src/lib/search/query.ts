import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type Condition } from "./filters";

type Client = Awaited<ReturnType<typeof createClient>>;

const OPS = { gte: "gte", lte: "lte", eq: "eq", contains: "cs", overlaps: "ov" } as const;

// Los valores vienen de slugs/ids del catálogo o de listas cerradas: no llevan comas ni llaves.
const encode = (c: Condition) => (Array.isArray(c.value) ? `{${c.value.join(",")}}` : String(c.value));

/** Busca jugadores en la vista `player_search` (la privacidad ya viene aplicada en la vista). */
export async function searchPlayers(
  supabase: Client,
  viewerId: string,
  conditions: Condition[],
  page: number,
  gameId: string,
  /** Si se indica, solo estos jugadores (p. ej. los disponibles ahora). */
  onlyIds?: string[],
) {
  let q = supabase
    .from("player_search")
    .select("*", { count: "exact" })
    .eq("game_id", gameId)
    .neq("user_id", viewerId);
  if (onlyIds) q = q.in("user_id", onlyIds.length ? onlyIds : ["00000000-0000-0000-0000-000000000000"]);
  for (const c of conditions) q = q.filter(c.column, OPS[c.op], encode(c));
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await q
    .order("updated_at", { ascending: false })
    .order("user_id")
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { players: data ?? [], total: count ?? 0 };
}

export type PlayerRow = Awaited<ReturnType<typeof searchPlayers>>["players"][number];
