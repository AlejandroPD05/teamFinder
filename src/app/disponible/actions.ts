"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentGame } from "@/lib/games";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type AvailableState = { ok: boolean; message: string } | null;

const schema = z.object({
  hours: z.coerce.number().int().min(0).max(3),
  mode: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^[a-z0-9-]{1,32}$/).nullable()),
});

/** Marcarse disponible 1–3 horas en el juego actual (0 = dejar de estarlo). */
export async function setAvailableAction(_p: AvailableState, fd: FormData): Promise<AvailableState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/inicio");
  const t = await getTranslations("availableNow");
  const v = schema.safeParse({ hours: fd.get("hours"), mode: fd.get("mode") });
  if (!v.success) return { ok: false, message: t("chooseTime") };
  const { game } = await currentGame();
  const { error } = await supabase.rpc("set_available", { p_game: game.id, p_hours: v.data.hours, p_mode: v.data.mode ?? undefined });
  if (error) {
    const message =
      error.hint === "no_profile"
        ? t("noProfile", { game: game.name })
        : error.hint === "restricted"
          ? t("restricted")
          : t("saveError");
    return { ok: false, message };
  }
  revalidatePath("/inicio");
  revalidatePath("/buscar");
  revalidatePath("/");
  return { ok: true, message: v.data.hours ? t("saved") : t("cleared") };
}
