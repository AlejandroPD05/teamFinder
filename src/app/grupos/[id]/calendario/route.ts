import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { APP_NAME } from "@/lib/config";
import { buildCalendar, calendarResponse } from "@/lib/ics";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// «Añadir al calendario» de un grupo con hora: lo descarga quien puede ver el grupo (la RLS decide). Una hora por defecto.
export async function GET(_req: Request, { params }: RouteContext<"/grupos/[id]/calendario">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new Response(null, { status: 401 });

  const { data: lobby } = await supabase.from("lobbies").select("id, game_id, mode_slug, starts_at, status").eq("id", id).maybeSingle();
  if (!lobby?.starts_at || lobby.status === "closed") return new Response(null, { status: 404 });
  const [{ data: game }, { data: mode }, t] = await Promise.all([
    supabase.from("games").select("name").eq("id", lobby.game_id).maybeSingle(),
    supabase.from("game_modes").select("name").eq("game_id", lobby.game_id).eq("slug", lobby.mode_slug).maybeSingle(),
    getTranslations("calendar"),
  ]);
  const url = `${siteUrl()}/grupos/${lobby.id}`;
  const title = t("lobbyTitle", { mode: mode?.name ?? lobby.mode_slug, game: game?.name ?? lobby.game_id, app: APP_NAME });
  const body = buildCalendar(
    [{ uid: `lobby-${lobby.id}@teamfinder`, start: new Date(lobby.starts_at), minutes: 60, title, description: t("lobbyDescription", { url }), url }],
    { name: APP_NAME },
  );
  return calendarResponse(body, `${APP_NAME}-${mode?.name ?? lobby.mode_slug}`);
}
