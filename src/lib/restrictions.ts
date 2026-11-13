import type { SupabaseClient } from "@supabase/supabase-js";
import { INTL_LOCALE, type AppLocale } from "./i18n/locale";
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

// El aviso de cuenta restringida está en messages/*.json (common.restricted y errors.*.restricted).

/** Fecha de fin de una restricción, en hora peninsular. */
export function formatUntil(iso: string, locale: AppLocale = "es"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: "Europe/Madrid",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}
