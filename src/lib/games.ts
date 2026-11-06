import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

import { GAME_COOKIE, PATH_GAME_HEADER } from "@/lib/config";

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

/**
 * Juego con el que se pinta la petición: el de la URL en /equipos/<juego> y, si no, el elegido (cookie).
 * `saved` es el elegido y guardado, que el selector usa para guardar el de /equipos al visitarla de verdad.
 */
export async function currentGame(): Promise<{ game: Game; games: Game[]; saved: string | null }> {
  const games = await loadGames();
  const valid = (id: string | null | undefined) => games.find((g) => g.id === id);
  const saved = valid((await cookies()).get(GAME_COOKIE)?.value)?.id ?? null;
  const fromPath = (await headers()).get(PATH_GAME_HEADER);
  const game = valid(fromPath) ?? valid(saved) ?? valid(DEFAULT_GAME) ?? games[0];
  return { game, games, saved };
}

export { themeStyle } from "./game-theme";
