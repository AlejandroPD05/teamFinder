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

const tint = (hex: string, pct: number, base: string) => `color-mix(in srgb, ${hex} ${pct}%, ${base})`;

/**
 * Variables CSS del tema del juego: el acento y un tinte liso del fondo y los paneles con el tono oscuro del juego
 * (azul marino, pizarra…). Sin degradados. La paleta base es común a todos (prompt §17).
 */
export function themeStyle(game?: Game | null): CSSProperties {
  if (!game?.theme_accent) return {};
  const t = game.theme_glow_b;
  return {
    "--color-accent": game.theme_accent,
    "--color-accent-soft": game.theme_accent_soft ?? game.theme_accent,
    ...(t && {
      "--color-bg": tint(t, 12, "#0b0c12"),
      "--color-bg-raised": tint(t, 12, "#10111a"),
      "--color-panel": tint(t, 14, "#151722"),
      "--color-panel-hover": tint(t, 16, "#1c1f2e"),
      "--color-line": tint(t, 16, "#2a2d3e"),
    }),
  } as CSSProperties;
}
