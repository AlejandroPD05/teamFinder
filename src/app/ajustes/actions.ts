"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
