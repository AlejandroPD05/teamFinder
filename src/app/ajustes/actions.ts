"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type EmailState = { ok: true; enabled: boolean; message: string } | { ok: false; message: string } | null;

export async function emailNotificationsAction(_p: EmailState, fd: FormData): Promise<EmailState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/entrar?next=/ajustes");
  const enabled = fd.get("enabled") === "on";
  const { error } = await supabase.from("profiles").update({ email_notifications: enabled }).eq("id", userId);
  if (error) return { ok: false, message: "No se pudo guardar. Inténtalo de nuevo." };
  revalidatePath("/ajustes");
  return {
    ok: true,
    enabled,
    message: enabled ? "Activados. Te escribiremos como mucho una vez por hora si tienes novedades." : "Desactivados.",
  };
}

const subscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

/** Guarda la suscripción push de este dispositivo (cada dispositivo tiene la suya). */
export async function savePushSubscription(raw: unknown): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false };
  const s = subscriptionSchema.safeParse(raw);
  if (!s.success) return { ok: false };
  // Si este navegador ya estaba suscrito con esta cuenta, se reemplaza.
  await supabase.from("push_subscriptions").delete().eq("endpoint", s.data.endpoint);
  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ user_id: userId, endpoint: s.data.endpoint, p256dh: s.data.keys.p256dh, auth: s.data.keys.auth });
  return { ok: !error };
}

export async function deletePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { ok: false };
  const ep = z.string().url().max(1000).safeParse(endpoint);
  if (!ep.success) return { ok: false };
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", ep.data).eq("user_id", data.claims.sub);
  return { ok: !error };
}
