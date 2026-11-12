import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

/** Restricción temporal vigente de una persona (la RLS solo deja ver las propias y a moderación). */
export async function activeRestriction(supabase: SupabaseClient<Database>, userId: string) {
  const { data } = await supabase
    .from("user_restrictions")
    .select("until, reason")
    .eq("user_id", userId)
    .is("lifted_at", null)
    .gt("until", new Date().toISOString())
    .order("until", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export const RESTRICTED_MESSAGE = "Tu cuenta está restringida temporalmente: no puedes hacer esto hasta que termine.";

export const untilFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  dateStyle: "long",
  timeStyle: "short",
});
