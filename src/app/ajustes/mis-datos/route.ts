import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Portabilidad y acceso (arts. 15 y 20 RGPD): descarga en JSON de los datos que ha aportado o generado la persona.
// Todas las consultas van con su sesión, así que la RLS solo deja ver lo suyo.
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

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
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    note: "Datos de tu cuenta en TeamFinder. Los mensajes de grupos cerrados se borran a los 30 días (ver /privacidad).",
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
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="teamfinder-mis-datos.json"`,
      "Cache-Control": "no-store",
    },
  });
}
