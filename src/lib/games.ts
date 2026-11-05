import "server-only";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export const GAME_COOKIE = "tf_game";
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

/** Juegos activos (catálogo público). */
export async function loadGames(supabase: Client): Promise<Game[]> {
  const { data } = await supabase
    .from("games")
    .select("id, name, short_name, character_label, theme_accent, theme_accent_soft, theme_glow_a, theme_glow_b")
    .eq("active", true)
    .order("sort");
  return (data ?? []) as Game[];
}

/** Juego elegido por quien navega (cookie), validado contra los juegos activos. */
export async function currentGame(supabase: Client): Promise<{ game: Game; games: Game[] }> {
  const games = await loadGames(supabase);
  const wanted = (await cookies()).get(GAME_COOKIE)?.value;
  const game = games.find((g) => g.id === wanted) ?? games.find((g) => g.id === DEFAULT_GAME) ?? games[0];
  return { game, games };
}

const rgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** Variables CSS del tema del juego: acento y brillos. La base oscura es común a todos (prompt §17). */
export function themeStyle(game?: Game | null): CSSProperties {
  if (!game?.theme_accent) return {};
  return {
    "--color-accent": game.theme_accent,
    "--color-accent-soft": game.theme_accent_soft ?? game.theme_accent,
    "--glow-a": `rgb(${rgb(game.theme_glow_a ?? game.theme_accent)} / 0.14)`,
    "--glow-b": `rgb(${rgb(game.theme_glow_b ?? "#3b82f6")} / 0.22)`,
  } as CSSProperties;
}
