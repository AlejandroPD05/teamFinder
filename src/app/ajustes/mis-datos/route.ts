import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Portabilidad y acceso (arts. 15 y 20 RGPD): descarga en JSON de los datos que ha aportado o generado la persona.
// Todas las consultas van con su sesión, así que la RLS solo deja ver lo suyo.
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const t = await getTranslations("settings");
  if (!userId) return NextResponse.json({ error: t("exportNoSession") }, { status: 401 });

  const own = <T extends string>(table: T, column = "user_id") =>
    // Tipado laxo a propósito: es una exportación genérica de filas propias.
    (supabase.from(table as never) as unknown as { select: (c: string) => { eq: (k: string, v: string) => PromiseLike<{ data: unknown }> } })
      .select("*")
      .eq(column, userId)
      .then((r) => r.data ?? []);

  const [
    profile,
    gameProfiles,
    roles,
    characters,
    lobbies,
    memberships,
    messages,
    requests,
    karmaGiven,
    blocks,
    reports,
    clips,
    comments,
    emblems,
    cards,
    claimsMade,
    directMessages,
    notifications,
    fanart,
    restrictions,
    rankAwards,
    matchesManual,
    teamMemberships,
    teamMessages,
    teamInvites,
    teamEventRsvps,
    pushSubscriptions,
    lobbyTemplates,
    savedSearches,
    feedback,
    reliability,
  ] = await Promise.all([
    own("profiles", "id"),
    own("game_profiles"),
    own("player_roles"),
    own("player_characters"),
    own("lobbies", "owner_id"),
    own("lobby_members"),
    own("lobby_messages"),
    own("lobby_requests"),
    own("karma_votes", "voter_id"),
    own("user_blocks", "blocker_id"),
    own("reports", "reporter_id"),
    own("clips"),
    own("clip_comments"),
    own("clip_votes"),
    own("user_cards"),
    own("mission_claims"),
    own("direct_messages", "sender_id"),
    own("notifications"),
    own("fanart_submissions"),
    own("user_restrictions"),
    own("weekly_rank_awards"),
    own("manual_matches"),
    own("team_members"),
    own("team_messages"),
    own("team_invites"),
    own("team_event_rsvps"),
    own("push_subscriptions"),
    own("lobby_templates"),
    own("saved_searches"),
    own("feedback"),
    supabase.rpc("player_reliability", { p_user: userId }).then((r) => r.data ?? null),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    note: t("exportNote"),
    account: { id: userId, email: claims?.claims?.email ?? null },
    profile,
    game_profiles: gameProfiles,
    roles,
    characters,
    lobbies_created: lobbies,
    lobby_memberships: memberships,
    lobby_messages: messages,
    lobby_requests: requests,
    karma_given: karmaGiven,
    blocks,
    reports_made: reports,
    clips,
    clip_comments: comments,
    clip_emblems_given: emblems,
    cards,
    mission_claims: claimsMade,
    // Solo los mensajes privados que has enviado tú (los de la otra persona son suyos).
    direct_messages: directMessages,
    notifications,
    fanart_submissions: fanart,
    restrictions,
    weekly_rank_awards: rankAwards,
    manual_matches: matchesManual,
    team_memberships: teamMemberships,
    team_messages: teamMessages,
    team_invites_received: teamInvites,
    team_event_answers: teamEventRsvps,
    push_subscriptions: pushSubscriptions,
    lobby_templates: lobbyTemplates,
    saved_searches: savedSearches,
    feedback_sent: feedback,
    // Resumen calculado de los últimos 90 días (las salidas de grupos se guardan solo para esto).
    reliability,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="teamfinder-mis-datos.json"`,
      "Cache-Control": "no-store",
    },
  });
}
