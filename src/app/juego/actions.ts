"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth";
import { GAME_COOKIE, loadGames } from "@/lib/games";

async function setGameCookie(id: string | undefined) {
  const games = await loadGames();
  if (id && games.some((g) => g.id === id)) {
    (await cookies()).set(GAME_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  }
}

/** Ruta a la que volver tras cambiar de juego: sin filtros (son de cada juego) y fuera del detalle de un grupo. */
function returnPath(next: string | undefined) {
  const path = safeNextPath(next).split("?")[0];
  return path.startsWith("/grupos/") && path !== "/grupos/nuevo" ? "/grupos" : path;
}

/** Sin JavaScript: formulario que cambia el juego y vuelve a la página de origen. */
export async function selectGame(formData: FormData) {
  await setGameCookie(formData.get("game")?.toString());
  redirect(returnPath(formData.get("next")?.toString()));
}

/**
 * Con JavaScript: cambia el juego y devuelve la ruta destino. El cliente navega con el router, que vuelve a pintar
 * la página sin desmontar la cabecera (así las transiciones del selector no se cortan).
 */
export async function chooseGame(id: string, next: string): Promise<string> {
  await setGameCookie(id);
  return returnPath(next);
}
