import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const gameSlug = z.string().regex(/^[a-z0-9-]{2,30}$/);

/** Datos públicos de la tarjeta de un jugador (o null si no la ha activado o su perfil del juego no es público). */
export const loadPlayerCard = cache(async (id: string, game: string) => {
  if (!z.uuid().safeParse(id).success || !gameSlug.safeParse(game).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_player_card", { p_user: id, p_game: game });
  return data?.[0] ?? null;
});
