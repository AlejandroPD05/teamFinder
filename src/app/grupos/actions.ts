"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { translator } from "@/lib/i18n/translator";
import { createLobbyFromForm, createLobbySchemaFor, lobbyError as baseLobbyError, requestMessageSchemaFor } from "@/lib/lobbies/schema";
import { currentGame } from "@/lib/games";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string; fieldErrors?: Record<string, string> } | null;

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/grupos");
  return supabase;
}

/** Textos en el idioma de la petición. */
async function messages() {
  const locale = await getLocale();
  return { locale, t: translator(locale, "lobbies.actions"), lobbyError: (hint?: string | null) => baseLobbyError(hint, locale) };
}

const lobbyId = z.uuid();
const nil = null as unknown as string;

export async function createLobby(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await session();
  const { locale, t, lobbyError } = await messages();
  const parsed = createLobbySchemaFor(locale).safeParse(createLobbyFromForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: t("checkFields"), fieldErrors };
  }
  const v = parsed.data;
  const { data, error } = await supabase.rpc("create_lobby", {
    p_game_id: (await currentGame()).game.id,
    p_mode_slug: v.mode,
    p_note: v.note,
    p_rank_min: v.rank_min ?? nil,
    p_rank_max: v.rank_max ?? nil,
    p_region: v.region ?? nil,
    p_language: v.language ?? nil,
    p_goal: v.goal ?? nil,
    p_starts_at: v.startsAt?.toISOString() ?? nil,
    p_roles: v.roles,
  });
  if (error) return { ok: false, message: lobbyError(error.hint) };
  revalidatePath("/grupos");
  redirect(`/grupos/${data}`);
}

/** Acciones sobre un grupo concreto: devuelven un mensaje para el estado accesible. */
export async function lobbyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await session();
  const { locale, t, lobbyError } = await messages();
  const id = lobbyId.safeParse(fd.get("lobby_id"));
  if (!id.success) return { ok: false, message: lobbyError() };
  const intent = fd.get("intent");
  let result: { error: { hint?: string | null } | null };
  let ok = t("done");

  switch (intent) {
    case "request": {
      const msg = requestMessageSchemaFor(locale).safeParse(fd.get("message") ?? "");
      if (!msg.success) return { ok: false, message: msg.error.issues[0].message };
      result = await supabase.rpc("request_join", { p_lobby: id.data, p_message: msg.data });
      ok = t("requested");
      break;
    }
    case "withdraw":
      result = await supabase.rpc("withdraw_request", { p_lobby: id.data });
      ok = t("withdrawn");
      break;
    case "accept":
    case "reject": {
      const req = lobbyId.safeParse(fd.get("request_id"));
      if (!req.success) return { ok: false, message: lobbyError() };
      result = await supabase.rpc("respond_request", { p_request: req.data, p_accept: intent === "accept" });
      ok = intent === "accept" ? t("accepted") : t("rejected");
      break;
    }
    case "leave":
      result = await supabase.rpc("leave_lobby", { p_lobby: id.data });
      ok = t("left");
      break;
    case "close":
      result = await supabase.rpc("close_lobby", { p_lobby: id.data });
      ok = t("closed");
      break;
    default:
      return { ok: false, message: lobbyError() };
  }

  if (result.error) return { ok: false, message: lobbyError(result.error.hint) };
  revalidatePath(`/grupos/${id.data}`);
  revalidatePath("/grupos");
  return { ok: true, message: ok };
}

export type ShareState = { ok: true; url: string } | { ok: false; message: string } | null;

/** El creador comparte el grupo: genera el enlace público con su resumen (para Discord, WhatsApp…). */
export async function shareLobbyAction(_prev: ShareState, fd: FormData): Promise<ShareState> {
  const supabase = await session();
  const { t, lobbyError } = await messages();
  const id = lobbyId.safeParse(fd.get("lobby_id"));
  if (!id.success) return { ok: false, message: lobbyError() };
  const { error } = await supabase.rpc("share_lobby", { p_lobby: id.data });
  if (error) return { ok: false, message: error.hint === "closed" ? t("isClosed") : lobbyError(error.hint) };
  return { ok: true, url: `${siteUrl()}/unete/${id.data}` };
}

export type DiscordState = { ok: boolean; message: string } | null;

/** El creador publica el grupo ya compartido en el canal de Discord de TeamFinder (si la integración está conectada). */
export async function postLobbyDiscordAction(_prev: DiscordState, fd: FormData): Promise<DiscordState> {
  const supabase = await session();
  const { locale, lobbyError } = await messages();
  const t = translator(locale, "share");
  const id = lobbyId.safeParse(fd.get("lobby_id"));
  if (!id.success) return { ok: false, message: lobbyError() };
  const { error } = await supabase.rpc("post_lobby_discord", { p_lobby: id.data });
  if (error) {
    const known = ["not_connected", "closed", "not_shared", "already_posted", "limit_discord"] as const;
    const hint = known.find((h) => h === error.hint);
    return { ok: false, message: hint ? t(`discord.${hint}`) : lobbyError(error.hint) };
  }
  revalidatePath(`/grupos/${id.data}`);
  return { ok: true, message: t("discord.posted") };
}

