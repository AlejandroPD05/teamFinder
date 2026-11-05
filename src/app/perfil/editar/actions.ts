"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentGame } from "@/lib/games";
import { gameProfileFromForm, gameProfileSchema, profileFromForm, profileSchema } from "@/lib/profile/schema";
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

  const common = profileSchema.safeParse(profileFromForm(fd));
  const gameParsed = gameProfileSchema.safeParse(gameProfileFromForm(fd));
  if (!common.success || !gameParsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      fieldErrors: {
        ...(common.success ? {} : firstErrors(common.error.issues)),
        ...(gameParsed.success ? {} : firstErrors(gameParsed.error.issues)),
      },
    };
  }

  const { error: profileError } = await supabase.from("profiles").update(common.data).eq("id", userId);
  if (profileError) return { ok: false, message: "No se pudo guardar el perfil. Inténtalo de nuevo." };

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
  if (gameError) return { ok: false, message: `No se pudo guardar tu perfil de ${game.name}. Inténtalo de nuevo.` };

  revalidatePath("/inicio");
  revalidatePath("/perfil");
  revalidatePath("/perfil/editar");
  revalidatePath(`/jugador/${userId}`);
  return { ok: true, message: "Perfil guardado." };
}
