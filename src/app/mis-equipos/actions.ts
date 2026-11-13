"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { translator } from "@/lib/i18n/translator";
import { currentGame } from "@/lib/games";
import { keys } from "@/lib/profile/options";
import { createClient } from "@/lib/supabase/server";
import { teamError as baseTeamError, teamSchemaFor } from "@/lib/teams";
import { lobbyError as baseLobbyError } from "@/lib/lobbies/schema";
import { REPORT_REASONS } from "@/lib/trust/options";

export type TeamState = { ok: boolean; message: string } | null;

const uuid = z.uuid();

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/entrar?next=/mis-equipos");
  return supabase;
}

/** Textos en el idioma de la petición. */
async function messages() {
  const locale = await getLocale();
  return {
    locale,
    t: translator(locale, "teams.actions"),
    teamError: (hint?: string | null) => baseTeamError(hint, locale),
  };
}

const done = (paths: string[], message: string): TeamState => {
  paths.forEach((p) => revalidatePath(p));
  return { ok: true, message };
};

export async function createTeamAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { locale, teamError } = await messages();
  const v = teamSchemaFor(locale).safeParse({ name: fd.get("name") ?? "", description: fd.get("description") ?? "" });
  if (!v.success) return { ok: false, message: v.error.issues[0].message };
  const { game } = await currentGame();
  const { data, error } = await supabase.rpc("create_team", { p_game: game.id, p_name: v.data.name, p_description: v.data.description });
  if (error || !data) return { ok: false, message: teamError(error?.hint) };
  revalidatePath("/mis-equipos");
  redirect(`/equipo/${data}`);
}

export async function updateTeamAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { locale, t, teamError } = await messages();
  const team = uuid.safeParse(fd.get("team_id"));
  const v = teamSchemaFor(locale).safeParse({ name: fd.get("name") ?? "", description: fd.get("description") ?? "" });
  if (!team.success) return { ok: false, message: teamError() };
  if (!v.success) return { ok: false, message: v.error.issues[0].message };
  const { error } = await supabase.rpc("update_team", { p_team: team.data, p_name: v.data.name, p_description: v.data.description });
  if (error) return { ok: false, message: teamError(error.hint) };
  return done([`/equipo/${team.data}`, "/mis-equipos"], t("saved"));
}

export async function inviteAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { t, teamError } = await messages();
  const team = uuid.safeParse(fd.get("team_id"));
  const user = uuid.safeParse(fd.get("user_id"));
  if (!team.success || !user.success) return { ok: false, message: t("chooseTeam") };
  const { error } = await supabase.rpc("invite_to_team", { p_team: team.data, p_user: user.data });
  if (error) return { ok: false, message: teamError(error.hint) };
  return done([`/equipo/${team.data}`, `/jugador/${user.data}`], t("invited"));
}

export async function respondInviteAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { t, teamError } = await messages();
  const invite = uuid.safeParse(fd.get("invite_id"));
  if (!invite.success) return { ok: false, message: teamError() };
  const accept = fd.get("decision") === "accept";
  const { data: inv } = await supabase.from("team_invites").select("team_id").eq("id", invite.data).maybeSingle();
  const { error } = await supabase.rpc("respond_team_invite", { p_invite: invite.data, p_accept: accept });
  if (error) return { ok: false, message: teamError(error.hint) };
  revalidatePath("/mis-equipos");
  // Al aceptar, directo al equipo (y a su chat).
  if (accept && inv) redirect(`/equipo/${inv.team_id}`);
  return { ok: true, message: accept ? t("joined") : t("declined") };
}

export async function cancelInviteAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { t, teamError } = await messages();
  const invite = uuid.safeParse(fd.get("invite_id"));
  const team = uuid.safeParse(fd.get("team_id"));
  if (!invite.success || !team.success) return { ok: false, message: teamError() };
  const { error } = await supabase.rpc("cancel_team_invite", { p_invite: invite.data });
  if (error) return { ok: false, message: teamError(error.hint) };
  return done([`/equipo/${team.data}`], t("cancelled"));
}

/** Salir (sin `user_id`) o, si eres el dueño, sacar a alguien. */
export async function leaveTeamAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { t, teamError } = await messages();
  const team = uuid.safeParse(fd.get("team_id"));
  const raw = fd.get("user_id");
  const user = raw ? uuid.safeParse(raw) : null;
  if (!team.success || (user && !user.success)) return { ok: false, message: teamError() };
  const { error } = await supabase.rpc("leave_team", { p_team: team.data, p_user: user?.success ? user.data : undefined });
  if (error) return { ok: false, message: teamError(error.hint) };
  if (!user) {
    revalidatePath("/mis-equipos");
    redirect("/mis-equipos");
  }
  return done([`/equipo/${team.data}`], t("removed"));
}

export async function deleteTeamAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { teamError } = await messages();
  const team = uuid.safeParse(fd.get("team_id"));
  if (!team.success) return { ok: false, message: teamError() };
  const { error } = await supabase.rpc("delete_team", { p_team: team.data });
  if (error) return { ok: false, message: teamError(error.hint) };
  revalidatePath("/mis-equipos");
  redirect("/mis-equipos");
}

const reportSchema = (t: ReturnType<typeof translator<"trust">>) =>
  z.object({
    message: z.coerce.number().int().positive(),
    reason: z.enum(keys(REPORT_REASONS)),
    details: z.string().trim().max(500, t("max500")).regex(/^[^<>]*$/, t("chars")),
  });

export async function reportTeamMessageAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { locale, teamError } = await messages();
  const tt = translator(locale, "trust");
  const r = reportSchema(tt).safeParse({ message: fd.get("message_id"), reason: fd.get("reason"), details: fd.get("details") ?? "" });
  if (!r.success) return { ok: false, message: r.error.issues[0].path[0] === "reason" ? tt("chooseReason") : r.error.issues[0].message };
  const { error } = await supabase.rpc("report_team_message", { p_message: r.data.message, p_reason: r.data.reason, p_details: r.data.details });
  if (error) return { ok: false, message: teamError(error.hint) };
  return { ok: true, message: tt("reported") };
}

// ---------- Quedadas ----------

export async function createEventAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { t, teamError } = await messages();
  const team = uuid.safeParse(fd.get("team_id"));
  const startsAt = z.iso.datetime({ offset: true }).safeParse(fd.get("starts_at"));
  const note = z.string().trim().max(200, t("noteMax")).regex(/^[^<>]*$/, t("chars")).safeParse(fd.get("note") ?? "");
  if (!team.success) return { ok: false, message: teamError() };
  if (!startsAt.success) return { ok: false, message: t("chooseTime") };
  if (!note.success) return { ok: false, message: note.error.issues[0].message };
  const { error } = await supabase.rpc("create_team_event", { p_team: team.data, p_starts_at: startsAt.data, p_note: note.data });
  if (error) {
    const message =
      error.hint === "invalid" ? t("eventRange") : error.hint === "limit_events" ? t("eventLimit") : teamError(error.hint);
    return { ok: false, message };
  }
  return done([`/equipo/${team.data}`], t("eventCreated"));
}

export async function rsvpAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { t, teamError } = await messages();
  const event = uuid.safeParse(fd.get("event_id"));
  const team = uuid.safeParse(fd.get("team_id"));
  const answer = z.enum(["yes", "maybe", "no"]).safeParse(fd.get("answer"));
  if (!event.success || !team.success || !answer.success) return { ok: false, message: teamError() };
  const { error } = await supabase.rpc("rsvp_team_event", { p_event: event.data, p_answer: answer.data });
  if (error) return { ok: false, message: teamError(error.hint) };
  return done([`/equipo/${team.data}`], t("rsvpSaved"));
}

export async function deleteEventAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { t, teamError } = await messages();
  const event = uuid.safeParse(fd.get("event_id"));
  const team = uuid.safeParse(fd.get("team_id"));
  if (!event.success || !team.success) return { ok: false, message: teamError() };
  const { error } = await supabase.rpc("delete_team_event", { p_event: event.data });
  if (error) return { ok: false, message: teamError(error.hint) };
  return done([`/equipo/${team.data}`], t("eventDeleted"));
}

/** Crear el grupo con los que van y llevar a él. */
export async function eventLobbyAction(_p: TeamState, fd: FormData): Promise<TeamState> {
  const supabase = await session();
  const { locale, t, teamError } = await messages();
  const event = uuid.safeParse(fd.get("event_id"));
  const mode = z.string().regex(/^[a-z0-9-]{1,32}$/).safeParse(fd.get("mode"));
  if (!event.success) return { ok: false, message: teamError() };
  if (!mode.success) return { ok: false, message: t("chooseMode") };
  const { data, error } = await supabase.rpc("team_event_lobby", { p_event: event.data, p_mode: mode.data });
  if (error || !data) {
    return { ok: false, message: error?.hint === "duplicate" ? t("eventHasLobby") : baseLobbyError(error?.hint, locale) };
  }
  revalidatePath("/grupos");
  redirect(`/grupos/${data}`);
}
