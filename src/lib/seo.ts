import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";

/** Solo producción se indexa: previews y local quedan fuera de los buscadores. */
export function indexable(env: NodeJS.ProcessEnv = process.env): boolean {
  return !env.VERCEL_ENV || env.VERCEL_ENV === "production";
}

/** Juegos activos sin depender de cookies (robots, sitemap). Catálogo público. */
export async function publicGameIds(): Promise<string[]> {
  const { url, key } = supabaseEnv();
  const { data } = await createSupabase(url, key, { auth: { persistSession: false } })
    .from("games")
    .select("id")
    .eq("active", true)
    .order("sort");
  return (data ?? []).map((g) => g.id);
}
