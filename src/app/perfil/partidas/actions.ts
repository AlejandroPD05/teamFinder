"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { currentGame } from "@/lib/games";
import { matchFromForm, matchSchemaFor } from "@/lib/matches";
import { keys, VISIBILITY } from "@/lib/profile/options";
import { createClient } from "@/lib/supabase/server";

export type MatchState = { ok: boolean; message: string; fieldErrors?: Record<string, string> } | null;

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/perfil/partidas");
  const [locale, t] = await Promise.all([getLocale(), getTranslations("matches")]);
  return { supabase, userId: data.claims.sub, locale, t };
}

const done = (userId: string) => {
  revalidatePath("/perfil/partidas");
  revalidatePath("/perfil");
  revalidatePath(`/jugador/${userId}`);
};

export async function addMatchAction(_p: MatchState, fd: FormData): Promise<MatchState> {
  const { supabase, userId, locale, t } = await session();
  const v = matchSchemaFor(locale).safeParse(matchFromForm(fd));
  if (!v.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of v.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: t("checkFields"), fieldErrors };
  }
  const { game } = await currentGame();
  const { error } = await supabase.from("manual_matches").insert({ ...v.data, user_id: userId, game_id: game.id });
  if (error) {
    return {
      ok: false,
      message: error.hint === "rate_limited" ? t("rateLimited") : t("saveError"),
    };
  }
  done(userId);
  return { ok: true, message: t("added") };
}

export async function deleteMatchAction(_p: MatchState, fd: FormData): Promise<MatchState> {
  const { supabase, userId, t } = await session();
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { ok: false, message: t("deleteError") };
  const { error } = await supabase.from("manual_matches").delete().eq("id", id.data).eq("user_id", userId);
  if (error) return { ok: false, message: t("deleteError") };
  done(userId);
  return { ok: true, message: t("deleted") };
}

export async function matchesVisibilityAction(_p: MatchState, fd: FormData): Promise<MatchState> {
  const { supabase, userId, t } = await session();
  const v = z.enum(keys(VISIBILITY)).safeParse(fd.get("visibility"));
  if (!v.success) return { ok: false, message: t("chooseVisibility") };
  const { error } = await supabase.from("profiles").update({ matches_visibility: v.data }).eq("id", userId);
  if (error) return { ok: false, message: t("visibilityError") };
  done(userId);
  return { ok: true, message: t("visibilitySaved") };
}
