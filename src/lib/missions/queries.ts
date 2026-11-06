import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Card = { id: string; slug: string; name: string; image_url: string; rarity: Rarity; credit: string };

/** Misiones activas del juego con el progreso de quien las ve. */
export async function loadMissions(supabase: Client, gameId: string) {
  const { data, error } = await supabase.rpc("my_missions", { p_game: gameId });
  if (error) throw error;
  return data ?? [];
}

/** Todas las cartas del juego y cuáles tiene ya quien las ve (orden: rareza alta primero, luego nombre). */
export async function loadCollection(supabase: Client, gameId: string, userId: string) {
  const [cards, owned] = await Promise.all([
    supabase.from("collectible_cards").select("id, slug, name, image_url, rarity, credit").eq("game_id", gameId).order("name"),
    supabase.from("user_cards").select("card_id, obtained_at").eq("user_id", userId),
  ]);
  if (cards.error) throw cards.error;
  if (owned.error) throw owned.error;
  const rank: Record<Rarity, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const list = ((cards.data ?? []) as Card[]).toSorted((a, b) => rank[a.rarity] - rank[b.rarity] || a.name.localeCompare(b.name));
  return { cards: list, owned: new Set((owned.data ?? []).map((o) => o.card_id)) };
}
