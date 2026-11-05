import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

import { GAME_COOKIE } from "@/lib/config";

export { GAME_COOKIE };
export const DEFAULT_GAME = "valorant";

export type Game = {
  id: string;
  name: string;
  short_name: string | null;
  character_label: string | null;
  theme_accent: string | null;
  theme_accent_soft: string | null;
  theme_glow_a: string | null;
  theme_glow_b: string | null;
};

// Una sola consulta por petición aunque el layout y la página lo pidan (catálogo público, igual para todos).
const gamesForRequest = cache(async (): Promise<Game[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select("id, name, short_name, character_label, theme_accent, theme_accent_soft, theme_glow_a, theme_glow_b")
    .eq("active", true)
    .order("sort");
  return (data ?? []) as Game[];
});

/** Juegos activos (catálogo público). */
export async function loadGames(): Promise<Game[]> {
  return gamesForRequest();
}

/** Juego elegido por quien navega (cookie), validado contra los juegos activos. */
export async function currentGame(): Promise<{ game: Game; games: Game[] }> {
  const games = await loadGames();
  const wanted = (await cookies()).get(GAME_COOKIE)?.value;
  const game = games.find((g) => g.id === wanted) ?? games.find((g) => g.id === DEFAULT_GAME) ?? games[0];
  return { game, games };
}

export { themeStyle } from "./game-theme";
