"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { GAME_COOKIE_MAX_AGE } from "@/lib/config";
import { currentGame, GAME_COOKIE, loadGames } from "@/lib/games";
import { loadOwnProfile } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";

export type WelcomeState = { ok: boolean; message: string } | null;

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/bienvenida");
  return { supabase, userId: data.claims.sub };
}

/** Paso 1: el juego (se guarda como el juego elegido de la web). */
export async function chooseWelcomeGame(fd: FormData) {
  await session();
  const id = fd.get("game")?.toString();
  if (id && (await loadGames()).some((g) => g.id === id)) {
    (await cookies()).set(GAME_COOKIE, id, { path: "/", maxAge: GAME_COOKIE_MAX_AGE, sameSite: "lax", httpOnly: true });
  }
  redirect("/bienvenida?paso=2");
}

const uuid = z.uuid();

/** Guarda roles o rango/servidor sin pisar lo demás del perfil de juego (personajes, modos, visibilidad…). */
async function saveGamePart(part: { roles?: { role_id: string; is_primary: boolean }[]; rank?: string | null; region?: string | null }) {
  const { supabase, userId } = await session();
  const { game } = await currentGame();
  const own = await loadOwnProfile(supabase, userId, game.id);
  const { error } = await supabase.rpc("save_game_profile", {
    p_game_id: game.id,
    p_rank_id: (part.rank !== undefined ? part.rank : (own.game?.rank_id ?? null)) as string,
    p_region_id: (part.region !== undefined ? part.region : (own.game?.region_id ?? null)) as string,
    p_flex: own.game?.flex ?? false,
    p_visibility: own.game?.visibility ?? "registered",
    p_roles: part.roles ?? own.roles.map((r) => ({ role_id: r.role_id, is_primary: r.is_primary })),
    p_characters: own.characters.map((c) => ({ character_id: c.character_id, status: c.status })),
    p_modes: own.game?.mode_slugs ?? [],
  });
  return error;
}

/** Paso 2: roles (y cuál es el principal). */
export async function saveWelcomeRoles(_p: WelcomeState, fd: FormData): Promise<WelcomeState> {
  const t = await getTranslations("welcome");
  const roles = z.array(uuid).max(4).safeParse(fd.getAll("roles"));
  const primary = fd.get("primary") ? uuid.safeParse(fd.get("primary")) : null;
  if (!roles.success || (primary && !primary.success)) return { ok: false, message: t("checkRoles") };
  const main = primary?.success && roles.data.includes(primary.data) ? primary.data : roles.data[0];
  const error = await saveGamePart({ roles: roles.data.map((role_id) => ({ role_id, is_primary: role_id === main })) });
  if (error) return { ok: false, message: t("saveError") };
  redirect("/bienvenida?paso=3");
}

/** Paso 3: nombre, rango y servidor. Al terminar, la guía no vuelve a salir. */
export async function saveWelcomeRank(_p: WelcomeState, fd: FormData): Promise<WelcomeState> {
  const { supabase, userId } = await session();
  const t = await getTranslations("welcome");
  const name = z.string().trim().min(2, t("nameMin")).max(32, t("nameMax")).regex(/^[^<>]+$/, t("chars")).safeParse(fd.get("display_name") ?? "");
  const opt = (v: FormDataEntryValue | null) => (v ? uuid.safeParse(v) : { success: true as const, data: null });
  const rank = opt(fd.get("rank_id"));
  const region = opt(fd.get("region_id"));
  if (!name.success) return { ok: false, message: name.error.issues[0].message };
  if (!rank.success || !region.success) return { ok: false, message: t("checkRank") };
  const error = await saveGamePart({ rank: rank.data, region: region.data });
  if (error) return { ok: false, message: t("saveError") };
  await supabase.from("profiles").update({ display_name: name.data, onboarded_at: new Date().toISOString() }).eq("id", userId);
  redirect("/inicio");
}

/** «Saltar por ahora»: la guía no vuelve a salir; se completa luego en Editar perfil. */
export async function skipWelcome() {
  const { supabase, userId } = await session();
  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", userId);
  redirect("/inicio");
}
