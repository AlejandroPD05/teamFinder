"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Card } from "@/lib/missions/queries";
import { createClient } from "@/lib/supabase/server";

export type ClaimState = { ok: true; card: Card } | { ok: false; message: string } | null;

const ERRORS: Record<string, string> = {
  not_completed: "Aún no has completado la misión.",
  collection_complete: "Ya tienes todas las cartas de este juego.",
  not_found: "Esa misión ya no existe.",
};

/** Reclama la recompensa de una misión completada: una carta nueva del juego. */
export async function claimMission(_prev: ClaimState, fd: FormData): Promise<ClaimState> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/entrar?next=/misiones");
  const id = z.uuid().safeParse(fd.get("mission"));
  if (!id.success) return { ok: false, message: ERRORS.not_found };

  const { data: cardId, error } = await supabase.rpc("claim_mission", { p_mission: id.data });
  if (error) return { ok: false, message: ERRORS[error.hint ?? ""] ?? "No se pudo reclamar. Inténtalo de nuevo." };
  const { data: card } = await supabase
    .from("collectible_cards")
    .select("id, slug, name, image_url, rarity, credit")
    .eq("id", cardId)
    .single();
  revalidatePath("/misiones");
  revalidatePath("/coleccion");
  return card ? { ok: true, card: card as Card } : { ok: false, message: "Carta conseguida, pero no se pudo mostrar." };
}
