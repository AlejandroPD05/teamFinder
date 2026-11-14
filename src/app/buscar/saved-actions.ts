"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { currentGame } from "@/lib/games";
import { translator } from "@/lib/i18n/translator";
import { loadCatalog } from "@/lib/profile/queries";
import { parseFilters } from "@/lib/search/filters";
import { savedSearchFrom } from "@/lib/search/saved";
import { createClient } from "@/lib/supabase/server";

export type SavedState = { ok: boolean; message: string } | null;

const id = z.uuid();
const searchName = z.string().trim().min(2).max(40).regex(/^[^<>]*$/);
const nil = null as unknown as string;

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/buscar");
  return { supabase, t: translator(await getLocale(), "savedSearches") };
}

/** Guarda la búsqueda actual. Los filtros se vuelven a leer de la URL en el servidor (no se fía del cliente). */
export async function saveSearchAction(_p: SavedState, fd: FormData): Promise<SavedState> {
  const { supabase, t } = await session();
  const name = searchName.safeParse(fd.get("name"));
  if (!name.success) return { ok: false, message: t("nameInvalid") };
  const { game } = await currentGame();
  const catalog = await loadCatalog(supabase, game.id);
  const params = Object.fromEntries(new URLSearchParams(String(fd.get("query") ?? "").slice(0, 500)));
  const s = savedSearchFrom(parseFilters(params, catalog), catalog);
  const { error } = await supabase.rpc("save_search", {
    p_game: game.id,
    p_name: name.data,
    p_query: s.query,
    p_role: s.role ?? nil,
    p_rank_min: s.rankMin ?? nil,
    p_rank_max: s.rankMax ?? nil,
    p_region: s.region ?? nil,
    p_language: s.language ?? "",
  });
  if (error) return { ok: false, message: error.hint === "limit_searches" ? t("limit") : t("error") };
  revalidatePath("/buscar");
  return { ok: true, message: t("saved") };
}

/** Activar o desactivar la alerta, o borrar una búsqueda guardada. */
export async function savedSearchAction(_p: SavedState, fd: FormData): Promise<SavedState> {
  const { supabase, t } = await session();
  const sid = id.safeParse(fd.get("id"));
  if (!sid.success) return { ok: false, message: t("error") };
  const intent = fd.get("intent");
  const { error } =
    intent === "delete"
      ? await supabase.from("saved_searches").delete().eq("id", sid.data)
      : await supabase.from("saved_searches").update({ alerts: intent === "alerts_on" }).eq("id", sid.data);
  if (error) return { ok: false, message: t("error") };
  revalidatePath("/buscar");
  return { ok: true, message: intent === "delete" ? t("deleted") : intent === "alerts_on" ? t("alertsOn") : t("alertsOff") };
}
