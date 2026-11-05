"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth";
import { GAME_COOKIE, loadGames } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

/** Cambia el juego activo (cookie) y vuelve a la página de origen, sin filtros de otro juego. */
export async function selectGame(formData: FormData) {
  const supabase = await createClient();
  const games = await loadGames(supabase);
  const id = formData.get("game")?.toString();
  if (id && games.some((g) => g.id === id)) {
    (await cookies()).set(GAME_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  }
  // Los filtros (rangos, agentes…) son de cada juego: se vuelve a la ruta sin parámetros.
  const next = safeNextPath(formData.get("next")?.toString()).split("?")[0];
  redirect(next.startsWith("/grupos/") && next !== "/grupos/nuevo" ? "/grupos" : next);
}
