"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { currentGame } from "@/lib/games";
import { gameProfileFromForm, gameProfileSchemaFor, profileFromForm, profileSchemaFor } from "@/lib/profile/schema";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { ok: boolean; message: string; fieldErrors?: Record<string, string> } | null;

function firstErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    out[key] ??= i.message;
  }
  return out;
}

export async function saveProfile(_prev: SaveState, fd: FormData): Promise<SaveState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/entrar?next=/perfil/editar");

  const [locale, t] = await Promise.all([getLocale(), getTranslations("profileForm")]);
  const common = profileSchemaFor(locale).safeParse(profileFromForm(fd));
  const gameParsed = gameProfileSchemaFor(locale).safeParse(gameProfileFromForm(fd));
  if (!common.success || !gameParsed.success) {
    return {
      ok: false,
      message: t("checkFields"),
      fieldErrors: {
        ...(common.success ? {} : firstErrors(common.error.issues)),
        ...(gameParsed.success ? {} : firstErrors(gameParsed.error.issues)),
      },
    };
  }

  const { error: profileError } = await supabase.from("profiles").update(common.data).eq("id", userId);
  if (profileError) return { ok: false, message: t("saveError") };

  const { game } = await currentGame();
  const g = gameParsed.data;
  const { error: gameError } = await supabase.rpc("save_game_profile", {
    p_game_id: game.id,
    p_rank_id: g.rank_id as string,
    p_region_id: g.region_id as string,
    p_flex: g.flex,
    p_visibility: g.visibility,
    p_roles: g.roles.map((role_id) => ({ role_id, is_primary: role_id === g.primary_role })),
    p_characters: g.characters,
    p_modes: g.modes,
  });
  if (gameError) return { ok: false, message: t("saveGameError", { game: game.name }) };

  revalidatePath("/inicio");
  revalidatePath("/perfil");
  revalidatePath("/perfil/editar");
  revalidatePath(`/jugador/${userId}`);
  return { ok: true, message: t("saved") };
}
