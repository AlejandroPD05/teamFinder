"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type CardState = { ok: true; enabled: boolean } | { ok: false; message: string } | null;

/** Activar o desactivar la tarjeta pública del perfil (opt-in: viene desactivada). */
export async function shareCardAction(_p: CardState, fd: FormData): Promise<CardState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const t = await getTranslations("playerShare");
  if (!userId) return { ok: false, message: t("error") };
  const enabled = fd.get("enabled") === "on";
  const { error } = await supabase.from("profiles").update({ share_card: enabled }).eq("id", userId);
  if (error) return { ok: false, message: t("error") };
  revalidatePath(`/jugador/${userId}`);
  return { ok: true, enabled };
}
