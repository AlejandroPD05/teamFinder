"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentGame } from "@/lib/games";
import { matchFromForm, matchSchema } from "@/lib/matches";
import { keys, VISIBILITY } from "@/lib/profile/options";
import { createClient } from "@/lib/supabase/server";

export type MatchState = { ok: boolean; message: string; fieldErrors?: Record<string, string> } | null;

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/perfil/partidas");
  return { supabase, userId: data.claims.sub };
}

const done = (userId: string) => {
  revalidatePath("/perfil/partidas");
  revalidatePath("/perfil");
  revalidatePath(`/jugador/${userId}`);
};

export async function addMatchAction(_p: MatchState, fd: FormData): Promise<MatchState> {
  const { supabase, userId } = await session();
  const v = matchSchema.safeParse(matchFromForm(fd));
  if (!v.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of v.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: "Revisa los campos marcados.", fieldErrors };
  }
  const { game } = await currentGame();
  const { error } = await supabase.from("manual_matches").insert({ ...v.data, user_id: userId, game_id: game.id });
  if (error) {
    return {
      ok: false,
      message: error.hint === "rate_limited" ? "Has apuntado 30 partidas hoy. Sigue mañana." : "No se pudo guardar. Revisa los datos.",
    };
  }
  done(userId);
  return { ok: true, message: "Partida apuntada." };
}

export async function deleteMatchAction(_p: MatchState, fd: FormData): Promise<MatchState> {
  const { supabase, userId } = await session();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: "No se pudo borrar." };
  const { error } = await supabase.from("manual_matches").delete().eq("id", id.data).eq("user_id", userId);
  if (error) return { ok: false, message: "No se pudo borrar." };
  done(userId);
  return { ok: true, message: "Borrada." };
}

export async function matchesVisibilityAction(_p: MatchState, fd: FormData): Promise<MatchState> {
  const { supabase, userId } = await session();
  const v = z.enum(keys(VISIBILITY)).safeParse(fd.get("visibility"));
  if (!v.success) return { ok: false, message: "Elige quién las ve." };
  const { error } = await supabase.from("profiles").update({ matches_visibility: v.data }).eq("id", userId);
  if (error) return { ok: false, message: "No se pudo guardar." };
  done(userId);
  return { ok: true, message: "Guardado." };
}
