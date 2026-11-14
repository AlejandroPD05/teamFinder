"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { translator } from "@/lib/i18n/translator";
import { lobbyError } from "@/lib/lobbies/schema";
import { currentGame } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export type TemplateState = { ok: boolean; message: string } | null;

const id = z.uuid();
const templateName = z.string().trim().min(2).max(40).regex(/^[^<>]*$/);
const nil = null as unknown as string;

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/entrar?next=/grupos/nuevo");
  const locale = await getLocale();
  return { supabase, userId, locale, t: translator(locale, "templates") };
}

/** El creador guarda su grupo como plantilla (modo, rango, servidor, idioma, objetivo, roles y nota). */
export async function saveTemplateAction(_p: TemplateState, fd: FormData): Promise<TemplateState> {
  const { supabase, locale, t } = await session();
  const lobby = id.safeParse(fd.get("lobby_id"));
  const name = templateName.safeParse(fd.get("name"));
  if (!lobby.success) return { ok: false, message: lobbyError(null, locale) };
  if (!name.success) return { ok: false, message: t("nameInvalid") };
  const { error } = await supabase.rpc("save_lobby_template", { p_lobby: lobby.data, p_name: name.data });
  if (error) return { ok: false, message: error.hint === "limit_templates" ? t("limit") : lobbyError(error.hint, locale) };
  revalidatePath("/grupos/nuevo");
  return { ok: true, message: t("saved") };
}

/**
 * Crea un grupo en un clic: desde una plantilla tuya (`template_id`) o repitiendo un grupo tuyo anterior
 * (`lobby_id`). Empieza «ahora»; la hora de inicio no se copia.
 */
export async function quickLobbyAction(_p: TemplateState, fd: FormData): Promise<TemplateState> {
  const { supabase, userId, locale } = await session();
  const { game } = await currentGame();
  const tpl = id.safeParse(fd.get("template_id"));
  const src = id.safeParse(fd.get("lobby_id"));
  let params: {
    mode_slug: string; note: string | null; rank_min_id: string | null; rank_max_id: string | null;
    region_id: string | null; language: string | null; goal: string | null; roles: string[];
  } | null = null;
  if (tpl.success) {
    const { data } = await supabase.from("lobby_templates").select("*").eq("id", tpl.data).eq("game_id", game.id).maybeSingle();
    params = data;
  } else if (src.success) {
    const { data } = await supabase
      .from("lobbies")
      .select("mode_slug, note, rank_min_id, rank_max_id, region_id, language, goal, lobby_needed_roles(role_id)")
      .eq("id", src.data)
      .eq("owner_id", userId)
      .eq("game_id", game.id)
      .maybeSingle();
    params = data ? { ...data, roles: data.lobby_needed_roles.map((r) => r.role_id) } : null;
  }
  if (!params) return { ok: false, message: lobbyError(null, locale) };
  const { data, error } = await supabase.rpc("create_lobby", {
    p_game_id: game.id,
    p_mode_slug: params.mode_slug,
    p_note: params.note ?? "",
    p_rank_min: params.rank_min_id ?? nil,
    p_rank_max: params.rank_max_id ?? nil,
    p_region: params.region_id ?? nil,
    p_language: params.language ?? nil,
    p_goal: params.goal ?? nil,
    p_starts_at: nil,
    p_roles: params.roles,
  });
  if (error) return { ok: false, message: lobbyError(error.hint, locale) };
  revalidatePath("/grupos");
  redirect(`/grupos/${data}`);
}

export async function deleteTemplateAction(_p: TemplateState, fd: FormData): Promise<TemplateState> {
  const { supabase, t } = await session();
  const tpl = id.safeParse(fd.get("template_id"));
  if (!tpl.success) return { ok: false, message: t("error") };
  const { error } = await supabase.from("lobby_templates").delete().eq("id", tpl.data);
  if (error) return { ok: false, message: t("error") };
  revalidatePath("/grupos/nuevo");
  return { ok: true, message: t("deleted") };
}
