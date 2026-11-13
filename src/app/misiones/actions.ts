"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { errorMessage, translator } from "@/lib/i18n/translator";
import type { Card } from "@/lib/missions/queries";
import { createClient } from "@/lib/supabase/server";

export type ClaimState = { ok: true; card: Card } | { ok: false; message: string } | null;

/** Reclama la recompensa de una misión completada: una carta nueva del juego. */
export async function claimMission(_prev: ClaimState, fd: FormData): Promise<ClaimState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/misiones");
  const locale = await getLocale();
  const id = z.uuid().safeParse(fd.get("mission"));
  if (!id.success) return { ok: false, message: errorMessage("mission", "not_found", locale) };

  const { data: cardId, error } = await supabase.rpc("claim_mission", { p_mission: id.data });
  if (error) return { ok: false, message: errorMessage("mission", error.hint, locale) };
  const { data: card } = await supabase
    .from("collectible_cards")
    .select("id, slug, name, image_url, rarity, credit")
    .eq("id", cardId)
    .single();
  revalidatePath("/misiones");
  revalidatePath("/coleccion");
  return card ? { ok: true, card: card as Card } : { ok: false, message: translator(locale, "missions")("claimedHidden") };
}
